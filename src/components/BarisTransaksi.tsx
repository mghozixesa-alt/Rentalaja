"use client";

import { useState } from "react";

type Opsi = { id: string; label: string };
type Row = { akun: string; deskripsi: string; cabang: string; jumlah: string; debit: string; kredit: string };

const kosong = (): Row => ({ akun: "", deskripsi: "", cabang: "", jumlah: "", debit: "", kredit: "" });
const angka = (s: string) => Math.max(0, Math.round(Number(s.replace(/[^\d]/g, "")) || 0));
const rp = (n: number) => "Rp" + n.toLocaleString("id-ID");
const sel = "h-11 w-full rounded-lg border border-abu-input bg-white px-2 text-sm font-semibold text-navy";

/**
 * Editor baris transaksi gaya Jurnal. Hasilnya dikirim sebagai JSON di input tersembunyi `name`.
 * mode "jumlah": akun, deskripsi, tag cabang, jumlah (biaya, pembelian, terima/kirim uang)
 * mode "debitkredit": akun, deskripsi, tag cabang, debit, kredit (jurnal umum); total harus seimbang.
 */
export function BarisTransaksi({ name = "baris", akun, cabang, mode = "jumlah", awal = 2 }: { name?: string; akun: Opsi[]; cabang: Opsi[]; mode?: "jumlah" | "debitkredit"; awal?: number }) {
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: awal }, kosong));
  const ubah = (i: number, k: keyof Row, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const isi = rows.filter((r) => r.akun);
  const data = isi.map((r) => mode === "jumlah"
    ? { akun: r.akun, deskripsi: r.deskripsi || null, cabang: r.cabang || null, jumlah: angka(r.jumlah) }
    : { akun: r.akun, ket: r.deskripsi || null, cabang: r.cabang || null, debit: angka(r.debit), kredit: angka(r.kredit) });
  const tDebit = isi.reduce((s, r) => s + angka(mode === "jumlah" ? r.jumlah : r.debit), 0);
  const tKredit = isi.reduce((s, r) => s + angka(r.kredit), 0);
  const kolom = mode === "jumlah" ? "minmax(0,1.4fr) minmax(0,1.4fr) 150px 140px 36px" : "minmax(0,1.4fr) minmax(0,1.3fr) 140px 120px 120px 36px";

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={JSON.stringify(data)} />
      <div className="overflow-x-auto">
        <div className="flex min-w-[720px] flex-col gap-2">
          <div className="grid gap-2 text-xs font-bold text-abu" style={{ gridTemplateColumns: kolom }}>
            <span>Akun</span><span>Deskripsi</span><span>Tag cabang</span>
            {mode === "jumlah" ? <span className="text-right">Jumlah</span> : <><span className="text-right">Debit</span><span className="text-right">Kredit</span></>}
            <span />
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid gap-2" style={{ gridTemplateColumns: kolom }}>
              <select aria-label={`Akun baris ${i + 1}`} className={sel} value={r.akun} onChange={(e) => ubah(i, "akun", e.target.value)}>
                <option value="">Pilih akun</option>
                {akun.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              <input aria-label={`Deskripsi baris ${i + 1}`} className={sel} value={r.deskripsi} onChange={(e) => ubah(i, "deskripsi", e.target.value)} />
              <select aria-label={`Tag cabang baris ${i + 1}`} className={sel} value={r.cabang} onChange={(e) => ubah(i, "cabang", e.target.value)}>
                <option value="">—</option>
                {cabang.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              {mode === "jumlah" ? (
                <input aria-label={`Jumlah baris ${i + 1}`} inputMode="numeric" className={`${sel} text-right`} value={r.jumlah} onChange={(e) => ubah(i, "jumlah", e.target.value)} placeholder="0" />
              ) : (
                <>
                  <input aria-label={`Debit baris ${i + 1}`} inputMode="numeric" className={`${sel} text-right`} value={r.debit} onChange={(e) => ubah(i, "debit", e.target.value)} placeholder="0" />
                  <input aria-label={`Kredit baris ${i + 1}`} inputMode="numeric" className={`${sel} text-right`} value={r.kredit} onChange={(e) => ubah(i, "kredit", e.target.value)} placeholder="0" />
                </>
              )}
              <button type="button" aria-label={`Hapus baris ${i + 1}`} className="h-11 rounded-lg border border-abu-input text-abu" onClick={() => setRows((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : x))}>×</button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="h-9 rounded-lg border border-abu-input bg-white px-3 text-sm font-bold" onClick={() => setRows((x) => [...x, kosong()])}>+ Tambah baris</button>
        {mode === "jumlah" ? (
          <span className="text-sm">Total <b className="text-xl">{rp(tDebit)}</b></span>
        ) : (
          <span className="flex items-center gap-3 text-sm">
            Debit <b>{rp(tDebit)}</b> · Kredit <b>{rp(tKredit)}</b>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${tDebit === tKredit && tDebit > 0 ? "bg-status-baikBg text-status-baik" : "bg-status-burukBg text-status-buruk"}`}>
              {tDebit === tKredit && tDebit > 0 ? "Seimbang" : `Selisih ${rp(Math.abs(tDebit - tKredit))}`}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
