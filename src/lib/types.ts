// Type definitions for Football Caster

export interface Player {
  playerId: string;
  ownerFid: number;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  rating: number;
  xp: number;
  morale: number;
  holdEnd: string | null; // ISO date string
  isNpc: boolean;
  avatar?: string;
  attributes: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
  };
}

export interface Auction {
  id: string;
  playerId: string;
  sellerFid: number;
  topBidFbcWei: string | null; // FBC in wei
  currentBidderFid: number | null;
  reserveFbcWei: string; // FBC in wei (reserve)
  endsAt: string; // ISO date string
  buyNowFbcWei: string | null; // FBC in wei
  minIncrement: string; // FBC in wei
  antiSnipeUsed: boolean;
  status: 'active' | 'ended' | 'finalized';
}

export interface Listing {
  id: string;
  playerId: string;
  sellerFid: number;
  priceFbcWei: string; // FBC in wei
  createdAt: string;
  status: 'active' | 'sold' | 'cancelled';
}

export interface InboxMessage {
  id: string;
  type: 'morale_summary_team' | 'offer_received' | 'offer_accepted' | 'offer_declined' | 'auction_outbid' | 'auction_won' | 'auction_lost' | 'auction_expired' | 'auction_sold';
  timestamp: string;
  read: boolean;
  data: Record<string, unknown>;
}

export interface FarcasterIdentity {
  fid: number;
  username?: string;
  displayName?: string;
  avatar?: string;
}

export interface WalletState {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  chainId: number | undefined;
}

export interface HoldStatus {
  isActive: boolean;
  endsAt: Date | null;
  hoursRemaining: number | null;
}
