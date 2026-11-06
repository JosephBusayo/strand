import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// prepare: false is required by Supabase's transaction pooler.
const connection = postgres(process.env.DATABASE_URL ?? "", { prepare: false });

export const db = drizzle(connection, { schema });
