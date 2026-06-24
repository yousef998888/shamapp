import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAuthUsers() {
  console.log('🔐 Creating auth users via SQL script...');
  
  try {
    // Read the SQL script
    const sqlScript = fs.readFileSync(path.join(process.cwd(), 'create-auth-users.sql'), 'utf8');
    
    // Execute the SQL script using the RPC function
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlScript
    });
    
    if (error) {
      console.error('❌ Error executing auth users SQL script:', error);
      console.log('⚠️ Trying alternative approach...');
      
      // Try to insert auth users directly
      const authUsers = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'john.doe@example.com',
          encrypted_password: '$2a$10$dummy.hash.for.seed.data',
          email_confirmed_at: new Date().toISOString(),
          created_at: '2023-01-15 10:00:00',
          updated_at: new Date().toISOString(),
          raw_app_meta_data: '{"provider": "email", "providers": ["email"]}',
          raw_user_meta_data: '{}',
          is_super_admin: false,
          confirmation_token: '',
          email_change: '',
          email_change_token_new: '',
          recovery_token: ''
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          email: 'sarah.smith@example.com',
          encrypted_password: '$2a$10$dummy.hash.for.seed.data',
          email_confirmed_at: new Date().toISOString(),
          created_at: '2023-02-20 14:30:00',
          updated_at: new Date().toISOString(),
          raw_app_meta_data: '{"provider": "email", "providers": ["email"]}',
          raw_user_meta_data: '{}',
          is_super_admin: false,
          confirmation_token: '',
          email_change: '',
          email_change_token_new: '',
          recovery_token: ''
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          email: 'mike.johnson@example.com',
          encrypted_password: '$2a$10$dummy.hash.for.seed.data',
          email_confirmed_at: new Date().toISOString(),
          created_at: '2023-03-10 09:15:00',
          updated_at: new Date().toISOString(),
          raw_app_meta_data: '{"provider": "email", "providers": ["email"]}',
          raw_user_meta_data: '{}',
          is_super_admin: false,
          confirmation_token: '',
          email_change: '',
          email_change_token_new: '',
          recovery_token: ''
        },
        {
          id: '44444444-4444-4444-4444-444444444444',
          email: 'emma.wilson@example.com',
          encrypted_password: '$2a$10$dummy.hash.for.seed.data',
          email_confirmed_at: new Date().toISOString(),
          created_at: '2023-04-05 16:45:00',
          updated_at: new Date().toISOString(),
          raw_app_meta_data: '{"provider": "email", "providers": ["email"]}',
          raw_user_meta_data: '{}',
          is_super_admin: false,
          confirmation_token: '',
          email_change: '',
          email_change_token_new: '',
          recovery_token: ''
        },
        {
          id: '55555555-5555-5555-5555-555555555555',
          email: 'david.brown@example.com',
          encrypted_password: '$2a$10$dummy.hash.for.seed.data',
          email_confirmed_at: new Date().toISOString(),
          created_at: '2023-05-12 11:20:00',
          updated_at: new Date().toISOString(),
          raw_app_meta_data: '{"provider": "email", "providers": ["email"]}',
          raw_user_meta_data: '{}',
          is_super_admin: false,
          confirmation_token: '',
          email_change: '',
          email_change_token_new: '',
          recovery_token: ''
        }
      ];

      // Try to insert each auth user
      for (const user of authUsers) {
        try {
          const { error: insertError } = await supabase
            .from('auth.users')
            .insert(user)
            .select();
          
          if (insertError) {
            console.log(`⚠️ Failed to create auth user ${user.email}: ${insertError.message}`);
          } else {
            console.log(`✅ Created auth user: ${user.email}`);
          }
        } catch (err) {
          console.log(`⚠️ Error creating auth user ${user.email}: ${err.message}`);
        }
      }
    } else {
      console.log('✅ Auth users created successfully via SQL script');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error creating auth users:', error.message);
    console.log('⚠️ Continuing without auth users - you may need to create them manually');
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Starting auth users creation...\n');
    await createAuthUsers();
    console.log('\n🎉 Auth users creation completed!');
  } catch (error) {
    console.error('\n❌ Auth users creation failed:', error);
    process.exit(1);
  }
}

// Run the script
console.log('Script starting...');
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});

export { createAuthUsers };
