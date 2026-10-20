import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Klien service role: melewati RLS. Hanya untuk webhook Xendit dan link sementara dokumen,
 * setelah peran pengguna dicek di server. Jangan pernah diimpor dari komponen "use client".
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diisi");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
