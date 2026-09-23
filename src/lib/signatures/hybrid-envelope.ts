import { sha256 } from "@/lib/crypto/ecdsa";
import { toBase64Url } from "@/lib/crypto/encoding";
import { signMlDsa44, verifyMlDsa44 } from "@/lib/crypto/ml-dsa";
import { createEnvelope, SignatureEnvelope, SignerMetadata, verifyEnvelope } from "./envelope";

export type HybridSignatureEnvelope = {
  formatVersion: 1;
  mode: "ECDSA-P256-AND-ML-DSA-44";
  document: SignatureEnvelope["document"];
  ecdsa: SignatureEnvelope;
  mlDsa: { publicKey: string; signature: string };
};

export async function createHybridEnvelope(
  file: Pick<File, "name" | "type" | "size">,
  bytes: Uint8Array,
  ecdsa: { privateKey: CryptoKey; publicKey: CryptoKey },
  mlDsa: { secretKey: string; publicKey: string },
  signer: SignerMetadata,
): Promise<HybridSignatureEnvelope> {
  const ecdsaEnvelope = await createEnvelope(file, bytes, ecdsa.privateKey, ecdsa.publicKey, signer);
  const digest = await sha256(bytes);
  return {
    formatVersion: 1,
    mode: "ECDSA-P256-AND-ML-DSA-44",
    document: ecdsaEnvelope.document,
    ecdsa: ecdsaEnvelope,
    mlDsa: { publicKey: mlDsa.publicKey, signature: signMlDsa44(digest, mlDsa.secretKey) },
  };
}

export async function verifyHybridEnvelope(envelope: HybridSignatureEnvelope, bytes: Uint8Array) {
  const ecdsaResult = await verifyEnvelope(envelope.ecdsa, bytes);
  const digest = await sha256(bytes);
  const mlDsaValid = verifyMlDsa44(digest, envelope.mlDsa.signature, envelope.mlDsa.publicKey);
  return { valid: ecdsaResult.valid && mlDsaValid, ecdsa: ecdsaResult, mlDsaValid, hash: toBase64Url(digest) };
}
