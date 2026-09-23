import { exportKeyPair, fingerprint, importPrivateKey, importPublicKey, KeyPairExport } from "@/lib/crypto/ecdsa";
import { fromBase64Url, toBase64Url } from "@/lib/crypto/encoding";

const VAULT_VERSION = 1;
const PBKDF2_ITERATIONS = 250_000;
const AES_KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

export type EncryptedKeyVault = {
  version: typeof VAULT_VERSION;
  algorithm: "PBKDF2-SHA-256/AES-256-GCM";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  publicKey: string;
  keyFingerprint: string;
};

function copyBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes);
  return copy.buffer;
}

async function deriveEncryptionKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: copyBuffer(salt), iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function createEncryptedVault(
  keyPair: CryptoKeyPair,
  password: string,
): Promise<EncryptedKeyVault> {
  if (password.length < 8) throw new Error("Password vault minimal 8 karakter.");
  const exported: KeyPairExport = await exportKeyPair(keyPair);
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encryptionKey = await deriveEncryptionKey(password, salt, PBKDF2_ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: copyBuffer(iv) },
    encryptionKey,
    copyBuffer(fromBase64Url(exported.privateKey)),
  );
  return {
    version: VAULT_VERSION,
    algorithm: "PBKDF2-SHA-256/AES-256-GCM",
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64Url(salt),
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(ciphertext),
    publicKey: exported.publicKey,
    keyFingerprint: await fingerprint(exported.publicKey),
  };
}

export async function unlockEncryptedVault(
  vault: EncryptedKeyVault,
  password: string,
): Promise<CryptoKeyPair> {
  if (vault.version !== VAULT_VERSION || vault.algorithm !== "PBKDF2-SHA-256/AES-256-GCM") {
    throw new Error("Format vault tidak didukung.");
  }
  const salt = fromBase64Url(vault.salt);
  const iv = fromBase64Url(vault.iv);
  const encryptionKey = await deriveEncryptionKey(password, salt, vault.iterations);
  const privateKeyBytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: copyBuffer(iv) },
    encryptionKey,
    copyBuffer(fromBase64Url(vault.ciphertext)),
  );
  const privateKey = await importPrivateKey(toBase64Url(privateKeyBytes));
  const publicKey = await importPublicKey(vault.publicKey);
  return { privateKey, publicKey };
}
