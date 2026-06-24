# Syria Marketplace Backend

A Node.js/Express backend server for the Syria Marketplace application.

## Features

- **Authentication**: JWT-based user registration and login
- **Products**: CRUD operations with image upload support
- **Categories**: Product categorization system
- **Orders**: Order management and tracking
- **File Upload**: Image upload with validation
- **Security**: Rate limiting, CORS, helmet protection
- **Database**: PostgreSQL with connection pooling

## Setup

1. **Install Dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Database Setup**
   - Install PostgreSQL locally
   - Create a database named `syria_marketplace`
   - Run the schema file:
     ```bash
     psql -d syria_marketplace -f database/schema.sql
     ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/syria_marketplace
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   UPLOAD_DIR=uploads
   MAX_FILE_SIZE=5242880
   ```

4. **Start the Server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product (auth required)
- `PUT /api/products/:id` - Update product (auth required)
- `DELETE /api/products/:id` - Delete product (auth required)

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:slug` - Get single category

### Orders
- `GET /api/orders` - Get user's orders (auth required)
- `POST /api/orders` - Create new order (auth required)
- `PUT /api/orders/:id/status` - Update order status (auth required)

## Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User accounts and profiles
- `categories` - Product categories
- `products` - Product listings
- `product_images` - Product photos
- `product_attributes` - Flexible product properties
- `orders` - Purchase orders
- `favorites` - User favorites

## File Upload

Images are uploaded to the `uploads/products/` directory and served statically at `/uploads/products/filename`.

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Helmet security headers
- Input validation with express-validator
- File upload restrictions

## Development

The server includes:
- Hot reload with nodemon
- Request logging with morgan
- Compression middleware
- Error handling
- Health check endpoint at `/health`

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up reverse proxy with nginx
4. Configure SSL certificates
5. Set up database backups
6. Monitor logs and performance