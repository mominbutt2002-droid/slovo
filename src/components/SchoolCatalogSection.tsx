import { CalendarPlus, Clock, GraduationCap } from 'lucide-react';
import {
  SCHOOL_SERVICES,
  SCHOOL_TEACHERS,
  SCHOOL_WORKING_HOURS,
} from '../data/schoolCatalog';
import { Button } from './ui/primitives';

interface SchoolCatalogSectionProps {
  onBookInAgentChat: (prefill?: { service?: string; teacher?: string }) => void;
}

export function SchoolCatalogSection({
  onBookInAgentChat,
}: SchoolCatalogSectionProps) {
  return (
    <section
      id="catalog"
      className="border-t border-border bg-background py-14 lg:py-16"
    >
      <div className="max-w-[1360px] mx-auto px-4 lg:px-8 space-y-12">
        {/* Header + Working Hours Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
          <div>
            <p className="font-heading text-xs font-medium text-muted-foreground">
              Каталог услуг, цены, учителя и расписание
            </p>
            <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
              Услуги школы, преподаватели и запись через AI-агента
            </h2>
            <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
              Все цены, график работы центра и расписание учителей загружены в AI-агента — задайте ему любой вопрос или оформите запись прямо в чате.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-border bg-card space-y-2.5">
            <div className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
              <Clock className="w-4 h-4 text-[#499BED]" />
              <span>Время работы центра</span>
            </div>
            <div className="space-y-1 text-sm text-foreground/90 font-mono tabular-nums">
              <div>{SCHOOL_WORKING_HOURS.weekdays}</div>
              <div>{SCHOOL_WORKING_HOURS.saturday}</div>
              <div className="text-muted-foreground font-sans text-base">
                {SCHOOL_WORKING_HOURS.sunday} · {SCHOOL_WORKING_HOURS.aiPlatform}
              </div>
            </div>
            <div className="pt-2 border-t border-border text-xs font-heading text-muted-foreground">
              {SCHOOL_WORKING_HOURS.address} · {SCHOOL_WORKING_HOURS.phone}
            </div>
          </div>
        </div>

        {/* Services & Prices Catalog */}
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
            Каталог услуг и цены
          </h3>
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {SCHOOL_SERVICES.map((srv) => (
              <div
                key={srv.id}
                className="p-4 lg:px-6 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_170px_auto] gap-3 lg:gap-6 items-start lg:items-center"
              >
                <div>
                  <div className="font-heading text-base font-semibold text-foreground">
                    {srv.title}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {srv.description}
                  </p>
                </div>
                <div className="font-heading text-xs text-muted-foreground">
                  {srv.duration} · {srv.format}
                </div>
                <div className="font-mono text-lg font-semibold text-foreground tabular-nums lg:text-right">
                  {srv.priceLabel}
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onBookInAgentChat({ service: srv.title })}
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-[#499BED]" />
                    <span>Записаться в чате</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teachers, Experience & Working Hours */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-[#499BED]" />
            <h3 className="font-heading text-lg font-semibold text-foreground">
              Преподаватели, стаж и время работы
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SCHOOL_TEACHERS.map((teacher) => (
              <div
                key={teacher.id}
                className="p-5 rounded-lg border border-border bg-card flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="font-mono text-xs text-[#499BED] tabular-nums">
                    {teacher.experienceLabel} · {teacher.levels}
                  </div>
                  <h4 className="font-heading text-base font-semibold text-foreground">
                    {teacher.name}
                  </h4>
                  <p className="font-heading text-xs text-muted-foreground">
                    {teacher.role}
                  </p>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {teacher.specialization}
                  </p>
                </div>

                <div className="pt-3 border-t border-border space-y-3">
                  <div className="font-mono text-xs text-muted-foreground tabular-nums">
                    {teacher.schedule}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      onBookInAgentChat({
                        teacher: teacher.name,
                        service: 'Индивидуальный урок с преподавателем',
                      })
                    }
                  >
                    Записаться к преподавателю
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
