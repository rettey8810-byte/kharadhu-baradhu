-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy to allow authenticated users to upload
CREATE POLICY "Users can upload their own receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'receipts' AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Allow users to read their own receipts
CREATE POLICY "Users can view their own receipts" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'receipts' AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Allow users to delete their own receipts
CREATE POLICY "Users can delete their own receipts" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'receipts' AND (storage.foldername(name))[1] = (select auth.uid()::text)
);
