import { describe, expect, it } from "vitest";
import { generateMlDsa44KeyPair, ML_DSA_44_SIZES, signMlDsa44, verifyMlDsa44 } from "@/lib/crypto/ml-dsa";

describe("ML-DSA-44 enrichment", () => {
  it("signs and verifies a message with real ML-DSA", () => {
    const message = new TextEncoder().encode("Siliwangi DiSign ML-DSA fixture");
    const keys = generateMlDsa44KeyPair();
    const signature = signMlDsa44(message, keys.secretKey);
    expect(verifyMlDsa44(message, signature, keys.publicKey)).toBe(true);
    expect(verifyMlDsa44(new TextEncoder().encode("tampered"), signature, keys.publicKey)).toBe(false);
    expect(ML_DSA_44_SIZES).toEqual({ publicKeyBytes: 1312, secretKeyBytes: 2560, signatureBytes: 2420 });
  }, 30_000);
});
