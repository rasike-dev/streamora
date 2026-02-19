"use client";

import {useTheme} from "next-themes";
import {useEffect, useState} from "react";

export function ThemeToggle() {
  const {theme, setTheme} = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      className="rounded-xl border px-3 py-2 text-sm"
      onClick={() => setTheme(next)}
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
