import { Camera, CreditCard, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Card, Eyebrow } from "@/components/ui/primitives";

const steps = [
  { icon: Camera, title: "Screenshot", text: "Send a product photo from any post." },
  {
    icon: MessagesSquare,
    title: "Chat & confirm",
    text: "The assistant finds it, confirms options and can haggle.",
  },
  {
    icon: CreditCard,
    title: "Pay with PayPal",
    text: "The order is marked Paid only after server verification.",
  },
];

const credentials = [
  { label: "Email", value: process.env.DEMO_SANDBOX_BUYER_EMAIL ?? "" },
  { label: "Password", value: process.env.DEMO_SANDBOX_BUYER_PASSWORD ?? "" },
];

export default function DemoHub() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 md:px-10">
          <Link href="/" aria-label="Acag home">
            <Logo />
          </Link>
          <div className="flex items-center gap-1 text-sm">
            <Link href="/s/tenth-lane" className="hidden rounded-chip px-3 py-2 hover:bg-surface sm:block">
              Try the shop
            </Link>
            <Link href="/dashboard" className="rounded-chip px-3 py-2 hover:bg-surface">
              Seller dashboard
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-10 md:px-10 md:pt-12">
        <section className="max-w-3xl">
          <Eyebrow className="mb-3">AI commerce agent for social sellers</Eyebrow>
          <h1 className="text-display-sm md:text-display">
            From &ldquo;how much?&rdquo;{" "}
            <em className="font-normal text-ink-3">to a paid order, in one chat.</em>
          </h1>
          <p className="mt-3 max-w-xl text-ink-2">
            Acag turns product questions and social-media screenshots into confirmed PayPal
            orders.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/s/tenth-lane">Try the buyer experience</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              Open the seller dashboard
            </ButtonLink>
          </div>
        </section>

        <ol className="mt-8 grid gap-3 md:mt-10 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <li key={title}>
              <Card className="flex h-full gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-chip bg-surface-raised text-accent">
                  <Icon className="size-5" strokeWidth={1.5} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-accent">Step {index + 1}</p>
                  <h2 className="mt-0.5 text-lg">{title}</h2>
                  <p className="mt-1 text-sm text-ink-2">{text}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>

        <section className="mt-3 grid gap-3 md:grid-cols-2">
          <Card raised>
            <h2 className="text-lg">How to test</h2>
            <p className="mt-1 text-sm text-ink-2">
              Payments use PayPal Sandbox, so no real money moves. Log in at checkout with:
            </p>
            <dl className="mt-2 divide-y divide-line text-sm">
              {credentials.map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <dt className="w-20 shrink-0 text-ink-2">{label}</dt>
                  <dd className="min-w-0 flex-1 font-medium break-all">{value}</dd>
                  <CopyButton value={value} label={label.toLowerCase()} />
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <h2 className="text-lg">What does what</h2>
            <p className="mt-1 text-sm text-ink-2">
              AI matches screenshots to the catalogue and handles the conversation. The server
              sets every price and enforces the seller&apos;s private minimum. PayPal handles
              checkout, and payment status comes only from verified capture data.
            </p>
          </Card>
        </section>
      </main>
    </>
  );
}
