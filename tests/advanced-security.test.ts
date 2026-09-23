import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { exportPublicKey, generateKeyPair } from "@/lib/crypto/ecdsa";
import { createMultiSignerEnvelope, parseMultiSignerEnvelope } from "@/lib/signatures/multi-signer";
import { rotateKey } from "@/lib/vault/key-rotation";
import { createEncryptedVault, unlockEncryptedVault } from "@/lib/vault/encrypted-key-vault";

beforeAll(() => {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
});

const bytes = new TextEncoder().encode("%PDF-1.7\nadvanced fixture\n");
const file = { name: "advanced.pdf", type: "application/pdf", size: bytes.length };
const metadata = (name: string) => ({ name, role: "Penguji", institution: "Siliwangi", signedAt: new Date().toISOString() });

describe("advanced signing", () => {
  it("creates and parses a two-signer envelope", async () => {
    const first = await generateKeyPair();
    const second = await generateKeyPair();
    const envelope = await createMultiSignerEnvelope(file, bytes, [
      { privateKey: first.privateKey, publicKey: first.publicKey, metadata: metadata("A") },
      { privateKey: second.privateKey, publicKey: second.publicKey, metadata: metadata("B") },
    ]);
    const parsed = parseMultiSignerEnvelope(JSON.stringify(envelope));
    expect(parsed.signatures).toHaveLength(2);
    expect(parsed.signatures[0].document.sha256).toBe(parsed.signatures[1].document.sha256);
  });

  it("rotates to a different encrypted key", async () => {
    const oldKeys = await generateKeyPair();
    const oldVault = await createEncryptedVault(oldKeys, "rotation password");
    const result = await rotateKey(oldVault, "rotation password");
    expect(result.previousFingerprint).toBe(oldVault.keyFingerprint);
    expect(result.currentFingerprint).not.toBe(oldVault.keyFingerprint);
    const unlocked = await unlockEncryptedVault(result.vault, "rotation password");
    expect(await exportPublicKey(unlocked.publicKey)).toBe(result.vault.publicKey);
  });
});
