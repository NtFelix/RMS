"use client";

import { useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseTabParamsOptions {
  paramName?: string;
  history?: "replace" | "push";
}

export function useTabParams<T extends string>(
  defaultValue: T,
  validValues: readonly T[],
  options: UseTabParamsOptions = {}
): [T, (tab: T) => void] {
  const { paramName = "tab", history = "replace" } = options;
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Store refs for event handlers to avoid stale closures
  const validValuesRef = useRef(validValues);
  const defaultValueRef = useRef(defaultValue);
  const validValuesKey = validValues.join(",");

  useEffect(() => {
    validValuesRef.current = validValues;
    defaultValueRef.current = defaultValue;
  }, [validValuesKey, defaultValue]);

  const getTabFromParams = useCallback((): T => {
    const tabParam = searchParams?.get(paramName) as T | null;
    if (tabParam && validValuesRef.current.includes(tabParam)) {
      return tabParam;
    }
    return defaultValueRef.current;
  }, [searchParams, paramName]);

  const [activeTab, setActiveTab] = useState<T>(getTabFromParams);

  // Track the raw searchParams query string to detect external URL changes (e.g. Back/Forward)
  const currentQueryString = searchParams?.toString() ?? "";
  const lastQueryStringRef = useRef<string>(currentQueryString);
  const lastValidValuesRef = useRef(validValues);

  useEffect(() => {
    const queryStringChanged = currentQueryString !== lastQueryStringRef.current;
    const validValuesChanged =
      validValues.length !== lastValidValuesRef.current.length ||
      validValues.some((v, i) => v !== lastValidValuesRef.current[i]);

    if (queryStringChanged || validValuesChanged) {
      lastQueryStringRef.current = currentQueryString;
      lastValidValuesRef.current = validValues;
      setActiveTab(getTabFromParams());
    }
  }, [currentQueryString, validValuesKey, getTabFromParams]);

  const setTab = useCallback(
    (tab: T) => {
      setActiveTab(tab);
      const params = new URLSearchParams(window.location.search);
      if (tab === defaultValueRef.current) {
        params.delete(paramName);
      } else {
        params.set(paramName, tab);
      }
      const query = params.toString();
      const url = `${pathname}${query ? `?${query}` : ""}`;
      if (history === "push") {
        window.history.pushState(null, "", url);
      } else {
        window.history.replaceState(null, "", url);
      }
    },
    [pathname, paramName, history]
  );

  return [activeTab, setTab];
}

