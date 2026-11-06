# Strand

An AI booking assistant for hair stylists. A client sends a screenshot of a style they saw on
Instagram or TikTok, or just describes it. Strand shows the matching styles from the stylist's
portfolio, asks the questions that style needs (length in inches, braid size, hair included),
quotes the price, haggles within the stylist's private limit, offers free times and books the
slot only once the client pays a 30% deposit or the full price through PayPal.

- Live demo: add the Render URL here after deploying
- Client chat: `/s/crown-and-coil`
- Stylist dashboard: `/dashboard`

## Why stylists

Most independent stylists take bookings in their DMs. They answer "how much for this?" many
times a day, and the price depends on length and size, so it's never one number. Clients haggle,
and no-shows cost a stylist a whole afternoon. Strand answers those messages from the stylist's
own price list, and only a paid deposit puts a client in the diary.

## How it works

1. **Find the style.** Gemini compares the client's screenshot with the stylist's portfolio
   photos (two per style) and returns up to three styles. Typed descriptions such as "twists for
   a guy" are searched by name, description and men's or women's styles.
2. **Price it.** The server works out every price: for example $10 an inch, so 3 inches is $30
   and 7 inches is $70, plus or minus option prices such as small braids. The model never does
   the maths.
3. **Haggle.** Each style has a private maximum discount (15% lets $70 come down to $60). The
   server decides every counter-offer. Lowballs are told they're way too low and the price comes
   down slowly. Close offers are met. Persistent offers get "this is the lowest I can go". The
   floor never reaches the model or the browser.
4. **Book.** Opening hours are set per weekday. Free time is offered in one-hour slots, and a
   start time is only offered if the whole appointment fits before closing and around other
   bookings. Choosing a time places a 15-minute hold, and a Postgres advisory lock stops two
   clients holding the same slot.
5. **Pay.** The client picks the 30% deposit or full payment. PayPal Sandbox charges that
   amount, and the booking is confirmed only after the server captures the payment and checks the
   amount, currency and booking id. A verified webhook can confirm it too. Unpaid holds expire
   and never reach the stylist's diary.
6. **Run the day.** The dashboard shows a diary of paid bookings with the deposit paid and the
   balance due. The stylist can mark a booking completed, a no-show (the deposit stays) or
   cancelled. They can also edit styles, prices and opening hours.

## Stack

Next.js 16 (App Router), Vercel AI SDK with Gemini, Supabase Postgres and Storage via Drizzle,
PayPal Orders v2 (Sandbox), Tailwind CSS v4, Vitest. Hosted on Render.

## Run it locally

```bash
cp .env.example .env.local   # then fill in your own keys
npm install
npm run db:push              # create tables
npm run db:setup             # lock tables with RLS and create the storage bucket
npm run db:seed              # demo salon, nine styles, a few paid bookings
npx tsx scripts/make-samples.ts
npm run dev
```

Useful checks: `npm test`, `npm run typecheck`, `npm run lint`, `npm run match:check` (runs the
image matcher on every demo screenshot) and `npm run paypal:smoke`.

## Honest limits

- One disclosed PayPal Sandbox merchant account. Stylists don't connect their own PayPal yet, and
  no real money moves.
- The dashboard is a shared demo login, with no stylist accounts.
- Refunds for cancellations are done in PayPal, not in the app.
- If two clients pay for the same slot after a hold runs out, both payments are confirmed.
  Checkout re-checks the slot before PayPal opens, which makes this rare, but not impossible.

## Credits

Strand began as a copy of the author's own earlier hackathon project, Acag (an AI sales assistant
for social sellers), and reuses its chat, checkout and haggling foundations. See
[docs/TOOLS.md](docs/TOOLS.md). Demo photos are from [Pexels](https://www.pexels.com), credited
in [demo-assets/sources.txt](demo-assets/sources.txt).

MIT licence.
