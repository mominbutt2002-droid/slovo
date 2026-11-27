import { useState } from 'react';
import { FileText, Plus, RotateCcw, Search } from 'lucide-react';
import { KnowledgeDocument } from '../types/consultant';

interface DocumentSidebarProps {
  documents: KnowledgeDocument[];
  selectedDocId: string | null;
  onToggleActive: (id: string) => void;
  onInspectDocument: (id: string) => void;
  onOpenAddModal: () => void;
  onResetDefaults: () => void;
}

export function DocumentSidebar({
  documents,
  selectedDocId,
  onToggleActive,
  onInspectDocument,
  onOpenAddModal,
  onResetDefaults,
}: DocumentSidebarProps) {
  const [query, setQuery] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const activeDocs = documents.filter((d) => d.active);
  const totalActiveWords = activeDocs.reduce((sum, d) => sum + d.wordCount, 0);

  const filtered = documents.filter((doc) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      doc.content.toLowerCase().includes(q)
    );
  });

  return (
    <aside className="flex flex-col bg-[#0F1522] border-b lg:border-b-0 lg:border-r border-slate-800/80 w-full lg:w-[290px] shrink-0">
      <div className="px-4 pt-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-display text-sm font-semibold text-slate-100">
            Документы в контексте
          </h3>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#60A5FA] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono tabular-nums">
          <span>
            Активно {activeDocs.length} из {documents.length}
          </span>
          <span aria-hidden="true">·</span>
          <span>{totalActiveWords.toLocaleString('ru-RU')} сл.</span>
        </div>

        <div className="relative mt-3">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по базе центра..."
            className="w-full bg-[#0B0F17] border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6] transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 max-h-[260px] lg:max-h-none">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-slate-400">
              {documents.length === 0
                ? 'База документов пуста.'
                : 'По запросу ничего не найдено.'}
            </p>
          </div>
        ) : (
          filtered.map((doc) => {
            const isSelected = selectedDocId === doc.id;
            return (
              <div
                key={doc.id}
                className={`group rounded-md border transition-colors ${
                  isSelected
                    ? 'bg-[#172032] border-slate-700/80'
                    : 'bg-transparent border-transparent hover:bg-slate-800/40 hover:border-slate-800/80'
                }`}
              >
                <div className="flex items-start gap-2.5 p-2.5">
                  <input
                    type="checkbox"
                    checked={doc.active}
                    onChange={() => onToggleActive(doc.id)}
                    aria-label={`Использовать документ ${doc.title}`}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-600 bg-[#0B0F17] accent-[#3B82F6] cursor-pointer shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => onInspectDocument(doc.id)}
                    className="flex-1 min-w-0 text-left focus-visible:outline-none cursor-pointer"
                  >
                    <div
                      className={`text-[13px] font-medium leading-snug truncate transition-colors ${
                        doc.active ? 'text-slate-100' : 'text-slate-500 line-through'
                      }`}
                      title={doc.title}
                    >
                      {doc.title}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="truncate">{doc.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums shrink-0">
                        {doc.wordCount.toLocaleString('ru-RU')} сл.
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onInspectDocument(doc.id)}
                    title="Открыть в редакторе базы"
                    className="opacity-60 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-100 rounded transition-opacity cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-slate-800/80 bg-[#0D1320]">
        {confirmReset ? (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Вернуть официальный прайс-лист, регламент учебного центра и 5 проверочных вопросов?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetDefaults();
                  setConfirmReset(false);
                }}
                className="flex-1 py-1.5 px-2.5 text-xs font-medium bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded transition-colors cursor-pointer"
              >
                Подтвердить
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="py-1.5 px-2.5 text-xs font-medium text-slate-300 hover:text-white border border-slate-700 rounded transition-colors cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-300 hover:text-slate-100 bg-transparent hover:bg-slate-800/60 border border-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сбросить к базе центра</span>
          </button>
        )}
      </div>
    </aside>
  );
}
