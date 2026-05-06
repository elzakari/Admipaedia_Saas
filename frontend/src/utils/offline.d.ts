// Type definitions for offline.js utility

// Store names enum
export const STORES: {
  GRADES: string;
  ATTENDANCE: string;
  EXAMS: string;
  CACHE: string;
};

// Database functions
export function openDatabase(): Promise<IDBDatabase>;

// Item management functions
export function addItem(storeName: string, item: any): Promise<number | string>;
export function getAllItems(storeName: string): Promise<any[]>;
export function deleteItem(storeName: string, id: number | string): Promise<void>;
export function clearStore(storeName: string): Promise<void>;

// Cache management functions
export function cacheApiResponse(url: string, data: any): Promise<boolean>;
export function getCachedApiResponse(url: string): Promise<any | null>;

// Sync functions
export function queueDataForSync(storeName: string, data: any, token: string): Promise<number | string>;
export function hasPendingData(): Promise<boolean>;
export function getSyncQueueStatus(): Promise<{
  total: number;
  details: {
    grades: number;
    attendance: number;
    exams: number;
  }
}>;
export function cleanupOldCache(maxAgeDays?: number): Promise<number>;