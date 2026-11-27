import { Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { PlanTier } from '../types/tutor';
import { Button } from './ui/primitives';

interface TutorNavbarProps {
  theme: 'dark' | 'light';
  plan: PlanTier;
  onToggleTheme: () => void;
  onNavigate: (id: string) => void;
  onOpenUpgrade: () => void;
}

const NAV_ITEMS = [
  { id: 'levels', label: 'Этапы' },
  { id: 'studio', label: 'Практика' },
  { id: 'catalog', label: 'Услуги и учителя' },
  { id: 'pricing', label: 'Тарифы' },
];

export function TutorNavbar({
  theme,
  plan,
  onToggleTheme,
  onNavigate,
  onOpenUpgrade,
}: TutorNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLink = (id: string) => {
    setMobileOpen(false);
    onNavigate(id);
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-[1360px] mx-auto h-full px-4 lg:px-8 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-heading text-lg font-bold tracking-tight text-foreground whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          Словесность
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Основная навигация"
          className="hidden md:flex items-center gap-8"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleLink(item.id)}
              className="font-heading text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Theme switcher + primary CTA */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleTheme}
            aria-label={
              theme === 'dark'
                ? 'Переключить на светлую тему'
                : 'Переключить на тёмную тему'
            }
            className="gap-1.5"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[#499BED]" />
                <span className="hidden sm:inline">Светлая</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#022E5B]" />
                <span className="hidden sm:inline">Тёмная</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant={plan === 'pro' ? 'secondary' : 'accent'}
            size="sm"
            onClick={() => (plan === 'pro' ? handleLink('studio') : onOpenUpgrade())}
          >
            {plan === 'pro' ? 'Тариф Pro активен' : 'Подключить Pro'}
          </Button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Открыть меню"
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-b border-border bg-card px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleLink(item.id)}
              className="block w-full text-left px-3 py-2 font-heading text-sm font-medium text-foreground hover:bg-secondary/60 rounded-md cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
