-- Storage policies for verification-documents bucket
CREATE POLICY "Users can upload verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their verification documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
