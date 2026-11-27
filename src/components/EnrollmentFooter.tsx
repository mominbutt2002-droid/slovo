import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { TRAINING_PROGRAMS } from '../data/defaultKnowledgeBase';

interface EnrollmentFooterProps {
  preselectedProgram: string;
  onNavigateSection: (id: string) => void;
}

export function EnrollmentFooter({
  preselectedProgram,
  onNavigateSection,
}: EnrollmentFooterProps) {
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [program, setProgram] = useState(
    preselectedProgram || TRAINING_PROGRAMS[0].title
  );
  const [format, setFormat] = useState<'Онлайн' | 'Очно в Москве' | 'Корпоративно'>(
    'Онлайн'
  );
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (preselectedProgram) {
      setProgram(preselectedProgram);
      setSubmitted(false);
    }
  }, [preselectedProgram]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) {
      setError('Укажите ваше имя и фамилию.');
      return;
    }
    const cleanContact = contact.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanContact);
    const isPhone = /[0-9]{7,}/.test(cleanContact.replace(/\D/g, ''));
    if (!isEmail && !isPhone) {
      setError('Укажите корректный телефон или адрес электронной почты.');
      return;
    }

    setSubmitted(true);
  };

  return (
    <>
      <section
        id="enroll"
        className="border-t border-slate-800/80 bg-[#0D1320] py-14 lg:py-16"
      >
        <div className="max-w-[1360px] mx-auto px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-start">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
              Заявка на обучение или корпоративный расчет
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400 max-w-md">
              Учебный отдел проверит наличие мест в ближайшей группе, подготовит договор, счет на оплату или график беспроцентной рассрочки.
            </p>

            <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-3 text-xs text-slate-400">
              <div>
                <span className="text-slate-200 font-medium">Очный кампус:</span>{' '}
                г. Москва, ул. Бауманская, д. 44, корп. 2
              </div>
              <div>
                <span className="text-slate-200 font-medium">Приемная комиссия:</span>{' '}
                пн–пт, 09:30–19:30 МСК · +7 (495) 218-44-10 · study@factbaza-edu.ru
              </div>
              <div>
                <span className="text-slate-200 font-medium">Лицензия ДПО:</span>{' '}
                <span className="font-mono tabular-nums">
                  № Л035-01298-77/00641205
                </span>{' '}
                (бессрочная)
              </div>
            </div>
          </div>

          <div className="p-6 rounded-md bg-[#111827] border border-slate-800/90">
            {submitted ? (
              <div className="py-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Заявка зарегистрирована</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Спасибо, {fullName}. Мы зафиксировали интерес к программе «{program}» ({format}). Методист учебного центра свяжется по контакту <span className="font-mono text-slate-100">{contact}</span> в рабочее время.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setComment('');
                  }}
                  className="mt-2 px-3.5 py-2 text-xs font-medium text-slate-200 border border-slate-700 hover:border-slate-500 rounded-md transition-colors cursor-pointer"
                >
                  Отправить еще одну заявку
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-md border border-red-500/30 bg-red-500/10 text-xs text-red-300">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Имя и фамилия
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Алексей Смирнов"
                      className="w-full bg-[#0B0F17] border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Телефон или email
                    </label>
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="+7 999 000-00-00 или email"
                      className="w-full bg-[#0B0F17] border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3.5">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Программа обучения
                    </label>
                    <select
                      value={program}
                      onChange={(e) => setProgram(e.target.value)}
                      className="w-full bg-[#0B0F17] border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#3B82F6]"
                    >
                      {TRAINING_PROGRAMS.map((p) => (
                        <option key={p.id} value={p.title}>
                          {p.title} ({p.priceLabel})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Формат
                    </label>
                    <select
                      value={format}
                      onChange={(e) =>
                        setFormat(
                          e.target.value as 'Онлайн' | 'Очно в Москве' | 'Корпоративно'
                        )
                      }
                      className="w-full bg-[#0B0F17] border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#3B82F6]"
                    >
                      <option value="Онлайн">Онлайн</option>
                      <option value="Очно в Москве">Очно в Москве</option>
                      <option value="Корпоративно">Корпоративно</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    Комментарий (необязательно)
                  </label>
                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Например: нужна рассрочка или обучение для 5 сотрудников"
                    className="w-full bg-[#0B0F17] border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6] resize-none"
                  />
                </div>

                <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500">
                    Отвечаем в течение 1 рабочего дня
                  </span>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-md transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Отправить заявку
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800/80 bg-[#0B0F17] py-8">
        <div className="max-w-[1360px] mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-semibold text-slate-200">
              ФактБаза
            </span>
            <span aria-hidden="true">·</span>
            <span>АНО ДПО «Учебный центр ФактБаза»</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">© 2026</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => onNavigateSection('programs')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Программы
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('terms')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Регламент
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('consultant')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              AI-консультант
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('documents')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              База документов
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
