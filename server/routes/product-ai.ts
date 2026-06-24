import express, { Request, Response } from 'express';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { body, validationResult } from 'express-validator';
import { z } from 'zod';
import dotenv from 'dotenv';
import pool from '../lib/db.js';

const router = express.Router();

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

// Zod schema for structured tag generation response
const TagGenerationSchema = z.object({
    tags: z.array(z.string()).describe("Array of relevant tags extracted from the product information"),
    ar_tags: z.array(z.string()).describe("Array of Arabic translations of the tags")
});

const TranslationSchema = z.object({
    translated_text: z.string().describe('Translated text value')
});

const translationCache = new Map<string, string>();

const containsArabic = (text?: string | null) =>
    typeof text === 'string' && /[\u0600-\u06FF]/.test(text);

const translateText = async (text: string, targetLanguage: 'en' | 'ar'): Promise<string> => {
    const cacheKey = `${targetLanguage}:${text}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey) as string;
    }

    const systemPrompt = targetLanguage === 'ar'
        ? `You are a professional translator. Translate the given text to Arabic.
           - Maintain the original meaning and context
           - Use natural, fluent Arabic
           - For product names, use commonly understood Arabic terms
           - Return only the translated text`
        : `You are a professional translator. Translate the given text to English.
           - Maintain the original meaning and context
           - Use natural, fluent English
           - For product names, use commonly understood English terms
           - Return only the translated text`;

    const userPrompt = `Translate this text to ${targetLanguage === 'ar' ? 'Arabic' : 'English'}: "${text}"`;

    const completion = await openai.responses.parse({
        model: 'gpt-5-nano',
        input: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        text: {
            format: zodTextFormat(TranslationSchema, 'translation')
        }
    });

    const parsed = completion.output_parsed;

    if (!parsed || !parsed.translated_text) {
        throw new Error('Translation failed: missing translated_text in response');
    }

    const translated = parsed.translated_text.trim();
    translationCache.set(cacheKey, translated);
    return translated;
};

const ensureEnglishText = async (primary?: string | null, secondary?: string | null): Promise<string> => {
    const candidates = [primary, secondary].filter(Boolean) as string[];
    for (const candidate of candidates) {
        if (!containsArabic(candidate)) {
            return candidate.trim();
        }
    }

    const source = primary || secondary;
    if (!source) {
        return '';
    }

    try {
        return (await translateText(source, 'en')).trim();
    } catch (error) {
        console.error('❌ Failed to translate text to English, using fallback.', error);
        return source.trim();
    }
};

const ensureArabicText = async (primary?: string | null, secondary?: string | null): Promise<string> => {
    const candidates = [primary, secondary].filter(Boolean) as string[];
    for (const candidate of candidates) {
        if (containsArabic(candidate)) {
            return candidate.trim();
        }
    }

    const source = primary || secondary;
    if (!source) {
        return '';
    }

    try {
        return (await translateText(source, 'ar')).trim();
    } catch (error) {
        console.error('❌ Failed to translate text to Arabic, using fallback.', error);
        return source.trim();
    }
};

// Validation middleware for product AI processing
const validateProductAIRequest = [
    body('title').isString().notEmpty().withMessage('Title is required'),
    body('description').isString().notEmpty().withMessage('Description is required'),
    body('ar_title').optional().isString(),
    body('ar_description').optional().isString(),
    body('productId').optional().isUUID().withMessage('Product ID must be a valid UUID'),
    body('deviceLanguage').optional().isString().isLength({ min: 2, max: 5 }),
];

// Endpoint to generate embeddings and tags for a product
router.post('/process-product', validateProductAIRequest, async (req: Request, res: Response) => {
    try {

        console.log('🤖 Processing product', req.body);

        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
            return;
        }

        const { title, description, ar_title, ar_description, productId, deviceLanguage } = req.body;

        console.log('🤖 Processing product', {
            title,
            description,
            ar_title,
            ar_description,
            productId,
            deviceLanguage,
        });

        if (!process.env.OPENAI_API_KEY) {
            res.status(500).json({
                error: 'OpenAI API key not configured'
            });
            return;
        }

        console.log('🤖 Processing product', {
            title,
            description,
            ar_title,
            ar_description,
            productId,
            deviceLanguage,
        });
        
        const rawTitle = typeof title === 'string' ? title.trim() : '';
        const rawArTitle = typeof ar_title === 'string' ? ar_title.trim() : '';
        const rawDescription = typeof description === 'string' ? description.trim() : '';
        const rawArDescription = typeof ar_description === 'string' ? ar_description.trim() : '';

        const englishTitle = await ensureEnglishText(rawTitle, rawArTitle);
        const arabicTitle = await ensureArabicText(rawArTitle, rawTitle);
        const englishDescription = await ensureEnglishText(rawDescription, rawArDescription);
        const arabicDescription = await ensureArabicText(rawArDescription, rawDescription);

        const finalEnglishTitle = englishTitle || rawTitle || rawArTitle || '';
        const finalArabicTitle = arabicTitle || rawArTitle || rawTitle || '';
        const finalEnglishDescription = englishDescription || rawDescription || rawArDescription || '';
        const finalArabicDescription = arabicDescription || rawArDescription || rawDescription || '';

        console.log(`🤖 Processing product ${productId ? `(ID: ${productId})` : ''}`, {
            deviceLanguage: deviceLanguage || 'unknown',
            englishTitleLength: finalEnglishTitle.length,
            arabicTitleLength: finalArabicTitle.length,
            englishDescriptionLength: finalEnglishDescription.length,
            arabicDescriptionLength: finalArabicDescription.length,
        });

        const combinedText = [finalEnglishTitle, finalEnglishDescription, finalArabicTitle, finalArabicDescription]
            .filter(Boolean)
            .join(' ');

        // Generate embedding using OpenAI
        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small", // Using the latest embedding model
            input: combinedText,
            dimensions: 384, // Specify 384 dimensions to match database schema
        });

        const embedding = embeddingResponse.data[0].embedding;

        // Generate tags using structured output
        const tagMessages = [
            {
                role: "system" as const,
                content: "You are an expert at extracting relevant tags from product information. Generate 5-10 relevant tags that would help users find this product when searching. Include category-related tags, condition tags, brand tags, and feature tags. Also provide Arabic translations of these tags. Return the tags as an array of strings and Arabic tags as another array of strings."
            },
            {
                role: "user" as const,
                content: `Extract relevant tags from this product information:

Title (English): ${finalEnglishTitle}
Description (English): ${finalEnglishDescription}
Title (Arabic): ${finalArabicTitle || 'N/A'}
Description (Arabic): ${finalArabicDescription || 'N/A'}

Generate tags that would help users find this product when searching. Provide both English tags and their Arabic translations.`
            }
        ];

        const tagResponse = await openai.responses.parse({
            model: "gpt-5-nano",
            input: tagMessages,
            text: {
                format: zodTextFormat(TagGenerationSchema, "tags")
            }
        });

        const parsedTags = tagResponse.output_parsed;

        if (!parsedTags || !parsedTags.tags || !parsedTags.ar_tags) {
            throw new Error('Invalid tag response structure from OpenAI');
        }

        console.log(`✅ Generated ${parsedTags.tags.length} English tags, ${parsedTags.ar_tags.length} Arabic tags and embedding for product${productId ? ` (ID: ${productId})` : ''}`);

        let updatedProductId: string | undefined;
        let productStatusAfterUpdate: string | undefined;

        console.log('🤖 Processing product', {
            productId,
            databaseUrl: process.env.DATABASE_URL,
        });

        if (productId && process.env.DATABASE_URL) {
            try {
                const updateResult = await pool.query(
                    `
                    UPDATE products
                    SET tags = $2,
                        ar_tags = $3,
                        embedding = $4::vector,
                        status = 'active',
                        title = $5,
                        ar_title = $6,
                        description = $7,
                        ar_description = $8,
                        updated_at = NOW()
                    WHERE id = $1
                    RETURNING id, status
                    `,
                    [
                        productId,
                        parsedTags.tags,
                        parsedTags.ar_tags,
                        JSON.stringify(embedding),
                        finalEnglishTitle,
                        finalArabicTitle,
                        finalEnglishDescription,
                        finalArabicDescription,
                    ]
                );

                if (updateResult.rowCount === 0) {
                    console.warn(`⚠️ Failed to update product ${productId} with AI data - product not found.`);
                } else {
                    updatedProductId = updateResult.rows[0].id;
                    productStatusAfterUpdate = updateResult.rows[0].status;
                    console.log(`✅ Product ${productId} updated with AI data and activated.`);
                }
            } catch (dbError) {
                console.error(`❌ Database update failed for product ${productId}:`, dbError);
            }
        } else if (productId && !process.env.DATABASE_URL) {
            console.warn('⚠️ DATABASE_URL not configured - skipping automatic product update.');
        }

        res.json({
            success: true,
            embedding: embedding,
            tags: parsedTags.tags,
            ar_tags: parsedTags.ar_tags,
            updatedProductId,
            productStatusAfterUpdate,
            translations: {
                title: finalEnglishTitle,
                ar_title: finalArabicTitle,
                description: finalEnglishDescription,
                ar_description: finalArabicDescription,
            },
            stats: {
                embedding_dimension: embedding.length,
                tags_count: parsedTags.tags.length,
                ar_tags_count: parsedTags.ar_tags.length
            }
        });

    } catch (error) {
        console.error('Product AI processing error:', error);
        res.status(500).json({
            error: 'AI processing failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Fast endpoint to generate embeddings only (for search queries)
router.post('/generate-embedding', async (req: Request, res: Response) => {
    try {
        const { text } = req.body;

        if (!text || typeof text !== 'string') {
            res.status(400).json({
                error: 'Text is required and must be a string'
            });
            return;
        }

        if (!process.env.OPENAI_API_KEY) {
            res.status(500).json({
                error: 'OpenAI API key not configured'
            });
            return;
        }

        console.log(`🔍 Generating embedding for search query: "${text}"`);

        // Generate embedding only (no tags)
        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
            dimensions: 384,
        });

        const embedding = embeddingResponse.data[0].embedding;

        console.log(`✅ Generated embedding (${embedding.length} dimensions)`);

        res.json({
            success: true,
            embedding: embedding,
            stats: {
                embedding_dimension: embedding.length
            }
        });

    } catch (error) {
        console.error('Embedding generation error:', error);
        res.status(500).json({
            error: 'Embedding generation failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Endpoint to get AI processing status
router.get('/status', (req: Request, res: Response) => {
    res.json({
        status: 'OK',
        openaiConfigured: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString()
    });
});

export default router;
