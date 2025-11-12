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

export async function saveImage(id: string, data: string): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([IMAGES_STORE], "readwrite");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.put({ id, data, timestamp: Date.now() });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getImage(id: string): Promise<string | null> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([IMAGES_STORE], "readonly");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.data : null);
    };
  });
}

export async function getAllImages(): Promise<Array<{ id: string; data: string }>> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([IMAGES_STORE], "readonly");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = request.result.map((item) => ({
        id: item.id,
        data: item.data,
      }));
      resolve(results);
    };
  });
}

export async function deleteImage(id: string): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([IMAGES_STORE], "readwrite");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function saveSong(
  id: string,
  title: string,
  artist: string,
  data: string
): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([SONGS_STORE], "readwrite");
    const store = transaction.objectStore(SONGS_STORE);
    const request = store.put({ id, title, artist, data, timestamp: Date.now() });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getAllSongs(): Promise<
  Array<{ id: string; title: string; artist: string; data: string }>
> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([SONGS_STORE], "readonly");
    const store = transaction.objectStore(SONGS_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = request.result.map((item) => ({
        id: item.id,
        title: item.title,
        artist: item.artist,
        data: item.data,
      }));
      resolve(results);
    };
  });
}

export async function deleteSong(id: string): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([SONGS_STORE], "readwrite");
    const store = transaction.objectStore(SONGS_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function clearAllData(): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([IMAGES_STORE, SONGS_STORE], "readwrite");

    const imagesStore = transaction.objectStore(IMAGES_STORE);
    const songsStore = transaction.objectStore(SONGS_STORE);

    const imagesRequest = imagesStore.clear();
    const songsRequest = songsStore.clear();

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}
