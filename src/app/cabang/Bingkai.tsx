import Link from "next/link";
import type { ReactNode } from "react";
import { PanelShell } from "@/components/PanelShell";
import { Pesan } from "@/components/ui";
import { konteksCabang, menuCabang } from "@/lib/panel";

export type SPCabang = { c?: string; galat?: string; ok?: string; denda?: string };

/** Bingkai halaman panel cabang: sidebar, pemilih cabang (owner), pesan hasil aksi. */
export async function Bingkai({ sp, aktif, judul, sub, children }: { sp: SPCabang; aktif: string; judul: string; sub?: string; children: (k: Awaited<ReturnType<typeof konteksCabang>> & { q: string }) => Promise<ReactNode> | ReactNode }) {
  const k = await konteksCabang(sp.c);
  const q = k.staf.cabang_id ? "" : `?c=${k.cabang.kode}`;
  const [ver, qc] = await Promise.all([
    k.supabase.from("booking").select("id", { count: "exact", head: true }).eq("cabang_id", k.cabang.id).eq("status", "menunggu_verifikasi"),
    k.supabase.from("unit").select("id", { count: "exact", head: true }).eq("cabang_id", k.cabang.id).eq("status", "qc"),
  ]);
  const isi = await children({ ...k, q });
  return (
    <PanelShell menu={menuCabang(q, { verifikasi: ver.count ?? 0, qc: qc.count ?? 0 })} aktif={`${aktif}${q}`} nama={k.staf.nama} peran={k.staf.peran}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-teal-tua">Cabang {k.cabang.nama}</div>
          <h1 className="text-[26px] font-extrabold leading-8">{judul}</h1>
          {sub ? <p className="text-sm text-abu">{sub}</p> : null}
        </div>
        {!k.staf.cabang_id ? (
          <nav aria-label="Pilih cabang" className="flex flex-wrap gap-2">
            {k.daftar.map((c) => (
              <Link key={c.id} href={`${aktif}?c=${c.kode}`} className={`rounded-full border px-3 py-1.5 text-sm font-bold no-underline ${c.id === k.cabang.id ? "border-navy bg-teal-muda" : "border-abu-input bg-white"}`}>{c.nama}</Link>
            ))}
          </nav>
        ) : null}
      </header>
      {sp.galat ? <Pesan nada="buruk">{sp.galat}</Pesan> : null}
      {sp.ok ? <Pesan nada="baik">Tersimpan.{sp.denda ? ` Denda keterlambatan Rp${Number(sp.denda).toLocaleString("id-ID")} ditagihkan ke pelanggan.` : ""}</Pesan> : null}
      {isi}
    </PanelShell>
  );
}
