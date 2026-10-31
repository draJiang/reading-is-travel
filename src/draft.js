const databaseName = 'reading-is-travel-drafts';
const storeName = 'drafts';

export function openDrafts() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function draftOperation(db, method, key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, method === 'get' ? 'readonly' : 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = method === 'put' ? store.put(value, key) : store[method](key);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
