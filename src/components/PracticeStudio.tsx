import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  FileSearch,
  Headphones,
  HelpCircle,
  Loader2,
  Lock,
  MessageSquare,
  Mic,
  Pause,
  Play,
  RefreshCw,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react';
import {
  CURRICULUM_LESSONS,
  PROFICIENCY_LEVELS,
} from '../data/russianCurriculum';
import {
  formatHhMmSs,
  formatMmSs,
  FREE_DAILY_LIMIT_SECONDS,
} from '../hooks/useDailyQuota';
import {
  evaluatePronunciation,
  fetchQuizExercise,
  sendTutorChat,
} from '../services/tutorApi';
import {
  LessonItem,
  PlanTier,
  PracticeTab,
  ProficiencyLevel,
  QuizPayload,
  TutorMessage,
} from '../types/tutor';
import {
  ErrorAnalysisPanel,
  ListeningPanel,
  PronunciationPanel,
} from './ProPracticePanels';
import { Button, Input, Progress } from './ui/primitives';

interface PracticeStudioProps {
  plan: PlanTier;
  activeLevel: ProficiencyLevel;
  activeTab: PracticeTab;
  completedLessonIds: string[];
  messages: TutorMessage[];
  remainingSeconds: number;
  percentRemaining: number;
  isLimitReached: boolean;
  secondsToMidnight: number;
  timerRunning: boolean;
  onToggleTimer: () => void;
  onSelectLevel: (level: ProficiencyLevel) => void;
  onSelectTab: (tab: PracticeTab) => void;
  onToggleLessonCompleted: (lessonId: string) => void;
  onAddMessages: (updater: (prev: TutorMessage[]) => TutorMessage[]) => void;
  onClearChat: () => void;
  onOpenUpgrade: () => void;
}

function formatNow(): string {
  return new Date().toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STUDIO_TABS: Array<{
  id: PracticeTab;
  label: string;
  proOnly?: boolean;
}> = [
  { id: 'chat', label: 'AI-агент и Speaking' },
  { id: 'lessons', label: 'Уроки (5 бесплатно)' },
  { id: 'quiz', label: 'Квизы и задачи' },
  { id: 'pronunciation', label: 'Произношение', proOnly: true },
  { id: 'listening', label: 'Listening', proOnly: true },
  { id: 'errors', label: 'Разбор ошибок', proOnly: true },
];

export function PracticeStudio({
  plan,
  activeLevel,
  activeTab,
  completedLessonIds,
  messages,
  remainingSeconds,
  percentRemaining,
  isLimitReached,
  secondsToMidnight,
  timerRunning,
  onToggleTimer,
  onSelectLevel,
  onSelectTab,
  onToggleLessonCompleted,
  onAddMessages,
  onClearChat,
  onOpenUpgrade,
}: PracticeStudioProps) {
  const levelLessons = CURRICULUM_LESSONS.filter((l) => l.level === activeLevel);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    levelLessons[0]?.id || CURRICULUM_LESSONS[0].id
  );

  // Chat state
  const [chatMode, setChatMode] = useState<
    'chat' | 'grammar' | 'spelling' | 'speaking'
  >('grammar');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);

  // Quiz state
  const [quizFocus, setQuizFocus] = useState<'quiz' | 'grammar' | 'spelling'>(
    'spelling'
  );
  const [quizTopic, setQuizTopic] = useState('');
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizData, setQuizData] = useState<QuizPayload | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizError, setQuizError] = useState<string | null>(null);

  useEffect(() => {
    const first = CURRICULUM_LESSONS.find((l) => l.level === activeLevel);
    if (first) setSelectedLessonId(first.id);
  }, [activeLevel]);

  useEffect(() => {
    if (chatScrollRef.current && (messages.length > 0 || chatLoading)) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages.length, chatLoading]);

  const activeLesson: LessonItem =
    levelLessons.find((l) => l.id === selectedLessonId) || levelLessons[0];

  const canAccessLesson = (lesson: LessonItem) =>
    plan === 'pro' || lesson.freeAccessible;

  const sendMessage = async (
    text: string,
    overrideMode?: 'chat' | 'grammar' | 'spelling' | 'speaking'
  ) => {
    const clean = text.trim();
    if (!clean || chatLoading) return;
    if (isLimitReached) {
      onOpenUpgrade();
      return;
    }

    const effectiveMode = overrideMode || chatMode;
    const useVoiceOutput = effectiveMode === 'speaking' && plan === 'pro';

    const userMsg: TutorMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: clean,
      createdAt: formatNow(),
    };
    onAddMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
    setVoiceError(null);

    try {
      const res = await sendTutorChat({
        message: clean,
        level: activeLevel,
        mode: effectiveMode,
        history: messages,
        withAudio: useVoiceOutput,
      });

      const assistantMsg: TutorMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        corrections: res.corrections,
        tip: res.tip,
        audioBase64: res.audioBase64,
        createdAt: formatNow(),
      };
      onAddMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      onAddMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content:
            err instanceof Error
              ? err.message
              : 'Не удалось связаться с AI-репетитором.',
          createdAt: formatNow(),
          error: true,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const toSend = chatInput;
    setChatInput('');
    void sendMessage(toSend);
  };

  const handleChatKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!chatInput.trim()) return;
      const toSend = chatInput;
      setChatInput('');
      void sendMessage(toSend);
    }
  };

  const startSpeakingVoice = async () => {
    if (plan !== 'pro') {
      onOpenUpgrade();
      return;
    }
    setVoiceError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError('Браузер не поддерживает запись аудио с микрофона.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      voiceChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) voiceChunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(voiceChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        setChatLoading(true);
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const s = typeof reader.result === 'string' ? reader.result : '';
              const i = s.indexOf(',');
              resolve(i >= 0 ? s.slice(i + 1) : s);
            };
            reader.onerror = () => reject(new Error('Ошибка чтения аудио.'));
            reader.readAsDataURL(blob);
          });
          const res = await evaluatePronunciation({
            audioBase64: base64,
            mimeType: blob.type || 'audio/webm',
            level: activeLevel,
          });
          setChatLoading(false);
          if (res.transcript) {
            void sendMessage(res.transcript, 'speaking');
          }
        } catch (err) {
          setChatLoading(false);
          setVoiceError(
            err instanceof Error ? err.message : 'Не удалось распознать голос.'
          );
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingVoice(true);
    } catch {
      setVoiceError('Разрешите доступ к микрофону для режима Speaking.');
    }
  };

  const stopSpeakingVoice = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (isLimitReached) {
      onOpenUpgrade();
      return;
    }
    setQuizError(null);
    setQuizLoading(true);
    setQuizAnswers({});
    try {
      const data = await fetchQuizExercise({
        level: activeLevel,
        focus: quizFocus,
        topic: quizTopic.trim() || undefined,
      });
      setQuizData(data);
    } catch (err) {
      setQuizError(
        err instanceof Error ? err.message : 'Не удалось создать квиз.'
      );
    } finally {
      setQuizLoading(false);
    }
  };

  const handlePracticeLessonWithTutor = (lesson: LessonItem) => {
    if (isLimitReached) {
      onOpenUpgrade();
      return;
    }
    onSelectTab('chat');
    const mode = lesson.category === 'Правописание' ? 'spelling' : 'grammar';
    setChatMode(mode);
    void sendMessage(lesson.practicePrompt, mode);
  };

  const quizScore = quizData
    ? quizData.questions.reduce(
        (acc, q, idx) => (quizAnswers[idx] === q.correctIndex ? acc + 1 : acc),
        0
      )
    : 0;
  const quizAnsweredCount = Object.keys(quizAnswers).length;

  return (
    <section
      id="studio"
      className="bg-surface-muted/40 dark:bg-[#051B2E] py-12 lg:py-16"
    >
      <div className="max-w-[1360px] mx-auto px-4 lg:px-8 space-y-6">
        {/* Top Studio Control Bar: Level Selector + Free Daily Quota / Midnight Reset */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-4 items-stretch">
          <div className="p-5 rounded-lg border border-border bg-card flex flex-col justify-between gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">
                  Рабочая студия русского языка
                </h2>
                <p className="text-sm text-muted-foreground">
                  Этап обучения:{' '}
                  <span className="text-foreground font-semibold">
                    {PROFICIENCY_LEVELS.find((l) => l.id === activeLevel)?.label}
                  </span>{' '}
                  · Пройдено уроков:{' '}
                  <span className="font-mono tabular-nums">
                    {completedLessonIds.length} / {CURRICULUM_LESSONS.length}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {PROFICIENCY_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => onSelectLevel(lvl.id)}
                  className={`px-3 py-1.5 rounded-md font-heading text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeLevel === lvl.id
                      ? 'bg-[#499BED] text-[#031725] font-semibold'
                      : 'bg-secondary text-secondary-foreground hover:opacity-85'
                  }`}
                >
                  {lvl.label} ({lvl.cefr})
                </button>
              ))}
            </div>
          </div>

          {/* Daily Quota Widget with Live Midnight Reset */}
          <div className="p-5 rounded-lg border border-border bg-card flex flex-col justify-between gap-3">
            {plan === 'pro' ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-[#499BED]" />
                    <span>Тариф Pro · Безлимит</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    ∞ мин / день
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Открыты все 4 этапа, проверка произношения, Speaking, Listening и глубокий разбор ошибок.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-heading text-xs font-semibold text-foreground">
                    <Clock className="w-3.5 h-3.5 text-[#499BED]" />
                    <span>Бесплатная практика сегодня</span>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleTimer}
                    className="inline-flex items-center gap-1 font-heading text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {timerRunning ? (
                      <>
                        <Pause className="w-3 h-3" />
                        <span>Пауза</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        <span>Продолжить</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`font-mono text-2xl font-semibold tabular-nums ${
                      isLimitReached ? 'text-red-400' : 'text-foreground'
                    }`}
                  >
                    {formatMmSs(remainingSeconds)}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    из {formatMmSs(FREE_DAILY_LIMIT_SECONDS)} · сброс в 00:00 (через{' '}
                    {formatHhMmSs(secondsToMidnight)})
                  </span>
                </div>

                <Progress value={percentRemaining} />
              </>
            )}
          </div>
        </div>

        {/* Free daily limit banner if reached */}
        {isLimitReached && (
          <div className="p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="font-heading text-sm font-semibold text-foreground">
                Лимит 10 минут на сегодня исчерпан
              </div>
              <p className="text-sm text-muted-foreground">
                Бесплатная практика обновится автоматически в полночь (через{' '}
                <span className="font-mono tabular-nums text-foreground">
                  {formatHhMmSs(secondsToMidnight)}
                </span>
                ), либо подключите Pro для безлимитных занятий.
              </p>
            </div>
            <Button type="button" variant="accent" size="sm" onClick={onOpenUpgrade}>
              Подключить Pro
            </Button>
          </div>
        )}

        {/* Main Tabbed Studio Container */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div
            role="tablist"
            aria-label="Режимы обучения"
            className="border-b border-border px-3 pt-2 flex items-center gap-1 overflow-x-auto bg-background/60"
          >
            {STUDIO_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const locked = tab.proOnly && plan !== 'pro';
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectTab(tab.id)}
                  className={`relative px-3.5 py-2.5 font-heading text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.id === 'lessons' && <BookOpen className="w-3.5 h-3.5" />}
                  {tab.id === 'chat' && <Bot className="w-4 h-4 text-[#499BED]" />}
                  {tab.id === 'quiz' && <HelpCircle className="w-3.5 h-3.5" />}
                  {tab.id === 'pronunciation' && <Mic className="w-3.5 h-3.5" />}
                  {tab.id === 'listening' && <Headphones className="w-3.5 h-3.5" />}
                  {tab.id === 'errors' && <FileSearch className="w-3.5 h-3.5" />}
                  <span>{tab.label}</span>
                  {locked && (
                    <Lock
                      className="w-3 h-3 text-[#499BED]"
                      aria-label="Доступно в Pro"
                    />
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#499BED]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: LESSONS (5 Free Base Lessons + Pro Advanced Stages) */}
          {activeTab === 'lessons' && (
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] min-h-[480px]">
              <div className="border-b lg:border-b-0 lg:border-r border-border divide-y divide-border bg-background/40">
                {levelLessons.map((lesson) => {
                  const unlocked = canAccessLesson(lesson);
                  const completed = completedLessonIds.includes(lesson.id);
                  const selected = activeLesson?.id === lesson.id;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className={`w-full text-left p-4 transition-colors cursor-pointer ${
                        selected
                          ? 'bg-secondary/75'
                          : 'hover:bg-secondary/35'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-heading text-[11px] text-muted-foreground">
                        <span>
                          Урок 0{lesson.order} · {lesson.category} ·{' '}
                          <span className="font-mono tabular-nums">
                            {lesson.durationMin} мин
                          </span>
                        </span>
                        {completed ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : !unlocked ? (
                          <Lock className="w-3.5 h-3.5 text-[#499BED] shrink-0" />
                        ) : null}
                      </div>
                      <div className="mt-1 font-heading text-sm font-semibold text-foreground">
                        {lesson.title}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-6 lg:p-8 flex flex-col justify-between">
                {activeLesson && canAccessLesson(activeLesson) ? (
                  <div className="space-y-6">
                    <div>
                      <div className="font-heading text-xs text-muted-foreground">
                        {activeLesson.category} · Урок {activeLesson.order} из 5 ·{' '}
                        {activeLesson.freeAccessible
                          ? 'Бесплатный урок'
                          : 'Доступ Pro'}
                      </div>
                      <h3 className="mt-1.5 font-heading text-2xl font-bold text-foreground">
                        {activeLesson.title}
                      </h3>
                      <p className="mt-2 text-lg text-muted-foreground">
                        {activeLesson.summary}
                      </p>
                    </div>

                    <div className="p-5 rounded-lg border border-border bg-background space-y-2">
                      <div className="font-heading text-xs font-semibold text-[#499BED]">
                        Ключевое правило
                      </div>
                      <p className="text-base leading-relaxed text-foreground">
                        {activeLesson.keyRule}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="font-heading text-xs font-semibold text-muted-foreground">
                        Примеры и разбор
                      </div>
                      {activeLesson.examples.map((ex, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-md border border-border bg-background/70"
                        >
                          <div className="text-base font-semibold text-foreground">
                            {ex.correct}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {ex.note}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-border flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="accent"
                        onClick={() => handlePracticeLessonWithTutor(activeLesson)}
                      >
                        Отработать урок с AI-репетитором
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onToggleLessonCompleted(activeLesson.id)}
                      >
                        <Check className="w-4 h-4" />
                        <span>
                          {completedLessonIds.includes(activeLesson.id)
                            ? 'Урок пройден'
                            : 'Отметить пройденным'}
                        </span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="my-auto py-8 text-center max-w-md mx-auto space-y-4">
                    <div className="w-11 h-11 rounded-md border border-border bg-secondary mx-auto flex items-center justify-center">
                      <Lock className="w-5 h-5 text-[#499BED]" />
                    </div>
                    <h3 className="font-heading text-xl font-semibold text-foreground">
                      Этап «{PROFICIENCY_LEVELS.find((l) => l.id === activeLevel)?.label}» доступен в Pro
                    </h3>
                    <p className="text-base text-muted-foreground">
                      На тарифе Free открыты 5 базовых уроков этапа «Начальный», а также квизы и практика грамматики с AI-репетитором. Перейдите на Pro, чтобы открыть все 20 уроков до уровня Эксперт.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                      <Button
                        type="button"
                        variant="accent"
                        onClick={onOpenUpgrade}
                      >
                        Открыть Pro через Stripe
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onSelectLevel('beginner')}
                      >
                        К 5 бесплатным урокам
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AI TUTOR CHAT & SPEAKING */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[560px]">
              <div className="shrink-0 px-4 lg:px-6 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-background/50">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'grammar', label: 'Грамматика' },
                      { id: 'spelling', label: 'Правописание' },
                      { id: 'chat', label: 'Свободная практика' },
                      { id: 'speaking', label: 'Speaking (голос Pro)' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        if (m.id === 'speaking' && plan !== 'pro') {
                          onOpenUpgrade();
                          return;
                        }
                        setChatMode(m.id);
                      }}
                      className={`px-3 py-1 rounded-md font-heading text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                        chatMode === m.id
                          ? 'bg-[#499BED] text-[#031725] font-semibold'
                          : 'bg-secondary text-secondary-foreground hover:opacity-85'
                      }`}
                    >
                      <span>{m.label}</span>
                      {m.id === 'speaking' && plan !== 'pro' && (
                        <Lock className="w-3 h-3" />
                      )}
                    </button>
                  ))}
                </div>

                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearChat}
                    className="inline-flex items-center gap-1.5 font-heading text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Очистить диалог</span>
                  </button>
                )}
              </div>

              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-5"
              >
                {messages.length === 0 ? (
                  <div className="max-w-2xl py-6 space-y-4">
                    <h3 className="font-heading text-xl font-semibold text-foreground">
                      Напишите фразу на русском или выберите быстрый старт
                    </h3>
                    <p className="text-base text-muted-foreground">
                      Репетитор проверит грамматику и правописание, объяснит ошибки простыми правилами и предложит следующее упражнение для вашего этапа.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {[
                        'Проверь предложение: «Я хочу научится писать без ошибок в течении месяца».',
                        'Объясни разницу между приставками ПРЕ- и ПРИ- на 4 примерах.',
                        'Давай потренируемся: задай мне 3 задачи на правописание Н и НН.',
                        'Как правильно: «по приезде» или «по приезду», «согласно приказу» или «приказа»?',
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void sendMessage(prompt)}
                          className="text-left p-3.5 rounded-md border border-border bg-background hover:border-[#499BED]/60 text-sm text-foreground transition-colors cursor-pointer"
                        >
                          {prompt}
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
                          : 'space-y-3 pb-5 border-b border-border last:border-b-0'
                      }
                    >
                      {msg.role === 'user' ? (
                        <div className="max-w-[82%] rounded-lg bg-[#022E5B] text-[#DAEAFF] px-4 py-3 border border-[#499BED]/30">
                          <p className="text-base leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                      ) : (
                        <div className="max-w-3xl space-y-3">
                          <div className="flex items-center justify-between gap-2 font-heading text-xs text-muted-foreground">
                            <span>Репетитор «Словесность»</span>
                            <span className="font-mono tabular-nums">
                              {msg.createdAt}
                            </span>
                          </div>

                          <p
                            className={`text-base leading-relaxed whitespace-pre-line ${
                              msg.error ? 'text-red-400' : 'text-foreground'
                            }`}
                          >
                            {msg.content}
                          </p>

                          {msg.audioBase64 && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const a = new Audio(
                                    `data:audio/wav;base64,${msg.audioBase64}`
                                  );
                                  void a.play();
                                }}
                                className="inline-flex items-center gap-1.5 font-heading text-xs font-medium text-[#499BED] hover:underline cursor-pointer"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Прослушать ответ голосом</span>
                              </button>
                            </div>
                          )}

                          {msg.corrections && msg.corrections.length > 0 && (
                            <div className="p-3.5 rounded-md border border-border bg-background space-y-2">
                              <div className="font-heading text-xs font-semibold text-[#499BED]">
                                Исправления
                              </div>
                              {msg.corrections.map((c, ci) => (
                                <div key={ci} className="text-sm space-y-0.5">
                                  <div>
                                    <span className="line-through text-red-400">
                                      {c.original}
                                    </span>{' '}
                                    →{' '}
                                    <span className="font-semibold text-emerald-400">
                                      {c.corrected}
                                    </span>
                                  </div>
                                  <div className="text-muted-foreground">
                                    {c.rule}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {msg.tip && (
                            <p className="text-sm text-muted-foreground">
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

                {chatLoading && (
                  <div className="flex items-center gap-2 font-heading text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-[#499BED]" />
                    <span>Репетитор проверяет ответ...</span>
                  </div>
                )}
              </div>

              {voiceError && (
                <div className="px-4 lg:px-6 pb-2 text-xs text-red-400 font-heading">
                  {voiceError}
                </div>
              )}

              <form
                onSubmit={handleChatSubmit}
                className="shrink-0 p-3.5 lg:px-6 border-t border-border bg-background/70 flex items-end gap-2"
              >
                {chatMode === 'speaking' && plan === 'pro' && (
                  <Button
                    type="button"
                    variant={isRecordingVoice ? 'destructive' : 'outline'}
                    size="default"
                    onClick={
                      isRecordingVoice ? stopSpeakingVoice : startSpeakingVoice
                    }
                    disabled={chatLoading}
                    aria-label={
                      isRecordingVoice
                        ? 'Остановить запись голоса'
                        : 'Ответить голосом'
                    }
                  >
                    {isRecordingVoice ? (
                      <Square className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Mic className="w-4 h-4 text-[#499BED]" />
                    )}
                    <span className="hidden sm:inline">
                      {isRecordingVoice ? 'Стоп' : 'Голосом'}
                    </span>
                  </Button>
                )}

                <textarea
                  rows={1}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  disabled={chatLoading || isLimitReached}
                  placeholder={
                    isLimitReached
                      ? 'Лимит 10 мин на сегодня исчерпан — сброс в 00:00'
                      : 'Напишите предложение, вопрос по правилу или ответ репетитору...'
                  }
                  className="flex-1 bg-card border border-input rounded-md px-3.5 py-2 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />

                <Button
                  type="submit"
                  variant="accent"
                  disabled={!chatInput.trim() || chatLoading || isLimitReached}
                >
                  <span>Отправить</span>
                  <ArrowUp className="w-4 h-4" />
                </Button>
              </form>
            </div>
          )}

          {/* TAB 3: QUIZZES & GRAMMAR/SPELLING EXERCISES (Free & Pro) */}
          {activeTab === 'quiz' && (
            <div className="p-5 lg:p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    Квизы, задачи, грамматика и правописание
                  </h3>
                  <p className="mt-1 text-base text-muted-foreground">
                    Доступно на тарифах Free и Pro. Задачи автоматически подстраиваются под выбранный этап.
                  </p>
                </div>

                {quizData && (
                  <div className="font-mono text-sm text-foreground tabular-nums">
                    Результат: {quizScore} / {quizData.questions.length}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'spelling', label: 'Правописание' },
                    { id: 'grammar', label: 'Грамматика' },
                    { id: 'quiz', label: 'Общий квиз' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setQuizFocus(item.id)}
                    className={`px-3.5 py-1.5 rounded-md font-heading text-xs font-medium transition-colors cursor-pointer ${
                      quizFocus === item.id
                        ? 'bg-[#499BED] text-[#031725] font-semibold'
                        : 'bg-secondary text-secondary-foreground hover:opacity-85'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  placeholder="Тема (необязательно, например: Н/НН, запятые, падежи, ударения)"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="accent"
                  onClick={handleGenerateQuiz}
                  disabled={quizLoading || isLimitReached}
                >
                  {quizLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>
                    {quizLoading ? 'Составляем задачи...' : 'Сгенерировать 4 задачи'}
                  </span>
                </Button>
              </div>

              {quizError && (
                <div className="p-3.5 rounded-md border border-red-500/40 bg-red-500/10 text-sm text-red-400">
                  {quizError}
                </div>
              )}

              {quizData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading text-base font-semibold text-foreground">
                      {quizData.title}
                    </h4>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      Отвечено {quizAnsweredCount} из {quizData.questions.length}
                    </span>
                  </div>

                  {quizData.questions.map((q, qi) => {
                    const chosen = quizAnswers[qi];
                    const isAnswered = chosen !== undefined;
                    return (
                      <div
                        key={qi}
                        className="p-4 rounded-lg border border-border bg-background space-y-3"
                      >
                        <div className="font-heading text-sm font-semibold text-foreground">
                          {qi + 1}. {q.prompt}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, oi) => {
                            const isCorrect = oi === q.correctIndex;
                            const isChosen = chosen === oi;
                            let cls =
                              'border-border bg-card hover:border-[#499BED]/60 text-foreground';
                            if (isAnswered) {
                              if (isCorrect) {
                                cls =
                                  'border-emerald-500 bg-emerald-500/15 text-foreground';
                              } else if (isChosen) {
                                cls =
                                  'border-red-500 bg-red-500/15 text-foreground';
                              }
                            }
                            return (
                              <button
                                key={oi}
                                type="button"
                                disabled={isAnswered}
                                onClick={() =>
                                  setQuizAnswers((prev) => ({
                                    ...prev,
                                    [qi]: oi,
                                  }))
                                }
                                className={`text-left px-3.5 py-2.5 rounded-md border text-base transition-colors cursor-pointer disabled:cursor-default ${cls}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {isAnswered && (
                          <p className="text-sm text-muted-foreground pt-1">
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRO PRONUNCIATION */}
          {activeTab === 'pronunciation' && (
            <PronunciationPanel
              plan={plan}
              level={activeLevel}
              onUpgrade={onOpenUpgrade}
            />
          )}

          {/* TAB 5: PRO LISTENING */}
          {activeTab === 'listening' && (
            <ListeningPanel
              plan={plan}
              level={activeLevel}
              onUpgrade={onOpenUpgrade}
            />
          )}

          {/* TAB 6: PRO ERROR ANALYSIS */}
          {activeTab === 'errors' && (
            <ErrorAnalysisPanel
              plan={plan}
              level={activeLevel}
              onUpgrade={onOpenUpgrade}
            />
          )}
        </div>
      </div>
    </section>
  );
}
