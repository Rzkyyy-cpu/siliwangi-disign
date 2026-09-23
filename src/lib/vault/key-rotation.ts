import { createEncryptedVault, EncryptedKeyVault } from "./encrypted-key-vault";
import { generateKeyPair } from "@/lib/crypto/ecdsa";

export type KeyRotationResult = {
  vault: EncryptedKeyVault;
  previousFingerprint: string | null;
  currentFingerprint: string;
};

export async function rotateKey(
  currentVault: EncryptedKeyVault | null,
  password: string,
): Promise<KeyRotationResult> {
  const keyPair = await generateKeyPair();
  const vault = await createEncryptedVault(keyPair, password);
  return {
    vault,
    previousFingerprint: currentVault?.keyFingerprint ?? null,
    currentFingerprint: vault.keyFingerprint,
  };
}
