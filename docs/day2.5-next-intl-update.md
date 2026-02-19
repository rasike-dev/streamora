# Day 2.5 - next-intl Version Update

## Issue

The `requestLocale` function is not available in `next-intl@3.15.0`. It was added in version 3.22.0+.

## Solution

### Option 1: Upgrade next-intl (Recommended)

```bash
# From repo root
cd apps/web
pnpm add next-intl@^3.22.0
cd ../../
```

Then use the new API:
```typescript
import {getRequestConfig} from "next-intl/server";
import {requestLocale} from "next-intl/server";
import {notFound} from "next/navigation";

export default getRequestConfig(async () => {
  const locale = await requestLocale();
  
  if (!["en", "si", "ta"].includes(locale)) notFound();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
```

### Option 2: Keep Current Version (3.15.0)

If you want to stay on 3.15.0, use the old API (with deprecation warning):

```typescript
import {getRequestConfig} from "next-intl/server";
import {notFound} from "next/navigation";

export default getRequestConfig(async ({locale}) => {
  if (!["en", "si", "ta"].includes(locale)) notFound();

  return {
    locale, // Add locale to return object
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
```

**Note**: This will show deprecation warnings but will work fine.

## Recommendation

**Upgrade to 3.22.0+** to:
- Remove deprecation warnings
- Use the latest API
- Future-proof your code

## After Upgrade

1. **Install new version**:
   ```bash
   cd apps/web
   pnpm install
   ```

2. **Restart dev server**:
   ```bash
   pnpm dev:web
   ```

3. **Warnings should disappear**
