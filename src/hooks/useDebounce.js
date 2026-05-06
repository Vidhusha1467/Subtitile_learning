import { useEffect, useRef, useCallback } from "react";

/**
 * Returns a debounced version of the provided callback.
 * The callback fires only after `delay` ms of inactivity.
 * Uses useRef to always call the latest version of the callback,
 * and useCallback so the returned function is stable across renders.
 */
export const useDebounce = (callback, delay) => {
  const timerRef    = useRef(null);
  const callbackRef = useRef(callback);

  // Always keep the latest callback in the ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Return a stable debounced function
  const debounced = useCallback((...args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  return debounced;
};
