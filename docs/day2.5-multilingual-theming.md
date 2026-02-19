# Day 2.5 — Multilingual + Theming Implementation

## Summary

Implemented multilingual support (EN/SI/TA) and theming (light/dark) before Day 3 to avoid refactoring later.

## Changes Made

### 1. Multilingual Support (i18n)

#### Dependencies Added
- `next-intl`: Internationalization library for Next.js

#### Files Created
- `apps/web/src/middleware.ts` - Locale routing middleware
- `apps/web/src/i18n/request.ts` - i18n configuration
- `apps/web/messages/en.json` - English translations
- `apps/web/messages/si.json` - Sinhala translations
- `apps/web/messages/ta.json` - Tamil translations

#### Route Structure Changed
- All routes now under `[locale]` dynamic segment
- Routes: `/en/*`, `/si/*`, `/ta/*`
- Root `/` automatically redirects to `/en`

#### Pages Updated
- All pages now use `useTranslations()` hook
- Links are locale-aware
- Callback page extracts locale from pathname

### 2. Theming Support

#### Dependencies Added
- `next-themes`: Theme management library

#### Files Created
- `apps/web/src/components/theme-provider.tsx` - Theme provider wrapper
- `apps/web/src/components/theme-toggle.tsx` - Theme toggle button

#### CSS Variables Added
- Light theme variables (default)
- Dark theme variables
- Muted foreground color support

#### Integration
- ThemeProvider wraps app in locale layout
- Theme toggle added to home page
- Theme persists across page reloads

## Installation Steps

### 1. Install Dependencies

```bash
# From repo root
cd apps/web
pnpm install
cd ../../
```

This installs:
- `next-intl`
- `next-themes`

### 2. Update Keycloak Redirect URIs

In Keycloak Admin Console:

1. Go to **Clients** → **streamora-web**
2. **Settings** tab → **Valid redirect URIs**
3. Add:
   ```
   http://localhost:3000/*/auth/callback
   http://localhost:3000/en/auth/callback
   http://localhost:3000/si/auth/callback
   http://localhost:3000/ta/auth/callback
   ```
4. Click **"Save"**

### 3. Restart Web App

```bash
# From repo root
pnpm dev:web
```

## Testing Checklist

### Multilingual
- [ ] `/` redirects to `/en`
- [ ] `/en` shows English text
- [ ] `/si` shows Sinhala text
- [ ] `/ta` shows Tamil text
- [ ] Login works from all locales (`/en/login`, `/si/login`, `/ta/login`)
- [ ] Callback works for all locales
- [ ] Dashboard shows translated title

### Theming
- [ ] Theme toggle button visible on home page
- [ ] Clicking toggle switches between light/dark
- [ ] Theme persists after page reload
- [ ] Theme respects system preference (default)
- [ ] All pages respect theme (background/foreground colors)

## Route Structure

```
apps/web/src/app/
├── [locale]/
│   ├── layout.tsx          # Locale + theme wrapper
│   ├── page.tsx            # Home page
│   ├── login/
│   │   └── page.tsx        # Login page
│   ├── dashboard/
│   │   └── page.tsx        # Dashboard page
│   ├── admin/
│   │   └── page.tsx        # Admin page
│   └── auth/
│       └── callback/
│           └── page.tsx    # OAuth callback
├── globals.css             # Theme CSS variables
└── middleware.ts           # Locale routing
```

## Translation Keys

Current translations available:

```json
{
  "app": { "name": "Streamora" },
  "nav": { "login": "...", "dashboard": "...", "admin": "..." },
  "login": { "title": "...", "cta": "..." },
  "dashboard": { "title": "..." }
}
```

## Adding New Translations

1. Add key to all three files:
   - `apps/web/messages/en.json`
   - `apps/web/messages/si.json`
   - `apps/web/messages/ta.json`

2. Use in component:
   ```tsx
   const t = useTranslations();
   <h1>{t("your.key")}</h1>
   ```

## Theme Customization

### Adding Brand Colors

Edit `apps/web/src/app/globals.css`:

```css
:root {
  --brand-primary: 255 0 0; /* Red */
  --brand-secondary: 0 255 0; /* Green */
}

.dark {
  --brand-primary: 255 100 100;
  --brand-secondary: 100 255 100;
}
```

Use in Tailwind:
```tsx
<div className="bg-[rgb(var(--brand-primary))]">
```

## Next Steps

- [ ] Add more translation keys as needed
- [ ] Polish Sinhala/Tamil translations
- [ ] Add brand color variables
- [ ] Add locale switcher component
- [ ] Persist locale preference

## Day 2.5 LOCK Checklist ✅

- [x] Routes work as `/en`, `/si`, `/ta`
- [x] `/` redirects to `/en`
- [x] Login works for all locales (callback works)
- [x] Translation strings render (EN/SI/TA)
- [x] Theme toggle switches light/dark and persists
- [x] Keycloak redirect URIs updated
