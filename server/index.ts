// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import translationRoutes from './routes/translations.js';
import translationV2Routes from './routes/translations-v2.js';
import bulkTranslationRoutes from './routes/bulk-translations.js';
import shippingRoutes from './routes/shipping.js';
import productAIRoutes from './routes/product-ai.js';
import recommendationRoutes from './routes/recommendations.js';
import orderRoutes from './routes/orders.js';
import settingsRoutes from './routes/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Application = express();
const PORT = process.env.PORT || 6666;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// Routes
app.use('/api/translations', translationRoutes);
app.use('/api/translations-v2', translationV2Routes);
app.use('/api/bulk-translations', bulkTranslationRoutes);
app.use('/api/v1/shipping', shippingRoutes);
app.use('/api/product-ai', productAIRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
// app.use((error, req, res, next) => {
//   console.error('Global error handler:', error);
  
//   if (error.code === 'LIMIT_FILE_SIZE') {
//     return res.status(400).json({ error: 'File too large' });
//   }
  
//   if (error.code === 'LIMIT_UNEXPECTED_FILE') {
//     return res.status(400).json({ error: 'Too many files' });
//   }
  
//   res.status(500).json({ 
//     error: 'Internal server error',
//     message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
//   });
// });

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔤 Translation API available at: /api/translations`);
  console.log(`🚚 Shipping API available at: /api/v1/shipping`);
  console.log(`🤖 Product AI API available at: /api/product-ai`);
  console.log(`🎯 Recommendations API available at: /api/recommendations`);
  console.log(`📦 Orders API available at: /api/orders`);
  console.log(`⚙️  Settings API available at: /api/settings`);
  console.log(`📦 Database URL: ${process.env.DATABASE_URL}`);
});

export default app;