import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SCRYPT_KEYLEN = 64;

function encodeBuffer(input: Buffer) {
  return input.toString("base64url");
}

function decodeBuffer(input: string) {
  return Buffer.from(input, "base64url");
}

function normalizePassword(password: string) {
  return password.normalize("NFKC");
}

export async function hashPassword(password: string) {
  const normalized = normalizePassword(password);
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(normalized, salt, SCRYPT_KEYLEN)) as Buffer;
  return `scrypt$${encodeBuffer(salt)}$${encodeBuffer(derivedKey)}`;
}

function verifyLegacySeedHash(password: string, storedHash: string) {
  const legacyHash = `seed:${createHash("sha256").update(normalizePassword(password)).digest("hex")}`;
  return legacyHash === storedHash;
}

export async function verifyPassword(password: string, storedHash: string) {
  if (storedHash.startsWith("seed:")) {
    return verifyLegacySeedHash(password, storedHash);
  }

  const [algorithm, saltValue, keyValue] = storedHash.split("$");
  if (algorithm !== "scrypt" || !saltValue || !keyValue) return false;

  const salt = decodeBuffer(saltValue);
  const storedKey = decodeBuffer(keyValue);
  const derivedKey = (await scrypt(normalizePassword(password), salt, storedKey.length)) as Buffer;

  if (derivedKey.length !== storedKey.length) return false;
  return timingSafeEqual(derivedKey, storedKey);
}
