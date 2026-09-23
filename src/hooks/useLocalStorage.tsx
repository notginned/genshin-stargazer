import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { isNull } from "../utils/lib";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const storedItem = localStorage.getItem(key);

  const item = isNull(storedItem) ? initialValue : JSON.parse(storedItem);
  const [value, setValue] = useState<T>(item);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] satisfies [T, Dispatch<SetStateAction<T>>];
}
