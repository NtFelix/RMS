"use client";

import { useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export function useTabParams<T extends string>(
  defaultValue: T,
  validValues: readonly T[]
): [T, (tab: T) => void] {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Stabilize props via refs so stale closures aren't a problem
  const validValuesRef = useRef(validValues);
  const defaultValueRef = useRef(defaultValue);
  validValuesRef.current = validValues;
  defaultValueRef.current = defaultValue;

  const getTabFromParams = useCallback((): T => {
    const tabParam = searchParams.get("tab") as T | null;
    if (tabParam && validValuesRef.current.includes(tabParam)) {
      return tabParam;
    }
    return defaultValueRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<T>(getTabFromParams);

  // Sync state when URL changes externally (back/forward browser navigation)
  useEffect(() => {
    setActiveTab(getTabFromParams());
  }, [getTabFromParams]);

  const setTab = useCallback(
    (tab: T) => {
      setActiveTab(tab);
      const params = new URLSearchParams(window.location.search);
      if (tab === defaultValueRef.current) {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${pathname}${query ? `?${query}` : ""}`
      );
    },
    [pathname]
  );

  return [activeTab, setTab];
}
