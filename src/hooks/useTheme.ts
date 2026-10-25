import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'packimg-theme';

function readAppliedTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Theme state lives on <html class="dark"> so it can be resolved before first paint
 * (see the inline bootstrap in index.html) and every token reacts to a single class flip.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readAppliedTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#06090a' : '#e9ece6');
    }

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private mode / storage disabled: the in-memory theme still applies.
    }
  }, [theme]);

  // Follow the OS while the user has not made an explicit choice.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = (event: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return;
      } catch {
        return;
      }
      setTheme(event.matches ? 'dark' : 'light');
    };

    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
