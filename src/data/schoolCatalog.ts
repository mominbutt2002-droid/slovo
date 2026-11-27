export interface SchoolService {
  id: string;
  title: string;
  priceLabel: string;
  duration: string;
  format: string;
  description: string;
}

export interface TeacherScheduleRow {
  id: string;
  name: string;
  experience: string;
  role: string;
  specialization: string;
  levels: string;
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  sat: string;
  sun: string;
  summarySchedule: string;
}

export interface SchoolTeacher {
  id: string;
  name: string;
  experienceYears: number;
  experienceLabel: string;
  role: string;
  specialization: string;
  schedule: string;
  levels: string;
  weekly: {
    mon: string;
    tue: string;
    wed: string;
    thu: string;
    fri: string;
    sat: string;
    sun: string;
  };
}

export interface WorkingHoursInfo {
  weekdays: string;
  saturday: string;
  sunday: string;
  aiPlatform: string;
  address: string;
  phone: string;
}

export const SCHOOL_WORKING_HOURS: WorkingHoursInfo = {
  weekdays: 'Пн–Пт: 09:00 – 21:00 МСК',
  saturday: 'Сб: 10:00 – 18:00 МСК',
  sunday: 'Вс: выходной (живые занятия не проводятся)',
  aiPlatform: 'AI-репетитор и платформа: круглосуточно 24/7',
  address: 'г. Москва, ул. Покровка, д. 28, стр. 2 (и онлайн по всему миру)',
  phone: '+7 (495) 642-18-90',
};

export const SCHOOL_SERVICES: SchoolService[] = [
  {
    id: 'srv-individual',
    title: 'Индивидуальный урок с преподавателем',
    priceLabel: '1 900 ₽',
    duration: '60 минут',
    format: 'Онлайн или в классе',
    description:
      'Персональная программа по уровню, разбор ошибок и практика речи один на один.',
  },
  {
    id: 'srv-pack8',
    title: 'Пакет из 8 индивидуальных уроков',
    priceLabel: '13 600 ₽',
    duration: '8 × 60 минут',
    format: 'Онлайн или в классе',
    description:
      'Выгода 1 600 ₽ (1 700 ₽ за занятие), гибкий перенос урока за 12 часов.',
  },
  {
    id: 'srv-group',
    title: 'Групповой курс по этапу (A1–C2)',
    priceLabel: '14 900 ₽ / мес',
    duration: '12 занятий по 90 мин',
    format: 'Мини-группа до 8 чел.',
    description:
      'Системное прохождение выбранного этапа: грамматика, правописание, квизы и практика.',
  },
  {
    id: 'srv-intensive',
    title: 'Интенсив «Экзамены и деловой русский»',
    priceLabel: '16 500 ₽',
    duration: '10 занятий по 90 мин',
    format: 'Онлайн',
    description:
      'Подготовка к ТРКИ, ЕГЭ, деловой переписке и публичным выступлениям.',
  },
  {
    id: 'srv-speaking-club',
    title: 'Разговорный клуб Speaking',
    priceLabel: '900 ₽ / встреча',
    duration: '75 минут (абонемент 4 встречи — 3 200 ₽)',
    format: 'Онлайн',
    description:
      'Живые дискуссии с преподавателем-фонетистом и разбор произношения.',
  },
  {
    id: 'srv-ai-pro',
    title: 'Подписка на AI-репетитора Pro (Stripe)',
    priceLabel: '$15 / мес (1 490 ₽)',
    duration: 'Безлимитно',
    format: 'Платформа 24/7',
    description:
      'Проверка произношения, Speaking, Listening, глубокий разбор ошибок и все 20 уроков.',
  },
];

export const SCHOOL_TEACHERS: SchoolTeacher[] = [
  {
    id: 'tch-sokolova',
    name: 'Елена Соколова',
    experienceYears: 14,
    experienceLabel: '14 лет',
    role: 'Старший преподаватель, филолог-русист (МГУ)',
    specialization:
      'Начальный и Средний уровни, грамматика, орфография, пунктуация',
    schedule: 'Пн, Ср, Пт: 10:00 – 19:00 МСК',
    levels: 'Начальный · Средний',
    weekly: {
      mon: '10:00–19:00',
      tue: '—',
      wed: '10:00–19:00',
      thu: '—',
      fri: '10:00–19:00',
      sat: '—',
      sun: 'Выходной',
    },
  },
  {
    id: 'tch-volkov',
    name: 'Дмитрий Волков',
    experienceYears: 11,
    experienceLabel: '11 лет',
    role: 'Преподаватель РКИ и фонетики',
    specialization:
      'Speaking, постановка произношения и ударений, разговорный клуб',
    schedule: 'Вт, Чт: 12:00 – 21:00; Сб: 10:00 – 16:00 МСК',
    levels: 'Начальный · Средний · Продвинутый',
    weekly: {
      mon: '—',
      tue: '12:00–21:00',
      wed: '—',
      thu: '12:00–21:00',
      fri: '—',
      sat: '10:00–16:00',
      sun: 'Выходной',
    },
  },
  {
    id: 'tch-morozova',
    name: 'Анна Морозова',
    experienceYears: 16,
    experienceLabel: '16 лет',
    role: 'Кандидат филологических наук',
    specialization:
      'Продвинутый и Эксперт (C1–C2), стилистика, редактура и деловой русский',
    schedule: 'Пн–Чт: 14:00 – 20:00 МСК',
    levels: 'Продвинутый · Эксперт',
    weekly: {
      mon: '14:00–20:00',
      tue: '14:00–20:00',
      wed: '14:00–20:00',
      thu: '14:00–20:00',
      fri: '—',
      sat: '—',
      sun: 'Выходной',
    },
  },
  {
    id: 'tch-lebedev',
    name: 'Сергей Лебедев',
    experienceYears: 8,
    experienceLabel: '8 лет',
    role: 'Преподаватель практической грамматики',
    specialization:
      'Падежная система, виды глаголов, экзаменационные интенсивы и квизы',
    schedule: 'Вт, Ср, Пт: 09:00 – 18:00; Сб: 11:00 – 17:00 МСК',
    levels: 'Начальный · Средний · Продвинутый',
    weekly: {
      mon: '—',
      tue: '09:00–18:00',
      wed: '09:00–18:00',
      thu: '—',
      fri: '09:00–18:00',
      sat: '11:00–17:00',
      sun: 'Выходной',
    },
  },
];

export const TEACHER_TABLE_HEADERS = [
  'Преподаватель',
  'Стаж',
  'Должность',
  'Специализация',
  'Уровни',
  'Пн',
  'Вт',
  'Ср',
  'Чт',
  'Пт',
  'Сб',
  'Вс',
] as const;

export const DEFAULT_TEACHER_SCHEDULE_ROWS: TeacherScheduleRow[] =
  SCHOOL_TEACHERS.map((t) => ({
    id: t.id,
    name: t.name,
    experience: t.experienceLabel,
    role: t.role,
    specialization: t.specialization,
    levels: t.levels,
    mon: t.weekly.mon,
    tue: t.weekly.tue,
    wed: t.weekly.wed,
    thu: t.weekly.thu,
    fri: t.weekly.fri,
    sat: t.weekly.sat,
    sun: t.weekly.sun,
    summarySchedule: t.schedule,
  }));

export function formatTeacherRowsToTableText(rows: TeacherScheduleRow[]): string {
  if (!rows.length) return 'Расписание преподавателей не заполнено.';
  const header = `| ${TEACHER_TABLE_HEADERS.join(' | ')} |`;
  const sep = `| ${TEACHER_TABLE_HEADERS.map(() => '---').join(' | ')} |`;
  const body = rows.map(
    (r) =>
      `| ${r.name} | ${r.experience} | ${r.role} | ${r.specialization} | ${r.levels} | ${r.mon} | ${r.tue} | ${r.wed} | ${r.thu} | ${r.fri} | ${r.sat} | ${r.sun} |`
  );
  return [header, sep, ...body].join('\n');
}

export function formatDefaultRagDocumentText(): string {
  const servicesText = SCHOOL_SERVICES.map(
    (s, i) =>
      `${i + 1}. ${s.title} — ${s.priceLabel} (${s.duration}, ${s.format}). ${s.description}`
  ).join('\n');

  return `ШКОЛА И ПЛАТФОРМА РУССКОГО ЯЗЫКА «СЛОВЕСНОСТЬ»

ВРЕМЯ РАБОТЫ И КОНТАКТЫ:
- ${SCHOOL_WORKING_HOURS.weekdays}
- ${SCHOOL_WORKING_HOURS.saturday}
- ${SCHOOL_WORKING_HOURS.sunday}
- ${SCHOOL_WORKING_HOURS.aiPlatform}
- Адрес: ${SCHOOL_WORKING_HOURS.address}
- Телефон: ${SCHOOL_WORKING_HOURS.phone}

КАТАЛОГ УСЛУГ И ЦЕНЫ:
${servicesText}
- Бесплатный тариф AI-репетитора Free — 0 ₽ (10 минут практики в день, сброс в полночь, 5 бесплатных уроков, квизы, грамматика и правописание).

УСЛОВИЯ ЗАПИСИ И ПЕРЕНОСА:
- Запись на занятия выполняется через AI-агента на сайте или по телефону.
- Перенос или отмена индивидуального занятия без списания — не позднее чем за 12 часов до начала.
- Оплата подписки AI Pro выполняется через Stripe.`;
}

export function formatSchoolCatalogForPrompt(): string {
  return `${formatDefaultRagDocumentText()}

ТАБЛИЦА РАСПИСАНИЯ ПРЕПОДАВАТЕЛЕЙ (МСК):
${formatTeacherRowsToTableText(DEFAULT_TEACHER_SCHEDULE_ROWS)}`;
}

export function extractGoogleFileId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]{10,120})/);
  if (urlMatch?.[1]) return urlMatch[1];

  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,120})/);
  if (idParamMatch?.[1]) return idParamMatch[1];

  if (/^[a-zA-Z0-9_-]{10,120}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}
