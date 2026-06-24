import { supabase } from '@/utils/supabase';
import { UserVerificationRequest, UserVerificationStatus } from '@/types/database';

class VerificationService {
  static async fetchLatestRequest(userId: string): Promise<UserVerificationRequest | null> {
    const { data, error } = await supabase
      .from<UserVerificationRequest>('user_verification_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ?? null;
  }

  static async submitVerification(params: {
    userId: string;
    fileUri: string;
    mimeType?: string | null;
  }): Promise<UserVerificationRequest> {
    const fileResponse = await fetch(params.fileUri);
    const arrayBuffer = await fileResponse.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    const extensionGuess =
      params.mimeType?.split('/')[1] ??
      params.fileUri.split('.').pop() ??
      'jpg';

    const path = `${params.userId}/${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${extensionGuess.toLowerCase()}`;

    const { error: uploadError } = await supabase.storage
      .from('verification-documents')
      .upload(path, fileBytes, {
        cacheControl: '3600',
        upsert: true,
        contentType: params.mimeType ?? fileResponse.headers.get('Content-Type') ?? 'image/jpeg',
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data, error } = await supabase
      .from<UserVerificationRequest>('user_verification_requests')
      .insert({
        user_id: params.userId,
        document_path: path,
        status: 'pending' as UserVerificationStatus,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  static async getSignedDocumentUrl(documentPath: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from('verification-documents')
      .createSignedUrl(documentPath, 60 * 30);

    if (error) {
      console.error('Failed to create signed URL', error);
      return null;
    }

    return data?.signedUrl ?? null;
  }
}

export default VerificationService;
