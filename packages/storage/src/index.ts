import { randomUUID } from 'node:crypto';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@platform/config';

const globalForStorage = globalThis as unknown as { s3Client?: S3Client };

export const s3Client =
  globalForStorage.s3Client ??
  new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    // MinIO local y el storage S3-compatible de Supabase necesitan
    // path-style (bucket como segmento de ruta, no subdominio).
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    },
  });
if (env.NODE_ENV !== 'production') globalForStorage.s3Client = s3Client;

const PRESIGNED_URL_TTL_SECONDS = 300;

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180);
}

export function buildStorageKey(organizationId: string, filename: string) {
  return `org/${organizationId}/${randomUUID()}-${sanitizeFilename(filename)}`;
}

export async function presignUpload(options: { storageKey: string; mimeType: string }) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: options.storageKey,
    ContentType: options.mimeType,
  });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_TTL_SECONDS });
  return { uploadUrl, expiresInSeconds: PRESIGNED_URL_TTL_SECONDS };
}

export async function headObject(storageKey: string) {
  try {
    const result = await s3Client.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: storageKey }));
    return { exists: true as const, sizeBytes: result.ContentLength ?? 0 };
  } catch (error) {
    const code = (error as { name?: string; $metadata?: { httpStatusCode?: number } }).name;
    if (code === 'NotFound' || code === 'NoSuchKey') return { exists: false as const, sizeBytes: 0 };
    throw error;
  }
}

// Subida server-side directa, sin URL presignada: para procesos backend
// (p.ej. el worker de ingesta regulatoria) que ya tienen el contenido en
// memoria y no necesitan que un navegador lo suba.
export async function putRawObject(options: { storageKey: string; body: string | Uint8Array; contentType: string }) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: options.storageKey,
      Body: options.body,
      ContentType: options.contentType,
    }),
  );
  return { storageKey: options.storageKey };
}
