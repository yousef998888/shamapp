require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (NOT with service role - using anon key like frontend)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  console.error('💡 Make sure you have a .env file with these variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAuthUsersViaSignUp() {
  console.log('🔐 Creating auth users via signUp (like registration)...');
  console.log('📝 Password for all users: 12345678\n');
  
  try {
    // Define users to create using signUp method
    const authUsers = [
      {
        email: 'wisam@admin.com',
        password: '12345678',
        fullName: 'Wisam'
      },
      {
        email: 'anhar@admin.com',
        password: '12345678',
        fullName: 'Anhar'
      },
      {
        email: 'moatasem@admin.com',
        password: '12345678',
        fullName: 'Moatasem'
      },
      {
        email: 'yousuf@admin.com',
        password: '12345678',
        fullName: 'yousuf'
      },
      {
        email: 'test@admin.com',
        password: '12345678',
        fullName: 'Test'
      }
    ];

    let successCount = 0;
    let failCount = 0;

    console.log('➕ Signing up users (like registration)...\n');
    
    // Create users using signUp (same as frontend registration)
    for (const userData of authUsers) {
      try {
        // Step 1: Sign up the user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              full_name: userData.fullName,
            },
            emailRedirectTo: `${supabaseUrl}/auth/callback`
          }
        });
        
        if (signUpError) {
          console.log(`❌ Failed to sign up ${userData.email}: ${signUpError.message}`);
          failCount++;
          continue;
        }

        if (authData.user) {
          // Step 2: Create user profile in users table (same as SignUpForm)
          const { error: profileError } = await supabase
            .from('users')
            .insert([
              {
                id: authData.user.id,
                email: userData.email,
                password_hash: '', // Not needed, handled by auth
                full_name: userData.fullName,
                username: userData.email.split('@')[0],
                member_since: new Date().toISOString(),
              },
            ]);

          if (profileError) {
            console.log(`⚠️  Auth created but profile failed for ${userData.email}: ${profileError.message}`);
            failCount++;
          } else {
            console.log(`✅ Created user: ${userData.email} (ID: ${authData.user.id})`);
            successCount++;
          }
        }
      } catch (err) {
        console.log(`❌ Error creating user ${userData.email}: ${err.message}`);
        failCount++;
      }
    }

    console.log(`\n📊 Summary: ${successCount} succeeded, ${failCount} failed`);
    return successCount > 0;
    
  } catch (error) {
    console.error('❌ Error creating auth users:', error.message);
    console.log('⚠️ Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly in .env');
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Starting auth users creation via signUp...\n');
    const result = await createAuthUsersViaSignUp();
    
    if (result) {
      console.log('\n🎉 Auth users creation completed!');
      console.log('\n📋 You can now login with:');
      console.log('   Email: wisam@admin.com (or any other user)');
      console.log('   Password: 12345678');
      console.log('\n⚠️  Note: Email confirmation might be required depending on your Supabase settings');
    } else {
      console.log('\n⚠️ Auth users creation completed with errors');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Auth users creation failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { createAuthUsersViaSignUp };
