import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delay`
 * milliseconds have passed without further changes.
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
