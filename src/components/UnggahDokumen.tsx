"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAMA: Record<string, string> = { ktp: "KTP", kk: "Kartu Keluarga", sim_c: "SIM C" };

/** Unggah foto dokumen ke bucket privat 'dokumen/<uid>/...' lalu catat di tabel dokumen untuk diperiksa CS. */
export function UnggahDokumen({ jenis, pelangganId, status }: { jenis: "ktp" | "kk" | "sim_c"; pelangganId: string; status: string | null }) {
  const router = useRouter();
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setGalat("Pilih foto (JPG atau PNG).");
    if (file.size > 8 * 1024 * 1024) return setGalat("Ukuran foto maksimal 8 MB.");
    setProses(true);
    setGalat(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProses(false);
      return setGalat("Sesi habis. Masuk lagi.");
    }
    const ext = file.type === "image/png" ? "png" : "jpg";
    const path = `${user.id}/${jenis}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("dokumen").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) {
      setProses(false);
      return setGalat("Gagal mengunggah. Coba lagi.");
    }
    const ins = await supabase.from("dokumen").insert({ pelanggan_id: pelangganId, jenis, path_storage: path });
    setProses(false);
    if (ins.error) return setGalat("Foto terunggah, tapi gagal dicatat. Coba lagi.");
    router.refresh();
  }

  const selesai = status === "lolos" || status === "menunggu";
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-abu-garis p-3">
      <div>
        <b className="text-sm">{NAMA[jenis]}</b>
        <div className="text-xs text-abu">
          {status === "lolos" ? "Sudah terverifikasi" : status === "menunggu" ? "Terunggah, diperiksa CS" : status === "ditolak" ? "Ditolak, unggah ulang" : "Foto jelas, semua sudut terlihat"}
        </div>
        {galat ? <div role="alert" className="text-xs font-bold text-status-buruk">{galat}</div> : null}
      </div>
      <label className={`inline-flex h-10 cursor-pointer items-center rounded-lg px-3 text-sm font-bold ${selesai ? "border border-abu-input" : "bg-navy text-white"}`}>
        {proses ? "Mengunggah…" : selesai ? "Ganti" : "Unggah foto"}
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pilih} disabled={proses} />
      </label>
    </div>
  );
}
