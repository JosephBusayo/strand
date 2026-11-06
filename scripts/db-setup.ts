// Locks public tables to the app's own role and checks the database and storage setup.
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });
  await sql`alter table conversations add column if not exists ui_messages jsonb not null default '[]'::jsonb`;

  const tables = await sql<{ tablename: string }[]>`
    select tablename from pg_tables where schemaname = 'public' order by tablename`;

  for (const { tablename } of tables) {
    await sql`alter table ${sql(tablename)} enable row level security`;
  }

  const status = await sql`
    select c.relname as name, c.relrowsecurity as rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' order by c.relname`;
  console.table(status.map((t) => ({ table: t.name, rls: t.rls })));
  await sql.end();

  const supabase = createClient(
    process.env.SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  );
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "acag";
  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(`Storage: ${listError.message}`);

  if (existing.some((b) => b.name === bucket)) {
    console.log(`Bucket ${bucket}: already exists`);
  } else {
    const { error } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    if (error) throw new Error(`Storage: ${error.message}`);
    console.log(`Bucket ${bucket}: created`);
  }
}

main().catch((error: Error) => {
  console.error("Failed:", error.message);
  process.exit(1);
});
