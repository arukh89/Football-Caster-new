import { env } from 'process';

// Canonical env vars only
const DEFAULT_URI = env.SPACETIME_URI || env.NEXT_PUBLIC_SPACETIME_URI || 'wss://maincloud.spacetimedb.com';
const DEFAULT_DB_NAME = env.SPACETIME_DB_NAME || env.NEXT_PUBLIC_SPACETIME_DB_NAME || 'football-caster-new';

// Lazy, singleton connection built from generated bindings
let _client: any | null = null;

async function buildConnection() {
  const dynamicImport = (Function('return import')() as unknown) as <T = any>(path: string) => Promise<T>;
  const { DbConnection } = await dynamicImport('@/spacetime_module_bindings');
  const conn = await DbConnection.builder()
    .withUri(DEFAULT_URI)
    .withDatabase(DEFAULT_DB_NAME)
    .connect();
  return conn;
}

export async function getSpacetime() {
  if (_client) return _client;
  const conn = await buildConnection();
  _client = conn;
  return conn;
}

export function getEnv() {
  return { URI: DEFAULT_URI, DB_NAME: DEFAULT_DB_NAME };
}

export async function reducers() {
  const st = await getSpacetime();
  return st.reducers as any;
}

export type ReducerCall<TArgs extends any[] = any[], TRes = any> = (...args: TArgs) => Promise<TRes>;

export const tables = {
  // Access via generated bindings if needed
} as any;
