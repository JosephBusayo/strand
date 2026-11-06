import { ShieldCheck } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/primitives";
import { requireSellerShop } from "@/server/seller-session";
import { CopyLink } from "../copy-link";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const shop = await requireSellerShop();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Settings" title="Salon settings" action={<CopyLink path={`/s/${shop.slug}`} />} />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
        <SettingsForm
          name={shop.name}
          description={shop.description}
          address={shop.address}
          timezone={shop.timezone}
          depositPercent={shop.depositPercent}
          openingHours={shop.openingHours}
          policies={shop.policies}
          assistantInstructions={shop.assistantInstructions}
        />
        <Card className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg">
            <ShieldCheck className="size-5 text-accent" strokeWidth={1.5} aria-hidden />
            PayPal
          </h2>
          <p className="inline-flex rounded-chip bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
            Sandbox
          </p>
          <p className="text-sm text-ink-2">
            This prototype uses one disclosed demo merchant account, so no real money moves and
            stylists don&apos;t connect their own PayPal yet.
          </p>
        </Card>
      </div>
    </div>
  );
}
