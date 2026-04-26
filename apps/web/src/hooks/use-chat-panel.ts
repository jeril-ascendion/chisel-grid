'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'cg.chatPanelOpen';

export function useChatPanel(defaultOpen = true) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === '0') setOpen(false);
      else if (stored === '1') setOpen(true);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const setAndPersist = useCallback((next: boolean) => {
    setOpen(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { open: hydrated ? open : defaultOpen, toggle, setOpen: setAndPersist, hydrated };
}
