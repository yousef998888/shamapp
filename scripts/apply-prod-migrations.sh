#!/bin/bash
#
# Applies new, un-applied migrations to a running self-hosted Supabase instance.
# This script is safe to run multiple times.
#

set -e

# --- Configuration ---
# The name of your Supabase database container as it appears in 'docker ps'
DB_CONTAINER_NAME="supabase-db"

# The directory where your migration files are stored, relative to this script.
MIGRATIONS_DIR="$(dirname "$0")/../migrations"
# --- End Configuration ---


echo "🚀 Applying Production Migrations..."
echo "---------------------------------"

# 1. Find the database container
CONTAINER_ID=$(docker ps -f "name=${DB_CONTAINER_NAME}" --format "{{.ID}}")
if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Database container '${DB_CONTAINER_NAME}' not found. Is your self-hosted Supabase running?"
    exit 1
fi
echo "✅ Found database container: ${DB_CONTAINER_NAME} (${CONTAINER_ID})"


# 2. Ensure the migration tracking table exists
echo "🔍 Ensuring migration tracking table (schema_migrations) exists..."
docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres > /dev/null <<'EOF'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);
EOF
echo "✅ Migration tracking is ready."


# 3. Get the list of new migrations
echo "🔍 Finding new migrations to apply..."
APPLIED_MIGRATIONS=$(docker exec "$CONTAINER_ID" psql -U postgres -d postgres -t -c "SELECT migration_name FROM public.schema_migrations;")
ALL_MIGRATIONS=$(ls -1 "$MIGRATIONS_DIR"/*.sql | xargs -n 1 basename)

# Find migrations that are in ALL_MIGRATIONS but not in APPLIED_MIGRATIONS
NEW_MIGRATIONS=$(comm -23 <(echo "$ALL_MIGRATIONS" | sort) <(echo "$APPLIED_MIGRATIONS" | sort))

if [ -z "$NEW_MIGRATIONS" ]; then
    echo "✅ No new migrations to apply. Database is up to date."
    exit 0
fi

echo "📄 Found new migrations to apply:"
echo "$NEW_MIGRATIONS"
echo ""


# 4. Apply each new migration
for MIGRATION_BASENAME in $NEW_MIGRATIONS; do
    MIGRATION_FILE="${MIGRATIONS_DIR}/${MIGRATION_BASENAME}"
    echo "⏳ Applying ${MIGRATION_BASENAME}..."

    # Apply the migration file and stop on any error
    docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$MIGRATION_FILE"

    # Record the migration as applied
    docker exec -i "$CONTAINER_ID" psql -U postgres -d postgres > /dev/null <<EOF
INSERT INTO public.schema_migrations (migration_name) VALUES ('${MIGRATION_BASENAME}');
EOF

    echo "✅ Successfully applied ${MIGRATION_BASENAME}"
    echo ""
done

echo "🎉 All new migrations applied successfully!" 