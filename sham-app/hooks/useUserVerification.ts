import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import VerificationService from '@/services/VerificationService';
import { UserVerificationRequest, UserVerificationStatus } from '@/types/database';

type VerificationSummary = 'none' | UserVerificationStatus | 'approved';

export function useUserVerification() {
  const queryClient = useQueryClient();
  const { user, profile, refreshProfile } = useAuthContext();
  const userId = user?.id;

  const verificationQuery = useQuery<UserVerificationRequest | null>({
    queryKey: ['userVerification', userId],
    queryFn: () => {
      if (!userId) {
        throw new Error('Missing user identifier');
      }
      return VerificationService.fetchLatestRequest(userId);
    },
    enabled: !!userId,
    refetchOnWindowFocus: false,
  });

  const submitMutation = useMutation({
    mutationFn: async ({ fileUri, mimeType }: { fileUri: string; mimeType?: string | null }) => {
      if (!userId) {
        throw new Error('Missing user identifier');
      }

      return VerificationService.submitVerification({
        userId,
        fileUri,
        mimeType,
      });
    },
    onSuccess: async (_, variables) => {
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: ['userVerification', userId] });
      }
      refreshProfile();
    },
  });

  const status: VerificationSummary = useMemo(() => {
    if (profile?.is_verified) {
      return 'approved';
    }
    if (verificationQuery.data?.status) {
      return verificationQuery.data.status;
    }
    return 'none';
  }, [profile?.is_verified, verificationQuery.data?.status]);

  return {
    status,
    latestRequest: verificationQuery.data ?? null,
    isVerified: status === 'approved',
    isLoading: verificationQuery.isLoading,
    refetch: verificationQuery.refetch,
    submit: submitMutation.mutateAsync,
    submitLoading: submitMutation.isPending,
    error: verificationQuery.error ?? submitMutation.error ?? null,
  };
}
