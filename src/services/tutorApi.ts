import {
  ErrorAnalysisResult,
  ListeningPayload,
  ProficiencyLevel,
  PronunciationResult,
  QuizPayload,
  TutorCorrection,
  TutorMessage,
} from '../types/tutor';

export interface TutorChatResponse {
  reply: string;
  corrections: TutorCorrection[];
  tip: string;
  audioBase64: string | null;
}

export async function sendTutorChat(params: {
  message: string;
  level: ProficiencyLevel;
  mode: 'chat' | 'grammar' | 'spelling' | 'speaking';
  history: TutorMessage[];
  withAudio?: boolean;
}): Promise<TutorChatResponse> {
  const res = await fetch('/api/tutor/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: params.message,
      level: params.level,
      mode: params.mode,
      withAudio: params.withAudio,
      history: params.history
        .filter((m) => !m.error)
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as TutorChatResponse & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `Ошибка сервера (${res.status})`);
  }
  return data;
}

export async function fetchQuizExercise(params: {
  level: ProficiencyLevel;
  focus: 'quiz' | 'grammar' | 'spelling';
  topic?: string;
}): Promise<QuizPayload> {
  const res = await fetch('/api/tutor/exercise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json().catch(() => ({}))) as QuizPayload & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось сгенерировать задание.');
  }
  return data;
}

export async function analyzeErrors(params: {
  text: string;
  level: ProficiencyLevel;
}): Promise<ErrorAnalysisResult> {
  const res = await fetch('/api/tutor/error-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json().catch(() => ({}))) as ErrorAnalysisResult & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось выполнить разбор ошибок.');
  }
  return data;
}

export async function generateListeningExercise(params: {
  level: ProficiencyLevel;
  topic?: string;
}): Promise<ListeningPayload> {
  const res = await fetch('/api/tutor/listening', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json().catch(() => ({}))) as ListeningPayload & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось создать аудирование.');
  }
  return data;
}

export async function evaluatePronunciation(params: {
  audioBase64: string;
  mimeType: string;
  targetPhrase?: string;
  level: ProficiencyLevel;
}): Promise<PronunciationResult> {
  const res = await fetch('/api/tutor/pronunciation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json().catch(() => ({}))) as PronunciationResult & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось проверить произношение.');
  }
  return data;
}

export async function fetchReferenceTts(text: string): Promise<string> {
  const res = await fetch('/api/tutor/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    audioBase64?: string;
    error?: string;
  };
  if (!res.ok || !data.audioBase64) {
    throw new Error(data.error || 'Не удалось озвучить фразу.');
  }
  return data.audioBase64;
}

export async function createStripeCheckout(email?: string): Promise<{
  configured: boolean;
  url?: string;
  message?: string;
}> {
  const res = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    configured?: boolean;
    url?: string;
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || 'Ошибка подключения к Stripe.');
  }
  return {
    configured: Boolean(data.configured),
    url: data.url,
    message: data.message,
  };
}

export async function verifyStripeSession(sessionId: string): Promise<boolean> {
  const res = await fetch(
    `/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`
  );
  const data = (await res.json().catch(() => ({}))) as { paid?: boolean };
  return Boolean(res.ok && data.paid);
}

export interface BookingRecord {
  id: string;
  studentName: string;
  contact: string;
  serviceTitle: string;
  teacherName: string;
  preferredDayTime: string;
  createdAt: string;
}

export interface ConciergeResponse {
  reply: string;
  openBookingForm: boolean;
  bookingDraft?: {
    studentName?: string;
    contact?: string;
    serviceTitle?: string;
    teacherName?: string;
    preferredDayTime?: string;
  };
  confirmedBooking?: BookingRecord | null;
}

export async function sendConciergeMessage(params: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<ConciergeResponse> {
  const res = await fetch('/api/agent/concierge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json().catch(() => ({}))) as ConciergeResponse & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `Ошибка сервера (${res.status})`);
  }
  return data;
}

export async function submitBooking(params: {
  studentName: string;
  contact: string;
  serviceTitle: string;
  teacherName: string;
  preferredDayTime: string;
}): Promise<BookingRecord> {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json().catch(() => ({}))) as {
    booking?: BookingRecord;
    error?: string;
  };
  if (!res.ok || !data.booking) {
    throw new Error(data.error || 'Не удалось создать запись.');
  }
  return data.booking;
}

