# PayZap — Product Requirements Document (PRD)

**Version:** 1.1  
**Project:** PayPal AI Hackathon  
**Product name:** PayZap  
**Document purpose:** Give a coding agent enough product context to implement the hackathon MVP without losing the intended user experience, demo narrative, scope boundaries, or acceptance criteria.

This revision records the demo as it ships: an Aster store for the buyer, a PayPal Business-style console for the merchant, automatic Sandbox captures, a guarded campaign box, and a read-only Sandbox request scanner.

---

## 1. Product Summary

PayZap is an AI-powered price-protection layer for merchants that use PayPal.

A merchant can offer customers a post-purchase price guarantee. Before launching a price reduction or promotion, the merchant describes the intended campaign in natural language, including financial constraints such as a maximum refund budget.

PayZap analyzes recent protected purchases, estimates the total refund exposure of the proposed price, and recommends a safer price when the proposal would exceed the merchant's budget.

When the merchant approves the campaign, PayZap updates the product price, evaluates all protected purchases against the merchant's policy, and executes eligible partial refunds through PayPal Sandbox.

The demo must show the same event from both perspectives:

- **Merchant:** understands financial exposure before changing the price and sees refunds executed.
- **Buyer:** receives the price adjustment automatically without submitting a claim, contacting support, or monitoring the price manually.

The key product idea is not merely "automatic refunds." The core value is:

> **PayZap helps merchants understand and control the financial impact of a price guarantee before changing prices, then automatically honors the guarantees they have already promised through PayPal.**

---

## 2. Demo Thesis

The demo should make the judge feel that PayZap is already an integrated merchant application rather than an isolated hackathon dashboard.

The experience must communicate this sequence naturally:

1. A buyer already purchased a product for **$1,000 through PayPal**.
2. The merchant has **10 recent protected purchases**, each originally made for $1,000.
3. The merchant wants to launch a promotion at **$800**, but wants total price-protection refunds to stay at or below **$1,500**.
4. PayZap analyzes the 10 purchases.
5. At $800, refund exposure would be **$2,000**.
6. PayZap recommends **$850** instead.
7. At $850, refund exposure is exactly **$1,500**.
8. Merchant accepts the recommendation and launches the promotion.
9. PayZap evaluates the 10 protected orders.
10. PayZap executes **10 real partial refunds of $150 each in PayPal Sandbox**.
11. The merchant's normal Orders view reflects the refunds.
12. The demo buyer receives a notification and their order now shows:
    - original price: $1,000
    - price adjustment: -$150
    - final effective price: $850
    - PayPal refund: completed

This is the core demo. All MVP decisions should protect this flow.

---

## 3. Product Principles

### 3.1 Immersive, not complicated

The judge should feel like they are using a complete commerce system, but they should not have to configure a real store, create accounts manually, enter API keys, seed data, or understand PayPal internals.

### 3.2 Real depth, controlled breadth

The surrounding ecommerce experience may be intentionally narrow. The PayZap financial workflow must be real.

The most important real behaviors are:

- demo-session creation
- merchant/buyer role separation
- persistent demo state
- campaign analysis
- refund-exposure calculation
- AI interpretation/recommendation
- product-price change
- eligibility evaluation
- real PayPal Sandbox refunds
- synchronized merchant and buyer views

### 3.3 Sandbox demo inside a PayPal Business frame

The application must clearly identify PayPal transactions as **Sandbox** transactions.

The merchant console is styled like PayPal Business so PayZap sits in that sidebar as one product, next to Checkout. The PayZap page may say it is a PayPal product inside that demo dashboard. The buyer side stays the Aster store and does not wear PayPal chrome.

A persistent demo bar stays above both skins. It is the frame that tells a visitor this is a temporary hackathon demo on PayPal Sandbox, not a production PayPal account.

Avoid language such as:

- "Official PayPal PriceGuard"
- a claim that PayPal sponsors or endorses PayZap outside this demo

### 3.4 Judge-first UX

A first-time visitor should understand the product by using it, without needing a tutorial or reading architecture documentation.

---

## 4. Target Users

### Primary user: Merchant operator

A person responsible for ecommerce pricing, promotions, customer experience, or store operations.

They want to:

- run promotions without accidentally creating excessive refund liability
- offer a trustworthy price guarantee
- understand the financial consequence of a proposed price change
- automate eligible refunds
- reduce support tickets and manual refund operations

### Secondary user: Buyer

A customer who purchased from the merchant and received price protection.

They want to:

- understand that their purchase is protected
- receive a price adjustment automatically
- see the refund reflected in their order
- avoid manually tracking price changes
- avoid contacting support or filing a claim

### Demo visitor / judge

A temporary visitor who must be able to experience both roles with minimal setup.

---

## 5. Demo Environment

The public demo operates as a temporary sandbox session.

### Session characteristics

Each generated demo session must:

- last approximately **30 minutes**
- have a unique session identifier
- have one temporary merchant persona
- have one temporary buyer persona
- have an isolated copy of the demo store state
- reference one reserved PayPal Sandbox transaction batch
- contain 10 protected orders
- contain one featured product
- expire automatically

The visitor must see that the environment is temporary and uses PayPal Sandbox.

Example persistent demo bar:

```text
LIVE DEMO · PayPal Sandbox ● · 24:18 remaining
[ Buyer ] [ Merchant ] [ Reset Scenario ]
```

---

## 6. First-Run Experience

### User Story 6.1 — Generate a demo

As a hackathon judge, I want to generate an isolated demo environment so that I can experience PayZap without configuring anything.

#### Acceptance criteria

- Landing page contains one obvious primary CTA such as **Generate Live Demo**.
- Page explains in one sentence what will happen.
- Page states that PayPal Sandbox is used.
- Page states that the session is temporary.
- Clicking the CTA creates an isolated demo session.
- During creation, a short progress state may show steps such as:
  - Creating storefront
  - Creating buyer
  - Creating merchant
  - Loading protected purchases
  - Connecting PayPal Sandbox transactions
  - Activating price protection
- Successful setup ends with a ready state.
- Visitor can enter as Buyer or Merchant.
- Buyer is the recommended first experience.
- Visitor is not required to manually enter credentials.
- Generated credentials may still be visible for transparency/testing.

Example:

```text
Your 30-minute demo is ready

BUYER
buyer-A7F2
[ Enter as Buyer ]

MERCHANT
merchant-A7F2
[ Enter as Merchant ]
```

---

## 7. Demo Store

The demo contains a fictitious ecommerce brand.

### Default store

**Store name:** Aster  
**Featured product:** Aster Nova Pro  
**Category:** closed-back reference headphone  
**Original price:** $1,000  
**Initial stock:** configurable seed value such as 30–50  
**Current campaign:** none

The product is shown with an illustration, not a photograph of a real headphone. No real-world brand is required.

### Required ecommerce surfaces

The store is not intended to be a full ecommerce implementation.

Only implement pages needed for the demo story:

#### Buyer
- Store header with the Aster wordmark
- Orders, including the live shop price
- Order Detail

#### Merchant
The sidebar is grouped like a PayPal Business account:

- Home: Summary
- Activity: Orders
- Catalog: Products
- PayPal products: PayZap, Checkout

Checkout shows the current price and a PayPal button preview. It does not take a new card payment. The ten protected payments are the Sandbox captures opened when the demo starts.

---

## 8. Buyer Experience — Before the Campaign

The buyer skin is the Aster store: warm paper, the store wordmark, and the headphone illustration. It should feel like the account page after a purchase, not like an admin tool.

### User Story 8.1 — See an existing purchase

As the temporary buyer, I want to see a completed purchase so that the demo begins after checkout and focuses on PayZap.

#### Acceptance criteria

- Buyer already has one Aster Nova Pro order.
- Order shows original purchase price of **$1,000**.
- Payment method displays PayPal.
- Payment status displays as paid/completed.
- Order status may display Delivered or Completed.
- This order corresponds to one of the 10 protected demo purchases.

### User Story 8.2 — Understand protection

As the buyer, I want to see that my order has price protection so that I know what PayZap promises before the merchant changes the price.

#### Acceptance criteria

Order Detail shows a Price Protection block containing:

- protection status
- protection duration
- expiration status/date
- short explanation

Example:

```text
PRICE PROTECTION

Protected for 7 days

If Aster lowers the public price during your
protection window, the eligible difference can
be automatically returned through PayPal.
```

The buyer should not need to understand AI or refund-policy internals.

### User Story 8.3 — Move naturally to the merchant story

The buyer experience should provide a contextual CTA:

**See what happens from the merchant side**

or

**Switch to Merchant**

This should switch role without requiring logout/login during the demo.

---

## 9. Merchant Experience — Store Context

The merchant skin is a light PayPal Business dashboard. PayZap is one product in that sidebar, beside Checkout, so a visitor finds it the way they would find another PayPal product.

### User Story 9.1 — Merchant overview

As the merchant, I want the environment to look like the PayPal account I already use so that PayZap feels like part of my existing operations.

#### Acceptance criteria

Merchant navigation contains:

- Summary
- Orders
- Products
- PayZap, labeled as price protection
- Checkout, labeled as online payments

The user should be able to discover PayZap naturally from the sidebar. The demo buyer's order is labeled so it can be picked out of the ten.

### User Story 9.2 — Product state

As the merchant, I want to see the product's current commercial state.

#### Acceptance criteria

Aster Nova Pro shows:

- price: $1,000
- stock
- sales/order count
- protected purchase count: 10

The product price must later update to $850 after the campaign is launched.

### User Story 9.3 — Existing orders

As the merchant, I want to see the purchases that PayZap will protect.

#### Acceptance criteria

Orders view contains 10 orders.

Each order should show enough context to feel real:

- order number
- buyer
- product
- amount: $1,000
- payment provider: PayPal
- payment state
- price-protection state

The primary demo buyer's order must be identifiable among these orders.

---

## 10. PayZap Dashboard

### Purpose

PayZap should visually feel like a focused application inside the merchant's commerce environment.

### Default metrics

Display:

- Protected Revenue: **$10,000**
- Protected Purchases: **10**
- Current Refund Exposure: **$0** before a campaign
- Product under protection: Aster Nova Pro
- Current Price: **$1,000**

Do not overload the screen with general analytics.

The central action should be campaign planning.

---

## 11. Natural-Language Campaign Planning

### User Story 11.1 — Describe a campaign in natural language

As a merchant, I want to describe the promotion and financial constraint in plain language so that I do not need to manually model refund exposure.

Default/prefilled demo prompt:

> Launch a weekend campaign at $800, but keep total price-protection refunds under $1,500.

#### Acceptance criteria

- User can edit the prompt.
- The demo can provide the default prompt for speed.
- Clicking Analyze Impact triggers analysis.
- UI shows an analysis/loading state.
- PayZap extracts at minimum:
  - proposed promotional price
  - maximum refund budget
- Parsed intent should be inspectable or reflected clearly in the result.
- The box accepts one short sentence: at most 280 characters, with a price and a campaign word such as price, promotion, refund, budget, or sale.
- Helper copy tells the merchant that the box is for the sale price and the refund budget.

### Public-demo guardrails

The campaign box is the only model input in the demo. A visitor must not be able to spend tokens on unrelated requests.

- Text that is not a price campaign is rejected before any model call.
- Instructions that try to change the model's task are rejected before any model call.
- Request bodies larger than 2,000 bytes are rejected.
- Repeating the sentence that was just analyzed does not call the model again.
- Each session may spend at most 6 model calls, with at least 3 seconds between them.
- The model is told to return only the promotional price and the refund budget. Its reply is capped at 80 tokens.
- If the reply does not contain a proposed price above zero, PayZap does not use it.

### Model providers

Intent extraction uses DeepSeek Flash when `DEEPSEEK_API_KEY` is set, or when `AI_PROVIDER=deepseek`. Thinking is disabled.

It uses GPT-6 Luna when `OPENAI_API_KEY` is set, or when `AI_PROVIDER=openai`, and DeepSeek was not selected. Reasoning effort is none.

If both keys exist and `AI_PROVIDER` is unset, DeepSeek is used.

If no provider is configured, a deterministic parser reads the same two numbers from the sentence.

The model never decides refund cents. The refund is always the original price minus the approved new price.

---

## 12. Refund Exposure Analysis

### Business rule

For each eligible protected order:

```text
refund = original_purchase_price - proposed_new_price
```

For the default demo:

```text
10 orders
original purchase price = $1,000
proposed price = $800

refund per order = $200
total exposure = $2,000
```

### User Story 12.1 — Detect an unsafe campaign

As a merchant, I want PayZap to warn me when the proposed campaign exceeds my refund budget.

#### Acceptance criteria

For the default prompt, PayZap must calculate:

- proposed price: $800
- eligible protected purchases: 10
- refund per eligible purchase: $200
- total expected refunds: $2,000
- merchant refund budget: $1,500
- result: exceeds budget by $500

The UI must make the risk understandable without requiring the judge to do arithmetic.

Example:

```text
CAMPAIGN RISK

Proposed price        $800
Protected customers    10
Expected refunds    $2,000
Refund budget       $1,500

Exceeds budget by     $500
```

---

## 13. AI Price Recommendation

### User Story 13.1 — Recommend a budget-safe price

As a merchant, I want PayZap to recommend a price that respects my constraint so that I can still launch a promotion without exceeding my intended refund exposure.

### Default expected recommendation

With:

- 10 eligible orders
- original price = $1,000
- refund budget = $1,500

Maximum refund per customer:

```text
$1,500 / 10 = $150
```

Recommended promotional price:

```text
$1,000 - $150 = $850
```

#### Acceptance criteria

PayZap recommends **$850**.

UI shows:

- recommended price
- expected total refunds: $1,500
- number of protected customers: 10
- reason recommendation satisfies the budget

The user can explicitly choose:

**Use $850**

The recommendation must not silently launch the campaign.

---

## 14. Launch Campaign

### User Story 14.1 — Approve recommendation

As the merchant, I want to explicitly approve the recommended price before PayZap changes the store and moves money.

#### Acceptance criteria

- User must take an explicit action to launch.
- Launch action clearly communicates that refunds will be executed.
- Product price changes from $1,000 to $850.
- Campaign becomes Active/Live.
- PayZap identifies the protected purchases affected by the change.
- Refund processing begins.

---

## 15. Protection Eligibility

For the hackathon MVP, eligibility should remain intentionally understandable.

### Required default rules

An order is eligible when:

- same product/SKU
- purchase is within protection window
- new price is below purchase price
- order has not already consumed the relevant refund
- promotion type is eligible
- PayPal capture is associated with the order
- session/batch has not already been consumed

### User Story 15.1 — Explain decisions

As the merchant, I want to understand why an order is being refunded so that the automation is auditable.

#### Acceptance criteria

At least one order detail/refund item should show an explanation such as:

```text
Eligible

✓ Same SKU
✓ Purchased 3 days ago
✓ Within 7-day protection
✓ Public promotion
✓ No previous price adjustment
```

Do not expose chain-of-thought. Show concise business-rule explanations only.

---

## 16. Real PayPal Sandbox Refund Execution

### Core MVP requirement

The target demo should execute **10 actual partial refunds through PayPal Sandbox**, one for each protected order.

Default refund:

```text
$1,000 original capture
$150 partial refund
```

Total:

```text
10 × $150 = $1,500
```

### User Story 16.1 — See live refund progress

As the merchant, I want to see PayZap processing refunds so that I understand the automation is actually executing.

#### Acceptance criteria

UI shows progress such as:

```text
1 / 10  ✓ $150 refunded
2 / 10  ✓ $150 refunded
3 / 10  Processing
4 / 10  Queued
...
```

Final successful state:

- 10 / 10 completed
- total refunded: $1,500
- protected GMV: $10,000
- PayPal Sandbox identified clearly
- no manual claim required

### User Story 16.2 — Partial failure is visible

If one refund fails:

- campaign screen must not falsely report 10/10 completed
- failed item displays Failed/Retryable status
- successful refunds remain successful
- total refunded reflects actual completed refunds
- user can retry an eligible failed refund
- retry must not duplicate already successful refunds

### User Story 16.3 — Watch the Sandbox calls

As a presenter, I want a read-only window of the PayPal Sandbox requests so that the audience can see the ten payments and the later refunds without leaving the demo.

#### Acceptance criteria

- A Sandbox control sits at the bottom-right corner on every screen.
- Opening it shows the calls for this session only.
- Generating the demo lists the ten $1,000 sales, including the order that belongs to this session.
- Launching the campaign appends each partial refund as it is sent.
- The window cannot start a payment, a refund, or any other PayPal call.
- Cards, access tokens, and request bodies are not shown.
- Sales that were already completed before the scanner existed are labeled as earlier Sandbox history.
- Preview mode says the call was not sent to PayPal.

---

## 17. Merchant Orders After Refunds

### User Story 17.1 — See PayZap reflected in normal operations

As the merchant, I want the normal Orders section to reflect PayZap actions so that PayZap does not feel like an isolated dashboard.

#### Acceptance criteria

After successful refund, applicable orders display:

- original payment: $1,000
- price adjustment: -$150
- effective price: $850
- PayPal refund status: Completed
- refund identifier/reference when available

The primary demo buyer's order must show the new state.

---

## 18. Buyer Experience — After Refund

### User Story 18.1 — Receive refund notification

As the buyer, I want to immediately understand that I saved money automatically.

#### Acceptance criteria

When switching back to Buyer after the campaign, show a prominent notification:

```text
You got $150 back

The price of your Aster Nova Pro changed
from $1,000 to $850.

Your price protection was automatically applied.

$150 refunded through PayPal.
```

### User Story 18.2 — Order history reflects adjustment

Buyer Order Detail must now show:

```text
Original price          $1,000
Price adjustment         -$150
Final effective price     $850
```

Payment history:

```text
✓ $1,000 paid through PayPal
✓ $150 refunded through PayPal
```

Closing product message:

> **No forms. No support ticket. No claim.**

This is the final buyer-facing emotional payoff of the demo.

---

## 19. Wow Moment

The primary wow moment is not merely the PayPal refund.

It is the full transition:

```text
Merchant intention
      ↓
AI detects hidden financial exposure
      ↓
AI recommends a safer campaign price
      ↓
Merchant approves
      ↓
Price changes
      ↓
10 customer guarantees evaluated
      ↓
10 real PayPal Sandbox partial refunds
      ↓
Merchant orders update
      ↓
Buyer automatically sees $150 returned
```

The judge should be able to summarize the product after the demo as:

> "PayZap tells merchants what a price drop will cost them before they launch it, then automatically honors their price guarantees through PayPal."

If a feature does not strengthen this story, it is not essential for the MVP.

---

## 20. Demo Session Lifecycle

### User Story 20.1 — Isolated sessions

As a judge, I want my demo actions isolated from other visitors.

#### Acceptance criteria

- Every generated demo gets a unique session.
- Buyer and merchant see only that session's state.
- Product/campaign/order UI changes inside one session do not affect another session.
- Session includes expiration timestamp.

### User Story 20.2 — Session expiry

After approximately 30 minutes:

- session is marked expired
- user cannot execute new refunds
- temporary app state can be deleted
- any already executed PayPal Sandbox refunds remain historical and are not reversed
- consumed PayPal transaction batch remains consumed

If the user attempts an action after expiry, they should be prompted to generate a fresh demo.

---

## 21. Reset Behavior

The product must distinguish **local scenario reset** from **PayPal financial history**.

A PayPal refund is not rolled back.

### Reset Scenario

May restore:

- product price to $1,000
- stock to seed value
- campaign to none
- AI analysis state
- UI notifications
- local campaign/refund simulation state when no live refund has been executed

### Fresh Live Run

For a new real-refund run:

- create/reset local demo state
- assign a fresh unused PayPal Sandbox batch
- bind 10 capture IDs to the 10 orders
- mark previous batch as consumed
- never reuse already-refunded captures as if they were new

### Acceptance criteria

The reset UI must not imply that PayPal refunds themselves were reversed.

---

## 22. PayPal Sandbox Batch Model

Each batch represents:

- 10 completed PayPal Sandbox captures
- each capture corresponds to a $1,000 purchase
- each capture is unused for the PayZap refund scenario
- batch status: Ready, Reserved, Consumed, Invalid

**Generate Live Demo** and **Fresh live run** open those ten captures themselves when Sandbox credentials are present and `PAYPAL_MODE` is not `live`. Automatic provisioning never runs against the live PayPal API. The running app does not read `PAYPAL_CAPTURE_IDS`.

A manual import remains available for captures that already exist: `npm run seed:paypal` reads `PAYPAL_CAPTURE_IDS` from the shell, and `npm run seed:demo-batches` reads `data/paypal-captures.json`.

When a live demo is generated:

1. reuse a Ready batch of real captures, or open ten new Sandbox sales
2. reserve that batch for this session
3. associate its 10 captures with the session's 10 protected orders
4. prevent other sessions from using the same batch
5. mark it Consumed after refunds begin or after a fresh live run replaces it

If Sandbox credentials are missing or PayPal rejects the captures, the session stays in preview. Preview refunds are simulated and labeled as such. PayZap does not describe a simulated refund as a completed PayPal refund.

---

## 23. Error and Edge Cases

### No PayPal batch available

Show:

> Live PayPal Sandbox capacity is temporarily unavailable.

The visitor may still explore a non-financial preview only if clearly labeled as such.

### PayPal refund fails

- preserve successful refunds
- identify the failed order
- expose retry
- use idempotent behavior
- do not double-refund successful orders

### Campaign box is used for something else

Reject the text before calling a model. Tell the visitor that PayZap only reads a sale price and a refund budget. Do not answer the unrelated request.

### AI response is malformed

The application must not break.

- validate extracted campaign intent
- fall back to deterministic input/defaults or ask user to edit
- never launch a campaign based on invalid AI output

### Proposed price is not lower

If proposed price >= current price:

- show that no price-protection liability is created
- do not trigger refunds

### No eligible orders

Show:

```text
0 protected purchases affected
Expected refund exposure: $0
```

Campaign may still be launched.

### Proposed campaign has no refund budget

PayZap may calculate exposure without a price recommendation.

### Visitor refreshes page

As long as the session is valid:

- role
- campaign state
- refund status
- product price
- notifications

must reload from persisted session state.

### Repeated Launch click

Must not create duplicate refunds or duplicate campaign execution.

### Buyer opens page while refunds are in progress

Display a neutral pending state until completed rather than falsely claiming funds were returned.

---

## 24. What We Are Building

MVP includes:

1. Public demo landing
2. Generate temporary demo session
3. Temporary buyer and merchant personas
4. Quick role switching
5. Fictional Aster store
6. Buyer Orders
7. Buyer Order Detail
8. Merchant Overview
9. Merchant Products
10. Merchant Orders
11. PayZap dashboard
12. Natural-language campaign request
13. Campaign intent extraction
14. Refund-exposure simulation
15. Budget-safe price recommendation
16. Explicit merchant approval
17. Product price update
18. Protection eligibility evaluation
19. Refund execution progress
20. 10 real partial PayPal Sandbox refunds
21. Merchant order-state synchronization
22. Buyer refund notification
23. Buyer order-price adjustment
24. Session expiry
25. Scenario reset
26. Fresh live-run / fresh PayPal batch handling
27. Automatic Sandbox captures when a live demo starts
28. Checkout product page that shows the live price
29. Campaign-box guardrails for a public demo
30. DeepSeek Flash or GPT-6 Luna for intent only, with a deterministic fallback
31. Read-only Sandbox request scanner

---

## 25. Non-Goals for Hackathon MVP

Do **not** build these unless the core demo is already complete and stable:

- complete ecommerce storefront
- real customer signup
- real merchant onboarding
- production payment processing
- production PayPal credentials
- support for arbitrary external merchants
- Amazon/eBay/Best Buy integrations
- web scraping
- competitor-price monitoring
- dynamic inventory optimization
- shipping/logistics
- returns workflow
- disputes/chargebacks automation
- multi-currency accounting
- tax calculations
- coupon engine
- membership pricing
- large analytics suite
- complex RBAC
- mobile application
- real email/SMS delivery
- multiple products/campaign types
- marketplace architecture
- multi-agent system
- autonomous campaign launch without merchant confirmation

The hackathon product wins by making one workflow excellent, not by pretending to be a full commerce platform.

---

## 26. What We Would Add With More Time

Possible post-MVP directions:

### Merchant policy engine

Allow merchants to describe policies such as:

> Protect purchases for 14 days. Exclude clearance. Auto-refund up to $50 per order. Require approval above that.

### Multiple promotion types

- scheduled sales
- inventory markdowns
- seasonal promotions
- public catalog reductions

### Approval thresholds

Automatically execute smaller refunds while routing large adjustments to a human.

### Product portfolio simulation

Analyze price-change exposure across many SKUs.

### Profit-aware recommendation

Combine refund exposure, margin, inventory, and conversion objectives.

### External commerce integrations

Connect PayZap to existing ecommerce platforms.

### Customer retention analytics

Measure:

- protected conversion
- price-protection usage
- refunds avoided via recommended pricing
- support tickets avoided
- return-and-rebuy behavior
- retention/repeat purchase impact

---

## 27. Submission Proof Points

The finished product should make the following evidence easy to capture in the demo video and Devpost submission.

### PayPal depth

- purchases represented by real PayPal Sandbox captures
- partial refunds executed through PayPal Sandbox
- PayPal refund states visible in the application
- transaction/refund identifiers available for verification
- a read-only scanner can show the ten sales and the refunds for the current session

### AI depth

- merchant provides natural-language business intent
- PayZap extracts campaign target and financial constraint
- PayZap evaluates the consequence of that intent
- PayZap produces an actionable recommendation with an explanation
- deterministic financial calculations remain auditable rather than being delegated blindly to an LLM

### Product completeness

- buyer and merchant experiences are connected
- merchant decision changes store state
- PayZap action changes order/payment state
- buyer sees the outcome
- public demo can be reset/re-created

### Demo story

The demo must be possible without creating data manually or modifying a database.

The intended presentation flow:

1. Generate demo
2. Enter Buyer
3. View $1,000 protected order
4. Switch to Merchant
5. Inspect $10,000 protected GMV
6. Open PayZap
7. Ask for $800 promotion with $1,500 refund cap
8. See $2,000 risk
9. Accept $850 recommendation
10. Launch campaign
11. Watch 10 × $150 PayPal Sandbox refunds
12. Inspect refunded merchant order
13. Switch to Buyer
14. See $150 refund notification and updated final price

---

## 28. UX Requirements

### The demo must feel fast

Avoid:

- long onboarding
- multi-step configuration wizards
- mandatory manual login
- technical API terminology in main user paths
- waiting for the judge to understand what to click

### Roles must be visually distinct

Buyer should feel like the Aster store after a purchase.

Merchant should feel like a PayPal Business account.

PayZap should feel like one product inside that account, not a separate dashboard with its own chrome.

### Financial numbers must be visually prominent

The three numbers that matter most:

```text
$10,000 protected GMV
$2,000 unsafe exposure
$1,500 optimized/refunded
```

### Live execution must be legible

Do not hide the PayPal work behind one spinner.

Show progress order-by-order.

---

## 29. Trust and Safety UX

Because PayZap triggers financial actions:

- merchant explicitly approves campaign launch
- PayZap explains why a proposed campaign is unsafe
- recommendation is advisory until approved
- refund eligibility is explainable
- PayPal Sandbox label is always discoverable
- failed refunds are not hidden
- duplicate execution is prevented
- session expiration prevents stale financial actions
- the campaign box refuses prompts that are not a short price-and-budget sentence
- the Sandbox scanner is read-only and cannot send a payment

AI must not directly invent refund amounts.

Refund amounts come from validated order/product data and deterministic calculations.

---

## 30. Product Success Criteria for the Hackathon

The MVP is considered ready when a fresh visitor can complete the following without developer assistance:

- generate a demo
- view the buyer's protected $1,000 order
- switch to merchant
- propose the $800 promotion
- understand why it creates $2,000 refund exposure
- receive the $850 recommendation
- approve the campaign
- see product price become $850
- observe all 10 refund jobs
- verify successful PayPal Sandbox refunds
- inspect one adjusted merchant order
- switch to buyer
- see the $150 refund notification
- see the order's final effective price of $850

The entire core journey should be understandable in approximately **90 seconds** when demonstrated by someone familiar with the product.

---

## 31. Golden Demo Dataset

Unless intentionally changed later, coding agents should preserve this dataset because the narrative and calculations depend on it.

```text
Store: Aster
Product: Aster Nova Pro
Original price: $1,000
Protected orders: 10
Purchase price per order: $1,000
Protected GMV: $10,000
Protection window: 7 days

Merchant requested promotional price: $800
Merchant maximum refund budget: $1,500

Exposure at $800:
$200 × 10 = $2,000

PayZap recommended price:
$850

Exposure at $850:
$150 × 10 = $1,500

Expected live refunds:
10

Expected refund per order:
$150

Expected total refunded:
$1,500
```

At least one of these 10 orders belongs to the generated Buyer persona.

---

## 32. Implementation Handoff Notes for Coding Agents

This PRD defines product behavior, not a mandatory framework.

When implementing, optimize for:

1. deterministic demo reliability
2. clear role/state synchronization
3. real PayPal Sandbox evidence
4. idempotent refund execution
5. repeatable ephemeral demo sessions
6. low friction for judges
7. fast reset/fresh-run behavior

Do not expand scope without a clear reason tied to the core demo.

When forced to choose between:

- building another ecommerce feature, or
- making the PayZap → PayPal → merchant → buyer loop more reliable,

always prioritize the second.

The central invariant is:

> **A merchant decision must result in a verifiable PayPal Sandbox financial action that is then visible from both merchant and buyer perspectives.**

