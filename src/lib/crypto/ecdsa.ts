import { bytesToHex, fromBase64Url, toBase64Url } from "./encoding";

const ECDSA_PARAMS: EcdsaParams = { name: "ECDSA", hash: "SHA-256" };
const P256_PARAMS: EcKeyGenParams = { name: "ECDSA", namedCurve: "P-256" };

function asArrayBuffer(bytes: ArrayBuffer | Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes);
  return copy.buffer;
}

export type KeyPairExport = {
  privateKey: string;
  publicKey: string;
};

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(P256_PARAMS, true, ["sign", "verify"]);
}

export async function signDigest(privateKey: CryptoKey, digest: Uint8Array): Promise<string> {
  const signature = await crypto.subtle.sign(ECDSA_PARAMS, privateKey, asArrayBuffer(digest));
  return toBase64Url(signature);
}

export async function verifyDigest(
  publicKey: CryptoKey,
  digest: Uint8Array,
  signature: string,
): Promise<boolean> {
  return crypto.subtle.verify(
    ECDSA_PARAMS,
    publicKey,
    asArrayBuffer(fromBase64Url(signature)),
    asArrayBuffer(digest),
  );
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  return toBase64Url(await crypto.subtle.exportKey("spki", publicKey));
}

export async function importPublicKey(value: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    asArrayBuffer(fromBase64Url(value)),
    P256_PARAMS,
    true,
    ["verify"],
  );
}

export async function exportKeyPair(keyPair: CryptoKeyPair): Promise<KeyPairExport> {
  return {
    privateKey: toBase64Url(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)),
    publicKey: await exportPublicKey(keyPair.publicKey),
  };
}

export async function importPrivateKey(value: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    asArrayBuffer(fromBase64Url(value)),
    P256_PARAMS,
    true,
    ["sign"],
  );
}

export async function sha256(bytes: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", asArrayBuffer(bytes));
  return new Uint8Array(digest);
}

export async function fingerprint(publicKey: string): Promise<string> {
  return bytesToHex(await sha256(fromBase64Url(publicKey))).slice(0, 32);
}
