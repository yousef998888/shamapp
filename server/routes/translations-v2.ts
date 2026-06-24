import express from 'express';
import OpenAI from 'openai';
import { zodResponseFormat, zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema for translation request
const TranslationRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  source_language: z.string().optional().default('auto'),
  target_language: z.enum(['en', 'ar']).default('en'),
});

// Schema for translation response using OpenAI responses format
const TranslationResponseSchema = z.object({
  success: z.boolean(),
  original_text: z.string(),
  translated_text: z.string(),
  source_language: z.string(),
  target_language: z.string(),
  confidence: z.number().min(0).max(1).optional(),
});

// Schema for batch translation request
const BatchTranslationRequestSchema = z.object({
  texts: z.array(z.string()).min(1, 'At least one text is required'),
  source_language: z.string().optional().default('auto'),
  target_language: z.enum(['en', 'ar']).default('en'),
});

// Schema for batch translation response
const BatchTranslationResponseSchema = z.object({
  success: z.boolean(),
  translations: z.array(z.object({
    original_text: z.string(),
    translated_text: z.string(),
    source_language: z.string(),
    target_language: z.string(),
    confidence: z.number().min(0).max(1).optional(),
  })),
});

/**
 * POST /api/translate
 * Translate text from one language to another
 */
router.post('/translate', async (req, res) => {
  try {
    // Validate request body
    const validatedData = TranslationRequestSchema.parse(req.body);
    const { text, source_language, target_language } = validatedData;

    console.log(`🔄 Translating: "${text}" from ${source_language} to ${target_language}`);

    // Prepare the prompt based on target language
    const systemPrompt = target_language === 'ar' 
      ? `You are a professional translator. Translate the given text to Arabic. 
         - Maintain the original meaning and context
         - Use natural, fluent Arabic
         - For product names, use common Arabic terms
         - For technical terms, use widely understood Arabic equivalents
         - Return only the translated text, no explanations`
      : `You are a professional translator. Translate the given text to English.
         - Maintain the original meaning and context
         - Use natural, fluent English
         - For product names, use common English terms
         - For technical terms, use standard English equivalents
         - Return only the translated text, no explanations`;

    const userPrompt = `Translate this text to ${target_language === 'ar' ? 'Arabic' : 'English'}: "${text}"`;

    // Call OpenAI API using responses format
    const completion = await openai.responses.parse({
      model: 'gpt-5-nano',
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      text: {
        format: zodTextFormat(TranslationResponseSchema, "translation")
      }
    });

    const parsedResponse = completion.output_parsed;
    
    if (!parsedResponse) {
      throw new Error('No translation received from OpenAI');
    }

    // Detect source language (simple heuristic)
    const detectedSourceLang = /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en';

    const response = TranslationResponseSchema.parse({
      success: true,
      original_text: text,
      translated_text: parsedResponse.translated_text,
      source_language: detectedSourceLang,
      target_language: target_language,
      confidence: parsedResponse.confidence || 0.95,
    });

    console.log(`✅ Translation successful: "${text}" → "${parsedResponse.translated_text}"`);
    res.json(response);

  } catch (error) {
    console.error('❌ Translation error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Translation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/translate/batch
 * Translate multiple texts in a single request
 */
router.post('/translate/batch', async (req, res) => {
  try {
    // Validate request body
    const validatedData = BatchTranslationRequestSchema.parse(req.body);
    const { texts, source_language, target_language } = validatedData;

    console.log(`🔄 Batch translating ${texts.length} texts to ${target_language}`);

    // Prepare the prompt for batch translation
    const systemPrompt = target_language === 'ar' 
      ? `You are a professional translator. Translate the given texts to Arabic.
         - Maintain the original meaning and context for each text
         - Use natural, fluent Arabic
         - For product names, use common Arabic terms
         - Return the translations in the same order as the input texts
         - Format: Return each translation on a new line, numbered (1. translation, 2. translation, etc.)`
      : `You are a professional translator. Translate the given texts to English.
         - Maintain the original meaning and context for each text
         - Use natural, fluent English
         - For product names, use common English terms
         - Return the translations in the same order as the input texts
         - Format: Return each translation on a new line, numbered (1. translation, 2. translation, etc.)`;

    const userPrompt = `Translate these ${texts.length} texts to ${target_language === 'ar' ? 'Arabic' : 'English'}:\n\n${texts.map((text, index) => `${index + 1}. "${text}"`).join('\n')}`;

    // Call OpenAI API using responses format
    const completion = await openai.responses.parse({
      model: 'gpt-5-nano',
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      text: {
        format: zodTextFormat(BatchTranslationResponseSchema, "batch_translation")
      }
    });

    const parsedResponse = completion.output_parsed;
    
    if (!parsedResponse || !parsedResponse.translations) {
      throw new Error('No batch translation received from OpenAI');
    }

    // Create response with detected source languages
    const translations = parsedResponse.translations.map((translation: any, index: number) => {
      const originalText = texts[index];
      const detectedSourceLang = /[\u0600-\u06FF]/.test(originalText) ? 'ar' : 'en';
      return {
        original_text: originalText,
        translated_text: translation.translated_text,
        source_language: detectedSourceLang,
        target_language: target_language,
        confidence: translation.confidence || 0.95,
      };
    });

    const response = BatchTranslationResponseSchema.parse({
      success: true,
      translations: translations,
    });

    console.log(`✅ Batch translation successful: ${texts.length} texts translated`);
    res.json(response);

  } catch (error) {
    console.error('❌ Batch translation error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Batch translation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/translate/status
 * Check translation service status
 */
router.get('/translate/status', async (req, res) => {
  try {
    // Test with a simple translation using responses API
    const testCompletion = await openai.responses.parse({
      model: 'gpt-5-nano',
      input: [
        { role: 'user', content: 'Translate "hello" to Arabic' }
      ],
      text: {
        format: zodTextFormat(z.object({ translation: z.string() }), "test_translation")
      }
    });

    const testResult = testCompletion.output_parsed?.translation || 'Test failed';
    
    res.json({
      success: true,
      service: 'translation',
      openai_configured: !!process.env.OPENAI_API_KEY,
      test_translation: testResult,
      status: 'operational'
    });

  } catch (error) {
    console.error('❌ Translation status check failed:', error);
    res.status(500).json({
      success: false,
      service: 'translation',
      openai_configured: !!process.env.OPENAI_API_KEY,
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
