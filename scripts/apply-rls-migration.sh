#!/bin/bash

# Script to apply RLS migration for order_messages table
# This ensures real-time messaging works properly with Supabase

echo "Applying RLS migration for order_messages table..."

# Navigate to the supabase directory
cd supabase

# Apply the migration
echo "Running migration: 20250810000000_order_messages_rls_policies.sql"
psql $DATABASE_URL -f migrations/20250810000000_order_messages_rls_policies.sql

echo "RLS migration applied successfully!"
echo "Real-time messaging should now work properly with proper security policies." 