import { requireSupabase } from '../../core/supabase/client';

const INBOX_MEDIA_BUCKET = 'inbox-media';
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

export interface UploadedInboxMedia {
  path: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

function extensionFrom(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName) return fromName;
  const mimeExtensions: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'application/pdf': 'pdf',
  };
  return mimeExtensions[file.type] ?? 'bin';
}

function randomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function uploadInboxMedia(file: File): Promise<UploadedInboxMedia> {
  if (!file.size) throw new Error('O arquivo está vazio.');
  if (file.size > 25 * 1024 * 1024) throw new Error('O arquivo excede o limite de 25 MB.');

  const supabase = requireSupabase() as any;
  const extension = extensionFrom(file);
  const path = `messages/${new Date().getUTCFullYear()}/${randomId()}.${extension}`;
  const bucket = supabase.storage.from(INBOX_MEDIA_BUCKET);

  const uploaded = await bucket.upload(path, file, {
    upsert: false,
    contentType: file.type || 'application/octet-stream',
    cacheControl: '3600',
  });

  if (uploaded.error || !uploaded.data?.path) {
    throw new Error(uploaded.error?.message || 'Não foi possível enviar o arquivo para a Inbox.');
  }

  const signed = await bucket.createSignedUrl(uploaded.data.path, SIGNED_URL_SECONDS);
  if (signed.error || !signed.data?.signedUrl) {
    await bucket.remove([uploaded.data.path]).catch(() => undefined);
    throw new Error(signed.error?.message || 'Não foi possível preparar o arquivo para envio.');
  }

  return {
    path: uploaded.data.path,
    url: signed.data.signedUrl,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
  };
}
