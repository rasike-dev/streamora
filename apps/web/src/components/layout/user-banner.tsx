'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

const variantClass: Record<'info' | 'warning' | 'error' | 'success', string> = {
  info: 'border-blue-500/25 bg-blue-500/[0.07] dark:border-blue-400/30',
  warning: 'border-amber-500/30 bg-amber-500/[0.08] dark:border-amber-400/25',
  error: 'border-red-500/30 bg-red-500/[0.06] dark:border-red-400/25',
  success: 'border-emerald-500/30 bg-emerald-500/[0.07] dark:border-emerald-400/25',
};

export type BannerAction = { href: string; label: string };

type UserBannerProps = {
  variant: keyof typeof variantClass;
  title: string;
  body?: string;
  primaryAction?: BannerAction;
  secondaryAction?: BannerAction;
  children?: ReactNode;
};

export function UserBanner({
  variant,
  title,
  body,
  primaryAction,
  secondaryAction,
  children,
}: UserBannerProps) {
  return (
    <div
      role="alert"
      className={`rounded-xl border p-4 text-sm ${variantClass[variant]}`}
    >
      <p className="font-medium text-foreground">{title}</p>
      {body ? (
        <p className="mt-1.5 text-muted-foreground leading-relaxed">{body}</p>
      ) : null}
      {children}
      {primaryAction || secondaryAction ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {primaryAction ? (
            <Link
              href={primaryAction.href}
              className="inline-flex rounded-lg border border-foreground/20 bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
            >
              {primaryAction.label}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link
              href={secondaryAction.href}
              className="inline-flex rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
            >
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
