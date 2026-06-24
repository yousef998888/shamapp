import { supabase } from '../utils/supabase';
import { UserProfile } from '../types/database';

class UserService {
  /**
   * Upload profile image (avatar or background) from mobile
   */
  static async uploadProfileImage(
    userId: string, 
    imageUri: string, 
    type: 'avatar' | 'background'
  ): Promise<string> {
    try {
      // Convert URI to array buffer for upload
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `profiles/${userId}/${type}-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from("profile-images")
        .upload(fileName, uint8Array);

      if (error) {
        console.error(`Storage error details:`, error);
        throw new Error(`Failed to upload ${type} image: ${error.message}. Please ensure the 'profile-images' storage bucket exists in your Supabase project.`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-images").getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${type} image:`, error);
      throw error;
    }
  }

  /**
   * Update user profile with new image URL
   */
  static async updateProfileImage(
    userId: string, 
    imageUrl: string, 
    type: 'avatar' | 'background'
  ): Promise<UserProfile> {
    try {
      const updateData = type === 'avatar' 
        ? { avatar_url: imageUrl }
        : { background_image_url: imageUrl };

      const { data, error } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update ${type} image: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error(`Error updating ${type} image:`, error);
      throw error;
    }
  }

  /**
   * Upload and update profile image in one operation
   */
  static async uploadAndUpdateProfileImage(
    userId: string, 
    imageUri: string, 
    type: 'avatar' | 'background'
  ): Promise<UserProfile> {
    try {
      // Upload image to storage
      const imageUrl = await this.uploadProfileImage(userId, imageUri, type);
      
      // Update user profile with new image URL
      const updatedProfile = await this.updateProfileImage(userId, imageUrl, type);
      
      return updatedProfile;
    } catch (error) {
      console.error(`Error uploading and updating ${type} image:`, error);
      throw error;
    }
  }

  /**
   * Fetch user profile by ID
   */
  static async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Profile doesn't exist
        }
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile fields
   */
  static async updateProfile(
    userId: string, 
    updates: Partial<Pick<UserProfile, 'full_name' | 'username' | 'phone' | 'location' | 'bio'>>
  ): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }
}

export default UserService;
