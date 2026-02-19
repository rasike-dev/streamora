# Day 2.5 Installation Steps

## Error: Cannot find module 'next-intl/plugin'

This error occurs because dependencies haven't been installed yet.

## Solution

### 1. Install Dependencies

```bash
# From repo root
pnpm install
```

This will install:
- `next-intl` (for i18n)
- `next-themes` (for theming)

### 2. Verify Installation

```bash
# Check if packages are installed
ls apps/web/node_modules/next-intl
ls apps/web/node_modules/next-themes
```

### 3. Start Web App

```bash
# From repo root
pnpm dev:web
```

## If Installation Fails

### Check pnpm version
```bash
pnpm --version
# Should be 8.x or higher
```

### Clear cache and reinstall
```bash
# From repo root
rm -rf node_modules apps/web/node_modules pnpm-lock.yaml
pnpm install
```

### Install from web directory
```bash
cd apps/web
pnpm install
cd ../../
```

## After Installation

Once dependencies are installed, the web app should start successfully and you'll see:

```
✓ Ready in X ms
○ Compiling / ...
```

Then test:
- http://localhost:3000 → Should redirect to /en
- http://localhost:3000/en → English version
- http://localhost:3000/si → Sinhala version
- http://localhost:3000/ta → Tamil version
