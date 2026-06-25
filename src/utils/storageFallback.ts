const DB_NAME = "ControlCenterOfflineDB_v2";
const STORE_NAME = "app_state_v2";
const DB_VERSION = 1;

/**
 * Safely writes to localStorage without risking crashes due to security settings or QuotaExceededError.
 */
export function safeLocalStorageSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
  } catch (err) {
    console.warn("safeLocalStorageSetItem failed to write to localStorage (possibly quota exceeded):", err);
  }
}

/**
 * Safely reads from localStorage.
 */
export function safeLocalStorageGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(key);
    }
  } catch (err) {
    console.warn("safeLocalStorageGetItem failed to read from localStorage:", err);
  }
  return null;
}

/**
 * Retrieves a key's value from IndexedDB.
 */
export function getFromIndexedDB(key: string): Promise<any | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        try {
          const transaction = db.transaction(STORE_NAME, "readonly");
          const store = transaction.objectStore(STORE_NAME);
          const getReq = store.get(key);

          getReq.onsuccess = () => {
            resolve(getReq.result || null);
          };

          getReq.onerror = () => {
            console.warn("StorageFallback: IndexedDB request error reading key:", key);
            resolve(null);
          };
        } catch (err) {
          console.warn("StorageFallback: IndexedDB transaction error reading key:", key, err);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.warn("StorageFallback: IndexedDB open error reading key:", key);
        resolve(null);
      };
    } catch (e) {
      console.warn("StorageFallback: IndexedDB not supported or failed reading key:", key, e);
      resolve(null);
    }
  });
}

/**
 * Saves a key-value pair to IndexedDB.
 */
export function saveToIndexedDB(key: string, data: any): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") {
        resolve();
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        try {
          const transaction = db.transaction(STORE_NAME, "readwrite");
          const store = transaction.objectStore(STORE_NAME);
          const putReq = store.put(data, key);

          putReq.onsuccess = () => {
            resolve();
          };

          putReq.onerror = () => {
            console.warn("StorageFallback: IndexedDB put request error for key:", key);
            resolve();
          };
        } catch (err) {
          console.warn("StorageFallback: IndexedDB transaction error to write key:", key, err);
          resolve();
        }
      };

      request.onerror = () => {
        console.warn("StorageFallback: IndexedDB open error writing key:", key);
        resolve();
      };
    } catch (e) {
      console.warn("StorageFallback: IndexedDB not supported or failed writing key:", key, e);
      resolve();
    }
  });
}
