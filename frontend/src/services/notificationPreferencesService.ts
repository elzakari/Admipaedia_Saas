import { PerClassNotifyPref, NotifyMode } from '../types/lesson';

const STORAGE_KEY = 'admipaedia:lesson_notify_prefs';
const DEFAULT_MODE: NotifyMode = 'badge';

interface StorageSchema {
  version: number;
  prefs: Record<number, PerClassNotifyPref>;
}

const CURRENT_VERSION = 1;

const readStorage = (): StorageSchema => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { version: CURRENT_VERSION, prefs: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { version: CURRENT_VERSION, prefs: {} };
    }
    const parsed = JSON.parse(raw) as StorageSchema;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== CURRENT_VERSION) {
      return { version: CURRENT_VERSION, prefs: {} };
    }
    if (!parsed.prefs || typeof parsed.prefs !== 'object') {
      parsed.prefs = {};
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to read notification preferences from localStorage:', err);
    return { version: CURRENT_VERSION, prefs: {} };
  }
};

const writeStorage = (schema: StorageSchema): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
  } catch (err) {
    console.warn('Failed to write notification preferences to localStorage:', err);
  }
};

const normalizeMode = (mode: unknown): NotifyMode => {
  if (mode === 'push' || mode === 'badge' || mode === 'none') {
    return mode;
  }
  return DEFAULT_MODE;
};

const notificationPreferencesService = {
  getPerClassLiveNotify(classId: number): PerClassNotifyPref {
    const storage = readStorage();
    const existing = storage.prefs[classId];
    if (existing) {
      return {
        ...existing,
        notify_mode: normalizeMode(existing.notify_mode),
      };
    }
    const pref: PerClassNotifyPref = {
      class_id: classId,
      notify_mode: DEFAULT_MODE,
      updated_at: new Date().toISOString(),
    };
    return pref;
  },

  setPerClassLiveNotify(classId: number, mode: NotifyMode): PerClassNotifyPref {
    const normalizedMode = normalizeMode(mode);
    const storage = readStorage();
    const pref: PerClassNotifyPref = {
      class_id: classId,
      notify_mode: normalizedMode,
      updated_at: new Date().toISOString(),
    };
    storage.prefs[classId] = pref;
    writeStorage(storage);
    return pref;
  },

  getAllPerClassLiveNotify(): PerClassNotifyPref[] {
    const storage = readStorage();
    return Object.values(storage.prefs).map((pref) => ({
      ...pref,
      notify_mode: normalizeMode(pref.notify_mode),
    }));
  },

  clearPerClassLiveNotify(classId: number): boolean {
    const storage = readStorage();
    const existed = classId in storage.prefs;
    if (existed) {
      delete storage.prefs[classId];
      writeStorage(storage);
    }
    return existed;
  },

  clearAllPerClassLiveNotify(): void {
    writeStorage({ version: CURRENT_VERSION, prefs: {} });
  },
};

export default notificationPreferencesService;
export { notificationPreferencesService };
