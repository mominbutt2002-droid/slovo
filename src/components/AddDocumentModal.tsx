import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { FileUp, Loader2, X } from 'lucide-react';
import { countWords } from '../data/defaultKnowledgeBase';
import { extractPdfText } from '../services/consultantApi';
import { DocumentCategory, KnowledgeDocument } from '../types/consultant';

interface AddDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onAddDocument: (doc: KnowledgeDocument) => void;
}

const CATEGORIES: DocumentCategory[] = [
  'Прайс-лист',
  'Регламент',
  'Инструкция',
  'База статей',
  'Пользовательский',
];

const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.csv', '.json', '.pdf'];

export function AddDocumentModal({
  open,
  onClose,
  onAddDocument,
}: AddDocumentModalProps) {
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Прайс-лист');
  const [content, setContent] = useState('');
  const [sourceFileName, setSourceFileName] = useState<string | undefined>();
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSourceFileName(undefined);
    setError(null);
    setMode('file');
  };

  const handleClose = () => {
    if (isParsingFile) return;
    resetForm();
    onClose();
  };

  const processFile = async (file: File) => {
    setError(null);
    const lowerName = file.name.toLowerCase();
    const isSupported = SUPPORTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!isSupported) {
      setError('Поддерживаются файлы .txt, .md, .csv, .json и .pdf.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Максимальный размер файла — 10 МБ.');
      return;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    setSourceFileName(file.name);
    if (!title.trim()) {
      setTitle(baseName);
    }

    if (lowerName.endsWith('.pdf')) {
      setIsParsingFile(true);
      try {
        const extracted = await extractPdfText(file);
        setContent(extracted);
        setMode('text');
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Не удалось извлечь текст из PDF-файла.'
        );
      } finally {
        setIsParsingFile(false);
      }
      return;
    }

    try {
      const text = await file.text();
      if (!text.trim()) {
        setError('Выбранный файл не содержит текста.');
        return;
      }
      setContent(text);
      setMode('text');
    } catch {
      setError('Не удалось прочитать содержимое файла.');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    if (!cleanTitle) {
      setError('Укажите название документа.');
      return;
    }
    if (!cleanContent) {
      setError('Добавьте текст документа или загрузите файл.');
      return;
    }

    const newDoc: KnowledgeDocument = {
      id: `doc-${Date.now()}`,
      title: cleanTitle,
      category,
      content: cleanContent,
      active: true,
      wordCount: countWords(cleanContent),
      updatedAt: new Date().toISOString().slice(0, 10),
      sourceFileName,
    };

    onAddDocument(newDoc);
    resetForm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-doc-title"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-xl rounded-lg bg-[#111827] border border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2
            id="add-doc-title"
            className="font-display text-base font-semibold text-slate-100"
          >
            Добавить документ в базу
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Закрыть окно"
            className="p-1 text-slate-400 hover:text-slate-100 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="inline-flex p-1 bg-[#0B0F17] border border-slate-800 rounded-md">
            <button
              type="button"
              onClick={() => setMode('file')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                mode === 'file'
                  ? 'bg-[#172032] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Загрузить файл
            </button>
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                mode === 'text'
                  ? 'bg-[#172032] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Вставить текст
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-md border border-red-500/30 bg-red-500/10 text-xs text-red-300">
              {error}
            </div>
          )}

          {mode === 'file' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isParsingFile && fileInputRef.current?.click()}
              className={`border border-dashed rounded-md p-8 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                  : 'border-slate-700 hover:border-slate-500 bg-[#0B0F17]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {isParsingFile ? (
                <div className="space-y-2 py-2">
                  <Loader2 className="w-6 h-6 text-[#3B82F6] animate-spin mx-auto" />
                  <p className="text-sm text-slate-200">
                    Извлечение текста из PDF...
                  </p>
                  <p className="text-xs text-slate-500">
                    Это займет несколько секунд
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <FileUp className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-sm font-medium text-slate-200">
                    Перетащите файл сюда или нажмите для выбора
                  </p>
                  <p className="text-xs text-slate-500">
                    Поддерживаются TXT, MD, CSV, JSON и PDF до 10 МБ
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_170px] gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    Название документа
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Например: Прайс-лист на 2026 год"
                    className="w-full bg-[#0B0F17] border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    Категория
                  </label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as DocumentCategory)
                    }
                    className="w-full bg-[#0B0F17] border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#3B82F6]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-slate-400">
                    Текст документа
                  </label>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500">
                    {countWords(content).toLocaleString('ru-RU')} слов
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Вставьте прайс-лист, FAQ, инструкцию или выдержку из регламента..."
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-md p-3 text-xs font-mono leading-relaxed text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6] resize-y"
                />
              </div>
            </>
          )}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isParsingFile}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white border border-slate-700 rounded-md transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isParsingFile || !content.trim()}
              className="px-4 py-2 text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-slate-800 disabled:text-slate-500 rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Добавить в базу
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
