# Sham Shop - E-commerce Platform

A modern e-commerce platform built with React, TypeScript, and Supabase.

## Features

### Dynamic Delivery Estimation

The checkout process now includes intelligent delivery cost estimation based on user authentication status and location:

#### For Logged-in Users
- **Address Management**: Uses saved user address from profile or allows editing
- **API Integration**: Automatically estimates delivery costs using the delivery service API
- **Real-time Updates**: Recalculates costs when address changes

#### For Guest Users  
- **Geolocation Services**: Automatically detects user location with browser geolocation
- **Manual Address Entry**: Fallback option for manual address input
- **Location Updates**: Allows users to update location for accurate pricing

#### Key Components

- **AddressSelector**: Handles both authenticated and guest user address management
- **useDeliveryEstimation**: Custom hook for API-based delivery cost calculation
- **Dynamic Pricing**: Real-time cost updates for both pickup and home delivery options

#### Environment Variables

Add these to your `.env` file:

```bash
# Delivery API Configuration
VITE_DELIVARY_API_URL=your-delivery-api-url
VITE_DELIVARY_API_TOKEN=your-delivery-api-token

# Geocoding API (for reverse geocoding)
VITE_OPENCAGE_API_KEY=your-opencage-api-key
```

#### Technical Implementation

1. **Location Detection**: Uses browser geolocation API with OpenCage reverse geocoding
2. **Delivery Estimation**: Integrates with delivery service API for real-time pricing
3. **Fallback System**: Provides default pricing when API is unavailable
4. **Error Handling**: Graceful degradation with user-friendly error messages

## 🚀 Environment Setup for New Developers

This guide will help you set up the Supabase backend and the front-end applications.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (install with `npm install -g supabase`)
- [Git](https://git-scm.com/)

---

### Part 1: Setting Up the Supabase Backend (Local Development)

1.  **Start Supabase Locally**
    ```bash
    # In your project root directory
    supabase start
    ```
    This will launch Supabase locally with Postgres, Auth, Storage, and Studio. Default ports:
    - API: `http://localhost:54321`
    - Studio: `http://localhost:54323`
    - DB: `postgresql://postgres:postgres@localhost:54322/postgres`


2.  **Get Your Supabase Keys**
    After running `supabase start`, the CLI will print your `anon key` and `service_role key` in the terminal. You can also find them in the generated `.env` file in the `supabase/` directory.

---

### Part 2: Setting Up the Marketplace Applications

1.  **Clone This Repository**
    ```bash
    git clone <your-repo-url>
    cd project-3
    ```

2.  **Install Dependencies**
    ```bash
    npm run install 
    ```

3.  **Configure Application Environment Variables**
    You need to create `.env` files for both the `ui` and `admin` apps and fill them with the credentials from your Supabase instance.
    - Copy the `anon key` from your Supabase CLI output or `.env` file.
    - Your Supabase URL will be `http://localhost:54321`.

    Create `ui/.env`:
    ```
    VITE_SUPABASE_URL=http://localhost:54321
    VITE_SUPABASE_ANON_KEY=<your-anon-key>
    ```

    Create `admin/.env`:
    ```
    VITE_SUPABASE_URL=http://localhost:54321
    VITE_SUPABASE_ANON_KEY=<your-anon-key>
    ```

4.  **Start the Development Servers**
    Run each command in a separate terminal.
    ```bash
    # In terminal 1
    npm run dev:ui

    # In terminal 2
    npm run dev:server
    ```

5.  **Database Reset & Seed**    

   When starting fresh, reset the database and seed with development data:

   ```bash
   # From project root - Reset the database
   supabase db reset
   
   # Seed with development data
   cd supabase
   npm i
   npm run seed:dev
   ```

   This will:
   - Reset the database to a clean state
   - **Automatically create all required storage buckets**
   - Create auth users with hardcoded UUIDs
   - Seed users, products, categories, and location data
   - Set up the complete development environment

   The following storage buckets are automatically created:
   - `product-images` (public, 5MB limit)
   - `payment-receipts` (private, 5MB limit)
   - `profile-images` (public, 2MB limit)
   - `verification-documents` (private, 10MB limit)
   - `shipping-receipts` (private, 5MB limit)

   Important
   - It will not create RLS for the storage buckets for this please copy and paste sql from storage-rls-all-buckets.sql into your supabase sql editor

   To manually create buckets separately, run:
   ```bash
   cd supabase
   npm run create-buckets
   ```

   







## 🎉 You're All Set!

- **Marketplace UI**: `http://localhost:5173`
- **Admin Dashboard**: `http://localhost:5174`
- **Supabase Studio**: `http://localhost:54323`

---

## 🗄️ Database Migrations Workflow

Schema changes are managed via SQL files in the `migrations` directory at the project root.

1.  **Make schema changes** in Supabase Studio (`http://localhost:54323`).
2.  **Create a new, empty migration file.**
    ```bash
    # Replace "your_change_description" with a short, descriptive name
    supabase db diff --use-migra your_change_description -f your_change_description
     
    ```
---

## 🚀 Production Deployment
TODO:
When deploying to production, copy your migration files and the `apply-prod-migrations.sh` script to your server. Run the script to apply any new migrations to your production Supabase instance. The script is idempotent and safe to run multiple times.

--- 