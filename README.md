# PayZap

Price protection for merchants on PayPal. A merchant pastes the guarantee terms they already publish, PayZap turns them into rules that quote the merchant's own words, shows what a price drop will cost before it happens, and then honors the guarantees with partial refunds through **PayPal Sandbox**. The buyer sees the money come back with no claim.

This is a hackathon demo. Everything runs against PayPal Sandbox or in a clearly labeled preview mode. PayZap is not a PayPal product and is not endorsed by PayPal.

## How the AI is used

- **Policy compiler (the main use).** Free-form policy prose becomes a closed set of rules: protection window, excluded coupons, excluded item condition. Each rule must quote text the merchant actually wrote, or it is discarded. When something is missing, such as the number of days, PayZap asks instead of guessing.
- **Campaign intent.** One short sentence ("$800, keep refunds under $1,500") becomes a sale price and a refund budget.
- **What the AI never does.** It never decides an amount. Refunds are always `purchase price - approved new price`, computed by code over the orders the compiled rules cover, and the merchant approves twice (accept the price, then launch) before money moves.
- **Providers.** DeepSeek Flash or GPT-6 Luna when a key is set (see `.env.example`). Without a key, a deterministic keyword parser reads the same inputs, and the UI says which engine read the policy.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Generate Live Demo**.

Checks:

```bash
npm run typecheck
npm run lint
npm run check:policy   # policy compiler and exposure engine
```

## Configuration

Copy `.env.example` to `.env.local`.

| Variable | Purpose |
|---|---|
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | PayPal Sandbox app. Without them the demo runs in labeled preview mode. |
| `DEEPSEEK_API_KEY` or `OPENAI_API_KEY` | Lets a model read the policy and the campaign sentence. Optional. |
| `AI_PROVIDER` | `deepseek` or `openai`, when both keys exist. |

For live refunds, enable **Advanced Credit and Debit Card Payments** on the Sandbox app, then restart. **Generate Live Demo** and **Fresh live run** open ten $1,000 Sandbox captures on their own.

A manual import is still available if you already have capture IDs: `npm run seed:paypal` reads `PAYPAL_CAPTURE_IDS` from the shell, or `npm run seed:demo-batches` reads `data/paypal-captures.json`.

## Demo path

The full presenter script is in [DEMO_SCRIPT.md](./DEMO_SCRIPT.md). In short:

1. Generate demo, then look at the buyer's protected $1,000 order.
2. Switch to Merchant, open PayZap, pick **Example: vague policy** and **Compile policy**. Answer the clarifying question. Two coupon orders are marked not covered, with the quoted rule.
3. **Analyze Impact** with the default sentence: $800 would refund $1,600 against a $1,500 budget. PayZap recommends **$813**.
4. **Use $813**, then **Launch campaign**. Eight refunds of $187 go out one by one.
5. Switch to Buyer: $187 back, effective price $813.

With the default policy (no policy pasted) all ten orders are covered, and the same flow gives the original numbers: $2,000 of risk, a recommendation of $850, and ten refunds of $150.

Product requirements: [PayZap_PRD.md](./PayZap_PRD.md). The PRD describes the original ten-order, $850 story.
