---
title: "Implementasi Wagmi + Viem untuk Semua Transaksi On‑chain (Mini App Farcaster + Next.js)"
---

# Ringkasan Eksekutif

Tujuan: menstandarkan seluruh transaksi on‑chain di project ini (Base chain, chainId 8453) menggunakan pola Wagmi v2 + Viem: simulate → write → wait. Untuk Mini App Farcaster, gunakan connector resmi agar transaksi berjalan mulus di Warpcast/klien Farcaster, dan manfaatkan batching EIP‑5792 bila tersedia. Setelah on‑chain sukses, sinkronkan state ke SpacetimeDB via reducer/endpoint server yang sudah ada.

Inti pipeline:
- Pastikan wallet tersambung & chain benar (Base).
- Simulasikan panggilan kontrak (`simulateContract`) [5].
- Eksekusi transaksi (`writeContract`) [1].
- Tunggu konfirmasi (`waitForTransactionReceipt`) [3][6].
- Jalankan side‑effects di server (verifikasi/SpacetimeDB).

Dokumen ini berisi langkah implementasi, snippet, serta checklist untuk klaim Starter Pack dan transaksi lain (approve, transfer, dll.).


# 1) Dependensi & Setup Dasar

Instal paket (Wagmi v2 + Viem + connector Farcaster + React Query):

```bash
pnpm add wagmi viem @wagmi/connectors @tanstack/react-query \
  @farcaster/miniapp-sdk @farcaster/miniapp-wagmi-connector
```

Catatan versi Wagmi v2 (aksi/`actions` selalu menerima `config` sebagai argumen pertama) [4].


# 2) Konfigurasi Wagmi (menambahkan Farcaster Mini App Connector)

File: `src/lib/wagmi-config.ts`

```ts
import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'; // [2]
import { CHAIN_CONFIG } from './constants';

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    // Urutan penting: pakai connector Farcaster saat berjalan dalam Mini App,
    // fallback ke injected (MetaMask, Coinbase, dll.)
    miniAppConnector(),
    injected(),
  ],
  transports: {
    [base.id]: http(CHAIN_CONFIG.rpcUrl),
  },
});
```

Jika tidak ingin menambah dependensi connector, alternatifnya membuat custom connector yang membungkus `sdk.wallet.getEthereumProvider()` dari Mini App SDK [2].


## 2.1) Memaksa Warplet (Warpcast Wallet) di Mini App (Mobile & Web)

Agar SEMUA transaksi di Mini App selalu memakai Warplet, lakukan deteksi lingkungan Mini App dan paksa koneksi via Farcaster connector. Di luar Mini App, tampilkan CTA “Buka di Warpcast” atau fallback ke injected sesuai kebutuhan Anda.

Contoh helper universal:

```ts
// src/lib/wallet/ensureWarpcast.ts
import { connect, getAccount, switchChain } from 'wagmi/actions';
import { wagmiConfig } from '@/lib/wagmi-config';

export class NotMiniAppError extends Error { constructor(){ super('Not running inside Warpcast Mini App'); } }

export async function ensureWarpcastAndBase() {
  // 1) Deteksi Mini App dengan mencoba mendapatkan provider dari SDK
  let isMiniApp = false;
  try {
    const sdk = await import('@farcaster/miniapp-sdk');
    const provider = await sdk.wallet.getEthereumProvider();
    isMiniApp = !!provider;
  } catch { /* noop */ }

  // 2) Pastikan connect via Farcaster connector jika di Mini App
  const account = getAccount(wagmiConfig);
  if (!account.isConnected) {
    if (isMiniApp) {
      const farcaster = wagmiConfig.connectors.find(
        (c) => c.id?.toLowerCase().includes('farcaster') || c.name?.toLowerCase().includes('farcaster')
      );
      if (!farcaster) throw new Error('Farcaster connector missing');
      await connect(wagmiConfig, { connector: farcaster }); // akan memanggil Warplet di Mini App
    } else {
      // Di luar Mini App: tampilkan CTA untuk membuka di Warpcast atau lakukan fallback sesuai desain
      throw new NotMiniAppError();
    }
  }

  // 3) Paksa chain Base (8453)
  const acc2 = getAccount(wagmiConfig);
  if (acc2.chainId !== 8453) {
    await switchChain(wagmiConfig, { chainId: 8453 });
  }
}

// Validasi cepat: pastikan benar-benar tersambung via Farcaster/Warplet
export async function assertUsingWarplet() {
  const { connector } = getAccount(wagmiConfig);
  const name = connector?.name?.toLowerCase() ?? '';
  if (!name.includes('farcaster')) {
    // Opsi tambahan: cek dukungan EIP-5792
    try {
      const provider: any = await connector?.getProvider();
      const supportsBatch = !!provider?.request;
      if (!supportsBatch) throw new Error('Provider does not expose request');
    } catch {
      throw new Error('Not using Warplet / Farcaster connector');
    }
  }
}
```

Contoh CTA sederhana untuk pengguna di luar Mini App:

```tsx
// src/components/OpenInWarpcastCTA.tsx
export function OpenInWarpcastCTA() {
  return (
    <a
      href="https://warpcast.com/~/mini-apps/YOUR_APP_SLUG"
      target="_blank"
      rel="noreferrer"
      className="btn btn-primary"
    >
      Buka di Warpcast
    </a>
  );
}
```

Penggunaan di setiap entry point on‑chain (sebelum simulate/write):

```ts
import { ensureWarpcastAndBase } from '@/lib/wallet/ensureWarpcast';

async function onUserAction() {
  try {
    await ensureWarpcastAndBase();
  } catch (e) {
    if (e instanceof NotMiniAppError) {
      // render <OpenInWarpcastCTA /> atau fallback lain
      return;
    }
    throw e;
  }
  // lanjut: simulate → write → wait
}
```


# 3) Pola Standar Transaksi (simulate → write → wait)

Seluruh transaksi on‑chain mengikuti pola ini agar aman & terukur:

1. Pastikan wallet connect dan chain = Base (8453).
2. `publicClient.simulateContract(...)` (Viem) untuk validasi & gas estimation [5].
3. `writeContract(config, request)` untuk mengirim transaksi [1].
4. `waitForTransactionReceipt(config, { hash, confirmations })` untuk menunggu konfirmasi dan deteksi replacement [3][6].
5. Panggil endpoint server untuk verifikasi/SpacetimeDB setelah tx sukses.

Contoh helper generik (framework‑agnostik, menggunakan Wagmi Actions + Viem):

```ts
// src/lib/onchain/sendTx.ts
import { simulateContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import type { Abi } from 'viem';
import { wagmiConfig } from '@/lib/wagmi-config';

type SendTxParams = {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: any[];
  value?: bigint;
  chainId?: number; // default Base
  confirmations?: number; // default 1-2
};

export async function sendTx<T extends SendTxParams>(p: T) {
  const { request } = await simulateContract(wagmiConfig, {
    address: p.address,
    abi: p.abi,
    functionName: p.functionName as any,
    args: (p.args ?? []) as any[],
    value: p.value,
    chainId: p.chainId,
  });

  const hash = await writeContract(wagmiConfig, request);

  const receipt = await waitForTransactionReceipt(wagmiConfig, {
    hash,
    chainId: p.chainId,
    confirmations: p.confirmations ?? 2,
  });

  return { hash, receipt };
}
```


# 4) Batching (opsional) dengan EIP‑5792 di Mini App

Farcaster Wallet mendukung `wallet_sendCalls` (EIP‑5792) untuk membundel beberapa panggilan (mis. approve + transfer) jadi satu konfirmasi [2].

Contoh minimal (fallback ke sequential bila method tidak ada):

```ts
// src/lib/onchain/batch.ts
import { getAccount } from 'wagmi/actions';
import { wagmiConfig } from '@/lib/wagmi-config';

export async function tryBatchSend(calls: Array<{ to: `0x${string}`; data: `0x${string}`; value?: `0x${string}` }>) {
  const { connector } = getAccount(wagmiConfig);
  const provider: any = await connector?.getProvider();
  if (!provider?.request) return null;

  try {
    const hash: `0x${string}` = await provider.request({
      method: 'wallet_sendCalls',
      params: [{ calls }],
    });
    return hash;
  } catch {
    return null; // wallet tidak mendukung / user membatalkan
  }
}
```

Catatan: bentuk payload `calls` mengikuti implementasi wallet; mulai dari encode data (ABI) hingga value. Jika gagal, jalankan pola sequential (approve → wait → action).


# 5) Struktur Kode & ABI

- Buat folder `src/lib/abis/` untuk mengelola ABI kontrak: ERC20, StarterClaim, Marketplace, dsb.
- Gunakan tipe Viem (`as const`) untuk ABI agar type inference maksimal.

Contoh: `src/lib/abis/StarterClaim.ts`

```ts
export const STARTER_CLAIM_ABI = [
  { name: 'claim', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
] as const;
```


# 6) Klaim Starter Pack (Wagmi + Viem)

Alur UI (client):
1. Panggil `ensureWarpcastAndBase()` untuk menjamin Warplet + Base (8453) [2].
2. Simulasikan fungsi klaim (atau approve/transfer FBC jika perlu biaya) [5].
3. Kirim transaksi dan tunggu receipt [1][3].
4. Panggil `/api/starter/verify` untuk verifikasi on‑chain (sudah tersedia di repo) → server memanggil reducer `grant_starter_pack` [server‑side].
5. Refresh status `/api/starter/status`.

Contoh implementasi action sederhana:

```ts
// src/lib/onchain/starter.ts
import { sendTx } from './sendTx';
import { STARTER_CLAIM_ABI } from '@/lib/abis/StarterClaim';
import { CONTRACT_ADDRESSES } from '@/lib/constants';

export async function claimStarterOnchain() {
  return sendTx({
    address: CONTRACT_ADDRESSES.starterClaim,
    abi: STARTER_CLAIM_ABI as any,
    functionName: 'claim',
    chainId: 8453,
  });
}
```

Contoh penggunaan di komponen (ringkas):

```ts
import { quickAuth } from '@farcaster/miniapp-sdk';
import { ensureWarpcastAndBase } from '@/lib/wallet/ensureWarpcast';
import { claimStarterOnchain } from '@/lib/onchain/starter';

async function onClickClaim() {
  await ensureWarpcastAndBase();
  const { hash } = await claimStarterOnchain();
  const res = await quickAuth.fetch('/api/starter/verify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHash: hash }),
  });
  if (!res.ok) throw new Error('Verification failed');
}
```

Catatan: Untuk pola pembayaran FBC (approve + transfer), gunakan helper yang sudah ada di project (`wallet-utils.ts`) dan/atau adaptasi ke `sendTx` + batching [2].


# 7) Transaksi ERC20 (approve/transfer) dengan Viem + Wagmi

Contoh pola ensure allowance → transfer (non‑batch):

```ts
import { parseAbi } from 'viem';
import { encodeFunctionData } from 'viem';
import { sendTx } from '@/lib/onchain/sendTx';

const ERC20 = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
]);

async function ensureAndPay(token: `0x${string}`, to: `0x${string}`, amount: bigint, owner: `0x${string}`) {
  // 1) Cek allowance via readContract (Viem) [7]
  // 2) Jika kurang, approve → wait
  await sendTx({ address: token, abi: ERC20, functionName: 'approve', args: [to, amount] });
  // 3) Transfer → wait
  await sendTx({ address: token, abi: ERC20, functionName: 'transfer', args: [to, amount] });
}
```

Untuk Mini App dengan EIP‑5792, encode dua call di atas, lalu `wallet_sendCalls` [2].


# 8) Verifikasi Server & Sinkronisasi SpacetimeDB

Server (Next.js Route) memverifikasi transaksi via Viem `getTransactionReceipt`/log parsing, lalu memanggil reducer SpacetimeDB. Project ini sudah memiliki:
- `/api/starter/verify` (memakai `verifyFBCTransfer`) → memanggil `stGrantStarterPack` setelah valid.
- `/api/starter/status` untuk state UI.

Best practice:
- Tunggu ≥2 konfirmasi di client sebelum memanggil verifikasi (server bebas menambah threshold) [6].
- Tangani replacement transaksi (sped‑up/cancelled) di `waitForTransactionReceipt` [6].


# 9) UX & Guardrails

- Deteksi chain & auto‑switch ke Base (8453) ketika user klik aksi.
- Tampilkan progres: Simulating → Signing → Waiting → Verified.
- Tangani error umum: insufficient funds, user rejected, simulation revert (tampilkan pesan dari Viem error) [5].
- Cache/disable tombol untuk mencegah double‑submit; lock by in‑flight hash.
- Untuk Mini App, pastikan `requiredChains` di manifes/metadata sesuai Base [9]. Tambahkan Base (8453) agar klien Farcaster mengetahui chain yang didukung.
- Bila aplikasi dibuka di luar Mini App, tampilkan CTA “Buka di Warpcast” (lihat §2.1) agar user berpindah ke lingkungan yang menyediakan Warplet.


# 10) Checklist Implementasi per Fitur

- Klaim Starter Pack: implement `claim()` (atau flow approve+transfer FBC → verify → reducer). Lihat §6.
- Marketplace buy/list/auction on‑chain (bila dipindah ke chain): standar pola §3/§7; setelah success panggil reducer untuk sinkronisasi notifikasi/inventory.
- Link wallet on‑chain (jika diperlukan signature/permit): gunakan `signMessage`/`signTypedData` Viem; kirim ke server untuk verifikasi.
- Batch ops (approve + tindakan) di Mini App: coba `wallet_sendCalls`; fallback ke sequential (§4).


# Referensi / Sumber

1. Wagmi – writeContract (v2): https://wagmi.sh/core/api/actions/writeContract
2. Farcaster Mini Apps – Wallets (Wagmi connector, EIP‑5792): https://miniapps.farcaster.xyz/docs/guides/wallets
3. Wagmi – waitForTransactionReceipt: https://wagmi.sh/core/api/actions/waitForTransactionReceipt
4. Wagmi – Migrate v1 → v2 (konsep actions + config): https://wagmi.sh/core/guides/migrate-from-v1-to-v2
5. Viem – simulateContract: https://viem.sh/docs/contract/simulateContract
6. Viem – waitForTransactionReceipt: https://v1.viem.sh/docs/actions/public/waitForTransactionReceipt.html
7. Viem – readContract: https://viem.sh/docs/contract/readContract
8. Farcaster Frames v2 demo (Wagmi provider di app Next.js): https://github.com/farcasterxyz/frames-v2-demo
9. Farcaster – Mini App/Frames v2 Spec (requiredChains & metadata): https://docs.farcaster.xyz/developers/frames/v2/spec
10. Wagmi – connect: https://wagmi.sh/core/api/actions/connect
11. Wagmi – getAccount: https://wagmi.sh/core/api/actions/getAccount
12. Wagmi – switchChain: https://wagmi.sh/core/api/actions/switchChain
