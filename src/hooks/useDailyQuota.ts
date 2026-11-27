import { useEffect, useState } from 'react';
import { PlanTier } from '../types/tutor';

export const FREE_DAILY_LIMIT_SECONDS = 10 * 60; // 10 minutes per day
const QUOTA_STORAGE_KEY = 'slovesnost_daily_quota_v1';

interface StoredQuota {
  dateKey: string;
  usedSeconds: number;
}

function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getSecondsUntilMidnight(now = new Date()): number {
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));
}

export function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatHhMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function loadQuotaForToday(): StoredQuota {
  const today = getLocalDateKey();
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredQuota;
      if (parsed && parsed.dateKey === today && typeof parsed.usedSeconds === 'number') {
        return {
          dateKey: today,
          usedSeconds: Math.max(0, Math.min(FREE_DAILY_LIMIT_SECONDS, parsed.usedSeconds)),
        };
      }
    }
  } catch {
    // Ignore storage read error
  }
  return { dateKey: today, usedSeconds: 0 };
}

export function useDailyQuota(plan: PlanTier, isPracticing: boolean) {
  const [quota, setQuota] = useState<StoredQuota>(() => loadQuotaForToday());
  const [secondsToMidnight, setSecondsToMidnight] = useState<number>(() =>
    getSecondsUntilMidnight()
  );

  useEffect(() => {
    try {
      localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(quota));
    } catch {
      // Ignore storage error
    }
  }, [quota]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = new Date();
      const todayKey = getLocalDateKey(now);
      setSecondsToMidnight(getSecondsUntilMidnight(now));

      setQuota((prev) => {
        // Automatic daily reset at midnight (00:00)
        if (prev.dateKey !== todayKey) {
          return { dateKey: todayKey, usedSeconds: 0 };
        }
        if (plan === 'free' && isPracticing && prev.usedSeconds < FREE_DAILY_LIMIT_SECONDS) {
          return { ...prev, usedSeconds: prev.usedSeconds + 1 };
        }
        return prev;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [plan, isPracticing]);

  const remainingSeconds =
    plan === 'pro'
      ? Infinity
      : Math.max(0, FREE_DAILY_LIMIT_SECONDS - quota.usedSeconds);

  const isLimitReached = plan === 'free' && remainingSeconds <= 0;
  const percentRemaining =
    plan === 'pro'
      ? 100
      : Math.round((remainingSeconds / FREE_DAILY_LIMIT_SECONDS) * 100);

  return {
    usedSeconds: quota.usedSeconds,
    remainingSeconds,
    percentRemaining,
    isLimitReached,
    secondsToMidnight,
    resetDateKey: quota.dateKey,
  };
}
