import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStorage = new Map();
let useNativeStorage = true;
let hasWarnedAboutFallback = false;

const warnAboutFallback = (error) => {
  if (hasWarnedAboutFallback) return;

  hasWarnedAboutFallback = true;
  console.warn('AsyncStorage native module is unavailable. Using in-memory session storage.', error);
};

const withStorageFallback = async (nativeOperation, fallbackOperation) => {
  if (!useNativeStorage) {
    return fallbackOperation();
  }

  try {
    return await nativeOperation();
  } catch (error) {
    useNativeStorage = false;
    warnAboutFallback(error);
    return fallbackOperation();
  }
};

export const storage = {
  getItem: (key) =>
    withStorageFallback(
      () => AsyncStorage.getItem(key),
      () => memoryStorage.get(key) ?? null
    ),

  setItem: (key, value) =>
    withStorageFallback(
      () => AsyncStorage.setItem(key, value),
      () => {
        memoryStorage.set(key, value);
      }
    ),

  removeItem: (key) =>
    withStorageFallback(
      () => AsyncStorage.removeItem(key),
      () => {
        memoryStorage.delete(key);
      }
    ),
};
