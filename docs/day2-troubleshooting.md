# Day 2 API Troubleshooting

## Issue: Cannot find module 'dist/main'

### Symptoms
- TypeScript compilation succeeds (0 errors)
- But NestJS can't find the compiled `main.js` file
- Error: `Cannot find module '/path/to/apps/api/dist/main'`

### Root Cause
NestJS watch mode is having trouble with the compilation output structure, possibly due to workspace package resolution.

### Solutions

#### Solution 1: Clean Build (Recommended)
```bash
cd apps/api
rm -rf dist node_modules
cd ../..
pnpm install
cd apps/api
pnpm start:dev
```

#### Solution 2: Manual Build First
```bash
cd apps/api
pnpm build
pnpm start:dev
```

#### Solution 3: Check Workspace Linking
Ensure the shared package is properly linked:
```bash
# From repo root
pnpm install
ls -la apps/api/node_modules/@streamora
# Should show a symlink to ../../packages/shared
```

#### Solution 4: Use Direct Import (Temporary)
If workspace resolution is still problematic, you can temporarily import directly:

In `apps/api/src/app.controller.ts`:
```typescript
// Instead of: import { UserRole } from '@streamora/shared';
import { UserRole } from '../../../packages/shared/index';
```

But this is not recommended for production - fix the workspace setup instead.

### Verification

After applying a solution, check:
1. `dist/main.js` exists: `ls apps/api/dist/main.js`
2. API starts without errors
3. `/health` endpoint works: `curl http://localhost:3001/health`
