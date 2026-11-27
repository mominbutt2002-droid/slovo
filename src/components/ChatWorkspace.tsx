import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUp,
  CheckCircle2,
  FolderOpen,
  RotateCcw,
  ShieldAlert,
  Square,
  Trash2,
} from 'lucide-react';
import {
  ChatMessage,
  GroundingStatus,
  KnowledgeDocument,
  TrickyPrompt,
} from '../types/consultant';
import { TrickyPromptsPanel } from './TrickyPromptsPanel';

interface ChatWorkspaceProps {
  documents: KnowledgeDocument[];
  messages: ChatMessage[];
  trickyPrompts: TrickyPrompt[];
  isLoading: boolean;
  isGeneratingPrompts: boolean;
  onSendQuestion: (question: string, trickyPromptId?: string) => void;
  onCancelRequest: () => void;
  onRetryMessage: (messageId: string) => void;
  onClearChat: () => void;
  onEnableAllDocs: () => void;
  onOpenAddModal: () => void;
  onRegeneratePrompts: () => void;
  onUpdatePrompts: (updated: TrickyPrompt[]) => void;
}

function renderStatusHeader(status?: GroundingStatus, error?: boolean) {
  if (error) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-400">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Ошибка обработки запроса</span>
      </div>
    );
  }
  if (status === 'grounded') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>По данным базы</span>
      </div>
    );
  }
  if (status === 'partial') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-400">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>Частично в базе</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-300/90">
      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
      <span>Нет в базе</span>
    </div>
  );
}

function FormattedAnswer({ text }: { text: string }) {
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-2.5 text-[15px] leading-[1.65] text-slate-200 tabular-nums">
      {blocks.map((block, idx) => {
        const lines = block.split('\n').map((l) => l.trim());
        const isList = lines.length > 1 && lines.every((l) => /^[-•*]\s+/.test(l));
        if (isList) {
          return (
            <ul key={idx} className="space-y-1.5 pl-4 list-disc marker:text-slate-500">
              {lines.map((line, li) => (
                <li key={li}>{line.replace(/^[-•*]\s+/, '')}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </div>
  );
}

export function ChatWorkspace({
  documents,
  messages,
  trickyPrompts,
  isLoading,
  isGeneratingPrompts,
  onSendQuestion,
  onCancelRequest,
  onRetryMessage,
  onClearChat,
  onEnableAllDocs,
  onOpenAddModal,
  onRegeneratePrompts,
  onUpdatePrompts,
}: ChatWorkspaceProps) {
  const [input, setInput] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeDocs = documents.filter((d) => d.active);
  const hasActiveDocs = activeDocs.length > 0;

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el && (messages.length > 0 || isLoading)) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, isLoading]);

  const submitCurrent = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !hasActiveDocs) return;
    onSendQuestion(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitCurrent();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitCurrent();
    }
  };

  const promptById = new Map(trickyPrompts.map((p) => [p.id, p]));

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full bg-[#0B0F17]">
      {/* Contextual sub-header inside workspace */}
      <div className="shrink-0 border-b border-slate-800/80 px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 bg-[#0C111B]">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="text-slate-200 font-medium">Строгий режим без цитат</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Активных документов: {activeDocs.length}
          </span>
          {activeDocs.length > 0 && (
            <>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <span className="hidden sm:inline truncate max-w-[380px] text-slate-400">
                {activeDocs.map((d) => d.title).join(', ')}
              </span>
            </>
          )}
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={onClearChat}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Очистить диалог</span>
          </button>
        )}
      </div>

      {/* Chat scroll area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 min-h-[260px]"
      >
        <div className="max-w-3xl mx-auto">
          {!hasActiveDocs && (
            <div className="mb-6 p-4 rounded-md border border-amber-500/30 bg-amber-500/5 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-amber-200">
                  Нет активных документов в базе знаний
                </p>
                <p className="text-xs text-slate-400">
                  Включите хотя бы один документ слева или загрузите новый файл, чтобы задать вопрос консультанту.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {documents.length > 0 && (
                  <button
                    type="button"
                    onClick={onEnableAllDocs}
                    className="px-3 py-1.5 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Включить все ({documents.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded transition-colors cursor-pointer whitespace-nowrap"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Загрузить файл</span>
                </button>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="py-6 sm:py-8">
              <h3 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-slate-100 max-w-xl">
                Задайте вопрос по программам, ценам и регламенту учебного центра
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-400 max-w-2xl">
                Консультант отвечает строго по загруженным документам учебного центра «ФактБаза» — только факты без вывода цитат. Если информации нет в прайсе или регламенте, он честно откажется отвечать вместо домыслов.
              </p>

              <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <div className="text-xs font-medium text-slate-200">
                    1. Проверьте на 5 вопросах-ловушках
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Нажмите на любую подсказку ниже: ЕГЭ, выдуманная скидка 25%, возврат после 4 занятий, виза в Германию и внешние советы.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-200">
                    2. Уточните условия обучения
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Спросите про рассрочку, налоговый вычет 13%, ФИС ФРДО, перенос потока или корпоративный выезд.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-200">
                    3. Загрузите свой документ
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Добавьте свой FAQ, учебный план или прайс (TXT, MD, PDF) и перегенерируйте 5 каверзных проверок.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((msg) => {
                if (msg.role === 'user') {
                  const linkedPrompt = msg.trickyPromptId
                    ? promptById.get(msg.trickyPromptId)
                    : undefined;
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] sm:max-w-[75%] rounded-md bg-[#172032] border border-slate-700/60 px-4 py-3">
                        {linkedPrompt && (
                          <div className="mb-1 text-[11px] text-slate-400">
                            Каверзный вопрос · {linkedPrompt.trapType}
                          </div>
                        )}
                        <p className="text-[15px] leading-relaxed text-slate-100 whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className="pb-6 border-b border-slate-800/70 last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      {renderStatusHeader(msg.groundingStatus, msg.error)}
                      <span className="text-[11px] font-mono tabular-nums text-slate-500">
                        {msg.createdAt}
                      </span>
                    </div>

                    <FormattedAnswer text={msg.content} />

                    {msg.error && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => onRetryMessage(msg.id)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Повторить запрос</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="pb-4 space-y-3" aria-live="polite">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-400">
                      Проверка фактов по активным документам...
                    </span>
                    <button
                      type="button"
                      onClick={onCancelRequest}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Отменить</span>
                    </button>
                  </div>
                  <div className="space-y-2 max-w-xl animate-pulse">
                    <div className="h-3.5 bg-slate-800/90 rounded w-11/12" />
                    <div className="h-3.5 bg-slate-800/70 rounded w-4/5" />
                    <div className="h-3.5 bg-slate-800/50 rounded w-3/5" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Integrated 5 Tricky Questions Panel directly inside Chat */}
      <TrickyPromptsPanel
        prompts={trickyPrompts}
        disabled={isLoading || !hasActiveDocs}
        isGenerating={isGeneratingPrompts}
        onSelectPrompt={(prompt) => onSendQuestion(prompt.question, prompt.id)}
        onRegenerate={onRegeneratePrompts}
        onUpdatePrompts={onUpdatePrompts}
      />

      {/* Message composer */}
      <div className="shrink-0 border-t border-slate-800/80 bg-[#0B0F17] px-4 lg:px-6 py-3.5">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
          <div className="flex items-end gap-2 bg-[#111827] border border-slate-800 focus-within:border-[#3B82F6] rounded-md px-3.5 py-2.5 transition-colors">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
              }}
              onKeyDown={handleKeyDown}
              disabled={!hasActiveDocs || isLoading}
              placeholder={
                hasActiveDocs
                  ? 'Спросите про курсы, цены, рассрочку, налоговый вычет 13% или возврат...'
                  : 'Включите или загрузите документ для начала консультации'
              }
              className="flex-1 bg-transparent resize-none text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none leading-relaxed max-h-[140px] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || !hasActiveDocs || isLoading}
              aria-label="Отправить вопрос"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-slate-800 disabled:text-slate-500 rounded-md transition-colors shrink-0 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Спросить</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>Enter — отправить · Shift+Enter — перенос строки</span>
            <span>Ответы формируются строго по активным документам</span>
          </div>
        </form>
      </div>
    </div>
  );
}
