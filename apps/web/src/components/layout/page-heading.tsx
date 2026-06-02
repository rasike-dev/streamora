'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

type PageHeadingProps = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
};

export function PageHeading({
  title,
  description,
  backHref,
  backLabel,
  actions,
}: PageHeadingProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        {backHref && backLabel ? (
          <Link
            href={backHref}
            className="inline-block text-sm text-muted-foreground transition hover:text-foreground"
          >
            {backLabel}
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
