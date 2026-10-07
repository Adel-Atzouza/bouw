import type { IntakeDraft } from "./intake";

const storeName = "drafts";
// IndexedDB preserves actual File objects without putting photos in localStorage.
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("bouwaanhuis-opname", 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Sluit andere tabbladen en probeer opnieuw."));
  });
}
export async function readDraft(): Promise<IntakeDraft | null> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(storeName, "readonly").objectStore(storeName).get("current");
      request.onsuccess = () => {
        const draft = request.result as IntakeDraft | undefined;
        resolve(draft?.version === 1 && Array.isArray(draft.selected) && draft.answers && draft.files ? draft : null);
      };
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
async function mutateDraft(draft?: IntakeDraft): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      if (draft) transaction.objectStore(storeName).put(draft, "current");
      else transaction.objectStore(storeName).delete("current");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}
export const writeDraft = (draft: IntakeDraft) => mutateDraft(draft);
export const deleteDraft = () => mutateDraft();
