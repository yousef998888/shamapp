import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { UserProfile } from "@/types/database";

// --- Sign Up with Email Mutation Function ---
const signUpWithEmailMutationFn = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  // Hash the password before sign-up
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Sign up with Supabase
  const { data, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) {
    throw new Error(authError.message);
  }

  if (data.user) {
    // Insert into users table with the hashed password
    const { error: insertError } = await supabase.from("users").insert({
      id: data.user.id,
      email: data.user.email,
      password_hash: hashedPassword,
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
  
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Session request timeout')), 8000); // Reduced to 8 seconds
    });

    const sessionPromise = (async (): Promise<Session | null> => {
      const { data: { session }, error: getErr } = await supabase.auth.getSession();
      
      
      if (getErr) {
        console.warn("getSession Error:", getErr);
        return null; // Return null instead of throwing to avoid retries
      }

      let current = session;
      if (!session) {
        const { data, error: refErr } = await supabase.auth.refreshSession();
        if (refErr) {
          console.warn("refreshSession Error:", refErr);
          return null; // Return null if refresh fails
        } else {
          current = data.session;
        }
      }

      return current;
    })();

    // Race between timeout and session request
    const result = await Promise.race([sessionPromise, timeoutPromise]);
    return result;
  } catch (error) {
    console.error("Error in getCurrentSession:", error);
    return null; // Return null on any error to avoid infinite retries
  }

  if (!session) {
    const { data, error: refErr } = await supabase.auth.refreshSession();
    if (refErr) {
      console.warn("refreshSession Error:", refErr);
      return null;
    }
    return data.session;
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
    // Profile doesn't exist, create it
    const { data: newProfile, error: createError } = await supabase
      .from("users")
      .insert([
        {
          id: userId,
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