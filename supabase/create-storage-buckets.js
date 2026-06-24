import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Define storage buckets to create
const STORAGE_BUCKETS = [
  {
    id: 'product-images',
    name: 'product-images',
    public: true,
    fileSizeLimit: 5242880, // 5MB in bytes
    allowedMimeTypes: []
  },
  {
    id: 'payment-receipts',
    name: 'payment-receipts',
    public: false,
    fileSizeLimit: 5242880, // 5MB in bytes
    allowedMimeTypes: []
  },
  {
    id: 'profile-images',
    name: 'profile-images',
    public: true,
    fileSizeLimit: 2097152, // 2MB in bytes
    allowedMimeTypes: []
  },
  {
    id: 'verification-documents',
    name: 'verification-documents',
    public: false,
    fileSizeLimit: 10485760, // 10MB in bytes
    allowedMimeTypes: []
  },
  {
    id: 'shipping-receipts',
    name: 'shipping-receipts',
    public: false,
    fileSizeLimit: 5242880, // 5MB in bytes
    allowedMimeTypes: []
  }
];

/**
 * Check if a bucket exists by listing all buckets via REST API
 */
async function bucketExists(bucketName) {
  try {
    // Try to list buckets using REST API
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    });

    if (response.ok) {
      const buckets = await response.json();
      return buckets?.some(bucket => bucket.name === bucketName || bucket.id === bucketName) || false;
    }

    // Fallback: try to access the bucket directly
    try {
      const { error } = await supabase.storage.from(bucketName).list('', { limit: 1 });
      // If we can list from the bucket, it exists (error means it doesn't exist)
      return !error;
    } catch {
      return false;
    }
  } catch (err) {
    // Final fallback: assume it doesn't exist and let creation handle it
    return false;
  }
}

/**
 * Create a storage bucket
 */
async function createBucket(bucketConfig) {
  try {
    // Check if bucket already exists
    const exists = await bucketExists(bucketConfig.name);
    
    if (exists) {
      console.log(`✅ Bucket "${bucketConfig.name}" already exists, skipping...`);
      return { success: true, created: false, exists: true };
    }

    // Create the bucket using REST API (Supabase JS client doesn't have direct bucket creation)
    // Use the Storage Management API endpoint
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        id: bucketConfig.id,
        name: bucketConfig.name,
        public: bucketConfig.public,
        file_size_limit: bucketConfig.fileSizeLimit,
        allowed_mime_types: bucketConfig.allowedMimeTypes.length > 0 ? bucketConfig.allowedMimeTypes : null
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      // If bucket already exists (409), that's fine
      if (response.status === 409 || errorText.includes('already exists')) {
        console.log(`✅ Bucket "${bucketConfig.name}" already exists, skipping...`);
        return { success: true, created: false, exists: true };
      }
      throw new Error(`Failed to create bucket: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Created bucket: ${bucketConfig.name}`);
    return { success: true, created: true, exists: false, data };
    
  } catch (error) {
    // If it's an "already exists" error, that's okay
    if (error.message.includes('already exists') || error.message.includes('409')) {
      console.log(`✅ Bucket "${bucketConfig.name}" already exists, skipping...`);
      return { success: true, created: false, exists: true };
    }
    
    console.error(`❌ Error creating bucket "${bucketConfig.name}":`, error.message);
    return { success: false, created: false, exists: false, error: error.message };
  }
}

/**
 * Create storage policies for a bucket
 */
async function createStoragePolicies(bucketName, isPublic) {
  // Note: Storage policies are typically managed via SQL migrations
  // But we can provide helpful output here
  console.log(`📋 Storage policies for "${bucketName}" should be configured via SQL migrations`);
  
  // For public buckets, we typically want read access for everyone
  // For private buckets, we want authenticated users to read/write their own files
  
  if (isPublic) {
    console.log(`   → Public bucket: Allow public read access`);
  } else {
    console.log(`   → Private bucket: Restrict to authenticated users`);
  }
}

/**
 * Main function to create all storage buckets
 */
async function createStorageBuckets() {
  console.log('🪣 Creating storage buckets...\n');
  
  let createdCount = 0;
  let existingCount = 0;
  let failedCount = 0;

  for (const bucketConfig of STORAGE_BUCKETS) {
    console.log(`Creating bucket: ${bucketConfig.name} (${bucketConfig.public ? 'public' : 'private'})...`);
    
    const result = await createBucket(bucketConfig);
    
    if (result.success) {
      if (result.created) {
        createdCount++;
        await createStoragePolicies(bucketConfig.name, bucketConfig.public);
      } else if (result.exists) {
        existingCount++;
      }
    } else {
      failedCount++;
    }
    
    console.log(''); // Empty line for readability
  }

  console.log('\n📊 Storage Buckets Summary:');
  console.log(`   ✅ Created: ${createdCount}`);
  console.log(`   ℹ️  Already existed: ${existingCount}`);
  if (failedCount > 0) {
    console.log(`   ❌ Failed: ${failedCount}`);
  }
  
  if (failedCount === 0) {
    console.log('\n🎉 All storage buckets are ready!');
  } else {
    console.log('\n⚠️  Some buckets failed to create. Check the errors above.');
  }

  return { createdCount, existingCount, failedCount };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('create-storage-buckets.js')) {
  createStorageBuckets()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { createStorageBuckets, STORAGE_BUCKETS };

