import { useState, useEffect, useCallback } from 'react';

/**
 * 使用 localStorage 持久化状态的 Hook
 * @param key localStorage 键名
 * @param initialValue 初始值
 * @returns [value, setValue, clearValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // 初始化状态
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 更新 localStorage
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // 清除存储的值
  const clearValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error clearing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, clearValue];
}

/**
 * 防抖保存到 localStorage
 * @param key localStorage 键名
 * @param value 要保存的值
 * @param delay 防抖延迟 (ms)
 */
export function useDebouncedLocalStorage<T>(
  key: string,
  value: T,
  delay: number = 500
): void {
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn(`Error saving to localStorage key "${key}":`, error);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [key, value, delay]);
}

/**
 * 从 localStorage 读取值
 * @param key localStorage 键名
 * @param defaultValue 默认值
 * @returns 存储的值或默认值
 */
export function getStoredValue<T>(key: string, defaultValue: T): T {
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * 保存值到 localStorage
 * @param key localStorage 键名
 * @param value 要保存的值
 */
export function setStoredValue<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error setting localStorage key "${key}":`, error);
  }
}

export default useLocalStorage;
