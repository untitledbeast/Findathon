import { supabase } from '@/lib/supabase';

export interface IStorageProvider {
  uploadFile(bucket: string, path: string, file: Blob | Buffer, contentType?: string): Promise<{ url: string | null; error: string | null }>;
  getPublicUrl(bucket: string, path: string): string;
  deleteFile(bucket: string, path: string): Promise<boolean>;
}

export class SupabaseStorageProvider implements IStorageProvider {
  public async uploadFile(bucket: string, path: string, file: Blob | Buffer, contentType?: string): Promise<{ url: string | null; error: string | null }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType, upsert: true });

      if (error || !data) {
        return { url: null, error: error?.message || 'Upload failed' };
      }

      const publicUrl = this.getPublicUrl(bucket, path);
      return { url: publicUrl, error: null };
    } catch (err) {
      return { url: null, error: err instanceof Error ? err.message : 'Storage upload exception' };
    }
  }

  public getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  public async deleteFile(bucket: string, path: string): Promise<boolean> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return !error;
  }
}
