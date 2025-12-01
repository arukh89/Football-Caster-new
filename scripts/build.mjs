#!/usr/bin/env node
import { execSync } from 'node:child_process';

// Ensure consistent environment
process.env.BROWSERSLIST_IGNORE_OLD_DATA = process.env.BROWSERSLIST_IGNORE_OLD_DATA || '1';

try {
  execSync('npx next build', { stdio: 'inherit' });
} catch (e) {
  process.exit(typeof e?.status === 'number' ? e.status : 1);
}
