import { Check, CreditCard, LockOpen } from 'lucide-react';
import { PlanTier } from '../types/tutor';
import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/primitives';

interface PricingSectionProps {
  plan: PlanTier;
  onSelectFree: () => void;
  onOpenStripeCheckout: () => void;
}

const FREE_ITEMS = [
  '10 минут практики каждый день (автоматический сброс в 00:00)',
  'Базовые темы русского языка (Начальный этап A1–A2)',
  '5 структурированных уроков бесплатно с примерами и правилами',
  'Интерактивные квизы и практические задачи с AI-репетитором',
  'Тренажёр грамматики и правописания с мгновенной проверкой',
];

const PRO_ITEMS = [
  'Неограниченное время практики без суточных лимитов',
  'Все 4 этапа обучения: Начальный, Средний, Продвинутый и Эксперт (20 уроков)',
  'Проверка произношения через микрофон с оценкой ударений',
  'Speaking — живая голосовая практика с озвученными ответами репетитора',
  'Listening — аудирование с синтезом русской речи и вопросами на понимание',
  'Глубокий филологический разбор ошибок (орфография, пунктуация, стиль)',
];

export function PricingSection({
  plan,
  onSelectFree,
  onOpenStripeCheckout,
}: PricingSectionProps) {
  return (
    <section id="pricing" className="border-t border-border bg-background py-14 lg:py-16">
      <div className="max-w-[1360px] mx-auto px-4 lg:px-8">
        <div className="max-w-2xl mb-10">
          <p className="font-heading text-xs font-medium text-muted-foreground">
            Тарифы и подписка · Безопасная оплата через Stripe
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            Начните бесплатно — перейдите на Pro, когда потребуется голос и безлимит
          </h2>
          <p className="mt-2 text-lg text-muted-foreground">
            Бесплатный лимит в 10 минут обновляется ежедневно ровно в полночь. Подписку Pro можно отменить в любой момент.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
          {/* Free Tier */}
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <span className="font-heading text-xs font-medium text-muted-foreground">
                    Для ежедневного старта
                  </span>
                  <CardTitle className="mt-1 text-2xl">Free</CardTitle>
                </div>
                <div className="text-right">
                  <div className="font-mono text-3xl font-semibold text-foreground tabular-nums">
                    0 ₽
                  </div>
                  <div className="font-heading text-xs text-muted-foreground">
                    навсегда · сброс в 00:00
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3">
                {FREE_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-base text-foreground/90">
                    <Check className="w-4 h-4 text-[#499BED] mt-1 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={onSelectFree}
              >
                {plan === 'free' ? 'Текущий тариф · Перейти к практике' : 'Переключиться на Free'}
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Tier */}
          <Card className="flex flex-col justify-between border-[#499BED] bg-[#022E5B] text-[#DAEAFF]">
            <CardHeader>
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <span className="font-heading text-xs font-medium text-[#A1C6F6]">
                    Для свободной речи и экзаменов
                  </span>
                  <CardTitle className="mt-1 text-2xl text-white">Pro</CardTitle>
                </div>
                <div className="text-right">
                  <div className="font-mono text-3xl font-semibold text-white tabular-nums">
                    $15
                  </div>
                  <div className="font-heading text-xs text-[#A1C6F6]">
                    в месяц · оплата через Stripe
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3">
                {PRO_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-base text-[#DAEAFF]">
                    <Check className="w-4 h-4 text-[#499BED] mt-1 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="pt-4 border-t border-[#A1C6F6]/20 flex flex-col gap-2">
              {plan === 'pro' ? (
                <Button
                  type="button"
                  variant="accent"
                  size="lg"
                  className="w-full"
                  onClick={onSelectFree}
                >
                  <LockOpen className="w-4 h-4" />
                  <span>Тариф Pro активен · Все модули открыты</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="accent"
                  size="lg"
                  className="w-full"
                  onClick={onOpenStripeCheckout}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Оплатить Pro через Stripe</span>
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
