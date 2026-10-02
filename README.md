# PayZap

Immersive hackathon demo: merchants see refund exposure before dropping prices, then honor price guarantees through **PayPal Sandbox**.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Generate Live Demo**.

## PayPal Sandbox (optional live refunds)

1. Copy `.env.example` to `.env.local`
2. Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` (Sandbox app)
3. Seed real capture IDs:

```bash
# Option A: import IDs you already created in Sandbox
PAYPAL_CAPTURE_IDS=id1,id2,... npm run seed:paypal

# Option B: edit data/paypal-captures.json then
npm run seed:demo-batches
```

Without credentials, the demo runs in **preview mode** with simulated refunds (clearly labeled).

## Golden demo path

1. Generate demo → Enter as Buyer → view $1,000 protected order  
2. Switch to Merchant → PayZap → analyze default prompt ($800 / $1,500 cap)  
3. See $2,000 risk → launch at $850 → watch 10 refunds  
4. Switch to Buyer → see $150 back and effective price $850  

Product requirements: [PayZap_PRD.md](./PayZap_PRD.md)
