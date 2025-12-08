import { CHAIN_CONFIG, CONTRACT_ADDRESSES, TOKEN_ADDRESSES } from '@/lib/constants';
import {
  createPublicClient,
  decodeAbiParameters,
  encodeFunctionData,
  http,
  keccak256,
  stringToHex,
  type Hex,
} from 'viem';
import { base } from 'viem/chains';

// Env & defaults
const POOL_MANAGER: `0x${string}` = (
  (process.env.NEXT_PUBLIC_UNISWAP_V4_POOL_MANAGER || '0x498581fF718922c3f8e6A244956aF099B2652b2b')
) as `0x${string}`;
const STATE_VIEW: `0x${string}` = (
  (process.env.NEXT_PUBLIC_UNISWAP_V4_STATE_VIEW_ADDRESS || '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71')
) as `0x${string}`;
const QUOTER: `0x${string}` = (
  (process.env.NEXT_PUBLIC_UNISWAP_V4_QUOTER_ADDRESS || '0x0d5e0f971ed27fbff6c2837bf31316121532048d')
) as `0x${string}`;

// Public client
const publicClient = createPublicClient({ chain: base, transport: http(CHAIN_CONFIG.rpcUrl) });

// Minimal ABIs
const ERC20_DECIMALS_ABI = [
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const;

const STATE_VIEW_ABI = [
  {
    name: 'getSlot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint24' },
      { name: 'lpFee', type: 'uint24' },
    ],
  },
] as const;

const V4_QUOTER_ABI = [
  {
    name: 'quoteExactInputSingle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          {
            name: 'poolKey',
            type: 'tuple',
            components: [
              { name: 'currency0', type: 'address' },
              { name: 'currency1', type: 'address' },
              { name: 'fee', type: 'uint24' },
              { name: 'tickSpacing', type: 'int24' },
              { name: 'hooks', type: 'address' },
            ],
          },
          { name: 'zeroForOne', type: 'bool' },
          { name: 'exactAmount', type: 'uint256' },
          { name: 'hookData', type: 'bytes' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

// Helpers
function sortTokens(a: `0x${string}`, b: `0x${string}`): [`0x${string}`, `0x${string}`] {
  return a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
}

async function getTokenDecimals(addr: `0x${string}`): Promise<number> {
  try {
    const dec = await publicClient.readContract({
      address: addr,
      abi: ERC20_DECIMALS_ABI as any,
      functionName: 'decimals',
      args: [],
    });
    return Number(dec) || 18;
  } catch {
    return 18;
  }
}

// Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)
const INIT_EVENT_TOPIC: Hex = keccak256(
  stringToHex('Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)')
);

type InitParams = {
  fee: number;
  tickSpacing: number;
  hooks: `0x${string}`;
};

// Parse 32-byte slot from hex data (0x + 64 hex chars per slot)
function readSlot(data: Hex, index: number): Hex {
  const start = 2 + index * 64;
  const end = start + 64;
  return ('0x' + (data as string).slice(start, end)) as Hex;
}

function uintToNumber(u: Hex): number {
  try { return Number(BigInt(u)); } catch { return 0; }
}

function int24FromHex(u: Hex): number {
  const v = BigInt(u);
  const TWO_24 = 1n << 24n;
  const MAX = (1n << 23n) - 1n;
  return Number(v > MAX ? v - TWO_24 : v);
}

function addressFromSlot(u: Hex): `0x${string}` {
  const s = (u as string).slice(-40);
  return ('0x' + s) as `0x${string}`;
}

async function getInitParamsFromLogs(poolId: `0x${string}`): Promise<InitParams> {
  const latest = (await publicClient.getBlock()).number!;
  const logs = await (publicClient as any).getLogs({
    address: POOL_MANAGER,
    topics: [INIT_EVENT_TOPIC, poolId],
    fromBlock: 0n,
    toBlock: latest,
  });
  if (!logs.length) throw new Error('Initialize event not found for pool');
  const log = logs[0];
  const data = log.data as Hex;
  // Data layout (non-indexed): fee, tickSpacing, hooks, sqrtPriceX96, tick
  const fee = uintToNumber(readSlot(data, 0));
  const tickSpacing = int24FromHex(readSlot(data, 1));
  const hooks = addressFromSlot(readSlot(data, 2));
  return { fee, tickSpacing, hooks };
}

async function getLpFeeFromStateView(poolId: `0x${string}`): Promise<number> {
  try {
    const out: any = await publicClient.readContract({
      address: STATE_VIEW,
      abi: STATE_VIEW_ABI as any,
      functionName: 'getSlot0',
      args: [poolId],
    });
    const lpFee = Number(out?.[3] ?? out?.lpFee ?? 0);
    return lpFee;
  } catch {
    return 0;
  }
}

// Try viem simulate first; if the quoter uses revert-return, parse revert data
async function quoteExactInputSingleRaw(params: any): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  // simulate path
  try {
    const sim: any = await publicClient.simulateContract({
      address: QUOTER,
      abi: V4_QUOTER_ABI as any,
      functionName: 'quoteExactInputSingle',
      args: [params],
      account: '0x0000000000000000000000000000000000000001',
    });
    const [amountOut, gasEstimate] = sim.result as [bigint, bigint];
    return { amountOut, gasEstimate };
  } catch (err: any) {
    // Attempt raw eth_call & decode revert bytes as (uint256,uint256)
    try {
      const data = encodeFunctionData({ abi: V4_QUOTER_ABI as any, functionName: 'quoteExactInputSingle', args: [params] });
      const res = await publicClient.call({ to: QUOTER, data });
      // If it "succeeds", decode normally
      const decoded: any = decodeAbiParameters(
        [{ type: 'uint256' }, { type: 'uint256' }],
        res.data as Hex
      );
      return { amountOut: decoded[0] as bigint, gasEstimate: decoded[1] as bigint };
    } catch (inner: any) {
      // On revert, viem throws and embeds revert data at inner?.data?
      const raw: Hex | undefined = (inner?.data?.data || inner?.data || inner?.cause?.data?.data) as Hex | undefined;
      if (!raw || typeof raw !== 'string') throw err;
      // Try decode revert payload as abi.encode(amountOut, gasEstimate)
      const decoded: any = decodeAbiParameters(
        [{ type: 'uint256' }, { type: 'uint256' }],
        raw as Hex
      );
      return { amountOut: decoded[0] as bigint, gasEstimate: decoded[1] as bigint };
    }
  }
}

function pow10(n: number): bigint { return 10n ** BigInt(n); }

// Simple v3 TWAP leg for USD/WETH (re-uses pricing’s approach in a minimal form)
const UNISWAP_V3_FACTORY: `0x${string}` = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';
const V3_FEE_TIERS: number[] = [100, 500, 3000, 10000];

const V3_FACTORY_ABI = [
  { name: 'getPool', type: 'function', stateMutability: 'view', inputs: [
    { name: 'tokenA', type: 'address' },
    { name: 'tokenB', type: 'address' },
    { name: 'fee', type: 'uint24' },
  ], outputs: [{ type: 'address' }] },
] as const;

const V3_POOL_ABI = [
  { name: 'observe', type: 'function', stateMutability: 'view', inputs: [{ name: 'secondsAgos', type: 'uint32[]' }], outputs: [
    { name: 'tickCumulatives', type: 'int56[]' },
    { name: 'secondsPerLiquidityCumulativeX128', type: 'uint160[]' },
  ] },
] as const;

async function getV3Pool(tokenA: `0x${string}`, tokenB: `0x${string}`, fee: number): Promise<`0x${string}` | null> {
  const [t0, t1] = sortTokens(tokenA, tokenB);
  const out = await publicClient.readContract({ address: UNISWAP_V3_FACTORY, abi: V3_FACTORY_ABI as any, functionName: 'getPool', args: [t0, t1, fee] });
  const addr = (out as string).toLowerCase();
  return addr === '0x0000000000000000000000000000000000000000' ? null : (out as `0x${string}`);
}

async function observeAvgTick(pool: `0x${string}`, seconds: number): Promise<number | null> {
  try {
    const res: any = await publicClient.readContract({ address: pool, abi: V3_POOL_ABI as any, functionName: 'observe', args: [[seconds, 0]] });
    const ticks: any[] = res?.[0] ?? res?.tickCumulatives;
    if (!ticks || ticks.length < 2) return null;
    const t0 = BigInt(ticks[0]);
    const t1 = BigInt(ticks[1]);
    return Number((t1 - t0) / BigInt(seconds));
  } catch { return null; }
}

const TWAP_SECONDS: number = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_TWAP_SECONDS || '600');
  if (!isFinite(raw) || raw <= 0) return 600;
  return Math.min(Math.max(Math.floor(raw), 60), 3600);
})();

function price1Per0FromTick(avgTick: number, dec0: number, dec1: number): string {
  const p = Math.pow(1.0001, avgTick) * Math.pow(10, dec1 - dec0);
  return String(p);
}

async function usdPerWethFromV3Twap(): Promise<string | null> {
  const usdc = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`;
  const weth = TOKEN_ADDRESSES.weth;
  for (const fee of V3_FEE_TIERS) {
    const pool = await getV3Pool(usdc, weth, fee);
    if (!pool) continue;
    const avgTick = await observeAvgTick(pool, TWAP_SECONDS);
    if (avgTick === null) continue;
    const [t0, t1] = sortTokens(usdc, weth);
    const [dec0, dec1] = await Promise.all([getTokenDecimals(t0), getTokenDecimals(t1)]);
    const p = price1Per0FromTick(avgTick, dec0, dec1); // token1 per token0
    if (t0.toLowerCase() === weth.toLowerCase()) return p; // USD/WETH already
    // invert
    const [i, f = ''] = p.split('.');
    const scaled = BigInt(i + (f + '000000000000').slice(0, 12));
    const invScaled = (10n ** 12n * 10n ** 12n) / scaled;
    const intPart = invScaled / (10n ** 12n);
    const frac = (invScaled % (10n ** 12n)).toString().padStart(12, '0').replace(/0+$/, '');
    return frac.length ? `${intPart.toString()}.${frac}` : intPart.toString();
  }
  return null;
}

function mulDecimalStrings(a: string, b: string): string {
  const toScaled = (s: string) => {
    const [i, f = ''] = s.split('.');
    return BigInt(i + (f + '000000000000').slice(0, 12));
  };
  const as = toScaled(a);
  const bs = toScaled(b);
  const prod = (as * bs) / (10n ** 12n);
  const intPart = prod / (10n ** 12n);
  const frac = (prod % (10n ** 12n)).toString().padStart(12, '0').replace(/0+$/, '');
  return frac.length ? `${intPart.toString()}.${frac}` : intPart.toString();
}

export async function getUsdPerFbcViaQuoterStrict(poolId: `0x${string}`): Promise<string> {
  // Discover pool params
  const { tickSpacing, hooks } = await getInitParamsFromLogs(poolId);
  // Fee: prefer state view for up-to-date lpFee (should equal init fee for static-fee pools)
  const fee = (await getLpFeeFromStateView(poolId)) || 0;

  const fbc = CONTRACT_ADDRESSES.fbc;
  const weth = TOKEN_ADDRESSES.weth;
  const [currency0, currency1] = sortTokens(fbc, weth);
  const fbcDecimals = await getTokenDecimals(fbc);
  const wethDecimals = await getTokenDecimals(weth);

  const poolKey = { currency0, currency1, fee, tickSpacing, hooks };
  const zeroForOne = currency0.toLowerCase() === fbc.toLowerCase(); // FBC -> WETH
  const exactAmount = pow10(fbcDecimals); // 1 FBC

  const { amountOut } = await quoteExactInputSingleRaw({ poolKey, zeroForOne, exactAmount, hookData: '0x' });
  if (amountOut <= 0n) throw new Error('Quoter returned zero');

  // Convert to decimal string WETH per 1 FBC
  const int = amountOut / pow10(wethDecimals);
  const frac = (amountOut % pow10(wethDecimals)).toString().padStart(wethDecimals, '0').replace(/0+$/, '');
  const wethPerFbc = frac.length ? `${int.toString()}.${frac}` : int.toString();

  // USD per WETH via v3 TWAP
  const usdPerWeth = await usdPerWethFromV3Twap();
  if (!usdPerWeth) throw new Error('Unable to fetch USD/WETH');

  // USD/FBC = USD/WETH * WETH/FBC
  return mulDecimalStrings(usdPerWeth, wethPerFbc);
}
