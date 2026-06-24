#!/bin/bash

# Script to create auth users using Supabase CLI
# This script should be run from the supabase directory

echo "🔐 Creating auth users via Supabase CLI..."

# Check if we're in the right directory
if [ ! -f "create-auth-users.sql" ]; then
    echo "❌ Error: create-auth-users.sql not found. Please run this script from the supabase directory."
    exit 1
fi

# Run the SQL script using Supabase CLI
echo "📝 Executing create-auth-users.sql..."
supabase db reset --linked

# Alternative: If the above doesn't work, try running the SQL directly
echo "📝 Trying direct SQL execution..."
supabase db push

echo "✅ Auth users creation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Run 'npm run seed' to create the rest of the data"
echo "2. Or run 'npm run seed:auth' to create auth users via JavaScript"
echo "" 