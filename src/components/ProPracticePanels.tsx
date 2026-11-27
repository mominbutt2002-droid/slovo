import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  FileSearch,
  Headphones,
  Loader2,
  Lock,
  Mic,
  RefreshCw,
  Square,
  Volume2,
} from 'lucide-react';
import { PRONUNCIATION_PHRASES } from '../data/russianCurriculum';
import {
  analyzeErrors,
  evaluatePronunciation,
  fetchReferenceTts,
  generateListeningExercise,
} from '../services/tutorApi';
import {
  ErrorAnalysisResult,
  ListeningPayload,
  PlanTier,
  ProficiencyLevel,
  PronunciationResult,
} from '../types/tutor';
import { Button, Input, Progress, Textarea } from './ui/primitives';

interface ProGateProps {
  title: string;
  description: string;
  onUpgrade: () => void;
}

function ProGate({ title, description, onUpgrade }: ProGateProps) {
  return (
    <div className="p-8 lg:p-12 text-center max-w-xl mx-auto space-y-4">
      <div className="w-11 h-11 rounded-md border border-border bg-secondary mx-auto flex items-center justify-center">
        <Lock className="w-5 h-5 text-[#499BED]" />
      </div>
      <h3 className="font-heading text-xl font-semibold text-foreground">
        {title}
      </h3>
      <p className="text-base text-muted-foreground leading-relaxed">
        {description}
      </p>
      <div className="pt-2">
        <Button type="button" variant="accent" size="lg" onClick={onUpgrade}>
          Открыть в тарифе Pro (Stripe)
        </Button>
      </div>
    </div>
  );
}

/* ==================== 1. PRO PRONUNCIATION CHECKER ==================== */

export function PronunciationPanel({
  plan,
  level,
  onUpgrade,
}: {
  plan: PlanTier;
  level: ProficiencyLevel;
  onUpgrade: () => void;
}) {
  const levelPhrases = PRONUNCIATION_PHRASES.filter((p) => p.level === level);
  const [selectedPhrase, setSelectedPhrase] = useState(
    levelPhrases[0]?.text || PRONUNCIATION_PHRASES[0].text
  );
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPlayingRef, setIsPlayingRef] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  if (plan !== 'pro') {
    return (
      <ProGate
        title="Проверка произношения и ударений — в тарифе Pro"
        description="Записывайте русскую речь через микрофон, слушайте эталонную озвучку диктора и получайте оценку произношения с разбором ударений и редукции гласных."
        onUpgrade={onUpgrade}
      />
    );
  }

  const handlePlayReference = async () => {
    if (!selectedPhrase.trim() || isPlayingRef) return;
    setError(null);
    setIsPlayingRef(true);
    try {
      const wavBase64 = await fetchReferenceTts(selectedPhrase);
      const audio = new Audio(`data:audio/wav;base64,${wavBase64}`);
      audio.onended = () => setIsPlayingRef(false);
      audio.onerror = () => setIsPlayingRef(false);
      await audio.play();
    } catch (err) {
      setIsPlayingRef(false);
      setError(err instanceof Error ? err.message : 'Не удалось озвучить фразу.');
    }
  };

  const startRecording = async () => {
    setError(null);
    setResult(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Ваш браузер не поддерживает запись с микрофона.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        setIsEvaluating(true);
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const str = typeof reader.result === 'string' ? reader.result : '';
              const idx = str.indexOf(',');
              resolve(idx >= 0 ? str.slice(idx + 1) : str);
            };
            reader.onerror = () => reject(new Error('Ошибка чтения аудио.'));
            reader.readAsDataURL(blob);
          });

          const evaluated = await evaluatePronunciation({
            audioBase64: base64,
            mimeType: blob.type || 'audio/webm',
            targetPhrase: selectedPhrase,
            level,
          });
          setResult(evaluated);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Не удалось оценить произношение.'
          );
        } finally {
          setIsEvaluating(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setError('Нет доступа к микрофону. Разрешите доступ в настройках браузера.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="p-5 lg:p-6 space-y-6">
      <div className="space-y-2">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          Тренажёр произношения и ударений
        </h3>
        <p className="text-base text-muted-foreground">
          Выберите фразу для вашего уровня или введите свою, послушайте эталон и запишите произношение через микрофон.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {levelPhrases.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSelectedPhrase(item.text);
              setResult(null);
            }}
            className={`text-left p-4 rounded-md border transition-colors cursor-pointer ${
              selectedPhrase === item.text
                ? 'border-[#499BED] bg-secondary/70'
                : 'border-border bg-background hover:border-[#499BED]/50'
            }`}
          >
            <div className="text-base text-foreground font-medium">
              {item.text}
            </div>
            <div className="mt-1.5 font-heading text-xs text-muted-foreground">
              Фокус: {item.focus}
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="block font-heading text-xs font-medium text-muted-foreground">
          Фраза для прочтения вслух
        </label>
        <Textarea
          rows={2}
          value={selectedPhrase}
          onChange={(e) => setSelectedPhrase(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handlePlayReference}
          disabled={isPlayingRef || isRecording || !selectedPhrase.trim()}
        >
          {isPlayingRef ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Volume2 className="w-4 h-4 text-[#499BED]" />
          )}
          <span>{isPlayingRef ? 'Воспроизведение...' : 'Послушать эталон'}</span>
        </Button>

        {!isRecording ? (
          <Button
            type="button"
            variant="accent"
            onClick={startRecording}
            disabled={isEvaluating || !selectedPhrase.trim()}
          >
            <Mic className="w-4 h-4" />
            <span>Записать произношение</span>
          </Button>
        ) : (
          <Button type="button" variant="destructive" onClick={stopRecording}>
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Остановить запись и проверить</span>
          </Button>
        )}
      </div>

      {isEvaluating && (
        <div className="flex items-center gap-2 font-heading text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-[#499BED]" />
          <span>Распознаём речь и проверяем ударения...</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-md border border-red-500/40 bg-red-500/10 text-sm text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="p-5 rounded-lg border border-border bg-background space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-heading text-xs text-muted-foreground">
                Точность произношения и дикции
              </div>
              <div className="font-mono text-2xl font-semibold text-foreground tabular-nums">
                {result.score} / 100
              </div>
            </div>
            <div className="w-44">
              <Progress value={result.score} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border">
            <div>
              <div className="font-heading text-xs text-muted-foreground mb-1">
                Распознано из вашей речи
              </div>
              <p className="text-base text-foreground">{result.transcript}</p>
            </div>
            <div>
              <div className="font-heading text-xs text-muted-foreground mb-1">
                Ориентир по ударениям
              </div>
              <p className="text-base text-foreground font-medium">
                {result.stressGuide}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-2">
            <div className="font-heading text-xs text-muted-foreground">
              Комментарий репетитора
            </div>
            <p className="text-base text-foreground leading-relaxed">
              {result.feedback}
            </p>
            {result.issues.length > 0 && (
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {result.issues.map((iss, idx) => (
                  <li key={idx}>
                    <span className="font-heading font-semibold text-foreground">
                      {iss.word}:
                    </span>{' '}
                    {iss.note}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== 2. PRO LISTENING STUDIO ==================== */

export function ListeningPanel({
  plan,
  level,
  onUpgrade,
}: {
  plan: PlanTier;
  level: ProficiencyLevel;
  onUpgrade: () => void;
}) {
  const [topic, setTopic] = useState('Путешествия и культура России');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<ListeningPayload | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (plan !== 'pro') {
    return (
      <ProGate
        title="Listening (аудирование) — в тарифе Pro"
        description="Слушайте сгенерированные живые русские тексты вашего уровня с выбором скорости речи, проверяйте понимание по вопросам и открывайте расшифровку при необходимости."
        onUpgrade={onUpgrade}
      />
    );
  }

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    setAnswers({});
    setShowTranscript(false);
    try {
      const data = await generateListeningExercise({ level, topic });
      setPayload(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания аудирования.');
    } finally {
      setLoading(false);
    }
  };

  const applySpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  return (
    <div className="p-5 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex-1 space-y-1.5">
          <h3 className="font-heading text-lg font-semibold text-foreground">
            Аудирование (Listening)
          </h3>
          <p className="text-base text-muted-foreground">
            Укажите тему — AI сгенерирует русскую аудиозапись под ваш уровень и 3 вопроса на понимание.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Тема аудиофрагмента (например: деловая встреча, театр, новости науки)"
          className="flex-1"
        />
        <Button
          type="button"
          variant="accent"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Headphones className="w-4 h-4" />
          )}
          <span>{loading ? 'Создаём аудио...' : 'Сгенерировать аудирование'}</span>
        </Button>
      </div>

      {error && (
        <div className="p-3.5 rounded-md border border-red-500/40 bg-red-500/10 text-sm text-red-400">
          {error}
        </div>
      )}

      {payload && (
        <div className="space-y-5">
          <div className="p-5 rounded-lg border border-border bg-background space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-heading text-base font-semibold text-foreground">
                {payload.title}
              </h4>
              <div className="flex items-center gap-1.5">
                {[0.85, 1, 1.15].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => applySpeed(speed)}
                    className={`px-2.5 py-1 rounded font-mono text-xs tabular-nums transition-colors cursor-pointer ${
                      playbackRate === speed
                        ? 'bg-[#499BED] text-[#031725] font-semibold'
                        : 'bg-secondary text-secondary-foreground hover:opacity-80'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {payload.audioBase64 ? (
              <audio
                ref={audioRef}
                controls
                src={`data:audio/wav;base64,${payload.audioBase64}`}
                className="w-full"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Аудиодорожка недоступна — откройте текст ниже.
              </p>
            )}

            <div>
              <button
                type="button"
                onClick={() => setShowTranscript((v) => !v)}
                className="font-heading text-xs font-medium text-[#499BED] hover:underline cursor-pointer"
              >
                {showTranscript ? 'Скрыть расшифровку' : 'Показать текст аудиозаписи'}
              </button>
              {showTranscript && (
                <p className="mt-2.5 pt-2.5 border-t border-border text-base text-foreground leading-relaxed">
                  {payload.transcript}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {payload.questions.map((q, qi) => {
              const chosen = answers[qi];
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
                      let stateCls =
                        'border-border bg-card hover:border-[#499BED]/60 text-foreground';
                      if (isAnswered) {
                        if (isCorrect) {
                          stateCls =
                            'border-emerald-500 bg-emerald-500/15 text-foreground';
                        } else if (isChosen) {
                          stateCls =
                            'border-red-500 bg-red-500/15 text-foreground';
                        }
                      }
                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={isAnswered}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [qi]: oi }))
                          }
                          className={`text-left px-3.5 py-2.5 rounded-md border text-sm transition-colors cursor-pointer disabled:cursor-default ${stateCls}`}
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
        </div>
      )}
    </div>
  );
}

/* ==================== 3. PRO DEEP ERROR ANALYSIS ==================== */

const SAMPLE_ERROR_TEXT =
  'Согласно договора мы должны встретится завтра в течении дня что бы обсудить не законченый отчёт и поговорить о новом проэкте.';

export function ErrorAnalysisPanel({
  plan,
  level,
  onUpgrade,
}: {
  plan: PlanTier;
  level: ProficiencyLevel;
  onUpgrade: () => void;
}) {
  const [text, setText] = useState(SAMPLE_ERROR_TEXT);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ErrorAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (plan !== 'pro') {
    return (
      <ProGate
        title="Глубокий разбор ошибок — в тарифе Pro"
        description="Вставьте письмо, эссе или домашнее задание на русском языке — репетитор найдёт орфографические, пунктуационные, грамматические и стилистические ошибки и объяснит каждое правило."
        onUpgrade={onUpgrade}
      />
    );
  }

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const data = await analyzeErrors({ text, level });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось разобрать текст.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.correctedText) return;
    try {
      await navigator.clipboard.writeText(result.correctedText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="p-5 lg:p-6 space-y-5">
      <div>
        <h3 className="font-heading text-lg font-semibold text-foreground">
          Глубокий разбор ошибок
        </h3>
        <p className="mt-1 text-base text-muted-foreground">
          Вставьте любой текст на русском — репетитор проверит орфографию, пунктуацию, грамматику и стиль.
        </p>
      </div>

      <Textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Вставьте русский текст для подробной проверки..."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="accent"
          onClick={handleAnalyze}
          disabled={loading || !text.trim()}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileSearch className="w-4 h-4" />
          )}
          <span>{loading ? 'Анализируем текст...' : 'Разобрать ошибки'}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setText(SAMPLE_ERROR_TEXT);
            setResult(null);
          }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Загрузить пример с ошибками</span>
        </Button>
      </div>

      {error && (
        <div className="p-3.5 rounded-md border border-red-500/40 bg-red-500/10 text-sm text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="p-5 rounded-lg border border-border bg-background space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-heading text-xs text-muted-foreground">
                  Индекс грамотности
                </div>
                <div className="font-mono text-2xl font-semibold text-foreground tabular-nums">
                  {result.score} / 100
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Копировать исправленный текст</span>
                  </>
                )}
              </Button>
            </div>

            <div className="pt-3 border-t border-border">
              <div className="font-heading text-xs text-muted-foreground mb-1">
                Исправленный вариант
              </div>
              <p className="text-base text-foreground leading-relaxed">
                {result.correctedText}
              </p>
            </div>

            <p className="text-sm text-muted-foreground">{result.summary}</p>
          </div>

          {result.errors.length > 0 && (
            <div className="divide-y divide-border rounded-lg border border-border bg-background">
              {result.errors.map((errItem, idx) => (
                <div key={idx} className="p-4 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 font-heading text-xs text-muted-foreground">
                    <span className="text-[#499BED] font-semibold">
                      {errItem.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="line-through text-red-400">
                      {errItem.fragment}
                    </span>
                    <span aria-hidden="true">→</span>
                    <span className="text-emerald-400 font-semibold">
                      {errItem.correction}
                    </span>
                  </div>
                  <p className="text-base text-foreground/90">
                    {errItem.explanation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
