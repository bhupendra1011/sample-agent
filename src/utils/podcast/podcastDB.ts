// src/utils/podcast/podcastDB.ts
// Lightweight IndexedDB wrapper for podcast transcript/chat persistence.

import type { PodcastTranscriptEntry, AudienceMessage } from "@/types/podcast";

const DB_NAME = "podcast-studio";
const DB_VERSION = 1;

const STORE_TRANSCRIPTS = "transcripts";
const STORE_AUDIENCE = "audienceMessages";
const STORE_SESSION = "lastSession";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_TRANSCRIPTS)) {
        db.createObjectStore(STORE_TRANSCRIPTS);
      }
      if (!db.objectStoreNames.contains(STORE_AUDIENCE)) {
        db.createObjectStore(STORE_AUDIENCE);
      }
      if (!db.objectStoreNames.contains(STORE_SESSION)) {
        db.createObjectStore(STORE_SESSION);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putValue(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getValue<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const podcastDB = {
  async saveTranscripts(sessionId: string, transcripts: PodcastTranscriptEntry[]): Promise<void> {
    await putValue(STORE_TRANSCRIPTS, sessionId, transcripts);
  },

  async getTranscripts(sessionId: string): Promise<PodcastTranscriptEntry[]> {
    return (await getValue<PodcastTranscriptEntry[]>(STORE_TRANSCRIPTS, sessionId)) ?? [];
  },

  async saveAudienceMessages(sessionId: string, messages: AudienceMessage[]): Promise<void> {
    await putValue(STORE_AUDIENCE, sessionId, messages);
  },

  async getAudienceMessages(sessionId: string): Promise<AudienceMessage[]> {
    return (await getValue<AudienceMessage[]>(STORE_AUDIENCE, sessionId)) ?? [];
  },

  async saveLastSession(session: { sessionId: string; config: unknown; status: string }): Promise<void> {
    await putValue(STORE_SESSION, "current", session);
  },

  async getLastSession(): Promise<{ sessionId: string; config: unknown; status: string } | undefined> {
    return getValue(STORE_SESSION, "current");
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      clearStore(STORE_TRANSCRIPTS),
      clearStore(STORE_AUDIENCE),
      clearStore(STORE_SESSION),
    ]);
  },
};
