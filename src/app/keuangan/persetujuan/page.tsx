import Link from "next/link";
import { Bingkai, JENIS_UANG, type SPKeu } from "../Bingkai";
import { putuskan } from "../actions";
import { JurnalEntry } from "../JurnalEntry";
import { Chip, Kartu, input, tombol, tombolBahaya } from "@/components/ui";
import { tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Persetujuan uang · Keuangan" };

type P = { id: string; jenis: string; referensi_tabel: string; referensi_id: string; ringkasan: string; status: string; dibuat_pada: string; diajukan_oleh: string | null;
  pengaju: { nama: string } | null; pemutus: { nama: string } | null; catatan: string | null };
const LABEL: Record<string, string> = { pembelian: "Pembelian", biaya: "Biaya", kirim_uang: "Kirim uang", jurnal_manual: "Jurnal manual" };
const HREF: Record<string, (id: string) => string> = {
  pembelian: (id) => `/keuangan/pembelian?id=${id}`, biaya: (id) => `/keuangan/biaya?id=${id}`, kirim_uang: () => "/keuangan/kas-bank", jurnal_manual: (id) => `/keuangan/jurnal-umum?j=${id}`,
};

export default function Persetujuan({ searchParams }: { searchParams: SPKeu }) {
  return (
    <Bingkai sp={searchParams} aktif="/keuangan/persetujuan" judul="Persetujuan uang"
      sub="Pembelian, biaya, dan kirim uang di atas batas, serta semua jurnal manual. Hanya owner yang menyetujui, dan pencatat tidak bisa menyetujui catatannya sendiri.">
      {async ({ supabase, staf }) => {
        const sel = "id, jenis, referensi_tabel, referensi_id, ringkasan, status, dibuat_pada, diajukan_oleh, catatan, pengaju:diajukan_oleh(nama), pemutus:diputuskan_oleh(nama)";
        const [{ data: tunggu }, { data: riwayat }] = await Promise.all([
          supabase.from("persetujuan").select(sel).eq("status", "menunggu").in("jenis", JENIS_UANG).order("dibuat_pada"),
          supabase.from("persetujuan").select(sel).neq("status", "menunggu").in("jenis", JENIS_UANG).order("diputuskan_pada", { ascending: false }).limit(20),
        ]);
        const rows = (tunggu ?? []) as unknown as P[];
        const owner = staf.peran === "owner";
        // Jurnal yang akan dibuat: untuk jurnal manual, jurnalnya sendiri; untuk dokumen lain tampil setelah disetujui
        return (
          <>
            {!owner ? <Kartu><p className="text-sm">Anda bisa melihat antrean ini; keputusan diambil owner.</p></Kartu> : null}
            {rows.length === 0 ? <Kartu><p className="text-sm text-abu">Tidak ada yang menunggu.</p></Kartu> : null}
            {rows.map((p) => (
              <Kartu key={p.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><Chip nada="waspada">{LABEL[p.jenis] ?? p.jenis}</Chip> <b className="ml-1">{p.ringkasan}</b></div>
                  <span className="text-xs text-abu">dicatat {p.pengaju?.nama ?? "—"} · {tanggalJam(p.dibuat_pada)}</span>
                </div>
                {p.jenis === "jurnal_manual" ? <JurnalEntry supabase={supabase} ids={[p.referensi_id]} /> : <Link href={HREF[p.jenis]?.(p.referensi_id) ?? "/keuangan"} className="text-sm font-bold">Lihat rincian</Link>}
                {owner && p.diajukan_oleh !== staf.id ? (
                  <form action={putuskan} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input name="catatan" placeholder="Catatan (opsional)" maxLength={200} className={`${input} max-w-sm`} />
                    <button name="setuju" value="1" className={tombol}>Setujui</button>
                    <button name="setuju" value="0" className={tombolBahaya}>Tolak</button>
                  </form>
                ) : null}
              </Kartu>
            ))}
            <Kartu className="flex flex-col gap-1">
              <h2 className="text-lg font-extrabold">Riwayat</h2>
              {((riwayat ?? []) as unknown as P[]).map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-abu-garis py-2 text-sm">
                  <span>{p.ringkasan}</span>
                  <span className="flex items-center gap-2"><Chip nada={p.status === "disetujui" ? "baik" : "buruk"}>{p.status}</Chip><span className="text-xs text-abu">{p.pemutus?.nama}{p.catatan ? ` · ${p.catatan}` : ""}</span></span>
                </div>
              ))}
            </Kartu>
          </>
        );
      }}
    </Bingkai>
  );
}
