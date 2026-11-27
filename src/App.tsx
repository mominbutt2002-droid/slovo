import { useEffect, useRef, useState } from 'react';
import { BookingPrefill, FloatingTutorAgent } from './components/FloatingTutorAgent';
import { PracticeStudio } from './components/PracticeStudio';
import { PricingSection } from './components/PricingSection';
import { SchoolCatalogSection } from './components/SchoolCatalogSection';
import { StripeCheckoutModal } from './components/StripeCheckoutModal';
import { TutorHero } from './components/TutorHero';
import { TutorNavbar } from './components/TutorNavbar';
import { useDailyQuota } from './hooks/useDailyQuota';
import { verifyStripeSession } from './services/tutorApi';
import {
  PlanTier,
  PracticeTab,
  ProficiencyLevel,
  TutorMessage,
} from './types/tutor';

const STORAGE = {
  theme: 'slovesnost_theme_v1',
  plan: 'slovesnost_plan_v1',
  level: 'slovesnost_level_v1',
  lessons: 'slovesnost_completed_lessons_v1',
  messages: 'slovesnost_messages_v1',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return (JSON.parse(raw) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    readStorage<'dark' | 'light'>(STORAGE.theme, 'dark')
  );
  const [plan, setPlan] = useState<PlanTier>(() =>
    readStorage<PlanTier>(STORAGE.plan, 'free')
  );
  const [activeLevel, setActiveLevel] = useState<ProficiencyLevel>(() =>
    readStorage<ProficiencyLevel>(STORAGE.level, 'beginner')
  );
  const [activeTab, setActiveTab] = useState<PracticeTab>('chat');
  const [agentOpen, setAgentOpen] = useState(false);
  const [bookingPrefill, setBookingPrefill] = useState<BookingPrefill | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE.lessons, [])
  );
  const [messages, setMessages] = useState<TutorMessage[]>(() =>
    readStorage<TutorMessage[]>(STORAGE.messages, [])
  );
  const [timerRunning, setTimerRunning] = useState(true);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE.theme, JSON.stringify(theme));
    } catch {
      // Ignore storage error
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.plan, JSON.stringify(plan));
    } catch {
      // Ignore
    }
  }, [plan]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.level, JSON.stringify(activeLevel));
    } catch {
      // Ignore
    }
  }, [activeLevel]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.lessons, JSON.stringify(completedLessonIds));
    } catch {
      // Ignore
    }
  }, [completedLessonIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.messages, JSON.stringify(messages));
    } catch {
      // Ignore
    }
  }, [messages]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('stripe_session_id');
    const canceled = params.get('stripe_canceled');

    if (sessionId) {
      void verifyStripeSession(sessionId).then((paid) => {
        if (paid) {
          setPlan('pro');
          showToast('Оплата через Stripe подтверждена! Тариф Pro активирован.');
        } else {
          showToast('Статус оплаты Stripe ещё не подтверждён.');
        }
        window.history.replaceState({}, '', window.location.pathname);
      });
    } else if (canceled) {
      showToast('Оплата в Stripe отменена. Вы остаётесь на тарифе Free.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const quota = useDailyQuota(plan, timerRunning && !stripeModalOpen);

  const navigateTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleToggleLessonCompleted = (lessonId: string) => {
    setCompletedLessonIds((prev) =>
      prev.includes(lessonId)
        ? prev.filter((id) => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TutorNavbar
        theme={theme}
        plan={plan}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onNavigate={navigateTo}
        onOpenUpgrade={() => setStripeModalOpen(true)}
      />

      <main className="flex-1">
        <TutorHero
          activeLevel={activeLevel}
          onSelectLevel={(lvl) => {
            setActiveLevel(lvl);
            navigateTo('studio');
          }}
          onStartPractice={() => navigateTo('studio')}
          onOpenAgent={() => setAgentOpen(true)}
          onGoToPricing={() => navigateTo('pricing')}
        />

        <PracticeStudio
          plan={plan}
          activeLevel={activeLevel}
          activeTab={activeTab}
          completedLessonIds={completedLessonIds}
          messages={messages}
          remainingSeconds={quota.remainingSeconds}
          percentRemaining={quota.percentRemaining}
          isLimitReached={quota.isLimitReached}
          secondsToMidnight={quota.secondsToMidnight}
          timerRunning={timerRunning}
          onToggleTimer={() => setTimerRunning((v) => !v)}
          onSelectLevel={setActiveLevel}
          onSelectTab={setActiveTab}
          onToggleLessonCompleted={handleToggleLessonCompleted}
          onAddMessages={setMessages}
          onClearChat={() => setMessages([])}
          onOpenUpgrade={() => setStripeModalOpen(true)}
        />

        <SchoolCatalogSection
          onBookInAgentChat={(prefill) => {
            setBookingPrefill(prefill ?? {});
            setAgentOpen(true);
          }}
        />

        <PricingSection
          plan={plan}
          onSelectFree={() => {
            if (plan === 'pro') {
              setPlan('free');
              showToast('Переключено на тариф Free (10 мин практики в день).');
            }
            navigateTo('studio');
          }}
          onOpenStripeCheckout={() => setStripeModalOpen(true)}
        />
      </main>

      <footer className="border-t border-border bg-card py-8 pb-24 sm:pb-8">
        <div className="max-w-[1360px] mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading font-semibold text-foreground">
              Словесность
            </span>
            <span aria-hidden="true">·</span>
            <span>Персональный AI-репетитор по русскому языку</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-xs tabular-nums">© 2026</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 font-heading text-xs">
            <button
              type="button"
              onClick={() => navigateTo('levels')}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Этапы
            </button>
            <button
              type="button"
              onClick={() => navigateTo('studio')}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Практика
            </button>
            <button
              type="button"
              onClick={() => navigateTo('catalog')}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Услуги и учителя
            </button>
            <button
              type="button"
              onClick={() => navigateTo('pricing')}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Тарифы и Stripe
            </button>
          </div>
        </div>
      </footer>

      <FloatingTutorAgent
        open={agentOpen}
        onToggleOpen={setAgentOpen}
        plan={plan}
        activeLevel={activeLevel}
        messages={messages}
        remainingSeconds={quota.remainingSeconds}
        isLimitReached={quota.isLimitReached}
        bookingPrefill={bookingPrefill}
        onClearBookingPrefill={() => setBookingPrefill(null)}
        onAddMessages={setMessages}
        onOpenFullStudio={() => {
          setActiveTab('chat');
          navigateTo('studio');
        }}
        onOpenUpgrade={() => setStripeModalOpen(true)}
      />

      <StripeCheckoutModal
        open={stripeModalOpen}
        onClose={() => setStripeModalOpen(false)}
        onActivatePreviewPro={() => {
          setPlan('pro');
          showToast(
            'Тариф Pro активирован: открыты произношение, Speaking, Listening и безлимит.'
          );
        }}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 right-5 z-50 px-4 py-2.5 rounded-md bg-[#022E5B] text-[#DAEAFF] border border-[#499BED]/60 font-heading text-xs shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
