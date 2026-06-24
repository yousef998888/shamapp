// src/hooks/useProfile.ts
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/contexts/AuthContext"; // To get the current user
import { UserProfile } from "@/types/database";
import UserService, { ProfileFormData } from "@/services/UserService";

// --- Custom Hook for Profile Management ---
export function useProfile() {
  const { user, loading: authLoading } = useAuthContext();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // State to hold form data, initialized with profile data once loaded
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: "",
    username: "",
    phone: "",
    location: "",
    bio: "",
  });

  // 1. Query for fetching the user's profile
  const {
    data: profile,
    isLoading: isProfileLoading, // Loading state for the query
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile, // Function to manually refetch profile
  } = useQuery<UserProfile | null, Error>({
    queryKey: ["userProfile", user?.id], // Query key includes user ID for uniqueness
    queryFn: () => {
      if (!user?.id) {
        // If no user ID, return a promise that resolves to null or throws an error
        // depending on desired behavior. Here, we resolve to null.
        return Promise.resolve(null);
      }
      return UserService.fetchUserProfile(user.id);
    },
    enabled: !!user?.id && !authLoading, // Only run query if user ID exists and auth is not loading

  });

  // Effect to update formData when profile data changes (e.g., on initial load or refetch)
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        username: profile.username || "",
        phone: profile.phone || "",
        location: profile.location || "",
        bio: profile.bio || "",
      });
    }
  }, [profile]);

  // 2. Mutation for updating the user's profile
  const updateProfileMutation = useMutation({
    mutationFn: UserService.updateProfileMutationFn,
    onSuccess: async () => {
      toast.success(t('profile.messages.updatedSuccessfully'));
      // Invalidate the 'userProfile' query to force a refetch and update UI
      await queryClient.invalidateQueries({ queryKey: ["userProfile", user?.id] });
      // The useEffect above will handle updating formData based on the new profile data
    },
    onError: (err: Error) => {
      toast.error(err.message || t('profile.messages.updateFailed'));
    },
  });

  // Handlers for form input changes
  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Function to save profile changes
  const saveProfile = () => {
    if (!user?.id) {
      toast.error(t('profile.messages.notAuthenticated'));
      return;
    }
    updateProfileMutation.mutate({ userId: user.id, formData });
  };

  // Function to cancel editing and revert form data
  const cancelProfileEdit = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        username: profile.username || "",
        phone: profile.phone || "",
        location: profile.location || "",
        bio: profile.bio || "",
      });
    }
  };

  return {
    profile, // The fetched profile data
    formData, // The mutable form data
    isProfileLoading: isProfileLoading || authLoading, // Combined loading state
    isProfileSaving: updateProfileMutation.isPending, // Loading state for saving
    isProfileError,
    profileError,
    handleInputChange,
    saveProfile,
    cancelProfileEdit,
    refetchProfile, // Expose refetch function if needed outside
  };
}