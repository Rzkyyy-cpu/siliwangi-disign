import { exportPublicKey, generateKeyPair, sha256, signDigest, verifyDigest } from "@/lib/crypto/ecdsa";
import { fromBase64Url } from "@/lib/crypto/encoding";

export type BenchmarkStats = {
  iterations: number;
  averageMs: number;
  medianMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
};

export type SignatureBenchmarkReport = {
  generatedAt: string;
  iterations: number;
  keyGeneration: BenchmarkStats;
  signing: BenchmarkStats;
  verification: BenchmarkStats;
  signatureBytes: number;
  publicKeyBytes: number;
};

function statistics(samples: number[]): BenchmarkStats {
  const sorted = [...samples].sort((left, right) => left - right);
  const percentileIndex = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return {
    iterations: samples.length,
    averageMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    p95Ms: sorted[percentileIndex],
  };
}

async function measure<T>(iterations: number, operation: () => Promise<T>): Promise<{ values: T[]; stats: BenchmarkStats }> {
  const values: T[] = [];
  const samples: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    const started = performance.now();
    values.push(await operation());
    samples.push(performance.now() - started);
  }
  return { values, stats: statistics(samples) };
}

export async function benchmarkSignature(
  documentBytes: Uint8Array,
  iterations = 30,
): Promise<SignatureBenchmarkReport> {
  if (!Number.isSafeInteger(iterations) || iterations < 30) {
    throw new Error("Benchmark membutuhkan minimal 30 iterasi.");
  }
  const digest = await sha256(documentBytes);
  await generateKeyPair();
  const keyGeneration = await measure(iterations, generateKeyPair);
  const keyPair = keyGeneration.values[0];
  const signing = await measure(iterations, () => signDigest(keyPair.privateKey, digest));
  const signature = signing.values[0];
  const verification = await measure(iterations, () => verifyDigest(keyPair.publicKey, digest, signature));
  const publicKey = await exportPublicKey(keyPair.publicKey);
  return {
    generatedAt: new Date().toISOString(),
    iterations,
    keyGeneration: keyGeneration.stats,
    signing: signing.stats,
    verification: verification.stats,
    signatureBytes: fromBase64Url(signature).byteLength,
    publicKeyBytes: fromBase64Url(publicKey).byteLength,
  };
}
