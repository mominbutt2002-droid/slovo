import { useState } from 'react';
import { ArrowRight, BookOpenCheck, Bot, Check } from 'lucide-react';
import { PROFICIENCY_LEVELS } from '../data/russianCurriculum';
import { ProficiencyLevel } from '../types/tutor';
import { Button } from './ui/primitives';

interface TutorHeroProps {
  activeLevel: ProficiencyLevel;
  onSelectLevel: (level: ProficiencyLevel) => void;
  onStartPractice: () => void;
  onOpenAgent: () => void;
  onGoToPricing: () => void;
}

const HERO_IMG = '/src/assets/images/russian_tutor_hero_1795783061908.jpg';

export function TutorHero({
  activeLevel,
  onSelectLevel,
  onStartPractice,
  onOpenAgent,
  onGoToPricing,
}: TutorHeroProps) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <section id="top" className="border-b border-border bg-background">
      <div className="max-w-[1360px] mx-auto px-4 lg:px-8 pt-10 pb-12 lg:pt-14 lg:pb-16">
        {/* 2-column balanced split */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-8 lg:gap-12 items-stretch">
          <div className="flex flex-col justify-between py-1">
            <div>
              <p className="font-heading text-xs font-medium text-muted-foreground">
                Персональный AI-репетитор по русскому языку · Free 10 мин/день и Pro без границ
              </p>

              <h1 className="mt-4 font-heading text-[34px] sm:text-[44px] lg:text-[52px] font-bold leading-[1.1] tracking-tight text-foreground max-w-2xl">
                Грамотный русский язык с личным AI-наставником
              </h1>

              <p className="mt-5 text-lg sm:text-[19px] leading-[1.6] text-muted-foreground max-w-xl">
                Осваивайте грамматику, правописание, квизы и живую речь по четырём этапам — от начального до экспертного. В Pro-тарифе доступны проверка произношения, speaking, listening и глубокий разбор ошибок.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Button
                type="button"
                variant="accent"
                size="lg"
                onClick={onOpenAgent}
              >
                <Bot className="w-4 h-4" />
                <span>Открыть AI-агента</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onStartPractice}
              >
                <span>Перейти в студию</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <button
                type="button"
                onClick={onGoToPricing}
                className="font-heading text-sm font-medium text-muted-foreground hover:text-foreground underline-offset-4 hover:underline px-2 py-2 cursor-pointer"
              >
                Тарифы Free и Pro
              </button>
            </div>
          </div>

          <div className="relative min-h-[260px] lg:min-h-[380px] rounded-lg overflow-hidden border border-border bg-card">
            {!imgErr ? (
              <img
                src={HERO_IMG}
                alt="Рабочее место для изучения русского языка: книга, ноутбук и микрофон для практики речи"
                referrerPolicy="no-referrer"
                onError={() => setImgErr(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#031725] to-[#022E5B] text-[#DAEAFF]">
                <BookOpenCheck className="w-10 h-10 mb-3 text-[#499BED]" />
                <span className="font-heading text-sm font-semibold">
                  Словесность · Русский язык
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#031725]/92 via-[#031725]/45 to-transparent p-5">
              <div className="flex flex-wrap items-center gap-2 font-heading text-xs text-[#DAEAFF]">
                <span>Грамматика и орфография</span>
                <span className="text-[#A1C6F6]/60" aria-hidden="true">
                  ·
                </span>
                <span>Speaking и Listening</span>
                <span className="text-[#A1C6F6]/60" aria-hidden="true">
                  ·
                </span>
                <span>Проверка ударений</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Proficiency Levels Strip right below the hero split */}
        <div id="levels" className="mt-12 pt-10 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-semibold text-foreground">
                Четыре этапа изучения русского языка
              </h2>
              <p className="mt-1 text-base text-muted-foreground">
                Выберите ваш уровень — репетитор, уроки, квизы и диктанты мгновенно подстроятся под этап.
              </p>
            </div>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              Активный этап: {PROFICIENCY_LEVELS.find((l) => l.id === activeLevel)?.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROFICIENCY_LEVELS.map((lvl, idx) => {
              const isSelected = activeLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    onSelectLevel(lvl.id);
                  }}
                  className={`text-left p-5 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isSelected
                      ? 'bg-[#022E5B] text-[#DAEAFF] border-[#499BED]'
                      : 'bg-card text-card-foreground border-border hover:border-[#499BED]/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        isSelected ? 'text-[#A1C6F6]' : 'text-muted-foreground'
                      }`}
                    >
                      0{idx + 1} · {lvl.cefr}
                    </span>
                    {isSelected && (
                      <Check
                        className="w-4 h-4 text-[#499BED] shrink-0"
                        aria-label="Выбранный этап"
                      />
                    )}
                  </div>
                  <h3
                    className={`mt-2 font-heading text-lg font-semibold ${
                      isSelected ? 'text-white' : 'text-foreground'
                    }`}
                  >
                    {lvl.label}
                  </h3>
                  <p
                    className={`mt-1.5 text-[15px] leading-snug ${
                      isSelected ? 'text-[#DAEAFF]/85' : 'text-muted-foreground'
                    }`}
                  >
                    {lvl.tagline}
                  </p>
                  <div
                    className={`mt-4 pt-3 border-t text-xs font-heading ${
                      isSelected
                        ? 'border-[#A1C6F6]/20 text-[#A1C6F6]'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {lvl.skills.join(' · ')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
