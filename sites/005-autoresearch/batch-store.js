(function (root) {
  'use strict';
  let connection;
  function database() {
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      if (!root.indexedDB) { reject(new Error('浏览器没有可用的实验存储。')); return; }
      const request = root.indexedDB.open('autoresearch-observation-batches-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('batches', { keyPath: 'id' });
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('实验存储被其他页面占用。'));
      request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    });
    return connection;
  }
  async function load() {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('batches', 'readonly'), request = transaction.objectStore('batches').getAll();
      transaction.oncomplete = () => resolve(request.result.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3).map(item => item.bundle));
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('读取已中断。'));
    });
  }
  async function save(bundle) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('batches', 'readwrite'), store = transaction.objectStore('batches');
      store.put({ id: bundle.id, updatedAt: Date.now(), bundle });
      const request = store.getAll();
      request.onsuccess = () => request.result.sort((a, b) => b.updatedAt - a.updatedAt).slice(3).forEach(item => store.delete(item.id));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('保存已中断。'));
    });
  }
  root.BatchStore = { load, save };
})(window);
