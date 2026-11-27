import { useEffect, useState } from 'react';
import {
  Check,
  FilePlus2,
  FileText,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { countWords } from '../data/defaultKnowledgeBase';
import { DocumentCategory, KnowledgeDocument } from '../types/consultant';

interface DocumentManagerViewProps {
  documents: KnowledgeDocument[];
  selectedDocId: string | null;
  onSelectDoc: (id: string | null) => void;
  onToggleActive: (id: string) => void;
  onUpdateDocument: (doc: KnowledgeDocument) => void;
  onDeleteDocument: (id: string) => void;
  onOpenAddModal: () => void;
  onGoToConsultant: () => void;
}

const CATEGORIES: Array<'Все' | DocumentCategory> = [
  'Все',
  'Прайс-лист',
  'Регламент',
  'Инструкция',
  'База статей',
  'Пользовательский',
];

const DOC_CATEGORIES: DocumentCategory[] = [
  'Прайс-лист',
  'Регламент',
  'Инструкция',
  'База статей',
  'Пользовательский',
];

export function DocumentManagerView({
  documents,
  selectedDocId,
  onSelectDoc,
  onToggleActive,
  onUpdateDocument,
  onDeleteDocument,
  onOpenAddModal,
  onGoToConsultant,
}: DocumentManagerViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<'Все' | DocumentCategory>('Все');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selectedDoc =
    documents.find((d) => d.id === selectedDocId) || documents[0] || null;

  const [editTitle, setEditTitle] = useState(selectedDoc?.title || '');
  const [editCategory, setEditCategory] = useState<DocumentCategory>(
    selectedDoc?.category || 'Пользовательский'
  );
  const [editContent, setEditContent] = useState(selectedDoc?.content || '');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (selectedDoc) {
      setEditTitle(selectedDoc.title);
      setEditCategory(selectedDoc.category);
      setEditContent(selectedDoc.content);
      setJustSaved(false);
    }
  }, [selectedDoc?.id]);

  const filteredDocs = documents.filter((d) =>
    categoryFilter === 'Все' ? true : d.category === categoryFilter
  );

  const hasUnsavedChanges =
    !!selectedDoc &&
    (editTitle !== selectedDoc.title ||
      editCategory !== selectedDoc.category ||
      editContent !== selectedDoc.content);

  const handleSave = () => {
    if (!selectedDoc) return;
    const trimmedTitle = editTitle.trim() || 'Без названия';
    const trimmedContent = editContent.trim();
    if (!trimmedContent) return;

    onUpdateDocument({
      ...selectedDoc,
      title: trimmedTitle,
      category: editCategory,
      content: trimmedContent,
      wordCount: countWords(trimmedContent),
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-[#0B0F17] overflow-hidden">
      {/* Workspace sub-header */}
      <div className="shrink-0 border-b border-slate-800/80 px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#0C111B]">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-sm font-semibold text-slate-100">
            Активные файлы и редактор текста
          </h3>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            Всего: {documents.length} · Активных:{' '}
            {documents.filter((d) => d.active).length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGoToConsultant}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            Перейти к диалогу
          </button>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Загрузить файл или текст</span>
          </button>
        </div>
      </div>

      {/* Category filter strip */}
      <div className="shrink-0 border-b border-slate-800/80 px-4 lg:px-8 py-2 bg-[#0B0F17] flex items-center gap-1 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              categoryFilter === cat
                ? 'bg-[#172032] text-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main split: Document list + Full text editor */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] min-h-0 overflow-hidden">
        {/* Left list */}
        <div className="border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-y-auto bg-[#0D1320]">
          {filteredDocs.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <FilePlus2 className="w-7 h-7 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-300">
                В этой категории документов пока нет
              </p>
              <button
                type="button"
                onClick={onOpenAddModal}
                className="px-3.5 py-2 text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-md transition-colors cursor-pointer"
              >
                Добавить документ
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {filteredDocs.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`p-4 transition-colors ${
                      isSelected ? 'bg-[#151F30]' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={doc.active}
                        onChange={() => onToggleActive(doc.id)}
                        aria-label={`Активность документа ${doc.title}`}
                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-[#0B0F17] accent-[#3B82F6] cursor-pointer shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => onSelectDoc(doc.id)}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="text-sm font-medium text-slate-100 truncate">
                          {doc.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                          <span>{doc.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {doc.wordCount.toLocaleString('ru-RU')} сл.
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              doc.active ? 'text-emerald-400' : 'text-slate-500'
                            }
                          >
                            {doc.active ? 'Активен' : 'Отключен'}
                          </span>
                        </div>
                      </button>

                      {confirmDeleteId === doc.id ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteDocument(doc.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 text-[11px] font-medium text-white bg-red-600 hover:bg-red-500 rounded cursor-pointer"
                          >
                            Удалить
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-[11px] text-slate-300 hover:text-white cursor-pointer"
                          >
                            Нет
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(doc.id)}
                          aria-label={`Удалить документ ${doc.title}`}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right full-text viewer/editor */}
        <div className="flex flex-col min-h-0 overflow-hidden bg-[#0B0F17]">
          {selectedDoc ? (
            <>
              <div className="shrink-0 p-4 lg:px-6 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[220px] grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-2.5">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    aria-label="Название документа"
                    className="bg-[#111827] border border-slate-800 rounded-md px-3 py-1.5 text-sm font-medium text-slate-100 focus:outline-none focus:border-[#3B82F6]"
                  />
                  <select
                    value={editCategory}
                    onChange={(e) =>
                      setEditCategory(e.target.value as DocumentCategory)
                    }
                    aria-label="Категория документа"
                    className="bg-[#111827] border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#3B82F6]"
                  >
                    {DOC_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    {countWords(editContent).toLocaleString('ru-RU')} слов ·{' '}
                    {editContent.length.toLocaleString('ru-RU')} симв.
                  </span>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || !editContent.trim()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-slate-800 disabled:text-slate-500 rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {justSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Сохранено</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Сохранить</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 lg:p-6 overflow-hidden flex flex-col">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  aria-label="Содержимое документа"
                  spellCheck={false}
                  className="flex-1 w-full bg-[#111827] border border-slate-800 rounded-md p-4 text-[13.5px] font-mono leading-relaxed text-slate-200 focus:outline-none focus:border-[#3B82F6] resize-none"
                />
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Редактируйте текст напрямую — консультант сразу начнет опираться на сохраненную версию.
                  </span>
                  {selectedDoc.sourceFileName && (
                    <span className="font-mono">{selectedDoc.sourceFileName}</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <FileText className="w-8 h-8 text-slate-600 mb-3" />
              <p className="text-sm text-slate-300">
                Выберите документ слева или загрузите новый файл
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
