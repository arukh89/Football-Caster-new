# Pre-Deployment Checklist

## ✅ STEP 1: Set Treasury Address

### Local Environment (.env.local)
```bash
# Add this to .env.local:
NEXT_PUBLIC_TREASURY_ADDRESS=0xYourTreasuryAddressHere
```

### Vercel Environment (Production)

**Option A: Via Vercel CLI**
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project (if not linked)
vercel link

# Set environment variable
vercel env add NEXT_PUBLIC_TREASURY_ADDRESS production
# When prompted, enter your treasury address: 0xYourAddress...

# Verify it's set
vercel env ls
```

**Option B: Via Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project: `football-caster-new`
3. Go to Settings → Environment Variables
4. Click "Add New"
   - Key: `NEXT_PUBLIC_TREASURY_ADDRESS`
   - Value: `0xYourTreasuryAddressHere`
   - Environment: Check "Production" (and Preview/Development if needed)
5. Click "Save"
6. **Important:** Redeploy for changes to take effect

### Verification
```bash
# Test build locally
pnpm build

# Should succeed if treasury is set
# Should fail with clear error if missing/invalid
```

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Completed

---

## ✅ STEP 2: Deploy SpacetimeDB Schema Update

### Prerequisites Check
```bash
# Verify SpacetimeDB CLI installed
spacetime --version
# Expected: spacetimedb tool version 1.9.0+

# Check if logged in
spacetime identity list

# If not logged in:
spacetime identity new
# Or
spacetime identity import <your-identity>
```

### Build Rust Module
```bash
# Navigate to Rust server directory
cd spacetime-server/rust/footballcaster2

# Build the WebAssembly module
cargo build --release --target wasm32-unknown-unknown

# Verify build succeeded
ls target/wasm32-unknown-unknown/release/footballcaster2.wasm
```

### Deploy Schema to SpacetimeDB

**Important:** Choose deployment strategy:

**Option A: Fresh Deployment (⚠️ Deletes all data)**
```bash
spacetime publish footballcaster2 \
  --project-path . \
  --clear-database

# Use this ONLY for:
# - First time deployment
# - Development/testing environments
# - When you want to reset all data
```

**Option B: Schema Migration (✅ Preserves existing data)**
```bash
spacetime publish footballcaster2 \
  --project-path . \
  --upgrade

# Use this for:
# - Production deployments
# - When you want to keep existing data
# - Adding new tables/reducers without breaking changes
```

### Verify Deployment
```bash
# Check deployment logs
spacetime logs footballcaster2

# Verify new table exists
spacetime sql footballcaster2 "SELECT COUNT(*) FROM transaction_used"
# Should return: 0 (empty table)

# List all tables
spacetime sql footballcaster2 "SELECT * FROM sys.tables"
# Should show: transaction_used

# Test new reducer
spacetime call footballcaster2 mark_tx_used '["0xtest123", 12345, "/test"]'
# Should succeed

# Verify it was stored
spacetime sql footballcaster2 "SELECT * FROM transaction_used"
# Should show the test record
```

### Rollback Plan (if needed)
```bash
# If deployment fails, you can rollback:
spacetime publish footballcaster2 \
  --project-path . \
  --version <previous-version>

# Or restore from backup:
spacetime sql footballcaster2 < backup.sql
```

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Completed

---

## ✅ STEP 3: Test Payment Flows

### Test Environment Setup
```bash
# Make sure treasury address is set
echo $NEXT_PUBLIC_TREASURY_ADDRESS

# Start local dev server
pnpm dev

# In another terminal, keep SpacetimeDB logs open
spacetime logs footballcaster2 --follow
```

### Test 1: Treasury Validation
```bash
# This should pass (treasury is set)
curl http://localhost:3000/api/health
# Expected: {"status":"ok","treasury":"0xYour..."}

# Test build validation
pnpm build
# Expected: Build succeeds ✅
```

### Test 2: Transaction Replay Protection

**Test 2A: First Transaction (Should Succeed)**
```bash
# Replace with actual test values
curl -X POST http://localhost:3000/api/starter/verify \
  -H "Authorization: Bearer YOUR_DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "txHash": "0xTEST_TRANSACTION_HASH_123",
    "amount": "1000000000000000000"
  }'

# Expected Response: 200 OK
# {
#   "success": true,
#   "message": "Entry verified and starter pack awarded"
# }
```

**Test 2B: Replay Attempt (Should Fail)**
```bash
# Use SAME txHash as above
curl -X POST http://localhost:3000/api/starter/verify \
  -H "Authorization: Bearer YOUR_DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "txHash": "0xTEST_TRANSACTION_HASH_123",
    "amount": "1000000000000000000"
  }'

# Expected Response: 409 Conflict
# {
#   "error": "Transaction hash already used"
# }
```

### Test 3: Confirmation Depth
```bash
# Submit a transaction with <10 confirmations
# (This requires a REAL recent blockchain transaction)

curl -X POST http://localhost:3000/api/starter/verify \
  -H "Authorization: Bearer YOUR_DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "txHash": "0xRECENT_TX_WITH_FEW_CONFIRMATIONS",
    "amount": "1000000000000000000"
  }'

# Expected Response: 400 Bad Request
# {
#   "error": "Insufficient confirmations: 3/10"
# }
```

### Test 4: Error Boundary
1. Open http://localhost:3000 in browser
2. Open DevTools Console
3. Force an error:
   ```javascript
   // In browser console
   throw new Error("Test error boundary");
   ```
4. Expected: See friendly error UI (not white screen)
5. Click "Try Again" or "Refresh Page"
6. Expected: App recovers

### Test 5: hasEnteredBefore Check
```bash
# Check SpacetimeDB for test FID
spacetime sql footballcaster2 \
  "SELECT * FROM inventory_item WHERE owner_fid = 250704"

# If returns rows: hasEnteredBefore should be true
# If returns empty: hasEnteredBefore should be false
```

### Test 6: All Payment Endpoints

Test each endpoint with replay protection:

```bash
# 1. Starter Pack Purchase
curl -X POST http://localhost:3000/api/starter/verify \
  -H "Authorization: Bearer TOKEN" \
  -d '{"txHash":"0xUNIQUE_1","amount":"1000000000000000000"}'

# 2. Market Buy
curl -X POST http://localhost:3000/api/market/buy \
  -H "Authorization: Bearer TOKEN" \
  -d '{"listingId":"123","txHash":"0xUNIQUE_2"}'

# 3. Auction Buy Now
curl -X POST http://localhost:3000/api/auctions/buy-now \
  -H "Authorization: Bearer TOKEN" \
  -d '{"auctionId":"456","txHash":"0xUNIQUE_3"}'

# 4. Auction Finalize
curl -X POST http://localhost:3000/api/auctions/finalize \
  -H "Authorization: Bearer TOKEN" \
  -d '{"auctionId":"789","txHash":"0xUNIQUE_4"}'
```

**Each should:**
- ✅ First call: Succeed (if payment valid)
- ✅ Second call with same txHash: Return 409 Conflict

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Completed

---

## ✅ STEP 4: Monitor Logs Post-Deployment

### Setup Monitoring Commands

**Vercel Logs (Real-time)**
```bash
# Stream production logs
vercel logs --follow --production

# Filter for specific patterns
vercel logs --follow --production | grep "Transaction hash already used"
vercel logs --follow --production | grep "treasury"
vercel logs --follow --production | grep "ERROR"
```

**SpacetimeDB Logs**
```bash
# Stream database logs
spacetime logs footballcaster2 --follow

# Check for reducer errors
spacetime logs footballcaster2 --follow | grep "panic"
spacetime logs footballcaster2 --follow | grep "tx_already_used"
```

### Monitoring Checklist (First 24 Hours)

**Hour 1: Critical Monitoring**
- [ ] Check for build errors in Vercel
- [ ] Verify treasury address is set (check logs)
- [ ] Monitor for any payment failures
- [ ] Check SpacetimeDB connection status
- [ ] Verify error boundary is working

**Hour 2-6: Active Monitoring**
- [ ] Check for transaction replay attempts (should be 0 or very low)
- [ ] Monitor confirmation depth rejections
- [ ] Check RPC call limits (Alchemy/Infura dashboard)
- [ ] Verify all payment endpoints responding correctly

**Hour 6-24: Periodic Checks**
- [ ] Check every 2 hours for errors
- [ ] Monitor treasury balance (should be increasing)
- [ ] Track user entry rate
- [ ] Check for any auth failures

### Key Metrics to Track

```bash
# Transaction replay attempts
vercel logs --production --since=24h | grep "Transaction hash already used" | wc -l
# Expected: 0 or very low (only if actual attack)

# Insufficient confirmations
vercel logs --production --since=24h | grep "Insufficient confirmations" | wc -l
# Expected: Some (normal - users trying too early)

# Treasury validation errors
vercel logs --production --since=24h | grep "CRITICAL.*TREASURY" | wc -l
# Expected: 0 (should be caught at build time)

# Error boundary activations
vercel logs --production --since=24h | grep "ErrorBoundary caught" | wc -l
# Expected: 0 or very low

# SpacetimeDB transactions stored
spacetime sql footballcaster2 "SELECT COUNT(*) FROM transaction_used"
# Expected: Increasing over time
```

### Alert Thresholds

Set up alerts for:
- ⚠️ More than 10 replay attempts per hour (possible attack)
- ⚠️ Treasury address errors (should never happen in production)
- ⚠️ SpacetimeDB connection failures
- ⚠️ More than 5% error boundary activations
- ⚠️ RPC rate limit approaching 80%

### Emergency Response

If you see issues:

1. **Replay Attack Detected**
   ```bash
   # Check logs for pattern
   vercel logs --production | grep "Transaction hash already used"
   
   # System is protected - no action needed unless volume is extreme
   # If extreme: Consider rate limiting at Vercel/Cloudflare level
   ```

2. **Treasury Not Set**
   ```bash
   # Should be caught at build time, but if somehow in production:
   vercel env add NEXT_PUBLIC_TREASURY_ADDRESS production
   vercel --prod  # Redeploy immediately
   ```

3. **SpacetimeDB Down**
   ```bash
   # Check status
   spacetime logs footballcaster2
   
   # If unresponsive: Contact SpacetimeDB support or restart instance
   ```

4. **High Error Rate**
   ```bash
   # Identify error pattern
   vercel logs --production | grep "ERROR" | head -50
   
   # If critical: Rollback deployment
   vercel rollback
   ```

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Completed

---

## 📊 Final Deployment Checklist

Before declaring deployment successful:

- [ ] Treasury address set in Vercel ✅
- [ ] SpacetimeDB schema deployed with `transaction_used` table ✅
- [ ] All payment endpoints tested and working ✅
- [ ] Transaction replay protection verified ✅
- [ ] Confirmation depth working (10 blocks) ✅
- [ ] Error boundary catches runtime errors ✅
- [ ] hasEnteredBefore returns correct results ✅
- [ ] No authentication bypass possible ✅
- [ ] Monitoring setup and active ✅
- [ ] First 24 hours passed without critical issues ✅

---

## 🆘 Support Contacts

- **Vercel Issues:** https://vercel.com/support
- **SpacetimeDB Issues:** https://discord.gg/spacetimedb
- **Base RPC Issues:** Check Alchemy/Infura dashboard
- **Code Issues:** Review DEPLOYMENT.md and FIXES_SUMMARY.md

---

**Last Updated:** December 4, 2025  
**Prepared by:** Droid (Factory AI)
