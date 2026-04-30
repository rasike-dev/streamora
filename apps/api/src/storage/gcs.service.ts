import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class GcsService {
  private storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });

  bucket(name: string) {
    return this.storage.bucket(name);
  }

  async upload(opts: {
    bucket: string;
    objectKey: string;
    buffer: Buffer;
    contentType: string;
  }) {
    const bucket = this.storage.bucket(opts.bucket);
    const file = bucket.file(opts.objectKey);
    await file.save(opts.buffer, {
      resumable: false,
      metadata: {
        contentType: opts.contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
  }

  async delete(bucket: string, objectKey: string) {
    const file = this.storage.bucket(bucket).file(objectKey);
    await file.delete();
  }

  getPublicUrl(bucket: string, objectKey: string): string {
    const cdnBase =
      process.env.CDN_BASE_URL || process.env.PUBLIC_ASSET_BASE_URL;
    if (cdnBase) return `${cdnBase}/${objectKey}`;
    return `https://storage.googleapis.com/${bucket}/${objectKey}`;
  }
}
