import { EncryptedKeyVault } from "./encrypted-key-vault";

const DATABASE_NAME = "siliwangi-disign";
const DATABASE_VERSION = 1;
const STORE_NAME = "vaults";
const VAULT_ID = "primary";
const LEGACY_STORAGE_KEY = "siliwangi:encrypted-key-vault";

function openVaultDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Database vault tidak dapat dibuka."));
  });
}

export async function readVault(): Promise<EncryptedKeyVault | null> {
  if (typeof indexedDB === "undefined") return readLegacyVault();
  const database = await openVaultDatabase();
  try {
    const stored = await new Promise<EncryptedKeyVault | null>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(VAULT_ID);
      request.onsuccess = () => resolve(request.result?.vault ?? null);
      request.onerror = () => reject(request.error);
    });
    if (stored) return stored;
    const legacy = readLegacyVault();
    if (legacy) await writeVault(legacy);
    return legacy;
  } finally {
    database.close();
  }
}

export async function writeVault(vault: EncryptedKeyVault): Promise<void> {
  if (typeof indexedDB === "undefined") {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(vault));
    return;
  }
  const database = await openVaultDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({ id: VAULT_ID, vault, updatedAt: new Date().toISOString() });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Vault tidak dapat disimpan."));
    });
  } finally {
    database.close();
  }
}

export async function deleteVault(): Promise<void> {
  if (typeof indexedDB === "undefined") {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }
  const database = await openVaultDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(VAULT_ID);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function readLegacyVault(): EncryptedKeyVault | null {
  const value = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as EncryptedKeyVault;
  } catch {
    return null;
  }
}
