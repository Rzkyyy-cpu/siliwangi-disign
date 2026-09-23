import { createEnvelope, SignatureEnvelope, SignerMetadata } from "./envelope";

export type MultiSignerEnvelope = {
  formatVersion: 1;
  mode: "MULTI-SIGNER-ECDSA-P256-SHA256";
  document: SignatureEnvelope["document"];
  signatures: SignatureEnvelope[];
};

export async function createMultiSignerEnvelope(
  file: Pick<File, "name" | "type" | "size">,
  bytes: Uint8Array,
  signers: Array<{ privateKey: CryptoKey; publicKey: CryptoKey; metadata: SignerMetadata }>,
): Promise<MultiSignerEnvelope> {
  if (signers.length < 2) throw new Error("Multi-signer membutuhkan minimal dua penandatangan.");
  const signatures = await Promise.all(signers.map((signer) => createEnvelope(
    file,
    bytes,
    signer.privateKey,
    signer.publicKey,
    signer.metadata,
  )));
  return {
    formatVersion: 1,
    mode: "MULTI-SIGNER-ECDSA-P256-SHA256",
    document: signatures[0].document,
    signatures,
  };
}

export function parseMultiSignerEnvelope(value: string): MultiSignerEnvelope {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object") throw new Error("Envelope multi-signer tidak valid.");
  const candidate = parsed as Partial<MultiSignerEnvelope>;
  if (
    candidate.formatVersion !== 1 ||
    candidate.mode !== "MULTI-SIGNER-ECDSA-P256-SHA256" ||
    !candidate.document || !Array.isArray(candidate.signatures) ||
    candidate.signatures.length < 2
  ) throw new Error("Envelope multi-signer tidak valid.");
  return candidate as MultiSignerEnvelope;
}
