import type { CatalogRepository } from './catalogRepository';
import type { CatalogMediaType } from './types';

export const CATALOG_MEDIA_BUCKET = 'catalog-media';

export interface CatalogMediaUpload {
  path: string;
  url: string;
  fileName: string;
  contentType: string;
  size: number;
}

export interface CatalogMediaStorage {
  upload(file: File, type: CatalogMediaType): Promise<CatalogMediaUpload>;
  remove(path: string): Promise<void>;
}

interface StorageErrorLike {
  message: string;
}

interface StorageUploadResult {
  data: { path: string } | null;
  error: StorageErrorLike | null;
}

interface StorageRemoveResult {
  error: StorageErrorLike | null;
}

interface StoragePublicUrlResult {
  data: { publicUrl: string };
}

interface SupabaseStorageBucketLike {
  upload(path: string, file: File, options?: { cacheControl?: string; contentType?: string; upsert?: boolean }): Promise<StorageUploadResult>;
  remove(paths: string[]): Promise<StorageRemoveResult>;
  getPublicUrl(path: string): StoragePublicUrlResult;
}

export interface CatalogStorageSupabaseClient {
  storage: {
    from(bucket: string): SupabaseStorageBucketLike;
  };
}

const acceptedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'application/pdf',
]);

const extensionByMimeType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'application/pdf': 'pdf',
};

const maxFileSize = 50 * 1024 * 1024;

function randomToken() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function extensionFrom(file: File) {
  const lastDot = file.name.lastIndexOf('.');
  if (lastDot > 0 && lastDot < file.name.length - 1) {
    const fromName = file.name.slice(lastDot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (fromName) return fromName;
  }
  return extensionByMimeType[file.type] ?? 'bin';
}

function validateFile(file: File, type: CatalogMediaType) {
  if (!acceptedMimeTypes.has(file.type)) {
    throw new Error(`Formato não permitido para “${file.name}”. Use JPG, PNG, WebP, GIF, MP4, WebM ou PDF.`);
  }
  if (file.size <= 0) throw new Error(`O arquivo “${file.name}” está vazio.`);
  if (file.size > maxFileSize) throw new Error(`O arquivo “${file.name}” excede o limite de 50 MB.`);

  if (type === 'image' && !file.type.startsWith('image/')) {
    throw new Error(`“${file.name}” não é uma imagem válida.`);
  }
  if (type === 'video' && !file.type.startsWith('video/')) {
    throw new Error(`“${file.name}” não é um vídeo válido.`);
  }
  if ((type === 'document' || type === 'floorplan') && file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
    throw new Error(`“${file.name}” deve ser PDF ou imagem.`);
  }
}

export class SupabaseCatalogMediaStorage implements CatalogMediaStorage {
  constructor(
    private readonly client: CatalogStorageSupabaseClient,
    private readonly repository?: CatalogRepository,
  ) {}

  private async isReferenced(path: string) {
    if (!this.repository) return false;
    const bucket = this.client.storage.from(CATALOG_MEDIA_BUCKET);
    const publicUrl = bucket.getPublicUrl(path).data.publicUrl;
    const items = await this.repository.list({ includeDeleted: true });

    return items.some((item) => item.media.some(
      (media) => media.storagePath === path || Boolean(publicUrl && media.url === publicUrl),
    ));
  }

  async upload(file: File, type: CatalogMediaType): Promise<CatalogMediaUpload> {
    validateFile(file, type);

    const extension = extensionFrom(file);
    const path = `${type}/${new Date().getUTCFullYear()}/${randomToken()}.${extension}`;
    const bucket = this.client.storage.from(CATALOG_MEDIA_BUCKET);
    const result = await bucket.upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    });

    if (result.error || !result.data) {
      throw new Error(result.error?.message || `Não foi possível enviar “${file.name}”.`);
    }

    const publicUrl = bucket.getPublicUrl(result.data.path).data.publicUrl;
    if (!publicUrl) {
      await bucket.remove([result.data.path]).catch(() => undefined);
      throw new Error(`Upload de “${file.name}” concluído, mas a URL pública não foi gerada.`);
    }

    return {
      path: result.data.path,
      url: publicUrl,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    };
  }

  async remove(path: string): Promise<void> {
    if (await this.isReferenced(path)) return;

    const result = await this.client.storage.from(CATALOG_MEDIA_BUCKET).remove([path]);
    if (result.error) throw new Error(result.error.message || 'Não foi possível remover a mídia.');
  }
}
