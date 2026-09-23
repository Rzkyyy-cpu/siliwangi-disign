import { webcrypto } from "node:crypto";
import { describe, expect, it, beforeAll } from "vitest";
import { exportPublicKey, generateKeyPair } from "@/lib/crypto/ecdsa";
import { createEnvelope, verifyEnvelope } from "@/lib/signatures/envelope";
import { createEncryptedVault, unlockEncryptedVault } from "@/lib/vault/encrypted-key-vault";

const documentBytes = new TextEncoder().encode("%PDF-1.7\nSiliwangi DiSign fixture\n");
const file = { name: "fixture.pdf", type: "application/pdf", size: documentBytes.byteLength };

beforeAll(() => {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
});

describe("digital signature security controls", () => {
  it("accepts an original document signed with ECDSA P-256", async () => {
    const keys = await generateKeyPair();
    const envelope = await createEnvelope(file, documentBytes, keys.privateKey, keys.publicKey, {
      name: "Ayu Siliwangi",
      role: "Ketua",
      institution: "Universitas Siliwangi",
      signedAt: "2026-09-23T00:00:00.000Z",
    });
    await expect(verifyEnvelope(envelope, documentBytes)).resolves.toEqual({
      valid: true,
      reason: "Signature valid dan dokumen asli.",
    });
  });

  it("rejects a document changed by one byte", async () => {
    const keys = await generateKeyPair();
    const envelope = await createEnvelope(file, documentBytes, keys.privateKey, keys.publicKey, {
      name: "Signer", role: "Role", institution: "Institution", signedAt: new Date().toISOString(),
    });
    const tampered = new Uint8Array(documentBytes);
    tampered[tampered.length - 1] ^= 1;
    const result = await verifyEnvelope(envelope, tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Hash SHA-256 tidak cocok");
  });

  it("rejects a modified signature", async () => {
    const keys = await generateKeyPair();
    const envelope = await createEnvelope(file, documentBytes, keys.privateKey, keys.publicKey, {
      name: "Signer", role: "Role", institution: "Institution", signedAt: new Date().toISOString(),
    });
    const modified = { ...envelope, signature: `${envelope.signature.slice(0, -1)}A` };
    const result = await verifyEnvelope(modified, documentBytes);
    expect(result.valid).toBe(false);
  });

  it("rejects a signature paired with the wrong public key", async () => {
    const signer = await generateKeyPair();
    const wrongKey = await generateKeyPair();
    const envelope = await createEnvelope(file, documentBytes, signer.privateKey, signer.publicKey, {
      name: "Signer", role: "Role", institution: "Institution", signedAt: new Date().toISOString(),
    });
    const wrongKeyEnvelope = { ...envelope, publicKey: await exportPublicKey(wrongKey.publicKey) };
    const result = await verifyEnvelope(wrongKeyEnvelope, documentBytes);
    expect(result.valid).toBe(false);
  });
});

describe("encrypted private-key vault", () => {
  it("round-trips with the correct password", async () => {
    const keys = await generateKeyPair();
    const vault = await createEncryptedVault(keys, "correct horse battery");
    const unlocked = await unlockEncryptedVault(vault, "correct horse battery");
    expect(await exportPublicKey(unlocked.publicKey)).toBe(vault.publicKey);
    expect(vault.ciphertext).not.toContain("BEGIN");
  });

  it("rejects a wrong password and tampered ciphertext", async () => {
    const keys = await generateKeyPair();
    const vault = await createEncryptedVault(keys, "correct horse battery");
    await expect(unlockEncryptedVault(vault, "wrong password")).rejects.toThrow();
    const tampered = { ...vault, ciphertext: `${vault.ciphertext[0] === "A" ? "B" : "A"}${vault.ciphertext.slice(1)}` };
    await expect(unlockEncryptedVault(tampered, "correct horse battery")).rejects.toThrow();
  });
});
