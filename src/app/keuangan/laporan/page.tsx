import Link from "next/link";
import { Bingkai, type SPKeu } from "../Bingkai";
import { Kartu, input, label, tombolGaris } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { bulanIni, dataMaster, tglValid } from "@/lib/keuangan";
import { ambilLaporan, JENIS_LAPORAN } from "@/lib/laporan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Laporan · Keuangan" };

export default function Laporan({ searchParams }: { searchParams: SPKeu }) {
  const b = bulanIni();
  const r = JENIS_LAPORAN.some(([k]) => k === searchParams.r) ? searchParams.r! : "laba-rugi";
  const dari = tglValid(searchParams.dari, b.dari);
  const sampai = tglValid(searchParams.sampai, b.sampai);
  const cabang = searchParams.cabang && /^[0-9a-f-]{36}$/.test(searchParams.cabang) ? searchParams.cabang : "";
  const akun = searchParams.akun && /^[0-9a-f-]{36}$/.test(searchParams.akun) ? searchParams.akun : "";
  const qs = new URLSearchParams({ r, dari, sampai, ...(cabang ? { cabang } : {}), ...(akun ? { akun } : {}) }).toString();
  return (
    <Bingkai sp={searchParams} aktif="/keuangan/laporan" judul="Laporan"
      sub="Laporan standar seperti di Jurnal, ditambah laba rugi per cabang. Semua dari jurnal yang sama, jadi angkanya selalu cocok dengan Dasbor."
      kanan={<a href={`/keuangan/laporan/unduh?${qs}`} className={tombolGaris}>Unduh CSV (Excel)</a>}>
      {async ({ supabase }) => {
        const m = await dataMaster(supabase);
        const lap = await ambilLaporan(supabase, { r, dari, sampai, cabang, akun });
        const kol = lap.kolom.length;
        return (
          <div className="grid items-start gap-4 xl:grid-cols-[260px_1fr]">
            <Kartu className="flex flex-col gap-1">
              {JENIS_LAPORAN.map(([k, l, s]) => (
                <Link key={k} href={`/keuangan/laporan?r=${k}&dari=${dari}&sampai=${sampai}`} aria-current={k === r ? "page" : undefined}
                  className={`rounded-lg px-2 py-2 no-underline ${k === r ? "bg-teal-muda" : ""}`}><b className="text-sm">{l}</b><div className="text-xs text-abu">{s}</div></Link>
              ))}
            </Kartu>
            <div className="flex flex-col gap-3">
              <form className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="r" value={r} />
                {r !== "neraca" && !r.startsWith("umur") ? <label className={label}>Dari<input type="date" name="dari" defaultValue={dari} className={input} /></label> : null}
                <label className={label}>{r === "neraca" || r.startsWith("umur") ? "Per tanggal" : "Sampai"}<input type="date" name="sampai" defaultValue={sampai} className={input} /></label>
                {["laba-rugi", "neraca-saldo"].includes(r) ? (
                  <label className={label}>Tag cabang<select name="cabang" defaultValue={cabang} className={input}><option value="">Semua cabang</option>{m.cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}</select></label>
                ) : null}
                {r === "buku-besar" ? (
                  <label className={label}>Akun<select name="akun" defaultValue={akun} className={input} required><option value="">Pilih akun</option>{m.akunAktif.map((a) => <option key={a.id} value={a.id}>{a.kode} {a.nama}</option>)}</select></label>
                ) : null}
                <button className={tombolGaris}>Terapkan</button>
              </form>
              <Kartu className="flex flex-col gap-1">
                <h2 className="text-lg font-extrabold">{lap.judul}</h2>
                <div className="text-xs text-abu">PT Popo Karya Investama · basis akrual</div>
                <div className="overflow-x-auto">
                  <table className="mt-2 w-full min-w-[560px] border-collapse text-sm">
                    <thead><tr>{lap.kolom.map((k, i) => <th key={k + i} className={`border-b border-abu-garis py-1.5 text-xs font-bold text-abu ${lap.angka.includes(i) ? "text-right" : "text-left"}`}>{k}</th>)}</tr></thead>
                    <tbody>
                      {lap.baris.length === 0 ? <tr><td colSpan={kol} className="py-4 text-abu">Belum ada data untuk periode ini.</td></tr> : null}
                      {lap.baris.map((b2, i) => (
                        <tr key={i} className={b2.tebal ? "font-extrabold" : ""}>
                          {b2.sel.map((v, j) => (
                            <td key={j} className={`border-b border-abu-garis py-1.5 ${lap.angka.includes(j) ? "text-right" : ""} ${j === 0 && b2.menjorok ? "pl-4" : ""}`}>
                              {typeof v === "number" ? (v === 0 && !b2.tebal ? "" : rupiah(v).replace("Rp-", "−Rp")) : v}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Kartu>
            </div>
          </div>
        );
      }}
    </Bingkai>
  );
}
