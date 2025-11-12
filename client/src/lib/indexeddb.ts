// Utilitário para gerenciar IndexedDB e armazenar imagens e músicas

const DB_NAME = "RomanticSiteDB";
const DB_VERSION = 1;
const IMAGES_STORE = "images";
const SONGS_STORE = "songs";

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Criar store para imagens
      if (!database.objectStoreNames.contains(IMAGES_STORE)) {
        database.createObjectStore(IMAGES_STORE, { keyPath: "id" });
      }

      // Criar store para músicas
      if (!database.objectStoreNames.contains(SONGS_STORE)) {
        database.createObjectStore(SONGS_STORE, { keyPath: "id" });
      }
    };
  });
}

// ------ FUNÇÕES DE ESCRITA CORRIGIDAS (ESPERAM PELA TRANSAÇÃO) ------

async function performWriteTransaction(
  storeName: string,
  action: (store: IDBObjectStore) => IDBRequest
): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    
    const request = action(store);

    request.onerror = () => reject(request.error);
    // Não resolvemos no onsuccess do request!

    // Resolvemos apenas quando a TRANSAÇÃO for concluída
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function saveImage(id: string, data: Blob): Promise<void> {
  return performWriteTransaction(IMAGES_STORE, (store) =>
    store.put({ id, data, timestamp: Date.now() })
  );
}

export async function deleteImage(id: string): Promise<void> {
  return performWriteTransaction(IMAGES_STORE, (store) => store.delete(id));
}

export async function saveSong(
  id: string,
  title: string,
  artist: string,
  data: Blob
): Promise<void> {
  return performWriteTransaction(SONGS_STORE, (store) =>
    store.put({ id, title, artist, data, timestamp: Date.now() })
  );
}

export async function deleteSong(id: string): Promise<void> {
  return performWriteTransaction(SONGS_STORE, (store) => store.delete(id));
}

export async function clearAllData(): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      [IMAGES_STORE, SONGS_STORE],
      "readwrite"
    );

    transaction.objectStore(IMAGES_STORE).clear();
    transaction.objectStore(SONGS_STORE).clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ------ FUNÇÕES DE LEITURA (NÃO PRECISAM DE MUDANÇA, MAS MANTIDAS PARA CONTEXTO) ------

async function performReadTransaction<T>(
  storeName: string,
  action: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = action(store);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getImage(id: string): Promise<Blob | null> {
  const result = await performReadTransaction<{ id: string; data: Blob }>(
    IMAGES_STORE,
    (store) => store.get(id)
  );
  return result ? result.data : null;
}

export async function getAllImages(): Promise<Array<{ id: string; data: Blob }>> {
  return performReadTransaction<Array<{ id: string; data: Blob }>>(
    IMAGES_STORE,
    (store) => store.getAll()
  );
}

export async function getAllSongs(): Promise<
  Array<{ id: string; title: string; artist: string; data: Blob }>
> {
  return performReadTransaction<
    Array<{ id: string; title: string; artist: string; data: Blob }>
  >(SONGS_STORE, (store) => store.getAll());
}