import { Menu, X } from 'lucide-react';
import { useState } from 'react';

interface TopBarProps {
  onNavigateSection: (sectionId: string) => void;
}

const NAV_LINKS = [
  { id: 'programs', label: 'Программы' },
  { id: 'terms', label: 'Условия' },
  { id: 'consultant', label: 'AI-консультант' },
  { id: 'documents', label: 'База документов' },
];

export function TopBar({ onNavigateSection }: TopBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (id: string) => {
    setMobileMenuOpen(false);
    onNavigateSection(id);
  };

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-slate-800/80 bg-[#0B0F17]/95 backdrop-blur-sm">
      <div className="max-w-[1360px] mx-auto h-full px-4 lg:px-8 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display text-[17px] font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded-sm"
        >
          ФактБаза
        </a>

        {/* Zone 2: 4 concise single-line text links */}
        <nav
          aria-label="Разделы учебного центра"
          className="hidden md:flex items-center gap-7"
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => handleNav(link.id)}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:text-white"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('enroll')}
            className="px-4 py-2 text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA]"
          >
            Записаться на курс
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Меню навигации"
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#0F1522] px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => handleNav(link.id)}
              className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800/60 rounded-md cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
