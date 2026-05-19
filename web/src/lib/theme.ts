import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'baby-theme';

function readStored(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* ignore */
  }
  return null;
}

function detectInitial(): Theme {
  const stored = readStored();
  if (stored) return stored;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', t);
  // Keep class in sync too — for Tailwind's `dark:` utilities.
  if (t === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#202028' : '#fff8f1');
}

function persist(t: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, t);
  } catch {
    /* ignore */
  }
}

// Module-level state lives outside React. React subscribes via useSyncExternalStore.
let current: Theme = typeof window === 'undefined' ? 'light' : detectInitial();
const listeners = new Set<() => void>();

// Apply once on module load so the DOM attribute matches `current`.
if (typeof document !== 'undefined') applyTheme(current);

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Theme {
  return current;
}

function getServerSnapshot(): Theme {
  return 'light';
}

export function setTheme(t: Theme) {
  if (current === t) return;
  current = t;
  applyTheme(t);
  persist(t);
  listeners.forEach((cb) => cb());
}

export function toggleTheme() {
  setTheme(current === 'dark' ? 'light' : 'dark');
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { theme, setTheme, toggle: toggleTheme };
}
