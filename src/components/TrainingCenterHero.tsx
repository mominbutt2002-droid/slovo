import { useState } from 'react';
import { ArrowDownRight, ArrowRight, GraduationCap } from 'lucide-react';

interface TrainingCenterHeroProps {
  onGoToConsultant: () => void;
  onGoToPrograms: () => void;
}

const HERO_IMAGE = '/src/assets/images/hero_training_center_1795432368129.jpg';

const KEY_METRICS = [
  { value: '6 программ', label: 'Аналитика, разработка и управление проектами' },
  { value: 'От 34 000 ₽', label: 'Фиксированный прайс, рассрочка от 50 000 ₽' },
  { value: 'До 16 человек', label: 'Очные группы в Москве и живой онлайн-формат' },
  { value: '13% вычет', label: 'Гослицензия и внесение документов в ФИС ФРДО' },
];

export function TrainingCenterHero({
  onGoToConsultant,
  onGoToPrograms,
}: TrainingCenterHeroProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <section id="top" className="border-b border-slate-800/80 bg-[#0B0F17]">
      <div className="max-w-[1360px] mx-auto px-4 lg:px-8 pt-10 pb-10 lg:pt-14 lg:pb-12">
        {/* 2-column balanced split with items-stretch */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-stretch">
          <div className="flex flex-col justify-between py-1">
            <div>
              <p className="text-xs text-slate-400 tracking-normal">
                Учебный центр ДПО · Лицензия № Л035-01298-77 · Москва, ул. Бауманская и онлайн
              </p>

              <h1 className="mt-4 font-display text-[32px] sm:text-[42px] lg:text-[48px] font-semibold leading-[1.12] tracking-tight text-slate-100 max-w-2xl">
                Прикладные курсы по ИТ, аналитике и управлению проектами
              </h1>

              <p className="mt-5 text-[15px] sm:text-base leading-[1.65] text-slate-400 max-w-xl">
                Обучаем взрослых специалистов на практических задачах с защитой итогового проекта и выдачей официальных удостоверений и дипломов. На сайте работает строгий AI-консультант: он отвечает по прайсу и регламенту центра без домыслов.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onGoToConsultant}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA]"
              >
                <span>Спросить AI-консультанта</span>
                <ArrowDownRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onGoToPrograms}
                className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Смотреть программы и цены</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right media column stretched cleanly to match text height */}
          <div className="relative min-h-[260px] lg:min-h-[380px] rounded-md overflow-hidden border border-slate-800/90 bg-[#111827]">
            {!imgError ? (
              <img
                src={HERO_IMAGE}
                alt="Вечернее занятие в аудитории учебного центра ФактБаза в Москве"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#111827] to-[#172032] text-slate-400">
                <GraduationCap className="w-10 h-10 mb-3 text-slate-500" />
                <span className="text-sm font-medium text-slate-300">
                  Учебный центр «ФактБаза»
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B0F17]/90 via-[#0B0F17]/45 to-transparent p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
                <span>Кампус на Бауманской</span>
                <span className="text-slate-500" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono tabular-nums text-slate-300">
                  Вт/Чт 19:00–21:30 и Сб 11:00–16:00
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width 4-column factual strip below the split */}
        <div className="mt-10 pt-8 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {KEY_METRICS.map((item) => (
            <div key={item.value} className="space-y-1">
              <div className="font-mono text-lg font-medium text-slate-100 tabular-nums">
                {item.value}
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
