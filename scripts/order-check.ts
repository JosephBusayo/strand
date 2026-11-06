// Prints the latest orders. Run: npx tsx --env-file=.env.local scripts/order-check.ts
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });
  const orders = await sql`
    select order_reference, payment_status, fulfilment_status, total_cents,
           paypal_order_id is not null as has_paypal_order,
           paypal_capture_id is not null as has_capture, buyer_email is not null as has_email
    from orders order by created_at desc limit 3`;
  console.table(orders);
  console.table(await sql`
    select event_type, verification_status, order_id is not null as has_order, processed_at
    from payment_events order by received_at desc limit 5`);
  await sql.end();
}

main();
