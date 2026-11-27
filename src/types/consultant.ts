export type DocumentCategory =
  | 'Прайс-лист'
  | 'Регламент'
  | 'Инструкция'
  | 'База статей'
  | 'Пользовательский';

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  content: string;
  active: boolean;
  wordCount: number;
  updatedAt: string;
  sourceFileName?: string;
}

export type GroundingStatus = 'grounded' | 'partial' | 'not_found';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  groundingStatus?: GroundingStatus;
  trickyPromptId?: string;
  createdAt: string;
  error?: boolean;
}

export interface TrickyPrompt {
  id: string;
  trapType: string;
  question: string;
  tested: boolean;
  lastStatus?: GroundingStatus;
}

export type WorkspaceTab = 'consultant' | 'documents';
