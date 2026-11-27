import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import { TrickyPrompt } from '../types/consultant';

interface TrickyPromptsPanelProps {
  prompts: TrickyPrompt[];
  disabled: boolean;
  isGenerating: boolean;
  onSelectPrompt: (prompt: TrickyPrompt) => void;
  onRegenerate: () => void;
  onUpdatePrompts: (updated: TrickyPrompt[]) => void;
}

export function TrickyPromptsPanel({
  prompts,
  disabled,
  isGenerating,
  onSelectPrompt,
  onRegenerate,
  onUpdatePrompts,
}: TrickyPromptsPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<TrickyPrompt[]>(prompts);

  const testedCount = prompts.filter((p) => p.tested).length;

  const startEditing = () => {
    setDrafts(prompts.map((p) => ({ ...p })));
    setExpanded(true);
    setEditing(true);
  };

  const handleSave = () => {
    const cleaned = drafts.map((d, idx) => ({
      ...d,
      trapType: d.trapType.trim() || `Проверка ${idx + 1}`,
      question: d.question.trim() || prompts[idx]?.question || '',
    }));
    onUpdatePrompts(cleaned);
    setEditing(false);
  };

  return (
    <section
      aria-label="Быстрая проверка на 5 каверзных вопросах"
      className="border-t border-slate-800/80 bg-[#0E1420]"
    >
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-display font-semibold text-slate-200">
              Проверка на 5 каверзных вопросах
            </span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="font-mono tabular-nums text-slate-400">
              Проверено {testedCount} из {prompts.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!editing ? (
              <>
                <button
                  type="button"
                  onClick={onRegenerate}
                  disabled={disabled || isGenerating}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`}
                  />
                  <span>{isGenerating ? 'Генерация...' : 'Обновить по базе'}</span>
                </button>
                <button
                  type="button"
                  onClick={startEditing}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Изменить</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{expanded ? 'Свернуть' : 'Показать'}</span>
                  {expanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded transition-colors cursor-pointer"
                >
                  <Save className="w-3 h-3" />
                  <span>Сохранить</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Отмена</span>
                </button>
              </>
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-2.5">
            {editing ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {drafts.map((item, idx) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-center"
                  >
                    <input
                      type="text"
                      value={item.trapType}
                      onChange={(e) => {
                        const next = [...drafts];
                        next[idx] = { ...next[idx], trapType: e.target.value };
                        setDrafts(next);
                      }}
                      placeholder="Тип проверки"
                      className="bg-[#0B0F17] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#3B82F6]"
                    />
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => {
                        const next = [...drafts];
                        next[idx] = { ...next[idx], question: e.target.value };
                        setDrafts(next);
                      }}
                      placeholder="Текст каверзного вопроса"
                      className="bg-[#0B0F17] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
                {prompts.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled || isGenerating}
                    onClick={() => onSelectPrompt(item)}
                    title={item.question}
                    className={`group text-left p-2.5 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer ${
                      item.tested
                        ? 'bg-[#121C2B] border-emerald-500/30 hover:border-emerald-500/50'
                        : 'bg-[#111827] border-slate-800/90 hover:border-slate-700 hover:bg-[#162033]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] text-slate-400 truncate">
                        <span className="font-mono tabular-nums text-slate-500 mr-1.5">
                          0{idx + 1}
                        </span>
                        {item.trapType}
                      </span>
                      {item.tested && (
                        <Check
                          className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                          aria-label="Вопрос проверен"
                        />
                      )}
                    </div>
                    <p className="text-xs text-slate-200 group-hover:text-white leading-snug line-clamp-2">
                      {item.question}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
