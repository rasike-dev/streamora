'use client';

import { ThemeToggle } from '@/components/theme-toggle';

export function LandingHeaderActions() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ThemeToggle />
    </div>
  );
}
