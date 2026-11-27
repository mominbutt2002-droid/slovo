import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Bot,
  CalendarCheck2,
  CheckCircle2,
  Loader2,
  Lock,
  Maximize2,
  Volume2,
  X,
} from 'lucide-react';
import { PROFICIENCY_LEVELS } from '../data/russianCurriculum';
import { SCHOOL_SERVICES, SCHOOL_TEACHERS } from '../data/schoolCatalog';
import { formatMmSs } from '../hooks/useDailyQuota';
import {
  BookingRecord,
  sendConciergeMessage,
  sendTutorChat,
  submitBooking,
} from '../services/tutorApi';
import { PlanTier, ProficiencyLevel, TutorMessage } from '../types/tutor';
import { Button, Input } from './ui/primitives';

export interface ConciergeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  bookingConfirmed?: BookingRecord;
  error?: boolean;
}

export interface BookingPrefill {
  service?: string;
  teacher?: string;
  studentName?: string;
  contact?: string;
  preferredDayTime?: string;
}

interface FloatingTutorAgentProps {
  open: boolean;
  onToggleOpen: (next: boolean) => void;
  plan: PlanTier;
  activeLevel: ProficiencyLevel;
  messages: TutorMessage[];
  remainingSeconds: number;
  isLimitReached: boolean;
  bookingPrefill: BookingPrefill | null;
  onClearBookingPrefill: () => void;
  onAddMessages: (updater: (prev: TutorMessage[]) => TutorMessage[]) => void;
  onOpenFullStudio: () => void;
  onOpenUpgrade: () => void;
}

function formatNow(): string {
  return new Date().toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CONCIERGE_QUICK_QUESTIONS = [
  'Какой каталог услуг и цены?',
  'Какие у вас учителя, их стаж и время работы?',
  'Какое время работы школы?',
  'Хочу записаться на занятие',
];

export function FloatingTutorAgent({
  open,
  onToggleOpen,
  plan,
  activeLevel,
  messages,
  remainingSeconds,
  isLimitReached,
  bookingPrefill,
  onClearBookingPrefill,
  onAddMessages,
  onOpenFullStudio,
  onOpenUpgrade,
}: FloatingTutorAgentProps) {
  const [agentTab, setAgentTab] = useState<'concierge' | 'tutor'>('concierge');

  // Concierge state (catalog, prices, hours, teachers, in-chat booking)
  const [conciergeMessages, setConciergeMessages] = useState<ConciergeMessage[]>([
    {
      id: 'welcome-concierge',
      role: 'assistant',
      content:
        'Здравствуйте! Я AI-агент школы «Словесность». Подскажу каталог услуг и цены, время работы, расскажу об учителях, их стаже и графике, а также сразу запишу вас на занятие прямо здесь в чате.',
      createdAt: formatNow(),
    },
  ]);
  const [conciergeLoading, setConciergeLoading] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  // Inline booking form fields inside chat
  const [bookName, setBookName] = useState('');
  const [bookContact, setBookContact] = useState('');
  const [bookService, setBookService] = useState(SCHOOL_SERVICES[0].title);
  const [bookTeacher, setBookTeacher] = useState(SCHOOL_TEACHERS[0].name);
  const [bookTime, setBookTime] = useState('');
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  // Tutor practice state
  const [input, setInput] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorMode, setTutorMode] = useState<'grammar' | 'spelling' | 'speaking'>(
    'grammar'
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  const levelLabel =
    PROFICIENCY_LEVELS.find((l) => l.id === activeLevel)?.label || 'Начальный';

  // Apply prefill when user clicks "Записаться в чате" on a service or teacher card
  useEffect(() => {
    if (!bookingPrefill) return;
    setAgentTab('concierge');
    if (bookingPrefill.service) setBookService(bookingPrefill.service);
    if (bookingPrefill.teacher) setBookTeacher(bookingPrefill.teacher);
    if (bookingPrefill.studentName) setBookName(bookingPrefill.studentName);
    if (bookingPrefill.contact) setBookContact(bookingPrefill.contact);
    if (bookingPrefill.preferredDayTime) setBookTime(bookingPrefill.preferredDayTime);
    setShowBookingForm(true);
    onClearBookingPrefill();
  }, [bookingPrefill, onClearBookingPrefill]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [
    open,
    agentTab,
    conciergeMessages.length,
    messages.length,
    conciergeLoading,
    tutorLoading,
    showBookingForm,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onToggleOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onToggleOpen]);

  const sendConciergePrompt = async (text: string) => {
    const clean = text.trim();
    if (!clean || conciergeLoading) return;

    const userMsg: ConciergeMessage = {
      id: `cu-${Date.now()}`,
      role: 'user',
      content: clean,
      createdAt: formatNow(),
    };
    const nextHistory = [...conciergeMessages, userMsg];
    setConciergeMessages(nextHistory);
    setConciergeLoading(true);

    try {
      const res = await sendConciergeMessage({
        message: clean,
        history: conciergeMessages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      if (res.bookingDraft) {
        if (res.bookingDraft.studentName) setBookName(res.bookingDraft.studentName);
        if (res.bookingDraft.contact) setBookContact(res.bookingDraft.contact);
        if (res.bookingDraft.serviceTitle) {
          const matchedService = SCHOOL_SERVICES.find((s) =>
            s.title
              .toLowerCase()
              .includes(res.bookingDraft!.serviceTitle!.toLowerCase().slice(0, 12))
          );
          if (matchedService) setBookService(matchedService.title);
        }
        if (res.bookingDraft.teacherName) {
          const matchedTeacher = SCHOOL_TEACHERS.find((t) =>
            t.name
              .toLowerCase()
              .includes(res.bookingDraft!.teacherName!.toLowerCase().split(' ')[0])
          );
          if (matchedTeacher) setBookTeacher(matchedTeacher.name);
        }
        if (res.bookingDraft.preferredDayTime) {
          setBookTime(res.bookingDraft.preferredDayTime);
        }
      }

      if (res.confirmedBooking) {
        setBookings((prev) => [res.confirmedBooking!, ...prev]);
        setShowBookingForm(false);
      } else if (res.openBookingForm) {
        setShowBookingForm(true);
      }

      setConciergeMessages((prev) => [
        ...prev,
        {
          id: `ca-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          bookingConfirmed: res.confirmedBooking || undefined,
          createdAt: formatNow(),
        },
      ]);
    } catch (err) {
      setConciergeMessages((prev) => [
        ...prev,
        {
          id: `ce-${Date.now()}`,
          role: 'assistant',
          content:
            err instanceof Error
              ? err.message
              : 'Не удалось получить ответ от AI-агента.',
          createdAt: formatNow(),
          error: true,
        },
      ]);
    } finally {
      setConciergeLoading(false);
    }
  };

  const handleConfirmInlineBooking = async (e: FormEvent) => {
    e.preventDefault();
    setBookError(null);

    if (bookName.trim().length < 2) {
      setBookError('Укажите ваше имя.');
      return;
    }
    const cleanContact = bookContact.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanContact);
    const isPhone = cleanContact.replace(/\D/g, '').length >= 7;
    if (!isEmail && !isPhone) {
      setBookError('Укажите телефон или email для подтверждения.');
      return;
    }

    setBookSubmitting(true);
    try {
      const created = await submitBooking({
        studentName: bookName.trim(),
        contact: cleanContact,
        serviceTitle: bookService,
        teacherName: bookTeacher,
        preferredDayTime: bookTime.trim() || 'Ближайшее свободное окно',
      });
      setBookings((prev) => [created, ...prev]);
      setShowBookingForm(false);
      setBookTime('');
      setConciergeMessages((prev) => [
        ...prev,
        {
          id: `cb-${Date.now()}`,
          role: 'assistant',
          content: `Запись #${created.id} подтверждена! Ждём вас на занятии.`,
          bookingConfirmed: created,
          createdAt: formatNow(),
        },
      ]);
    } catch (err) {
      setBookError(
        err instanceof Error ? err.message : 'Не удалось оформить запись.'
      );
    } finally {
      setBookSubmitting(false);
    }
  };

  const sendTutorPrompt = async (text: string) => {
    const clean = text.trim();
    if (!clean || tutorLoading) return;
    if (isLimitReached) {
      onOpenUpgrade();
      return;
    }

    const userMsg: TutorMessage = {
      id: `agent-u-${Date.now()}`,
      role: 'user',
      content: clean,
      createdAt: formatNow(),
    };
    onAddMessages((prev) => [...prev, userMsg]);
    setTutorLoading(true);

    try {
      const res = await sendTutorChat({
        message: clean,
        level: activeLevel,
        mode: tutorMode,
        history: messages,
        withAudio: tutorMode === 'speaking' && plan === 'pro',
      });

      onAddMessages((prev) => [
        ...prev,
        {
          id: `agent-a-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          corrections: res.corrections,
          tip: res.tip,
          audioBase64: res.audioBase64,
          createdAt: formatNow(),
        },
      ]);
    } catch (err) {
      onAddMessages((prev) => [
        ...prev,
        {
          id: `agent-e-${Date.now()}`,
          role: 'assistant',
          content:
            err instanceof Error
              ? err.message
              : 'Не удалось получить ответ от AI-репетитора.',
          createdAt: formatNow(),
          error: true,
        },
      ]);
    } finally {
      setTutorLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput('');
    if (agentTab === 'concierge') {
      void sendConciergePrompt(text);
    } else {
      void sendTutorPrompt(text);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim()) return;
      const text = input;
      setInput('');
      if (agentTab === 'concierge') {
        void sendConciergePrompt(text);
      } else {
        void sendTutorPrompt(text);
      }
    }
  };

  const isBusy = agentTab === 'concierge' ? conciergeLoading : tutorLoading;
  const inputBlocked =
    isBusy || (agentTab === 'tutor' && isLimitReached);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <section
          aria-label="Окно AI-агента школы Словесность"
          className="w-[min(440px,calc(100vw-2rem))] h-[min(620px,calc(100vh-6rem))] rounded-xl border border-[#499BED]/60 bg-card text-card-foreground shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Agent Header */}
          <div className="shrink-0 px-4 py-3 bg-[#022E5B] text-[#DAEAFF] border-b border-[#499BED]/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#499BED] text-[#031725] flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-heading text-sm font-semibold text-white truncate">
                  AI-агент «Словесность»
                </div>
                <div className="font-mono text-[11px] text-[#A1C6F6] tabular-nums truncate">
                  {agentTab === 'concierge'
                    ? `Консультация и запись · Записей: ${bookings.length}`
                    : `${levelLabel} · ${
                        plan === 'pro'
                          ? 'Pro ∞'
                          : `Free ${formatMmSs(remainingSeconds)}`
                      }`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onToggleOpen(false);
                  onOpenFullStudio();
                }}
                title="Открыть полную студию"
                aria-label="Открыть полную студию"
                className="p-1.5 rounded-md text-[#A1C6F6] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onToggleOpen(false)}
                aria-label="Свернуть AI-агента"
                className="p-1.5 rounded-md text-[#A1C6F6] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Primary Switch: Concierge & Booking vs AI Tutor */}
          <div className="shrink-0 px-3 py-2 border-b border-border bg-background/80 flex items-center justify-between gap-2">
            <div className="inline-flex p-0.5 rounded-md bg-secondary border border-border">
              <button
                type="button"
                onClick={() => setAgentTab('concierge')}
                className={`px-3 py-1 rounded font-heading text-xs font-medium transition-colors cursor-pointer ${
                  agentTab === 'concierge'
                    ? 'bg-[#499BED] text-[#031725] font-semibold'
                    : 'text-secondary-foreground hover:opacity-80'
                }`}
              >
                Услуги и запись
              </button>
              <button
                type="button"
                onClick={() => setAgentTab('tutor')}
                className={`px-3 py-1 rounded font-heading text-xs font-medium transition-colors cursor-pointer ${
                  agentTab === 'tutor'
                    ? 'bg-[#499BED] text-[#031725] font-semibold'
                    : 'text-secondary-foreground hover:opacity-80'
                }`}
              >
                AI-репетитор
              </button>
            </div>

            {agentTab === 'concierge' && (
              <button
                type="button"
                onClick={() => setShowBookingForm((v) => !v)}
                className="inline-flex items-center gap-1 font-heading text-xs font-medium text-[#499BED] hover:underline cursor-pointer whitespace-nowrap"
              >
                <CalendarCheck2 className="w-3.5 h-3.5" />
                <span>{showBookingForm ? 'Скрыть форму' : 'Записаться'}</span>
              </button>
            )}
          </div>

          {/* Sub-bar for Tutor mode */}
          {agentTab === 'tutor' && (
            <div className="shrink-0 px-3 py-1.5 border-b border-border bg-background/50 flex items-center gap-1.5 overflow-x-auto">
              {(
                [
                  { id: 'grammar', label: 'Грамматика' },
                  { id: 'spelling', label: 'Правописание' },
                  { id: 'speaking', label: 'Speaking (Pro)' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'speaking' && plan !== 'pro') {
                      onOpenUpgrade();
                      return;
                    }
                    setTutorMode(item.id);
                  }}
                  className={`px-2.5 py-1 rounded font-heading text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer inline-flex items-center gap-1 ${
                    tutorMode === item.id
                      ? 'bg-[#499BED] text-[#031725] font-semibold'
                      : 'bg-secondary text-secondary-foreground hover:opacity-85'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.id === 'speaking' && plan !== 'pro' && (
                    <Lock className="w-2.5 h-2.5" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Chat Feed */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-card"
          >
            {agentTab === 'concierge' ? (
              <>
                {conciergeMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      msg.role === 'user'
                        ? 'flex justify-end'
                        : 'space-y-2.5 pb-3 border-b border-border last:border-b-0'
                    }
                  >
                    {msg.role === 'user' ? (
                      <div className="max-w-[85%] rounded-lg bg-[#022E5B] text-[#DAEAFF] px-3.5 py-2.5 text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <p
                          className={`text-sm leading-relaxed whitespace-pre-line ${
                            msg.error ? 'text-red-400' : 'text-foreground'
                          }`}
                        >
                          {msg.content}
                        </p>

                        {msg.bookingConfirmed && (
                          <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 font-heading font-semibold text-emerald-400">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span>
                                Запись оформлена · #{msg.bookingConfirmed.id}
                              </span>
                            </div>
                            <div className="text-foreground">
                              Услуга: {msg.bookingConfirmed.serviceTitle}
                            </div>
                            <div className="text-foreground">
                              Преподаватель: {msg.bookingConfirmed.teacherName}
                            </div>
                            <div className="text-muted-foreground font-mono">
                              Время: {msg.bookingConfirmed.preferredDayTime} ·{' '}
                              {msg.bookingConfirmed.studentName} (
                              {msg.bookingConfirmed.contact})
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Quick basic question chips */}
                {!conciergeLoading && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {CONCIERGE_QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          if (q === 'Хочу записаться на занятие') {
                            setShowBookingForm(true);
                          } else {
                            void sendConciergePrompt(q);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-md border border-border bg-background hover:border-[#499BED] font-heading text-[11px] text-foreground transition-colors cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Inline Booking Form right inside the AI Agent chat */}
                {showBookingForm && (
                  <form
                    onSubmit={handleConfirmInlineBooking}
                    className="p-3.5 rounded-lg border border-[#499BED]/50 bg-background space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-xs font-semibold text-foreground">
                        Запись на занятие в чате
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowBookingForm(false)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="Закрыть форму записи"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {bookError && (
                      <div className="p-2 rounded border border-red-500/40 bg-red-500/10 font-heading text-[11px] text-red-400">
                        {bookError}
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block font-heading text-[11px] text-muted-foreground">
                        Услуга
                      </label>
                      <select
                        value={bookService}
                        onChange={(e) => setBookService(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {SCHOOL_SERVICES.map((s) => (
                          <option key={s.id} value={s.title}>
                            {s.title} — {s.priceLabel}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-heading text-[11px] text-muted-foreground">
                        Учитель и график
                      </label>
                      <select
                        value={bookTeacher}
                        onChange={(e) => setBookTeacher(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {SCHOOL_TEACHERS.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} ({t.experienceLabel} · {t.schedule})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={bookName}
                        onChange={(e) => setBookName(e.target.value)}
                        placeholder="Ваше имя"
                        className="h-9 text-xs"
                      />
                      <Input
                        value={bookContact}
                        onChange={(e) => setBookContact(e.target.value)}
                        placeholder="Телефон или email"
                        className="h-9 text-xs"
                      />
                    </div>

                    <Input
                      value={bookTime}
                      onChange={(e) => setBookTime(e.target.value)}
                      placeholder="Удобный день и время (например: Чт 18:00)"
                      className="h-9 text-xs"
                    />

                    <Button
                      type="submit"
                      variant="accent"
                      size="sm"
                      disabled={bookSubmitting}
                      className="w-full"
                    >
                      {bookSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Оформляем запись...</span>
                        </>
                      ) : (
                        <span>Подтвердить запись</span>
                      )}
                    </Button>
                  </form>
                )}

                {conciergeLoading && (
                  <div className="flex items-center gap-2 font-heading text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#499BED]" />
                    <span>AI-агент проверяет расписание и услуги...</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {messages.length === 0 ? (
                  <div className="space-y-3 py-2">
                    <p className="text-base text-foreground leading-relaxed">
                      Режим практики с AI-репетитором. Напишите фразу на русском для проверки грамматики и правописания:
                    </p>
                    <div className="space-y-2">
                      {[
                        'Проверь фразу: «Я хочу научится писать грамотно в течении месяца».',
                        'Дай мне 3 быстрых задания на правописание.',
                      ].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => void sendTutorPrompt(q)}
                          className="w-full text-left p-3 rounded-md border border-border bg-background hover:border-[#499BED] text-sm text-foreground transition-colors cursor-pointer"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={
                        msg.role === 'user'
                          ? 'flex justify-end'
                          : 'space-y-2 pb-3 border-b border-border last:border-b-0'
                      }
                    >
                      {msg.role === 'user' ? (
                        <div className="max-w-[85%] rounded-lg bg-[#022E5B] text-[#DAEAFF] px-3.5 py-2.5 text-sm leading-relaxed">
                          {msg.content}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p
                            className={`text-sm leading-relaxed whitespace-pre-line ${
                              msg.error ? 'text-red-400' : 'text-foreground'
                            }`}
                          >
                            {msg.content}
                          </p>
                          {msg.audioBase64 && (
                            <button
                              type="button"
                              onClick={() => {
                                const audio = new Audio(
                                  `data:audio/wav;base64,${msg.audioBase64}`
                                );
                                void audio.play();
                              }}
                              className="inline-flex items-center gap-1.5 font-heading text-xs text-[#499BED] hover:underline cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Прослушать ответ</span>
                            </button>
                          )}
                          {msg.corrections && msg.corrections.length > 0 && (
                            <div className="p-2.5 rounded-md border border-border bg-background space-y-1.5 text-xs">
                              {msg.corrections.map((c, idx) => (
                                <div key={idx}>
                                  <span className="line-through text-red-400">
                                    {c.original}
                                  </span>{' '}
                                  →{' '}
                                  <span className="font-semibold text-emerald-400">
                                    {c.corrected}
                                  </span>
                                  <div className="text-muted-foreground mt-0.5">
                                    {c.rule}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {msg.tip && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-heading font-semibold text-foreground">
                                Совет:
                              </span>{' '}
                              {msg.tip}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {tutorLoading && (
                  <div className="flex items-center gap-2 font-heading text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#499BED]" />
                    <span>AI-репетитор готовит ответ...</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input bar */}
          <form
            onSubmit={handleSubmit}
            className="shrink-0 p-3 border-t border-border bg-background/80 flex items-end gap-2"
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={inputBlocked}
              placeholder={
                agentTab === 'concierge'
                  ? 'Спросите про цены, учителей, график или напишите «Запиши меня...»'
                  : isLimitReached
                    ? 'Лимит 10 мин исчерпан (сброс в 00:00)'
                    : 'Напишите фразу для проверки репетитором...'
              }
              className="flex-1 bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <Button
              type="submit"
              variant="accent"
              size="icon"
              disabled={!input.trim() || inputBlocked}
              aria-label="Отправить сообщение AI-агенту"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
          </form>
        </section>
      )}

      {/* Always-visible Floating AI Agent Launcher Icon Button */}
      <button
        type="button"
        onClick={() => onToggleOpen(!open)}
        aria-label={open ? 'Закрыть AI-агента' : 'Открыть AI-агента'}
        aria-expanded={open}
        className="group h-14 px-4 rounded-full bg-[#499BED] hover:bg-[#3a8de2] text-[#031725] border-2 border-[#DAEAFF]/80 shadow-xl flex items-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#499BED] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="w-9 h-9 rounded-full bg-[#031725] text-[#499BED] flex items-center justify-center shrink-0">
          {open ? <X className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </span>
        <span className="font-heading text-sm font-bold pr-1 whitespace-nowrap">
          {open ? 'Свернуть агента' : 'AI-агент и запись'}
        </span>
      </button>
    </div>
  );
}
