# Tools, services and prior work

## Prior work

Strand was started from the author's own earlier project, Acag, built for the PayPal AI
hackathon (https://github.com/JosephBusayo/acag). The following came from Acag and were then
adapted:

- the streaming chat and image upload
- PayPal order, capture and webhook verification
- the tiered haggling engine
- the dashboard shell and design tokens

New for Strand:

- styles with gallery photos
- length and option pricing
- opening hours and slot availability
- holds with advisory locking
- deposit or full payment
- the booking diary, completed and no-show actions
- the hairstyle matching prompt
- all salon copy

## Services

| What | Used for |
| --- | --- |
| Google Gemini (AI Studio free tier) | Chat and screenshot matching. Flash-Lite is the primary model, with Flash as the backup when the free quota runs out |
| PayPal Orders v2, Sandbox | Deposit and full-payment checkout, capture, webhook verification |
| Supabase | Postgres database and public image storage |
| Render | Hosting |

## Libraries

Next.js 16, React 19, Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/react`), Drizzle ORM, postgres.js,
Zod, sharp, Tailwind CSS v4, lucide-react, Vitest, tsx.

## AI assistance

The code was written with help from Claude Code (Anthropic).

## Photos

Demo portfolio photos and sample screenshots are from Pexels, used under the Pexels licence.
The photographer link for each file is in `demo-assets/sources.txt`.
