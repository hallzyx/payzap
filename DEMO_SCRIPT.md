# PayZap demo script

Target: under 3 minutes (Devpost video limit). Narrate in English. Every number below was produced by the app in preview mode; with PayPal Sandbox credentials the refund ids are real Sandbox ids.

## Before you record

- [ ] PayPal Sandbox credentials set, with **Advanced Credit and Debit Card Payments** enabled. Without them the session is in preview and refunds are labeled "Simulated".
- [ ] A model key set (`DEEPSEEK_API_KEY` or `OPENAI_API_KEY`). Without one, the badge on the policy panel reads "keyword parser", which weakens the AI story.
- [ ] One full rehearsal at the resolution you will record.
- [ ] Do not click fast. Limits per session: 4 policy compilations, 6 analyses, 3 seconds between calls.
- [ ] A session lasts 30 minutes and each take uses one batch of ten captures. For a new take use **Fresh live run**. Resetting never reverses PayPal refunds.
- [ ] No third-party logos or music in the recording.

## Script

| Time | Do | Say |
|---|---|---|
| 0:00 | Title card or the landing page, untouched | "Merchants promise price guarantees, but nobody can tell them what a price drop will cost until the refunds land." |
| 0:15 | Click **Generate Live Demo** and let the landing build | "PayZap opens ten real PayPal Sandbox payments for a demo store." |
| 0:30 | Buyer view: open the $1,000 order, show the protection block, then switch to Merchant | "This buyer is protected. They will not have to file anything." |
| 0:45 | PayZap page. Click **Example: vague policy**, then **Compile policy** | "The merchant pastes the policy they already publish. It is prose, with gaps." |
| 1:00 | Point at the **Read by** badge, a rule and its quote | "Each rule quotes the merchant's own words. If the quote is not in the text, the rule is dropped." |
| 1:10 | Answer the clarifying question. Show the two orders marked not covered (coupon TEAM20) | "Where the policy is silent, PayZap asks instead of guessing. Two coupon orders are out, and it says why." |
| 1:25 | Click **Analyze Impact** with the default sentence | "Now the campaign: $800, keep refunds under $1,500." |
| 1:35 | Show the risk card and the curve | "$800 would refund $1,600. That is $100 over budget. The numbers come from code, not from the model." |
| 1:50 | Click **Use $813**, then **Launch campaign** | "PayZap recommends $813. I approve, then launch. That is two explicit approvals before any money moves." |
| 2:00 | Refund run: orders complete one by one. Open the Sandbox scanner (bottom right) | "Eight partial refunds of $187. Each shows its PayPal refund id and the rule that allowed it." |
| 2:30 | Switch to Buyer: price-drop notice, $187 back, effective price $813 | "The buyer sees the money back. No forms. No support ticket. No claim." |
| 2:50 | Closing card | "PayZap tells merchants what a price drop will cost, then honors the guarantee through PayPal." |

## If you present live

Extra material for a longer slot:

- Expand a merchant order to show its timeline: capture, protection, eligibility with quotes, refund.
- Switch the example to **Example: clear policy** to show the no-question path.
- Show a failed refund and **Retry** (needs a forced failure, so only if rehearsed).
- Run once with no policy pasted to show the original numbers: $2,000 of risk, $850, ten refunds of $150.

## What to say if asked

- **"Could a regex do this?"** For the campaign sentence, yes, and the app falls back to one. The policy is the part a form does not cover: reading prose that already exists, quoting where each rule came from, and asking when something is missing. The model proposes rules from a closed schema; code validates and applies them.
- **"What if the model is wrong?"** It can only produce the three rule types, each rule must quote the merchant's text, and a wrong rule changes who is covered, never an amount. The merchant sees every rule and approves the price and the launch.
- **"Is this real money?"** No. It is PayPal Sandbox. In preview mode refunds are labeled as simulated and are never described as completed PayPal refunds.

## Numbers reference

| Policy | Orders covered | Risk at $800 | Recommended price | Refunds |
|---|---|---|---|---|
| Default (nothing pasted) | 10 of 10 | $2,000 | $850 | 10 x $150 = $1,500 |
| Example policies (coupon TEAM20 excluded) | 8 of 10 | $1,600 | $813 | 8 x $187 = $1,496 |
