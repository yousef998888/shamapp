import { supabase } from "../utils/supabase";
import { Session } from "@supabase/supabase-js";
import { UserProfile } from "../types/database";

// Simple hash function for React Native
const simpleHash = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

// --- Sign Up with Email Mutation Function ---
const signUpWithEmailMutationFn = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  // Create a simple hash for the password (for database constraint)
  const passwordHash = simpleHash(password + email);

  // Sign up with Supabase
  console.log('Calling supabase.auth.signUp...');
  const { data, error: authError } = await supabase.auth.signUp({ email, password });
  
  if (authError) {
    console.error('Signup auth error:', authError);
    throw new Error(authError.message);
  }

  console.log('Signup response:', { 
    user: data.user?.id, 
    session: data.session?.user?.id,
    emailConfirmed: data.user?.email_confirmed_at,
    hasUser: !!data.user,
    hasSession: !!data.session
  });

  if (data.user) {
    // Insert into users table with the hashed password
    const { error: insertError } = await supabase.from("users").insert({
      id: data.user.id,
      email: data.user.email,
      password_hash: passwordHash,
      full_name: data.user.user_metadata?.full_name || "",
      username: data.user.user_metadata?.username || data.user.email?.split("@")[0],
      avatar_url: data.user.user_metadata?.avatar_url || "",
      phone: data.user.phone || "",
      location: "",
      bio: "",
      is_verified: false,
      rating: 0,
      total_sales: 0,
      member_since: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return data;
};

// --- Sign Up with Google Mutation Function ---
const signUpWithGoogleMutationFn = async () => {
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
  if (error) {
    throw new Error(error.message);
  }
};

// --- Sign In with Email Mutation Function ---
const signInWithEmailMutationFn = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

// --- Sign In with Google Mutation Function ---
const signInWithGoogleMutationFn = async () => {
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
  if (error) {
    throw new Error(error.message);
  }
};

// --- Sign Out Mutation Function ---
const signOutMutationFn = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
};

// --- Get Current Session Query Function ---
const getCurrentSession = async (): Promise<Session | null> => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.warn("getSession Error:", error);
    return null;
  }

  // If no session, try to refresh (but don't log errors for missing sessions - this is expected when logged out)
  if (!session) {
    try {
      const { data, error: refErr } = await supabase.auth.refreshSession();
      if (refErr) {
        // Only log if it's not a missing session error (which is expected when logged out)
        if (refErr.message && !refErr.message.includes('session missing')) {
          console.warn("refreshSession Error:", refErr);
        }
        return null;
      }
      return data.session;
    } catch (refreshError) {
      // Silently handle refresh errors - expected when no session exists
      return null;
    }
  }

  return session;
};

// --- Fetch User Profile Query Function ---
const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    // Profile doesn't exist, create it with a default password hash
    // This is for OAuth users who don't have a password
    const defaultPasswordHash = simpleHash("oauth_user_" + userId);
    
    const { data: newProfile, error: createError } = await supabase
      .from("users")
      .insert([
        {
          id: userId,
          password_hash: defaultPasswordHash,
          member_since: new Date().toISOString(),
          rating: 0,
          total_sales: 0,
          is_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();
    if (createError) {
      throw new Error(createError.message);
    }
    return newProfile;
  } else if (error) {
    throw new Error(error.message);
  }

  return data;
};

const AuthService = {
  signUpWithEmailMutationFn,
  signUpWithGoogleMutationFn,
  signInWithEmailMutationFn,
  signInWithGoogleMutationFn,
  signOutMutationFn,
  getCurrentSession,
  fetchUserProfile,
};

export default AuthService;
