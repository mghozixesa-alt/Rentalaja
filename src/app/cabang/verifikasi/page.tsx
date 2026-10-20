import { setujuiVerifikasi, tolakVerifikasi } from "../actions";
import { Bingkai, type SPCabang } from "../Bingkai";
import { Kartu, Kosong, input, tombol, tombolBahaya } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { rupiah, tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verifikasi dokumen" };

type B = { id: string; kode: string; mulai: string; selesai: string; total: number; dp_wajib: number; dibuat_pada: string; pelanggan: { id: string; nama: string; nomor_wa: string; terverifikasi: boolean } | null; booking_item: { produk: { nama: string } | null }[] };

export default function Verifikasi({ searchParams }: { searchParams: SPCabang }) {
  return (
    <Bingkai sp={searchParams} aktif="/cabang/verifikasi" judul="Verifikasi dokumen" sub="Unit sudah dipegang untuk pelanggan. Setujui atau tolak dalam 15 menit.">
      {async ({ cabang, supabase, q }) => {
        const { data } = await supabase.from("booking")
          .select("id, kode, mulai, selesai, total, dp_wajib, dibuat_pada, pelanggan:pelanggan_id(id, nama, nomor_wa, terverifikasi), booking_item(produk:produk_id(nama))")
          .eq("cabang_id", cabang.id).eq("status", "menunggu_verifikasi").order("dibuat_pada");
        const rows = (data ?? []) as unknown as B[];
        if (rows.length === 0) return <Kosong judul="Antrean kosong" isi="Booking baru yang butuh pemeriksaan KTP dan dokumen pendukung muncul di sini." />;
        const admin = createAdminClient();
        const ids = rows.map((r) => r.pelanggan?.id).filter(Boolean) as string[];
        const { data: dok } = await admin.from("dokumen").select("pelanggan_id, jenis, status, path_storage").in("pelanggan_id", ids).order("diunggah_pada", { ascending: false });
        const link = async (path: string) => (await admin.storage.from("dokumen").createSignedUrl(path, 300)).data?.signedUrl ?? null;
        const kartu = await Promise.all(rows.map(async (b) => {
          const milik = (dok ?? []).filter((d) => d.pelanggan_id === b.pelanggan?.id);
          const terbaru = [milik.find((d) => d.jenis === "ktp"), milik.find((d) => ["sim", "kk", "stnk", "npwp"].includes(d.jenis))].filter(Boolean) as { jenis: string; status: string; path_storage: string }[];
          const foto = await Promise.all(terbaru.map(async (d) => ({ ...d, url: await link(d.path_storage) })));
          return { b, foto };
        }));
        return kartu.map(({ b, foto }) => (
          <Kartu key={b.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap justify-between gap-2">
              <div><b>{b.pelanggan?.nama}</b> · {b.pelanggan?.nomor_wa}<div className="text-sm text-abu">{b.kode} · {b.booking_item.map((i) => i.produk?.nama).join(", ")} · {tanggalJam(b.mulai)}</div></div>
              <div className="text-right text-sm">Total <b>{rupiah(b.total)}</b><div className="text-abu">DP {rupiah(b.dp_wajib)}</div></div>
            </div>
            {b.pelanggan?.terverifikasi ? <p className="text-sm font-bold text-status-baik">Pelanggan sudah pernah lolos verifikasi.</p> : null}
            <div className="grid gap-3 sm:grid-cols-3">
              {foto.map((f) => (
                <a key={f.jenis} href={f.url ?? "#"} target="_blank" rel="noreferrer" className="flex flex-col gap-1 text-sm font-bold no-underline">
                  {f.url ? <img src={f.url} alt={`Foto ${f.jenis.toUpperCase()}`} className="aspect-[3/2] w-full rounded-lg border border-abu-garis object-cover" /> : null}
                  {f.jenis === "ktp" ? "KTP" : `Pendukung · ${f.jenis.toUpperCase()}`} · {f.status}
                </a>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <form action={tolakVerifikasi} className="flex flex-1 flex-wrap items-end gap-2">
                <input type="hidden" name="booking" value={b.id} /><input type="hidden" name="q" value={q} />
                <select name="alasan" aria-label="Alasan tolak" className={`${input} h-11 max-w-xs`}>
                  <option>Foto KTP tidak jelas</option><option>Foto dokumen pendukung tidak jelas</option><option>Nama di dokumen pendukung tidak sama dengan KTP</option><option>Dokumen sudah tidak berlaku</option><option>Masuk daftar pelanggaran</option>
                </select>
                <button className={tombolBahaya}>Tolak</button>
              </form>
              <form action={setujuiVerifikasi}>
                <input type="hidden" name="booking" value={b.id} /><input type="hidden" name="q" value={q} />
                <button className={tombol}>Setujui, minta bayar DP</button>
              </form>
            </div>
          </Kartu>
        ));
      }}
    </Bingkai>
  );
}
