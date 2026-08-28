export type DataImageDraft = {
  blob: Blob;
  fileName: string;
  previewBlob?: Blob;
};

export type DataImageDraftRepository = {
  read(workspaceId: string, nodeId: string): Promise<DataImageDraft | null>;
  delete(workspaceId: string, nodeId: string): Promise<void>;
  deleteWorkspace?(workspaceId: string): Promise<void>;
};

export async function createDataImagePreview(blob: Blob): Promise<Blob> {
  if (typeof document === "undefined") return blob;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    return blob;
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * 0.1));
    canvas.height = Math.max(1, Math.round(bitmap.height * 0.1));
    const context = canvas.getContext("2d");
    if (!context) return blob;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const previewType = ["image/jpeg", "image/png", "image/webp"].includes(
      blob.type,
    ) ? blob.type : "image/jpeg";
    return await new Promise((resolve) => canvas.toBlob(
      (preview) => resolve(preview ?? blob),
      previewType,
      0.8,
    ));
  } finally {
    bitmap.close();
  }
}

const databaseName = "flydeck-v2-data-images";
const storeName = "drafts";

export async function readDataImageDraft(
  workspaceId: string,
  nodeId: string,
): Promise<DataImageDraft | null> {
  const database = await openDatabase();
  if (!database) return null;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(draftKey(
      workspaceId,
      nodeId,
    ));
    request.onsuccess = () => {
      const value = request.result as DataImageDraft | undefined;
      resolve(value ?? null);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function writeDataImageDraft(
  workspaceId: string,
  nodeId: string,
  draft: DataImageDraft,
) {
  const database = await openDatabase();
  if (!database) return;
  await transact(database, "readwrite", (store) => store.put(
    draft,
    draftKey(workspaceId, nodeId),
  ));
}

export async function deleteDataImageDraft(
  workspaceId: string,
  nodeId: string,
) {
  const database = await openDatabase();
  if (!database) return;
  await transact(database, "readwrite", (store) => store.delete(draftKey(
    workspaceId,
    nodeId,
  )));
}

export async function deleteWorkspaceDataImageDrafts(workspaceId: string) {
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (typeof cursor.key === "string" && cursor.key.startsWith(`${workspaceId}:`)) {
        cursor.delete();
      }
      cursor.continue();
    };
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export const dataImageDraftRepository: DataImageDraftRepository = {
  read: readDataImageDraft,
  delete: deleteDataImageDraft,
  deleteWorkspace: deleteWorkspaceDataImageDrafts,
};

function draftKey(workspaceId: string, nodeId: string) {
  return `${workspaceId}:${nodeId}`;
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transact(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest,
) {
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    operation(transaction.objectStore(storeName));
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
