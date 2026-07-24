export interface UploadOptions {
  bucket: string;
  path: string;
  contentType?: string;
}

export interface IStorageProvider {
  upload(file: Buffer | Blob | File, options: UploadOptions): Promise<string | null>;
  delete(bucket: string, path: string): Promise<boolean>;
  generateSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string | null>;
}
