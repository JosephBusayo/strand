"use client";

import { ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Chip } from "@/components/ui/primitives";

type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  options: { name: string; values: string[] }[];
  isAvailable: boolean;
};

type OrderSummary = {
  orderId: string;
  orderReference: string;
  productName: string;
  imageUrl: string;
  options: Record<string, string>;
  quantity: number;
  subtotalCents: number;
  discountCents: number;
  deliveryCents: number;
  totalCents: number;
};

type ToolPart = { type: string; state?: string; output?: unknown };

const money = (amountCents: number) => `$${(amountCents / 100).toFixed(2)}`;

export function ToolResult({
  part,
  slug,
  said,
  onChoose,
}: {
  part: ToolPart;
  slug: string;
  said: Set<string>;
  onChoose: (text: string) => void;
}) {
  if (part.state !== "output-available") return null;
  const output = part.output as Record<string, never>;

  switch (part.type) {
    case "tool-search_catalogue": {
      const products = (output.products ?? []) as Product[];
      return <ProductRow products={products} onChoose={onChoose} />;
    }
    case "tool-match_uploaded_image": {
      const matches = (output.matches ?? []) as { product: Product }[];
      return (
        <ProductRow
          products={matches.map((m) => m.product)}
          onChoose={onChoose}
          actionLabel={(p) => `Yes, it's the ${p.name}`}
        />
      );
    }
    case "tool-get_product_options": {
      const product = output as unknown as Product;
      if (!product.options?.length) return null;
      return (
        <div className="space-y-3">
          {product.options.map((option) => (
            <div key={option.name}>
              <p className="mb-1.5 text-xs font-medium text-ink-2">{option.name}</p>
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => {
                  const choice = `${option.name} ${value}`;
                  return (
                    <Chip
                      key={value}
                      selected={said.has(choice)}
                      onClick={() => onChoose(choice)}
                      className="min-w-11"
                    >
                      {value}
                    </Chip>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case "tool-create_order_draft": {
      if ("error" in output) return null;
      return <OrderCard order={output as unknown as OrderSummary} slug={slug} />;
    }
    default:
      return null;
  }
}

function ProductRow({
  products,
  onChoose,
  actionLabel,
}: {
  products: Product[];
  onChoose: (text: string) => void;
  actionLabel?: (product: Product) => string;
}) {
  if (!products.length) return null;
  return (
    <div className="flex w-full snap-x gap-3 overflow-x-auto pb-2">
      {products.map((product) => (
        <button
          key={product.id}
          disabled={!product.isAvailable}
          onClick={() => onChoose(actionLabel?.(product) ?? `I'm interested in the ${product.name}`)}
          className="w-44 shrink-0 snap-start overflow-hidden rounded-card bg-surface-raised text-left shadow-raised transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={352}
            height={264}
            className="aspect-[4/3] w-full object-cover"
          />
          <span className="block p-3">
            <span className="block text-sm font-medium">{product.name}</span>
            <span className="block text-sm text-ink-2">{money(product.priceCents)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function OrderCard({ order, slug }: { order: OrderSummary; slug: string }) {
  const [state, setState] = useState<"idle" | "starting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function pay() {
    setState("starting");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, orderId: order.orderId }),
    });
    const body = await res.json();
    if (res.ok && body.approveUrl) {
      window.location.assign(body.approveUrl);
      return;
    }
    setMessage(body.error ?? "PayPal could not start the payment.");
    setState("error");
  }

  const option = Object.entries(order.options);
  return (
    <div className="w-full max-w-sm rounded-card bg-surface-raised p-4 shadow-raised">
      <div className="flex items-center justify-between">
        <h2 className="text-base">Order summary</h2>
        <Badge>{order.orderReference}</Badge>
      </div>
      <div className="mt-3 flex gap-3">
        <Image
          src={order.imageUrl}
          alt={order.productName}
          width={128}
          height={128}
          className="size-16 rounded-chip object-cover"
        />
        <div className="text-sm">
          <p className="font-medium">{order.productName}</p>
          <p className="text-ink-2">
            {option.map(([name, value]) => `${name} ${value}`).join(", ")}
            {option.length > 0 && " · "}Qty {order.quantity}
          </p>
        </div>
      </div>
      <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
        <Row label="Items" value={money(order.subtotalCents)} />
        {order.discountCents > 0 && (
          <Row label="Agreed discount" value={`-${money(order.discountCents)}`} />
        )}
        <Row label="Delivery" value={money(order.deliveryCents)} />
      </dl>
      <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-sm font-medium">Total</span>
        <span className="font-display text-2xl">
          {money(order.totalCents)} <span className="text-sm text-ink-2">USD</span>
        </span>
      </div>
      <Button
        className="mt-4 w-full"
        onClick={pay}
        disabled={state === "starting"}
      >
        {state === "starting" ? "Opening PayPal" : "Pay with PayPal"}
      </Button>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-2">
        <ShieldCheck className="size-3.5" strokeWidth={1.5} aria-hidden />
        Secure checkout with PayPal Sandbox. No real money moves.
      </p>
      {state === "error" && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {message}
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-2">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
