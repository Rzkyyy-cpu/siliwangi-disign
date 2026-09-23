import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { benchmarkSignature } from "@/lib/benchmark/signature-benchmark";

beforeAll(() => {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
});

describe("signature benchmark", () => {
  it("collects at least 30 samples and reports key sizes", async () => {
    const report = await benchmarkSignature(new TextEncoder().encode("benchmark PDF fixture"), 30);
    expect(report.iterations).toBe(30);
    expect(report.signing.iterations).toBe(30);
    expect(report.verification.iterations).toBe(30);
    expect(report.signatureBytes).toBeGreaterThan(0);
    expect(report.publicKeyBytes).toBeGreaterThan(0);
  }, 30_000);
});
