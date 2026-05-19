import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const dayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
};

export const fmtDay = (d: Date) =>
  d.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' });

export function ageLabelFromDate(birthISO: string, atISO: string): string {
  const b = new Date(birthISO + 'T00:00:00');
  const a = new Date(atISO + 'T00:00:00');
  let months = (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
  let days = a.getDate() - b.getDate();
  if (days < 0) {
    months -= 1;
    const prev = new Date(a.getFullYear(), a.getMonth(), 0).getDate();
    days += prev;
  }
  return `${months} мес. ${days} дни`;
}
