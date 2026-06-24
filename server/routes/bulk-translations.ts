import express, { Request, Response } from 'express';
import OpenAI from 'openai';
import { zodResponseFormat, zodTextFormat } from 'openai/helpers/zod';
import { body, validationResult } from 'express-validator';
import { z } from 'zod';
import dotenv from 'dotenv';

const router = express.Router();

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

// Type definitions
interface TranslationItem {
    id: string;
    name: string;
    description?: string;
    type: 'category' | 'attribute' | 'term';
}

interface TranslationResponse {
    id: string;
    name: string;
    description?: string;
    type: 'category' | 'attribute' | 'term';
    arabicName: string | null;
    arabicDescription?: string | null;
    translated: boolean;
}

// Zod schema for structured translation response
const BulkTranslationSchema = z.object({
    translations: z.array(z.object({
        id: z.string(),
        arabicName: z.string(),
        arabicDescription: z.string().optional()
    }))
});

// Validation middleware
const validateBulkTranslationRequest = [
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.id').isString().notEmpty().withMessage('Each item must have an id'),
    body('items.*.name').isString().notEmpty().withMessage('Each item must have a name'),
    body('items.*.type').isIn(['category', 'attribute', 'term']).withMessage('Each item must have a valid type'),
];

// Endpoint to translate items to Arabic
router.post('/translate-items', validateBulkTranslationRequest, async (req: Request, res: Response) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
            return;
        }

        const { items }: { items: TranslationItem[] } = req.body;

        if (!process.env.OPENAI_API_KEY) {
            res.status(500).json({
                error: 'OpenAI API key not configured'
            });
            return;
        }

        console.log(`🔄 Translating ${items.length} items...`);

        // Prepare the messages for the API
        const messages = [
            {
                role: "system" as const,
                content: "You are a professional translator specializing in e-commerce product categories, attributes, and terms. Translate names and descriptions to Arabic while maintaining their commercial context and meaning. Provide accurate and contextually appropriate Arabic translations."
            },
            {
                role: "user" as const,
                content: `Translate the following items to Arabic. Consider the commercial context and provide natural Arabic translations.

Items to translate:
${items.map((item: TranslationItem) => {
    const description = item.description ? ` (${item.description})` : '';
    return `${item.id}: ${item.name}${description} [${item.type}]`;
}).join('\n')}`
            }
        ];

        const response = await openai.responses.parse({
            model: "gpt-4o-mini",
            input: messages,
            temperature: 0.2,
            text: {
                format: zodTextFormat(BulkTranslationSchema, "translation")
            }
        });

        // Extract the parsed translations
        const parsedData = response.output_parsed;

        if (!parsedData || !parsedData.translations) {
            throw new Error('Invalid response structure from OpenAI');
        }

        // Create a map for easy lookup
        const translationMap: Record<string, { arabicName: string; arabicDescription?: string }> = {};
        parsedData.translations.forEach((trans: { id: string; arabicName: string; arabicDescription?: string }) => {
            if (trans.id && trans.arabicName) {
                translationMap[trans.id] = {
                    arabicName: trans.arabicName,
                    arabicDescription: trans.arabicDescription
                };
            }
        });

        // Match translations back to original items
        const result: TranslationResponse[] = items.map((item: TranslationItem) => {
            const translation = translationMap[item.id];
            return {
                ...item,
                arabicName: translation?.arabicName || null,
                arabicDescription: translation?.arabicDescription || null,
                translated: !!translation?.arabicName
            };
        });

        console.log(`✅ Successfully translated ${result.filter((r: TranslationResponse) => r.translated).length}/${items.length} items`);

        res.json({
            success: true,
            translations: result,
            stats: {
                total: items.length,
                translated: result.filter((r: TranslationResponse) => r.translated).length,
                failed: result.filter((r: TranslationResponse) => !r.translated).length
            }
        });

    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({
            error: 'Translation failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Endpoint to get translation status
router.get('/status', (req: Request, res: Response) => {
    res.json({
        status: 'OK',
        openaiConfigured: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString()
    });
});

export default router; 