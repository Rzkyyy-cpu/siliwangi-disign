import { describe, expect, it } from "vitest";
import { generateKeyPair } from "@/lib/crypto/ecdsa";
import { generateMlDsa44KeyPair } from "@/lib/crypto/ml-dsa";
import { createHybridEnvelope, verifyHybridEnvelope } from "@/lib/signatures/hybrid-envelope";

const bytes = new TextEncoder().encode("hybrid document fixture");
const file = { name: "hybrid.pdf", type: "application/pdf", size: bytes.length };

describe("hybrid ECDSA and ML-DSA envelope", () => {
  it("requires both independent signatures to verify", async () => {
    const ecdsa = await generateKeyPair();
    const mlDsa = generateMlDsa44KeyPair();
    const envelope = await createHybridEnvelope(file, bytes, ecdsa, mlDsa, {
      name: "Signer", role: "Role", institution: "Siliwangi", signedAt: new Date().toISOString(),
    });
    const valid = await verifyHybridEnvelope(envelope, bytes);
    expect(valid.valid).toBe(true);
    const tampered = new Uint8Array(bytes);
    tampered[0] ^= 1;
    expect((await verifyHybridEnvelope(envelope, tampered)).valid).toBe(false);
  }, 30_000);
});
