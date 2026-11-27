import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import Stripe from 'stripe';
import {
  formatSchoolCatalogForPrompt,
  SCHOOL_SERVICES,
  SCHOOL_TEACHERS,
} from './src/data/schoolCatalog.ts';

interface BookingRecord {
  id: string;
  studentName: string;
  contact: string;
  serviceTitle: string;
  teacherName: string;
  preferredDayTime: string;
  createdAt: string;
}

const MAX_BOOKINGS = 200;
const bookingsStore: BookingRecord[] = [];
let bookingSeq = 1000;

function isValidContact(contact: string): boolean {
  const trimmed = contact.trim();
  if (trimmed.length < 5 || trimmed.length > 120) return false;
  const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  const digitsCount = (trimmed.match(/\d/g) || []).length;
  const telegramLike = /^@[a-zA-Z0-9_]{4,32}$/.test(trimmed);
  return emailLike || digitsCount >= 7 || telegramLike;
}

function validateAndCreateBooking(input: {
  studentName?: string;
  contact?: string;
  serviceTitle?: string;
  teacherName?: string;
  preferredDayTime?: string;
}): { booking?: BookingRecord; error?: string } {
  const studentName = typeof input.studentName === 'string' ? input.studentName.trim().slice(0, 80) : '';
  const contact = typeof input.contact === 'string' ? input.contact.trim().slice(0, 120) : '';
  const rawService = typeof input.serviceTitle === 'string' ? input.serviceTitle.trim().slice(0, 140) : '';
  const rawTeacher = typeof input.teacherName === 'string' ? input.teacherName.trim().slice(0, 100) : '';
  const preferredDayTime =
    typeof input.preferredDayTime === 'string' ? input.preferredDayTime.trim().slice(0, 140) : '';

  if (studentName.length < 2) {
    return { error: 'Укажите имя (минимум 2 символа).' };
  }
  if (!isValidContact(contact)) {
    return { error: 'Укажите корректный телефон (от 7 цифр), email или @telegram.' };
  }
  if (!preferredDayTime || preferredDayTime.length < 3) {
    return { error: 'Укажите удобный день и время занятия.' };
  }

  const serviceTitle = rawService || SCHOOL_SERVICES[0].title;
  const teacherName = rawTeacher || 'Любой свободный преподаватель';

  bookingSeq += 1;
  const record: BookingRecord = {
    id: `SL-${bookingSeq}`,
    studentName,
    contact,
    serviceTitle,
    teacherName,
    preferredDayTime,
    createdAt: new Date().toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  bookingsStore.push(record);
  if (bookingsStore.length > MAX_BOOKINGS) {
    bookingsStore.shift();
  }
  return { booking: record };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const TUTOR_TEXT_MODEL = 'gemini-3.1-flash-lite';
const TTS_MODEL = 'gemini-3.8-flash-lite-tts';
const TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';

const VALID_LEVELS = new Set(['beginner', 'intermediate', 'advanced', 'expert']);

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  beginner:
    'Начальный уровень (A1–A2): простые предложения, базовые падежи, род и число, частые бытовые темы, чёткое объяснение правил простыми словами.',
  intermediate:
    'Средний уровень (B1–B2): все падежи, виды глаголов (СВ/НСВ), орфография корней и приставок, пунктуация в сложных предложениях.',
  advanced:
    'Продвинутый уровень (C1): причастные и деепричастные обороты, сложная орфография (Н/НН, НЕ/НИ), стилистика, точные синонимы и деловая речь.',
  expert:
    'Уровень Эксперт (C2): тонкая редактура, авторская пунктуация, орфоэпия, архаизмы и публицистический/академический стиль.',
};

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY не настроен на сервере.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

function resolveSafeBaseUrl(req: express.Request): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/+$/, '');
  }
  const forwardedProto = req.header('x-forwarded-proto')?.split(',')[0]?.trim();
  const proto = forwardedProto === 'https' ? 'https' : req.protocol || 'http';
  const host = req.header('x-forwarded-host')?.split(',')[0]?.trim() || req.header('host') || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isNonRetryable =
        msg.includes('400') ||
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('404') ||
        msg.includes('API_KEY_INVALID') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('GEMINI_API_KEY');
      if (isNonRetryable || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt - 1)));
    }
  }
  throw lastErr;
}

function mapApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY')) {
    return { status: 500, message: 'Серверный ключ Gemini API не настроен.' };
  }
  if (raw.includes('403') || raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'Доступ к Gemini API отклонён. Проверьте API-ключ в Settings > Secrets.',
    };
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Превышен лимит запросов к Gemini API. Повторите попытку через минуту.',
    };
  }
  return {
    status: 502,
    message: 'Не удалось обработать запрос к AI-репетитору. Попробуйте ещё раз.',
  };
}

async function generateRussianTtsWav(ai: GoogleGenAI, text: string, style?: string): Promise<string | null> {
  const cleanText = text.trim().slice(0, 1400);
  if (!cleanText) return null;

  const ttsRes = await withRetry(() =>
    ai.models.generateContent({
      model: TTS_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style:
                  style ||
                  'Чёткая, выразительная русская речь преподавателя с правильными ударениями и спокойным темпом',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    })
  );

  return ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '14mb' }));

  // 1. AI Russian Tutor Chat (Grammar, Spelling, General Practice, Speaking Dialog)
  app.post('/api/tutor/chat', async (req, res) => {
    try {
      const { message, level, mode, history, withAudio } = req.body as {
        message?: string;
        level?: string;
        mode?: string;
        history?: Array<{ role?: string; content?: string }>;
        withAudio?: boolean;
      };

      const cleanMessage = typeof message === 'string' ? message.trim() : '';
      if (!cleanMessage) {
        return res.status(400).json({ error: 'Введите сообщение для репетитора.' });
      }
      if (cleanMessage.length > 2500) {
        return res.status(400).json({ error: 'Сообщение слишком длинное (максимум 2500 символов).' });
      }

      const safeLevel = typeof level === 'string' && VALID_LEVELS.has(level) ? level : 'beginner';
      const safeMode =
        mode === 'grammar' || mode === 'spelling' || mode === 'speaking' ? mode : 'chat';

      const recentHistory = Array.isArray(history)
        ? history
            .filter(
              (m) =>
                (m?.role === 'user' || m?.role === 'assistant') &&
                typeof m?.content === 'string' &&
                m.content.trim().length > 0
            )
            .slice(-6)
            .map((m) => `${m.role === 'user' ? 'Ученик' : 'Репетитор'}: ${m.content!.slice(0, 700)}`)
            .join('\n')
        : '';

      const systemInstruction = `Ты — персональный AI-репетитор по русскому языку «Словесность».
Уровень ученика: ${LEVEL_DESCRIPTIONS[safeLevel]}
Режим занятия: ${
        safeMode === 'grammar'
          ? 'Грамматика и построение фраз'
          : safeMode === 'spelling'
            ? 'Правописание, орфография и пунктуация'
            : safeMode === 'speaking'
              ? 'Живой диалог (Speaking) — отвечай естественно, задавай встречный вопрос для поддержания беседы и мягко поправляй речевые ошибки'
              : 'Персональная практика русского языка'
      }.

Правила:
1. Отвечай на грамотном русском языке, дружелюбно, лаконично и по делу (2–5 предложений).
2. Если в сообщении ученика есть ошибки (грамматические, орфографические, пунктуационные или речевые), перечисли их в поле corrections (оригинал -> исправленный вариант -> краткое правило). Если ошибок нет, верни пустой массив.
3. В поле tip дай 1 короткий практический совет или мини-задание на закрепление для текущего уровня.`;

      const prompt = `${recentHistory ? `Контекст диалога:\n${recentHistory}\n\n` : ''}Сообщение ученика:\n${cleanMessage}`;

      const ai = getAiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: TUTOR_TEXT_MODEL,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING, description: 'Ответ репетитора на русском языке.' },
                corrections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      original: { type: Type.STRING },
                      corrected: { type: Type.STRING },
                      rule: { type: Type.STRING },
                    },
                    required: ['original', 'corrected', 'rule'],
                  },
                },
                tip: { type: Type.STRING, description: 'Короткий совет или следующий вопрос ученику.' },
              },
              required: ['reply', 'corrections', 'tip'],
            },
          },
        })
      );

      let parsed: {
        reply?: string;
        corrections?: Array<{ original: string; corrected: string; rule: string }>;
        tip?: string;
      } = {};

      try {
        parsed = JSON.parse((response.text ?? '{}').trim());
      } catch {
        parsed = { reply: (response.text ?? '').trim(), corrections: [], tip: '' };
      }

      const replyText = (parsed.reply || 'Продолжим практику! Напишите ещё одну фразу.').trim();
      let audioBase64: string | null = null;
      if (withAudio) {
        try {
          audioBase64 = await generateRussianTtsWav(ai, replyText);
        } catch (ttsErr) {
          console.error('Optional TTS error in /api/tutor/chat:', ttsErr);
        }
      }

      return res.json({
        reply: replyText,
        corrections: Array.isArray(parsed.corrections) ? parsed.corrections.slice(0, 6) : [],
        tip: (parsed.tip || '').trim(),
        audioBase64,
      });
    } catch (err) {
      console.error('Error in /api/tutor/chat:', err);
      const mapped = mapApiError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 2. Generate Quizzes & Grammar/Spelling Exercises
  app.post('/api/tutor/exercise', async (req, res) => {
    try {
      const { level, focus, topic } = req.body as {
        level?: string;
        focus?: string;
        topic?: string;
      };

      const safeLevel = typeof level === 'string' && VALID_LEVELS.has(level) ? level : 'beginner';
      const safeFocus =
        focus === 'spelling' ? 'правописание и орфография' : focus === 'grammar' ? 'грамматика и падежи' : 'квиз по русскому языку';
      const safeTopic = typeof topic === 'string' && topic.trim() ? topic.trim().slice(0, 120) : 'базовые правила уровня';

      const ai = getAiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: TUTOR_TEXT_MODEL,
          contents: `Составь 4 интерактивных вопроса-задачи по русскому языку.
Уровень: ${LEVEL_DESCRIPTIONS[safeLevel]}
Направление: ${safeFocus}
Тема: ${safeTopic}

Каждый вопрос должен иметь ровно 4 варианта ответа (options), индекс правильного варианта correctIndex (0..3) и краткое понятное объяснение правила (explanation).`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      prompt: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correctIndex: { type: Type.INTEGER },
                      explanation: { type: Type.STRING },
                    },
                    required: ['prompt', 'options', 'correctIndex', 'explanation'],
                  },
                },
              },
              required: ['title', 'questions'],
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        title?: string;
        questions?: Array<{
          prompt: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        }>;
      };

      if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        return res.status(502).json({ error: 'Не удалось сформировать квиз.' });
      }

      return res.json({
        title: parsed.title || 'Практический квиз',
        questions: parsed.questions.slice(0, 5),
      });
    } catch (err) {
      console.error('Error in /api/tutor/exercise:', err);
      const mapped = mapApiError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 3. Pro: Deep Error Analysis (Grammar, Spelling, Punctuation, Style)
  app.post('/api/tutor/error-analysis', async (req, res) => {
    try {
      const { text, level } = req.body as { text?: string; level?: string };
      const cleanText = typeof text === 'string' ? text.trim() : '';
      if (!cleanText) {
        return res.status(400).json({ error: 'Введите русский текст для разбора ошибок.' });
      }
      if (cleanText.length > 3500) {
        return res.status(400).json({ error: 'Текст слишком длинный (максимум 3500 символов).' });
      }
      const safeLevel = typeof level === 'string' && VALID_LEVELS.has(level) ? level : 'intermediate';

      const ai = getAiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: TUTOR_TEXT_MODEL,
          contents: `Проведи глубокий филологический разбор ошибок в русском тексте для ученика (${LEVEL_DESCRIPTIONS[safeLevel]}).
Текст ученика:
"""
${cleanText}
"""

Верни исправленный текст (correctedText), общую оценку грамотности от 0 до 100 (score), краткий вывод (summary) и список конкретных ошибок (errors) с категорией (Орфография / Пунктуация / Грамматика / Стилистика), неверным фрагментом, правильным вариантом и подробным правилом.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                correctedText: { type: Type.STRING },
                summary: { type: Type.STRING },
                errors: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING },
                      fragment: { type: Type.STRING },
                      correction: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                    },
                    required: ['category', 'fragment', 'correction', 'explanation'],
                  },
                },
              },
              required: ['score', 'correctedText', 'summary', 'errors'],
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json(parsed);
    } catch (err) {
      console.error('Error in /api/tutor/error-analysis:', err);
      const mapped = mapApiError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 4. Pro: Listening Exercise with Real Russian TTS Audio
  app.post('/api/tutor/listening', async (req, res) => {
    try {
      const { level, topic } = req.body as { level?: string; topic?: string };
      const safeLevel = typeof level === 'string' && VALID_LEVELS.has(level) ? level : 'intermediate';
      const safeTopic =
        typeof topic === 'string' && topic.trim() ? topic.trim().slice(0, 100) : 'жизнь, культура и работа';

      const ai = getAiClient();
      const scriptRes = await withRetry(() =>
        ai.models.generateContent({
          model: TUTOR_TEXT_MODEL,
          contents: `Создай короткий аутентичный монолог или историю на русском языке для аудирования (Listening), объёмом 3–5 предложений.
Уровень: ${LEVEL_DESCRIPTIONS[safeLevel]}
Тема: ${safeTopic}

Также составь 3 вопроса на понимание прослушанного с 4 вариантами ответа, правильным индексом (0..3) и пояснением.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                transcript: { type: Type.STRING },
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      prompt: { type: Type.STRING },
                      options: { type: Type.ARRAY, items: { type: Type.STRING } },
                      correctIndex: { type: Type.INTEGER },
                      explanation: { type: Type.STRING },
                    },
                    required: ['prompt', 'options', 'correctIndex', 'explanation'],
                  },
                },
              },
              required: ['title', 'transcript', 'questions'],
            },
          },
        })
      );

      const parsed = JSON.parse((scriptRes.text ?? '{}').trim()) as {
        title?: string;
        transcript?: string;
        questions?: Array<{
          prompt: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        }>;
      };

      const transcript = (parsed.transcript || '').trim();
      if (!transcript) {
        return res.status(502).json({ error: 'Не удалось создать текст для аудирования.' });
      }

      const audioBase64 = await generateRussianTtsWav(
        ai,
        transcript,
        safeLevel === 'beginner'
          ? 'Спокойная, отчётливая и слегка замедленная русская речь диктора для начинающих'
          : 'Естественная, выразительная русская речь диктора с правильной интонацией'
      );

      return res.json({
        title: parsed.title || 'Аудирование',
        transcript,
        audioBase64,
        questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 3) : [],
      });
    } catch (err) {
      console.error('Error in /api/tutor/listening:', err);
      const mapped = mapApiError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 5. Pro: Pronunciation & Speaking Audio Evaluation
  app.post('/api/tutor/pronunciation', async (req, res) => {
    try {
      const { audioBase64, mimeType, targetPhrase, level } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        targetPhrase?: string;
        level?: string;
      };

      if (typeof audioBase64 !== 'string' || audioBase64.length < 30) {
        return res.status(400).json({ error: 'Аудиозапись пуста. Запишите фразу через микрофон.' });
      }
      if (audioBase64.length > 10 * 1024 * 1024) {
        return res.status(413).json({ error: 'Аудиозапись слишком большая (максимум 7 МБ).' });
      }

      const allowedMimes = new Set([
        'audio/webm',
        'audio/ogg',
        'audio/wav',
        'audio/mp4',
        'audio/mpeg',
        'audio/mp3',
      ]);
      const baseMime = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
      const safeMime = allowedMimes.has(baseMime) ? baseMime : 'audio/webm';
      const safeLevel = typeof level === 'string' && VALID_LEVELS.has(level) ? level : 'intermediate';
      const cleanTarget = typeof targetPhrase === 'string' ? targetPhrase.trim().slice(0, 400) : '';

      const ai = getAiClient();
      const transcribeRes = await withRetry(() =>
        ai.models.generateContent({
          model: TRANSCRIBE_MODEL,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: safeMime,
                  data: audioBase64,
                },
              },
              {
                text: 'Транскрибируй эту русскую речь максимально точно, передавая реально произнесённые слова и окончания без автоисправления ошибок говорящего.',
              },
            ],
          },
        })
      );

      const transcript = (transcribeRes.text ?? '').trim();
      if (!transcript) {
        return res.status(422).json({
          error: 'Не удалось распознать речь. Проверьте микрофон и скажите фразу чётче.',
        });
      }

      const evalRes = await withRetry(() =>
        ai.models.generateContent({
          model: TUTOR_TEXT_MODEL,
          contents: `Оцени произношение и точность речи ученика по русскому языку (${LEVEL_DESCRIPTIONS[safeLevel]}).
${cleanTarget ? `Эталонная фраза: «${cleanTarget}»` : 'Свободная речь ученика.'}
Распознанная речь ученика: «${transcript}»

Верни JSON:
- score (0..100): оценка точности произношения и дикции
- transcript: распознанная фраза
- stressGuide: эталонная или исправленная фраза с проставленными знаками ударения (например: здрАвствуйте, звонИт)
- feedback: краткий конструктивный разбор произношения, ударений и редукции гласных
- issues: массив конкретных замечаний (слово, что исправить)`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                transcript: { type: Type.STRING },
                stressGuide: { type: Type.STRING },
                feedback: { type: Type.STRING },
                issues: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      word: { type: Type.STRING },
                      note: { type: Type.STRING },
                    },
                    required: ['word', 'note'],
                  },
                },
              },
              required: ['score', 'transcript', 'stressGuide', 'feedback', 'issues'],
            },
          },
        })
      );

      const evaluated = JSON.parse((evalRes.text ?? '{}').trim());
      return res.json({
        ...evaluated,
        transcript: evaluated.transcript || transcript,
      });
    } catch (err) {
      console.error('Error in /api/tutor/pronunciation:', err);
      const mapped = mapApiError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 6. Pro: On-Demand Reference TTS for Phrases
  app.post('/api/tutor/tts', async (req, res) => {
    try {
      const { text } = req.body as { text?: string };
      const clean = typeof text === 'string' ? text.trim() : '';
      if (!clean) {
        return res.status(400).json({ error: 'Укажите текст для озвучивания.' });
      }
      const ai = getAiClient();
      const audioBase64 = await generateRussianTtsWav(ai, clean);
      if (!audioBase64) {
        return res.status(502).json({ error: 'Не удалось синтезировать речь.' });
      }
      return res.json({ audioBase64 });
    } catch (err) {
      console.error('Error in /api/tutor/tts:', err);
      const mapped = mapApiError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 7. Stripe Checkout Configuration & Session Creation
  app.get('/api/stripe/config', (_req, res) => {
    res.json({
      configured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      monthlyPriceRub: 1490,
      monthlyPriceUsd: 15,
    });
  });

  app.post('/api/stripe/create-checkout-session', async (req, res) => {
    try {
      const stripe = getStripeClient();
      if (!stripe) {
        return res.status(200).json({
          configured: false,
          message:
            'Для приема реальных платежей добавьте STRIPE_SECRET_KEY в Settings > Secrets. Вы можете включить ознакомительный Pro-доступ прямо сейчас.',
        });
      }

      const { email } = req.body as { email?: string };
      const cleanEmail =
        typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
          ? email.trim()
          : undefined;

      const baseUrl = resolveSafeBaseUrl(req);
      const configuredPriceId = process.env.STRIPE_PRO_PRICE_ID?.trim();

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: cleanEmail,
        line_items: configuredPriceId
          ? [{ price: configuredPriceId, quantity: 1 }]
          : [
              {
                price_data: {
                  currency: 'usd',
                  unit_amount: 1500,
                  recurring: { interval: 'month' },
                  product_data: {
                    name: 'Словесность Pro — AI-репетитор по русскому языку',
                    description:
                      'Проверка произношения, Speaking, Listening, глубокий разбор ошибок и безлимитная практика.',
                  },
                },
                quantity: 1,
              },
            ],
        success_url: `${baseUrl}/?stripe_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?stripe_canceled=1`,
      });

      return res.json({
        configured: true,
        url: session.url,
        sessionId: session.id,
      });
    } catch (err) {
      console.error('Error in /api/stripe/create-checkout-session:', err);
      return res.status(502).json({
        error: 'Не удалось создать платёжную сессию Stripe. Проверьте STRIPE_SECRET_KEY.',
      });
    }
  });

  app.get('/api/stripe/verify-session', async (req, res) => {
    try {
      const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id.trim() : '';
      if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
        return res.status(400).json({ error: 'Некорректный идентификатор сессии Stripe.' });
      }
      const stripe = getStripeClient();
      if (!stripe) {
        return res.status(400).json({ error: 'Stripe не настроен на сервере.' });
      }
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const paid = session.payment_status === 'paid' || session.status === 'complete';
      return res.json({ paid, status: session.status });
    } catch (err) {
      console.error('Error in /api/stripe/verify-session:', err);
      return res.status(502).json({ error: 'Не удалось проверить статус оплаты Stripe.' });
    }
  });

  // 8. AI Agent Concierge (Catalog, Prices, Hours, Teachers & Chat Booking)
  app.post('/api/agent/concierge', async (req, res) => {
    try {
      const { message, history } = req.body as {
        message?: string;
        history?: Array<{ role?: string; content?: string }>;
      };

      const cleanMessage = typeof message === 'string' ? message.trim() : '';
      if (!cleanMessage) {
        return res.status(400).json({ error: 'Введите вопрос или запрос на запись.' });
      }
      if (cleanMessage.length > 2000) {
        return res.status(400).json({ error: 'Сообщение слишком длинное (максимум 2000 символов).' });
      }

      const recentHistory = Array.isArray(history)
        ? history
            .filter(
              (m) =>
                (m?.role === 'user' || m?.role === 'assistant') &&
                typeof m?.content === 'string' &&
                m.content.trim().length > 0
            )
            .slice(-6)
            .map((m) => `${m.role === 'user' ? 'Клиент' : 'AI-агент'}: ${m.content!.slice(0, 600)}`)
            .join('\n')
        : '';

      const catalogContext = formatSchoolCatalogForPrompt();
      const serviceList = SCHOOL_SERVICES.map((s) => s.title).join('; ');
      const teacherList = SCHOOL_TEACHERS.map((t) => t.name).join('; ');

      const systemInstruction = `Ты — официальный AI-агент и администратор школы русского языка «Словесность».
Отвечай строго по актуальным данным справочника ниже. Не придумывай цены, скидки, преподавателей или часы работы, которых нет в справочнике.

=== СПРАВОЧНИК ШКОЛЫ ===
${catalogContext}
=== КОНЕЦ СПРАВОЧНИКА ===

Правила работы:
1. Отвечай на русском языке чётко, структурированно и вежливо. Если спрашивают про каталог услуг, цены, время работы, учителей, их стаж или график работы — выдавай точные факты и цифры из справочника.
2. Если клиент хочет записаться на занятие, пробный урок, разговорный клуб или курс:
   - Проверь по истории диалога и текущему сообщению, известны ли уже: имя (studentName), контакт — телефон/email/Telegram (contact), услуга (serviceTitle из списка: ${serviceList}), преподаватель (teacherName из списка: ${teacherList}, либо «Любой свободный преподаватель»), и удобный день/время (preferredDayTime).
   - Если ВСЕ ключевые поля (studentName, contact, preferredDayTime) уже названы пользователем — установи readyToConfirm: true, openBookingForm: false и подтверди оформление записи в reply.
   - Если клиент хочет записаться, но часть данных ещё не указана — установи openBookingForm: true, readyToConfirm: false, заполни в bookingDraft уже известные поля и вежливо предложи заполнить короткую форму записи прямо в чате или написать недостающие данные сообщением.
   - Если это просто информационный вопрос (о ценах, услугах, учителях, стаже, графике работы) без запроса на запись — установи openBookingForm: false и readyToConfirm: false.`;

      const prompt = `${recentHistory ? `История диалога:\n${recentHistory}\n\n` : ''}Новое сообщение клиента:\n${cleanMessage}`;

      const ai = getAiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: TUTOR_TEXT_MODEL,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.STRING,
                  description: 'Структурированный ответ AI-агента строго по справочнику школы.',
                },
                openBookingForm: {
                  type: Type.BOOLEAN,
                  description: 'Открыть ли форму записи прямо в чате.',
                },
                readyToConfirm: {
                  type: Type.BOOLEAN,
                  description: 'True только если клиент уже указал имя, контакт и удобный день/время для записи.',
                },
                bookingDraft: {
                  type: Type.OBJECT,
                  properties: {
                    studentName: { type: Type.STRING },
                    contact: { type: Type.STRING },
                    serviceTitle: { type: Type.STRING },
                    teacherName: { type: Type.STRING },
                    preferredDayTime: { type: Type.STRING },
                  },
                },
              },
              required: ['reply', 'openBookingForm', 'readyToConfirm', 'bookingDraft'],
            },
          },
        })
      );

      let parsed: {
        reply?: string;
        openBookingForm?: boolean;
        readyToConfirm?: boolean;
        bookingDraft?: {
          studentName?: string;
          contact?: string;
          serviceTitle?: string;
          teacherName?: string;
          preferredDayTime?: string;
        };
      } = {};

      try {
        parsed = JSON.parse((response.text ?? '{}').trim());
      } catch {
        parsed = {
          reply: (response.text ?? '').trim(),
          openBookingForm: false,
          readyToConfirm: false,
        };
      }

      const draft = parsed.bookingDraft || {};
      let confirmedBooking: BookingRecord | null = null;
      let openBookingForm = Boolean(parsed.openBookingForm);
      let replyText = (parsed.reply || 'Подскажите, чем я могу помочь по услугам, расписанию или записи?').trim();

      const hasAllRequiredDraftFields = Boolean(
        draft.studentName?.trim() &&
          draft.contact?.trim() &&
          draft.preferredDayTime?.trim()
      );

      if (parsed.readyToConfirm || hasAllRequiredDraftFields) {
        const result = validateAndCreateBooking({
          studentName: draft.studentName,
          contact: draft.contact,
          serviceTitle: draft.serviceTitle,
          teacherName: draft.teacherName,
          preferredDayTime: draft.preferredDayTime,
        });
        if (result.booking) {
          confirmedBooking = result.booking;
          openBookingForm = false;
        } else if (parsed.readyToConfirm) {
          openBookingForm = true;
          replyText = `${replyText}\n\nЧтобы завершить запись, уточните, пожалуйста: ${result.error}`;
        }
      }

      return res.json({
        reply: replyText,
        openBookingForm,
        bookingDraft: {
          studentName: draft.studentName || '',
          contact: draft.contact || '',
          serviceTitle: draft.serviceTitle || '',
          teacherName: draft.teacherName || '',
          preferredDayTime: draft.preferredDayTime || '',
        },
        confirmedBooking,
      });
    } catch (err) {
      console.error('Error in /api/agent/concierge:', err);
      const mapped = mapApiError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 9. Direct Chat Booking Creation
  app.post('/api/bookings', (req, res) => {
    const body = req.body as {
      studentName?: string;
      contact?: string;
      serviceTitle?: string;
      teacherName?: string;
      preferredDayTime?: string;
    };
    const result = validateAndCreateBooking(body || {});
    if (result.error || !result.booking) {
      return res.status(400).json({ error: result.error || 'Проверьте поля заявки.' });
    }
    return res.status(201).json({ booking: result.booking });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
