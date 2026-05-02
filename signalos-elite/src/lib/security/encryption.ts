import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";

function getEncryptionKey(): Buffer | null {
  const rawKey = process.env.SIGI_SETTINGS_ENCRYPTION_KEY ?? "";
  if (!rawKey.trim()) return null;
  return createHash("sha256").update(rawKey).digest();
}

export function isEncryptionReady(): boolean {
  return getEncryptionKey() != null;
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("SIGI settings encryption is not configured.");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decrypt(payload: string): string | null {
  const key = getEncryptionKey();
  if (!key) return null;

  const parts = payload.split(".");
  if (parts.length !== 3) return null;

  try {
    const [ivPart, tagPart, encryptedPart] = parts;
    const iv = Buffer.from(ivPart, "base64");
    const authTag = Buffer.from(tagPart, "base64");
    const encrypted = Buffer.from(encryptedPart, "base64");
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}