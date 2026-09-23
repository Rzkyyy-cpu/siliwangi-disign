import { ml_dsa44 } from "@noble/post-quantum/ml-dsa.js";
import { fromBase64Url, toBase64Url } from "./encoding";

export type MlDsaKeyPair = { publicKey: string; secretKey: string };

export function generateMlDsa44KeyPair(): MlDsaKeyPair {
  const keyPair = ml_dsa44.keygen();
  return { publicKey: toBase64Url(keyPair.publicKey), secretKey: toBase64Url(keyPair.secretKey) };
}

export function signMlDsa44(message: Uint8Array, secretKey: string): string {
  return toBase64Url(ml_dsa44.sign(message, fromBase64Url(secretKey)));
}

export function verifyMlDsa44(message: Uint8Array, signature: string, publicKey: string): boolean {
  return ml_dsa44.verify(fromBase64Url(signature), message, fromBase64Url(publicKey));
}

export const ML_DSA_44_SIZES = {
  publicKeyBytes: ml_dsa44.lengths.publicKey,
  secretKeyBytes: ml_dsa44.lengths.secretKey,
  signatureBytes: ml_dsa44.lengths.signature,
};
