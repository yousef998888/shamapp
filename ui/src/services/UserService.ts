import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/types/database";

// Define the form data structure for updates
export interface ProfileFormData {
  full_name: string;
  username: string;
  phone: string;
  location: string;
  bio: string;
}

// --- Password Change Mutation Function ---
const changePasswordMutationFn = async (newPassword: string) => {
  const { error ,data } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    // Supabase error messages are often descriptive, pass them along
    throw new Error(error.message || "Failed to update password");
  }
  return data;
};

// --- Update Profile Mutation Function ---
const updateProfileMutationFn = async ({
  userId,
  formData,
}: {
  userId: string;
  formData: ProfileFormData;
}) => {
  const { error } = await supabase
    .from("users")
    .update({
      full_name: formData.full_name,
      username: formData.username,
      phone: formData.phone,
      location: formData.location,
      bio: formData.bio,
      updated_at: new Date().toISOString(), // Ensure updated_at is set
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message || "Failed to update profile");
  }
};

// --- Fetch Profile Query Function ---
const fetchUserProfile = async (
  userId: string
): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from("users") // Your public profile table name
    .select("*") // Select all columns, or specify what you need
    .eq("id", userId)
    .single(); // Use .single() as we expect one row

  if (error) {
    console.error("Error fetching user profile:", error.message);
    throw new Error(error.message || "Failed to fetch profile");
  }

  return data as UserProfile; // Cast data to your defined interface
};

const UserService = {
  fetchUserProfile,
  updateProfileMutationFn,
  changePasswordMutationFn,
};

export default UserService;
