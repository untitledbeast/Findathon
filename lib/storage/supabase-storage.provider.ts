import { IStorageProvider, UploadOptions } from './storage-provider.interface';
import { supabase } from '@/lib/supabase';

export class SupabaseStorageProvider implements IStorageProvider {
  async upload(file: Buffer | Blob | File, options: UploadOptions): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage.from(options.bucket).upload(options.path, file, {
        contentType: options.contentType,
        upsert: true
      });
      if (error || !data) return null;
      const { data: publicData } = supabase.storage.from(options.bucket).getPublicUrl(options.path);
      return publicData?.publicUrl || null;
    } catch (err) {
      console.error('Storage upload failed:', err);
      return null;
    }
  }

  async delete(bucket: string, path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      return !error;
    } catch {
      return false;
    }
  }

  async generateSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string | null> {
    try {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
      return data?.signedUrl || null;
    } catch {
      return null;
    }
  }
}

export const supabaseStorageProvider = new SupabaseStorageProvider();
