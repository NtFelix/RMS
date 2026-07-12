"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

export function useTabParams<T extends string>(
  defaultValue: T,
  validValues: readonly T[]
): [T, (tab: T) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = useMemo<T>(() => {
    const tabParam = searchParams.get("tab") as T | null;
    if (tabParam && validValues.includes(tabParam)) {
      return tabParam;
    }
    return defaultValue;
  }, [searchParams, defaultValue, validValues]);

  const setTab = useCallback(
    (tab: T) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === defaultValue) {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams, defaultValue]
  );

  return [currentTab, setTab];
}
