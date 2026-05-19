import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, CalendarDays, Home, LogOut, Moon, Settings, Sun } from 'lucide-react';
import { api, clearAuthToken, hasAuthToken, setAuthToken } from './lib/api';
import { ageLabelFromDate, dayKey, fmtDay } from './lib/utils';
import { useTheme } from './lib/theme';
import { CalendarPanel } from './components/CalendarPanel';
import { DayView } from './components/DayView';
import { RecommendationsCard } from './components/RecommendationsCard';

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('veli');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.login({ username, password });
      setAuthToken(result.token);
      onLogin();
    } catch {
      setError('Грешно име или парола.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[var(--color-bg)]">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] p-6 space-y-4">
        <div className="text-center space-y-1">
          <div className="text-4xl">🍼</div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Ели — дневник</h1>
          <p className="text-sm text-[var(--color-muted)]">Вход</p>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-[var(--color-muted)]">Потребител</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-brand)]"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-[var(--color-muted)]">Парола</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            autoFocus
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-brand)]"
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--color-brand)] px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Влизане…' : 'Вход'}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [selected, setSelected] = useState<Date>(() => new Date());
  const day = dayKey(selected);
  const { theme, toggle } = useTheme();

  const baby = useQuery({ queryKey: ['baby'], queryFn: api.baby });
  const recentDays = useQuery({ queryKey: ['recent-days'], queryFn: api.recentDays });

  const ageLabel = useMemo(() => {
    if (!baby.data) return '';
    return ageLabelFromDate(baby.data.birthDate, day);
  }, [baby.data, day]);

  useEffect(() => {
    document.title = baby.data ? `🍼 ${baby.data.name} — дневник` : '🍼 Дневник';
  }, [baby.data]);

  return (
    <div className="min-h-screen w-full pb-[env(safe-area-inset-bottom)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-bg)]/70 backdrop-blur-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-6xl px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">🍼</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-lg font-semibold truncate">{baby.data?.name ?? 'Бебе'} — дневник</h1>
            <p className="text-[11px] sm:text-xs text-[var(--color-muted)] truncate">
              {ageLabel} · HiPP Combiotic 1
            </p>
          </div>
          <div className="text-right text-[11px] sm:text-xs text-[var(--color-muted)] shrink-0">
            <div className="font-medium text-[var(--color-ink)]">{fmtDay(selected)}</div>
            <div className="hidden sm:block">избран ден</div>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Светла тема' : 'Тъмна тема'}
            title={theme === 'dark' ? 'Светла тема' : 'Тъмна тема'}
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-dim)] hover:text-[var(--color-brand)] hover:border-[var(--color-brand)] transition"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Изход"
            title="Изход"
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-dim)] hover:text-red-500 hover:border-red-400 transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="lg:hidden mx-auto max-w-6xl px-3 sm:px-5 pt-3 space-y-3">
        <DateStrip selected={selected} onSelect={setSelected} birthDate={baby.data?.birthDate} />
        <details className="group">
          <summary className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] px-4 py-3 text-sm font-semibold cursor-pointer select-none flex items-center justify-between list-none [&::-webkit-details-marker]:hidden">
            <span>📅 Смени ден</span>
            <span className="text-xs text-[var(--color-muted)] group-open:hidden">{fmtDay(selected)}</span>
            <span className="text-xs text-[var(--color-muted)] hidden group-open:inline">скрий ↑</span>
          </summary>
          <div className="mt-2">
            <CalendarPanel
              selected={selected}
              onSelect={(d) => d && setSelected(d)}
              daysWithData={recentDays.data?.map((r) => r.day) ?? []}
              birthDate={baby.data?.birthDate}
            />
          </div>
        </details>
      </div>

      <main className="mx-auto max-w-6xl px-3 sm:px-5 py-4 sm:py-6 grid gap-4 sm:gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="hidden lg:block space-y-4">
          <CalendarPanel
            selected={selected}
            onSelect={(d) => d && setSelected(d)}
            daysWithData={recentDays.data?.map((r) => r.day) ?? []}
            birthDate={baby.data?.birthDate}
          />
          {baby.data && <RecommendationsCard day={day} />}
        </aside>

        <section className="min-w-0">
          <DayView day={day} />
        </section>

        {baby.data && (
          <div className="lg:hidden">
            <RecommendationsCard day={day} />
          </div>
        )}
      </main>

      <MobileBottomNav />

      <footer className="text-center text-[11px] sm:text-xs text-[var(--color-muted)] px-4 pt-6 pb-24 lg:pb-6">
        Препоръката е от опаковката HiPP Combiotic 1. Реалните дози са в "Моят план". Винаги следвай педиатър.
      </footer>
    </div>
  );
}


function DateStrip({ selected, onSelect, birthDate }: { selected: Date; onSelect: (d: Date) => void; birthDate?: string }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 4 + i);
    return d;
  });
  const min = birthDate ? new Date(birthDate + 'T00:00:00') : null;
  const selectedKey = dayKey(selected);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
      {days.map((d) => {
        const disabled = min ? d < min : false;
        const active = dayKey(d) === selectedKey;
        return (
          <button
            key={dayKey(d)}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(d)}
            className={`snap-start min-w-[3.25rem] rounded-2xl border px-2 py-2 text-center shadow-sm transition disabled:opacity-40 ${
              active
                ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-[var(--color-on-brand)]'
                : 'bg-[var(--color-surface)] border-[var(--color-line)] text-[var(--color-muted)]'
            }`}
          >
            <span className="block text-[10px] uppercase font-semibold">
              {d.toLocaleDateString('bg-BG', { weekday: 'short' })}
            </span>
            <span className={`block text-lg font-extrabold tabular-nums ${active ? 'text-white' : 'text-[var(--color-ink)]'}`}>
              {d.getDate()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MobileBottomNav() {
  const items = [
    { icon: <Home size={19} />, label: 'Днес', active: true },
    { icon: <CalendarDays size={19} />, label: 'Дни' },
    { icon: <BarChart3 size={19} />, label: 'Тренд' },
    { icon: <Settings size={19} />, label: 'План' },
  ];
  return (
    <nav className="lg:hidden fixed left-3 right-3 bottom-3 z-20 rounded-[1.6rem] border border-[var(--color-line)] bg-[var(--color-surface)]/90 backdrop-blur-xl shadow-[var(--shadow-soft)] p-2 grid grid-cols-4 gap-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className={`rounded-2xl py-2 text-[11px] font-bold flex flex-col items-center gap-1 ${item.active ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]' : 'text-[var(--color-muted)]'}`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => hasAuthToken());
  const queryClient = useQueryClient();

  useEffect(() => {
    const onClear = () => {
      queryClient.clear();
      setAuthed(false);
    };
    window.addEventListener('baby-auth-cleared', onClear);
    return () => window.removeEventListener('baby-auth-cleared', onClear);
  }, [queryClient]);

  function logout() {
    clearAuthToken();
  }

  function login() {
    queryClient.clear();
    setAuthed(true);
  }

  return authed ? <Dashboard onLogout={logout} /> : <LoginPage onLogin={login} />;
}
