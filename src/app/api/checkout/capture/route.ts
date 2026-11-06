import { z } from "zod";
import { confirmPayment } from "@/server/payments/service";

const body = z.object({ token: z.string().min(1).max(64) });

// Holding a PayPal token proves nothing. confirmPayment asks PayPal and decides from its answer.
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  try {
    const order = await confirmPayment(parsed.data.token);
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
    return Response.json({
      paymentStatus: order.paymentStatus,
      orderReference: order.orderReference,
      totalCents: order.totalCents,
    });
  } catch {
    return Response.json(
      { error: "We could not confirm this payment with PayPal yet." },
      { status: 502 },
    );
  }
}
