import { ChatMessage, GroundingStatus, KnowledgeDocument, TrickyPrompt } from '../types/consultant';

export interface AskConsultantResponse {
  answer: string;
  groundingStatus: GroundingStatus;
}

export async function askConsultant(
  question: string,
  activeDocuments: KnowledgeDocument[],
  history: ChatMessage[],
  signal?: AbortSignal
): Promise<AskConsultantResponse> {
  const response = await fetch('/api/consultant/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      question,
      documents: activeDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        content: doc.content,
      })),
      history: history
        .filter((msg) => !msg.error)
        .slice(-6)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    answer?: string;
    groundingStatus?: GroundingStatus;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || `Ошибка сервера (${response.status})`);
  }

  return {
    answer: payload.answer || 'В загруженных документах нет информации по этому вопросу.',
    groundingStatus: payload.groundingStatus || 'not_found',
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
    reader.readAsDataURL(file);
  });
}

export async function extractPdfText(file: File): Promise<string> {
  const base64Data = await fileToBase64(file);
  const response = await fetch('/api/consultant/extract-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base64Data,
      fileName: file.name,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    text?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || 'Не удалось извлечь текст из PDF.');
  }

  return payload.text || '';
}

export async function generateTrickyTests(
  activeDocuments: KnowledgeDocument[]
): Promise<TrickyPrompt[]> {
  const response = await fetch('/api/consultant/tricky-tests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documents: activeDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        content: doc.content,
      })),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    prompts?: TrickyPrompt[];
    error?: string;
  };

  if (!response.ok || !Array.isArray(payload.prompts)) {
    throw new Error(payload.error || 'Не удалось обновить каверзные вопросы.');
  }

  return payload.prompts;
}
