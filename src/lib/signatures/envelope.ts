import { fingerprint, sha256, signDigest, exportPublicKey, verifyDigest, importPublicKey } from "@/lib/crypto/ecdsa";
import { toBase64Url } from "@/lib/crypto/encoding";

export const SIGNATURE_FORMAT_VERSION = 1;

export type SignerMetadata = {
  name: string;
  role: string;
  institution: string;
  signedAt: string;
};

export type SignatureEnvelope = {
  formatVersion: typeof SIGNATURE_FORMAT_VERSION;
  algorithm: "ECDSA-P256-SHA256";
  document: {
    name: string;
    mime: string;
    size: number;
    sha256: string;
  };
  signer: SignerMetadata;
  publicKey: string;
  keyFingerprint: string;
  signature: string;
};

export function parseEnvelope(value: string): SignatureEnvelope {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object") throw new Error("Envelope bukan object JSON.");
  const candidate = parsed as Partial<SignatureEnvelope>;
  const document = candidate.document;
  const signer = candidate.signer;
  if (
    candidate.formatVersion !== SIGNATURE_FORMAT_VERSION ||
    candidate.algorithm !== "ECDSA-P256-SHA256" ||
    !document || typeof document !== "object" ||
    typeof document.name !== "string" || typeof document.mime !== "string" ||
    typeof document.size !== "number" || !Number.isSafeInteger(document.size) || document.size < 1 ||
    typeof document.sha256 !== "string" ||
    !signer || typeof signer !== "object" ||
    typeof signer.name !== "string" || typeof signer.role !== "string" ||
    typeof signer.institution !== "string" || typeof signer.signedAt !== "string" ||
    typeof candidate.publicKey !== "string" || typeof candidate.keyFingerprint !== "string" ||
    typeof candidate.signature !== "string"
  ) {
    throw new Error("Envelope signature tidak valid.");
  }
  return candidate as SignatureEnvelope;
}

export async function createEnvelope(
  file: Pick<File, "name" | "type" | "size">,
  bytes: Uint8Array,
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  signer: SignerMetadata,
): Promise<SignatureEnvelope> {
  const digest = await sha256(bytes);
  const publicKeyValue = await exportPublicKey(publicKey);
  return {
    formatVersion: SIGNATURE_FORMAT_VERSION,
    algorithm: "ECDSA-P256-SHA256",
    document: {
      name: file.name,
      mime: file.type || "application/pdf",
      size: file.size,
      sha256: toBase64Url(digest),
    },
    signer,
    publicKey: publicKeyValue,
    keyFingerprint: await fingerprint(publicKeyValue),
    signature: await signDigest(privateKey, digest),
  };
}

export async function verifyEnvelope(
  envelope: SignatureEnvelope,
  bytes: Uint8Array,
): Promise<{ valid: boolean; reason: string }> {
  if (envelope.formatVersion !== SIGNATURE_FORMAT_VERSION) {
    return { valid: false, reason: "Format signature tidak didukung." };
  }
  if (envelope.algorithm !== "ECDSA-P256-SHA256") {
    return { valid: false, reason: "Algoritma signature tidak didukung." };
  }
  if (envelope.document.size !== bytes.byteLength) {
    return { valid: false, reason: "Ukuran dokumen berubah." };
  }

  const digest = await sha256(bytes);
  const digestValue = toBase64Url(digest);
  if (digestValue !== envelope.document.sha256) {
    return { valid: false, reason: "Hash SHA-256 tidak cocok. Dokumen mungkin telah diubah." };
  }

  try {
    const publicKey = await importPublicKey(envelope.publicKey);
    const valid = await verifyDigest(publicKey, digest, envelope.signature);
    return valid
      ? { valid: true, reason: "Signature valid dan dokumen asli." }
      : { valid: false, reason: "Signature tidak valid untuk public key ini." };
  } catch {
    return { valid: false, reason: "Payload signature rusak atau public key tidak valid." };
  }
}
