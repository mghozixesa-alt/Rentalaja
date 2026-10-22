import Link from "next/link";
import type { createClient } from "@/lib/supabase/server";
import { Chip } from "@/components/ui";
import { STATUS_DOK } from "@/lib/keuangan";

type J = { id: string; nomor: string; tanggal: string; memo: string | null; status: string;
  jurnal_baris: { urut: number; debit: number; kredit: number; keterangan: string | null; akun: { kode: string; nama: string } | null }[] };
const angka = (n: number) => (n ? n.toLocaleString("id-ID") : "");

/** Tampilkan jurnal entry (debit-kredit) untuk satu atau beberapa jurnal. */
export async function JurnalEntry({ supabase, ids, judul = "Jurnal entry" }: { supabase: ReturnType<typeof createClient>; ids: string[]; judul?: string }) {
  if (ids.length === 0) return <p className="text-xs text-abu">Belum ada jurnal untuk transaksi ini.</p>;
  const { data } = await supabase.from("jurnal").select("id, nomor, tanggal, memo, status, jurnal_baris(urut, debit, kredit, keterangan, akun:akun_id(kode, nama))").in("id", ids).order("tanggal");
  const js = (data ?? []) as unknown as J[];
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-extrabold uppercase tracking-wider text-teal-tua">{judul}</div>
      {js.map((j) => (
        <div key={j.id} className="flex flex-col gap-1 border-t border-dashed border-abu-input pt-2 text-[13px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href={`/keuangan/jurnal-umum?j=${j.id}`} className="font-bold">{j.nomor}</Link>
            <span className="text-abu">{j.tanggal}</span>
            {j.status !== "tercatat" ? <Chip nada={STATUS_DOK[j.status]?.nada}>{STATUS_DOK[j.status]?.label}</Chip> : null}
          </div>
          {[...j.jurnal_baris].sort((a, b) => a.urut - b.urut).map((b) => (
            <div key={b.urut} className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-1.5">
              <span className={b.kredit ? "pl-4" : ""}>{b.akun?.kode} {b.akun?.nama}</span>
              <span className="text-right">{angka(b.debit)}</span>
              <span className="text-right">{angka(b.kredit)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
