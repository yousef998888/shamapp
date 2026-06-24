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
interface CategoryForTranslation {
    translationId: string;
    name: string;
    fullPath: string;
}

interface TranslationResponse {
    translationId: string;
    name: string;
    fullPath: string;
    arabicName: string | null;
    translated: boolean;
}

// Zod schema for structured translation response
const TranslationSchema = z.object({
    translations: z.array(z.object({
        translationId: z.string(),
        arabicName: z.string()
    }))
});


// Validation middleware
const validateTranslationRequest = [
    body('categories').isArray().withMessage('Categories must be an array'),
    body('categories.*.translationId').isString().notEmpty().withMessage('Each category must have a translationId'),
    body('categories.*.name').isString().notEmpty().withMessage('Each category must have a name'),
    body('categories.*.fullPath').isString().notEmpty().withMessage('Each category must have a fullPath'),
];

// Endpoint to translate categories to Arabic
router.post('/translate-categories', validateTranslationRequest, async (req: Request, res: Response) => {
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

        const { categories }: { categories: CategoryForTranslation[] } = req.body;

        if (!process.env.OPENAI_API_KEY) {
            res.status(500).json({
                error: 'OpenAI API key not configured'
            });
            return;
        }

        console.log(`🔄 Translating ${categories.length} categories...`);

        // Prepare the messages for the API
        const messages = [
            {
                role: "system" as const,
                content: "You are a professional translator specializing in e-commerce product categories. Translate category names to Arabic while maintaining their commercial context and meaning. Provide accurate and contextually appropriate Arabic translations."
            },
            {
                role: "user" as const,
                content: `Translate the following product category names to Arabic. Consider the commercial context and provide natural Arabic translations.

Categories to translate:
${categories.map((cat: CategoryForTranslation) => `${cat.translationId}: ${cat.name} (${cat.fullPath})`).join('\n')}`
            }
        ];


        const response = await openai.responses.parse({
            model: "gpt-4.1",
            input: messages,
            temperature: 0.2,
            text: {
                format: zodTextFormat(TranslationSchema, "translation")
            }
        });

        // Extract the parsed translations
        const parsedData = response.output_parsed;

        if (!parsedData || !parsedData.translations) {
            throw new Error('Invalid response structure from OpenAI');
        }

        // Create a map for easy lookup
        const translationMap: Record<string, string> = {};
        parsedData.translations.forEach((trans: { translationId: string; arabicName: string }) => {
            if (trans.translationId && trans.arabicName) {
                translationMap[trans.translationId] = trans.arabicName;
            }
        });

        // Match translations back to original categories
        const result: TranslationResponse[] = categories.map((category: CategoryForTranslation) => ({
            ...category,
            arabicName: translationMap[category.translationId] || null,
            translated: !!translationMap[category.translationId]
        }));

        console.log(`✅ Successfully translated ${result.filter((r: TranslationResponse) => r.translated).length}/${categories.length} categories`);

        res.json({
            success: true,
            translations: result,
            stats: {
                total: categories.length,
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