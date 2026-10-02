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
3. On that app, enable **Advanced Credit and Debit Card Payments**
4. Restart `npm run dev`

**Generate Live Demo** and **Fresh live run** open ten $1,000 Sandbox captures on their own. Without credentials, refunds stay in preview mode.

A manual import is still available if you already have capture IDs: `npm run seed:paypal` reads `PAYPAL_CAPTURE_IDS` from the shell, or `npm run seed:demo-batches` reads `data/paypal-captures.json`.

## Golden demo path

1. Generate demo → Enter as Buyer → view $1,000 protected order  
2. Switch to Merchant → PayZap → analyze default prompt ($800 / $1,500 cap)  
3. See $2,000 risk → launch at $850 → watch 10 refunds  
4. Switch to Buyer → see $150 back and effective price $850  

Product requirements: [PayZap_PRD.md](./PayZap_PRD.md)
