import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/primitives";
import { enterDemo } from "../actions";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link href="/" aria-label="Acag home" className="mb-8">
        <Logo />
      </Link>
      <Card raised className="w-full max-w-md space-y-4 p-6">
        <Eyebrow>Seller dashboard</Eyebrow>
        <h1 className="text-display-sm">
          Tenth Lane <em className="font-normal text-ink-3">demo shop</em>
        </h1>
        <p className="text-sm text-ink-2">
          This prototype uses one demo seller and one PayPal Sandbox merchant account, with no
          password needed. Changes you make are visible to anyone testing the demo.
        </p>
        <form action={enterDemo}>
          <Button type="submit" className="w-full">
            Enter the dashboard
          </Button>
        </form>
      </Card>
    </main>
  );
}
