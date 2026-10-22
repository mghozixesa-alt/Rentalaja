import { NextResponse, type NextRequest } from "next/server";
import { konteksKeuangan, bulanIni, tglValid } from "@/lib/keuangan";
import { ambilLaporan } from "@/lib/laporan";

export const dynamic = "force-dynamic";

/** Unduh laporan sebagai CSV (dibuka langsung di Excel, pemisah titik koma). */
export async function GET(req: NextRequest) {
  const { supabase } = await konteksKeuangan();
  const sp = req.nextUrl.searchParams;
  const b = bulanIni();
  const uuid = (v: string | null) => (v && /^[0-9a-f-]{36}$/.test(v) ? v : null);
  const lap = await ambilLaporan(supabase, {
    r: sp.get("r") ?? "laba-rugi", dari: tglValid(sp.get("dari") ?? undefined, b.dari), sampai: tglValid(sp.get("sampai") ?? undefined, b.sampai),
    cabang: uuid(sp.get("cabang")), akun: uuid(sp.get("akun")),
  });
  const esc = (v: string | number) => {
    const s = String(v);
    const aman = /^[=+\-@]/.test(s) && typeof v !== "number" ? `'${s}` : s;   // cegah formula injection di Excel
    return /[;"\n]/.test(aman) ? `"${aman.replace(/"/g, '""')}"` : aman;
  };
  const csv = [[lap.judul], lap.kolom, ...lap.baris.map((x) => x.sel)].map((r) => r.map(esc).join(";")).join("\r\n");
  return new NextResponse("﻿" + csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="rentalaja-${(sp.get("r") ?? "laporan").replace(/[^a-z-]/g, "")}.csv"`, "Cache-Control": "no-store" },
  });
}
