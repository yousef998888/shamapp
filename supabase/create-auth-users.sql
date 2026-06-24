-- Create auth users for seeding
-- This needs to be run before the JavaScript seed script

-- Insert into auth.users table
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
  (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'john.doe@example.com',
    '$2a$10$dummy.hash.for.seed.data',
    now(),
    '2023-01-15 10:00:00'::timestamp,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    '',
    '',
    '',
    ''
  ),
  (
    '22222222-2222-2222-2222-222222222222'::uuid,
    'sarah.smith@example.com',
    '$2a$10$dummy.hash.for.seed.data',
    now(),
    '2023-02-20 14:30:00'::timestamp,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    '',
    '',
    '',
    ''
  ),
  (
    '33333333-3333-3333-3333-333333333333'::uuid,
    'mike.johnson@example.com',
    '$2a$10$dummy.hash.for.seed.data',
    now(),
    '2023-03-10 09:15:00'::timestamp,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    '',
    '',
    '',
    ''
  ),
  (
    '44444444-4444-4444-4444-444444444444'::uuid,
    'emma.wilson@example.com',
    '$2a$10$dummy.hash.for.seed.data',
    now(),
    '2023-04-05 16:45:00'::timestamp,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    '',
    '',
    '',
    ''
  ),
  (
    '55555555-5555-5555-5555-555555555555'::uuid,
    'david.brown@example.com',
    '$2a$10$dummy.hash.for.seed.data',
    now(),
    '2023-05-12 11:20:00'::timestamp,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO NOTHING;

SELECT '✅ Auth users created successfully!' as result; 