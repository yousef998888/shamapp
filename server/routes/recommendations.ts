import express, { Request, Response } from 'express';
import OpenAI from 'openai';
import { body, validationResult } from 'express-validator';
import dotenv from 'dotenv';
import pool from '../lib/db.js';

const router = express.Router();

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

// Validation middleware for search recommendations
const validateSearchRecommendationsRequest = [
    body('searchQueries').isArray().withMessage('Search queries must be an array'),
    body('searchQueries.*').isString().withMessage('Each search query must be a string'),
    body('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
];

// Endpoint to get AI-powered search-based recommendations
router.post('/search-based', validateSearchRecommendationsRequest, async (req: Request, res: Response) => {
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

        const { searchQueries, limit = 4 } = req.body;

        if (!process.env.OPENAI_API_KEY) {
            res.status(500).json({
                error: 'OpenAI API key not configured'
            });
            return;
        }

        // Use the most recent search query (first in array due to DESC ordering)
        const searchQuery = searchQueries[0];
        console.log(`🔍 [SearchRecommendations] Processing query: "${searchQuery}"`);

        // Generate embedding for the search query
        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: searchQuery,
            dimensions: 384,
        });

        const queryEmbedding = embeddingResponse.data[0].embedding;
        console.log(`✅ [SearchRecommendations] Generated embedding, dimension: ${queryEmbedding.length}`);

        // Use semantic search with embeddings using PostgreSQL
        const query = `
            SELECT 
                p.id,
                p.title,
                p.description,
                p.price,
                p.currency,
                p.category_id,
                p.view_count,
                p.created_at,
                c.name as category_name,
                c.slug as category_slug,
                up.full_name as seller_name,
                up.username as seller_username,
                up.avatar_url as seller_avatar_url,
                pi.image_url,
                1 - (p.embedding <=> $1::vector) as similarity
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN user_profiles up ON p.seller_id = up.id
            LEFT JOIN LATERAL (
                SELECT image_url 
                FROM product_images pi2 
                WHERE pi2.product_id = p.id 
                ORDER BY pi2.sort_order 
                LIMIT 1
            ) pi ON true
            WHERE p.status = 'active'
                AND p.embedding IS NOT NULL
            ORDER BY p.embedding <=> $1::vector
            LIMIT $2
        `;

        const result = await pool.query(query, [JSON.stringify(queryEmbedding), limit]);
        const products = result.rows;

        console.log(`✅ [SearchRecommendations] Found ${products?.length || 0} products`);

        // Transform the results to match the expected format
        const transformedProducts = products?.map((product: any) => ({
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            currency: product.currency,
            category_id: product.category_id,
            view_count: product.view_count,
            created_at: product.created_at,
            category: {
                id: product.category_id,
                name: product.category_name,
                slug: product.category_slug
            },
            images: product.image_url ? [{
                id: `${product.id}-img`,
                product_id: product.id,
                image_url: product.image_url,
                sort_order: 0
            }] : [],
            seller: {
                full_name: product.seller_name,
                username: product.seller_username,
                avatar_url: product.seller_avatar_url
            },
            similarity_score: product.similarity
        })) || [];

        res.json({
            success: true,
            products: transformedProducts,
            query: searchQuery,
            total: transformedProducts.length,
            stats: {
                embedding_dimension: queryEmbedding.length,
                similarity_threshold: 0.5
            }
        });

    } catch (error) {
        console.error('❌ [SearchRecommendations] Error:', error);
        res.status(500).json({
            error: 'Search recommendations failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Endpoint to get recommendations status
router.get('/status', (req: Request, res: Response) => {
    res.json({
        status: 'OK',
        openaiConfigured: !!process.env.OPENAI_API_KEY,
        databaseConfigured: !!process.env.DATABASE_URL,
        timestamp: new Date().toISOString()
    });
});

export default router;
