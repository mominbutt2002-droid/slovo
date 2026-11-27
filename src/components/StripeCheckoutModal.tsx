import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, ShieldCheck, X } from 'lucide-react';
import { createStripeCheckout } from '../services/tutorApi';
import { Button, Input } from './ui/primitives';

interface StripeCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  onActivatePreviewPro: () => void;
}

export function StripeCheckoutModal({
  open,
  onClose,
  onActivatePreviewPro,
}: StripeCheckoutModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfiguredNote, setUnconfiguredNote] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnconfiguredNote(null);

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Введите корректный адрес электронной почты.');
      return;
    }

    setLoading(true);
    try {
      const result = await createStripeCheckout(email.trim() || undefined);
      if (result.configured && result.url) {
        window.location.href = result.url;
        return;
      }
      setUnconfiguredNote(
        result.message ||
          'Ключ STRIPE_SECRET_KEY ещё не добавлен в Settings > Secrets. Вы можете активировать ознакомительный доступ Pro прямо сейчас.'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Не удалось инициировать оплату через Stripe.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#031725]/80 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stripe-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2
              id="stripe-modal-title"
              className="font-heading text-lg font-semibold text-foreground"
            >
              Подписка «Словесность Pro»
            </h2>
            <p className="font-mono text-xs text-muted-foreground tabular-nums">
              $15 / месяц · Stripe Checkout
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно оплаты"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCheckout} className="p-6 space-y-4">
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="w-4 h-4 text-[#499BED] shrink-0" />
              <span>Безлимитная практика + все 4 уровня (20 уроков)</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="w-4 h-4 text-[#499BED] shrink-0" />
              <span>Проверка произношения, Speaking, Listening и разбор ошибок</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="stripe-email"
              className="block font-heading text-xs font-medium text-muted-foreground mb-1.5"
            >
              Email для чека Stripe (необязательно)
            </label>
            <Input
              id="stripe-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
            />
          </div>

          {error && (
            <div className="p-3 rounded-md border border-red-500/40 bg-red-500/10 text-sm text-red-400">
              {error}
            </div>
          )}

          {unconfiguredNote && (
            <div className="p-3.5 rounded-md border border-[#499BED]/40 bg-secondary/70 space-y-3">
              <p className="text-sm text-foreground leading-relaxed">
                {unconfiguredNote}
              </p>
              <Button
                type="button"
                variant="accent"
                className="w-full"
                onClick={() => {
                  onActivatePreviewPro();
                  onClose();
                }}
              >
                Включить Pro-режим для тестирования
              </Button>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2.5">
            <Button
              type="submit"
              variant="accent"
              size="lg"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Создание сессии Stripe...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Перейти к оплате в Stripe</span>
                </>
              )}
            </Button>
            <div className="flex items-center justify-center gap-1.5 font-heading text-[11px] text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-[#499BED]" />
              <span>Платёж обрабатывается сервером через официальный Stripe Checkout</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
