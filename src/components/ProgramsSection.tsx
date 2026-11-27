import { useState } from 'react';
import { ArrowUpRight, BookOpen, MessageSquare } from 'lucide-react';
import {
  ProgramTrack,
  TRAINING_PROGRAMS,
  TrainingProgram,
} from '../data/defaultKnowledgeBase';

interface ProgramsSectionProps {
  onAskAboutProgram: (program: TrainingProgram) => void;
  onSelectForEnrollment: (programTitle: string) => void;
}

const TRACK_FILTERS: Array<'Все направления' | ProgramTrack> = [
  'Все направления',
  'Аналитика и данные',
  'Разработка и ИТ',
  'Управление и корпоративное',
];

const ANALYTICS_IMG = '/src/assets/images/course_analytics_lab_1795432367714.jpg';
const SEMINAR_IMG =
  '/src/assets/images/course_management_seminar_1795432367473.jpg';

const TERMS_SUMMARY = [
  {
    index: '01',
    title: 'Оплата, рассрочка и скидки',
    body: 'Скидка 7% при полной предоплате за 5 дней до старта. Беспроцентная рассрочка на 3 платежа (40% / 30% / 30%) для программ от 50 000 ₽. Корпоративная скидка 10% от 3 сотрудников. Скидки не суммируются.',
  },
  {
    index: '02',
    title: 'Налоговый вычет 13%',
    body: 'Учебный центр работает по бессрочной государственной лицензии ДПО. Физические лица оформляют социальный вычет 13%; справку для ФНС учебный отдел выдает за 5 рабочих дней.',
  },
  {
    index: '03',
    title: 'Возврат средств и перенос',
    body: 'До начала первого занятия возвращается 100% оплаты в течение 10 рабочих дней. После старта — пропорционально непройденным занятиям за вычетом 10% организационного сбора. Бесплатный перенос потока — до 3-го занятия.',
  },
  {
    index: '04',
    title: 'Документы и ФИС ФРДО',
    body: 'При наличии СПО или ВО и защите проекта от 70% выдается удостоверение или диплом с внесением в ФИС ФРДО за 60 дней. Без диплома СПО/ВО выдается сертификат. Гарантии трудоустройства в договор не входят.',
  },
];

export function ProgramsSection({
  onAskAboutProgram,
  onSelectForEnrollment,
}: ProgramsSectionProps) {
  const [selectedTrack, setSelectedTrack] = useState<
    'Все направления' | ProgramTrack
  >('Все направления');
  const [img1Err, setImg1Err] = useState(false);
  const [img2Err, setImg2Err] = useState(false);

  const visiblePrograms =
    selectedTrack === 'Все направления'
      ? TRAINING_PROGRAMS
      : TRAINING_PROGRAMS.filter((p) => p.track === selectedTrack);

  return (
    <>
      <section
        id="programs"
        className="border-b border-slate-800/80 bg-[#0D1320] py-14 lg:py-16"
      >
        <div className="max-w-[1360px] mx-auto px-4 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-800/80">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
                Программы обучения и прайс-лист 2026
              </h2>
              <p className="mt-2 text-sm text-slate-400 max-w-2xl">
                Все тарифы, длительность и условия синхронизированы с официальными документами, по которым отвечает AI-консультант ниже.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Фильтр направлений обучения"
              className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-slate-800 rounded-md overflow-x-auto shrink-0"
            >
              {TRACK_FILTERS.map((track) => (
                <button
                  key={track}
                  type="button"
                  role="tab"
                  aria-selected={selectedTrack === track}
                  onClick={() => setSelectedTrack(track)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedTrack === track
                      ? 'bg-[#172032] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {track}
                </button>
              ))}
            </div>
          </div>

          {/* High-density structured program price list */}
          <div className="divide-y divide-slate-800/80">
            {visiblePrograms.map((program) => (
              <div
                key={program.id}
                className="py-6 grid grid-cols-1 lg:grid-cols-[56px_1.5fr_1fr_180px_auto] gap-4 lg:gap-6 items-start lg:items-center hover:bg-slate-800/20 -mx-3 px-3 rounded-md transition-colors"
              >
                <div className="font-mono text-xs text-slate-500 tabular-nums">
                  {program.code}
                </div>

                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold text-slate-100">
                    {program.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400 max-w-xl">
                    {program.summary}
                  </p>
                </div>

                <div className="space-y-1 text-xs text-slate-400">
                  <div className="text-slate-200 font-mono tabular-nums">
                    {program.hours} · {program.duration}
                  </div>
                  <div>
                    {program.format} · {program.credential}
                  </div>
                </div>

                <div className="lg:text-right">
                  <div className="font-mono text-lg font-medium text-slate-100 tabular-nums">
                    {program.priceLabel}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    НДС не облагается
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onAskAboutProgram(program)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white bg-[#111827] hover:bg-[#172032] border border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>Уточнить</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectForEnrollment(program.title)}
                    className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Записаться</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 2-column visual environment showcase */}
          <div className="mt-12 pt-10 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-md overflow-hidden border border-slate-800/80 bg-[#111827]">
              <div className="aspect-[16/10] overflow-hidden bg-[#0B0F17]">
                {!img1Err ? (
                  <img
                    src={ANALYTICS_IMG}
                    alt="Лаборатория аналитики данных и практических занятий"
                    referrerPolicy="no-referrer"
                    onError={() => setImg1Err(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <BookOpen className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="text-xs text-slate-400">
                  Практикум · SQL, BI и Python
                </div>
                <h3 className="mt-1 font-display text-base font-semibold text-slate-100">
                  Разбор рабочих датасетов и код-ревью от преподавателей
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  Каждое занятие состоит из короткой теории и практики на стендах; записи доступны в личном кабинете 12 месяцев.
                </p>
              </div>
            </div>

            <div className="rounded-md overflow-hidden border border-slate-800/80 bg-[#111827]">
              <div className="aspect-[16/10] overflow-hidden bg-[#0B0F17]">
                {!img2Err ? (
                  <img
                    src={SEMINAR_IMG}
                    alt="Учебная аудитория для проектного управления и корпоративных групп"
                    referrerPolicy="no-referrer"
                    onError={() => setImg2Err(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <BookOpen className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="text-xs text-slate-400">
                  Корпоративный и очный формат · До 16 человек
                </div>
                <h3 className="mt-1 font-display text-base font-semibold text-slate-100">
                  Малые группы и закрытые программы под задачи компаний
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  Занятия проходят на кампусе на Бауманской, в офисе заказчика или в прямом эфире с разбором внутренних кейсов команды.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Education terms & rules summary */}
      <section
        id="terms"
        className="border-b border-slate-800/80 bg-[#0B0F17] py-14"
      >
        <div className="max-w-[1360px] mx-auto px-4 lg:px-8">
          <div className="max-w-2xl mb-8">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-100">
              Регламент обучения, оплаты и возврата
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Ключевые правила учебного центра. Полный текст регламента загружен в базу знаний AI-консультанта и доступен для просмотра и редактирования.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TERMS_SUMMARY.map((item) => (
              <div
                key={item.index}
                className="p-5 rounded-md bg-[#111827] border border-slate-800/80"
              >
                <div className="font-mono text-xs text-slate-500 tabular-nums">
                  {item.index}.
                </div>
                <h3 className="mt-2 font-display text-sm font-semibold text-slate-100">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400 tabular-nums">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
