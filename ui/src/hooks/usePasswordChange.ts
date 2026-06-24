// src/hooks/usePasswordChange.ts
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import UserService from "@/services/UserService";

interface PasswordData {
  currentPassword: string; // Note: Supabase `updateUser` doesn't strictly need current password if done client-side, but good for UX validation.
  newPassword: string;
  confirmPassword: string;
}


// --- Custom Hook for Password Change ---
export function usePasswordChange() {
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false); // UI state for toggling password visibility

  const passwordMutation = useMutation({
    mutationFn: UserService.changePasswordMutationFn,
    onSuccess: () => {
      toast.success("Password updated successfully!");
      // Reset form data on success
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update password");
    },
  });

  const handlePasswordChange = (
    field: keyof PasswordData,
    value: string
  ) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  const submitPasswordChange = (event: React.FormEvent) => {
    event.preventDefault(); // Prevent default form submission

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    // Trigger the mutation
    passwordMutation.mutate(passwordData.newPassword);
  };

  const cancelPasswordEdit = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  return {
    passwordData,
    showPassword,
    isLoading: passwordMutation.isPending, // Renamed to isLoading for clarity in UI
    isError: passwordMutation.isError,
    error: passwordMutation.error,
    handlePasswordChange,
    submitPasswordChange,
    cancelPasswordEdit,
    toggleShowPassword: () => setShowPassword((prev) => !prev),
  };
}