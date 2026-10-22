import Link from "next/link";
import type { ReactNode } from "react";
import { PanelShell } from "@/components/PanelShell";
import { Pesan } from "@/components/ui";
import { konteksKeuangan, menuKeuangan } from "@/lib/keuangan";

export type SPKeu = Record<string, string | undefined>;
export const JENIS_UANG = ["pembelian", "biaya", "kirim_uang", "jurnal_manual"];

/** Bingkai halaman Panel Keuangan: sidebar gaya Jurnal, judul, tombol kanan, pesan hasil aksi. */
export async function Bingkai({ sp, aktif, judul, sub, kanan, children }: {
  sp: SPKeu; aktif: string; judul: string; sub?: string; kanan?: ReactNode;
  children: (k: Awaited<ReturnType<typeof konteksKeuangan>>) => Promise<ReactNode> | ReactNode;
}) {
  const k = await konteksKeuangan();
  const { count } = await k.supabase.from("persetujuan").select("id", { count: "exact", head: true }).eq("status", "menunggu").in("jenis", JENIS_UANG);
  const isi = await children(k);
  return (
    <PanelShell menu={menuKeuangan({ setuju: count ?? 0 })} aktif={aktif} nama={k.staf.nama} peran={k.staf.peran}>
      <div className="rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white">Panel Keuangan · area terbatas owner dan keuangan · 2FA · <Link href="/" className="text-teal underline">kembali ke situs</Link></div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-3xl">
          <h1 className="text-[26px] font-extrabold leading-8">{judul}</h1>
          {sub ? <p className="text-sm text-abu">{sub}</p> : null}
        </div>
        {kanan ? <div className="flex flex-wrap gap-2">{kanan}</div> : null}
      </header>
      {sp.galat ? <Pesan nada="buruk">{sp.galat}</Pesan> : null}
      {sp.ok ? <Pesan nada="baik">{sp.ok === "1" ? "Tersimpan." : sp.ok}</Pesan> : null}
      {isi}
    </PanelShell>
  );
}

/** Tabel sederhana dengan kolom grid. */
export function Tabel({ kolom, kepala, children, kanan = [] }: { kolom: string; kepala: string[]; children: ReactNode; kanan?: number[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid gap-2.5 border-b border-abu-garis pb-1.5 text-xs font-bold text-abu" style={{ gridTemplateColumns: kolom }}>
          {kepala.map((h, i) => <span key={h + i} className={kanan.includes(i) ? "text-right" : ""}>{h}</span>)}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Baris({ kolom, children, aktif }: { kolom: string; children: ReactNode; aktif?: boolean }) {
  return <div className={`grid items-center gap-2.5 border-b border-abu-garis py-2.5 text-sm ${aktif ? "bg-teal-muda" : ""}`} style={{ gridTemplateColumns: kolom }}>{children}</div>;
}

export function Ringkas({ item }: { item: [string, string, string?][] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {item.map(([l, v, s]) => (
        <div key={l} className="rounded-kartu border border-abu-garis bg-white p-4">
          <div className="text-[13px] font-bold text-abu">{l}</div>
          <div className="text-2xl font-extrabold">{v}</div>
          {s ? <div className="text-xs text-abu">{s}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function Tab({ item, aktif }: { item: [string, string][]; aktif: string }) {
  return (
    <nav aria-label="Tab" className="flex flex-wrap gap-2">
      {item.map(([href, l]) => (
        <Link key={href} href={href} aria-current={aktif === href ? "page" : undefined}
          className={`rounded-lg border px-3 py-1.5 text-sm font-bold no-underline ${aktif === href ? "border-navy bg-teal-muda" : "border-abu-input bg-white"}`}>{l}</Link>
      ))}
    </nav>
  );
}
