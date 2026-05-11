/**
 * Storage abstraction. Switch via STORAGE_PROVIDER env var.
 *
 * "mock" — writes to .uploads/{key} on local disk; downloads served by
 *          /api/documents/[id] which streams the file back. Dev/demo only.
 * "s3"   — uses S3 / Cloudflare R2 with PutObject + presigned GET URLs.
 *
 * The interface is small on purpose: we only need put + getDownloadUrl + delete.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

export type StorageProvider = "mock" | "s3";

export function storageProvider(): StorageProvider {
  return (process.env.STORAGE_PROVIDER ?? "mock").toLowerCase() === "s3"
    ? "s3"
    : "mock";
}

export type PutInput = {
  key: string; // e.g. "bookings/<bookingId>/<uuid>.pdf"
  body: Buffer | Uint8Array;
  contentType: string;
};

export type Storage = {
  put(input: PutInput): Promise<void>;
  /**
   * Download URL the browser can hit. For mock storage this is /api/documents/<id>.
   * For s3 it's a short-lived presigned GET URL.
   */
  getDownloadUrl(key: string, opts?: { filename?: string }): Promise<string>;
  delete(key: string): Promise<void>;
  /** Used by the /api/documents proxy in mock mode to stream the file. */
  read(key: string): Promise<Uint8Array<ArrayBuffer>>;
};

const MOCK_ROOT = path.join(process.cwd(), ".uploads");

const mockStorage: Storage = {
  async put({ key, body }) {
    const target = path.join(MOCK_ROOT, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
  },
  async getDownloadUrl(_key, _opts) {
    // The route resolves the storageKey via the document ID, so we don't
    // expose it in the URL. The page that calls this passes the document ID.
    throw new Error(
      "mockStorage.getDownloadUrl is unused — pages link directly to /api/documents/[id]"
    );
  },
  async delete(key) {
    const target = path.join(MOCK_ROOT, key);
    await fs.unlink(target).catch(() => undefined);
  },
  async read(key) {
    const target = path.join(MOCK_ROOT, key);
    const data = await fs.readFile(target);
    // Re-allocate into a fresh ArrayBuffer-backed Uint8Array so its type is
    // Uint8Array<ArrayBuffer> (BodyInit-compatible), not <ArrayBufferLike>.
    const out = new Uint8Array(data.byteLength);
    out.set(data);
    return out;
  },
};

let s3Adapter: Storage | null = null;

async function getS3Adapter(): Promise<Storage> {
  if (s3Adapter) return s3Adapter;

  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } =
    await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION ?? "auto";
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "STORAGE_PROVIDER=s3 requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY"
    );
  }

  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    // R2 requires path-style addressing for the legacy endpoint.
    forcePathStyle: true,
  });

  s3Adapter = {
    async put({ key, body, contentType }) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );
    },
    async getDownloadUrl(key, opts) {
      const cmd = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ...(opts?.filename
          ? { ResponseContentDisposition: `attachment; filename="${opts.filename}"` }
          : {}),
      });
      return getSignedUrl(client, cmd, { expiresIn: 300 }); // 5 minutes
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    async read(_key) {
      throw new Error("s3Adapter.read is not used in s3 mode (signed URLs serve directly)");
    },
  };
  return s3Adapter;
}

export async function storage(): Promise<Storage> {
  return storageProvider() === "s3" ? getS3Adapter() : mockStorage;
}
