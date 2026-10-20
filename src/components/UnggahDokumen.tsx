"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const PENDUKUNG = [
  { id: "sim", label: "SIM" },
  { id: "kk", label: "KK" },
  { id: "stnk", label: "STNK" },
  { id: "npwp", label: "NPWP" },
] as const;
type JenisPendukung = (typeof PENDUKUNG)[number]["id"];

/**
 * Unggah satu foto dokumen ke bucket privat 'dokumen/<uid>/...' lalu catat untuk diperiksa CS.
 * mode "ktp": foto KTP. mode "pendukung": pelanggan memilih SIM, KK, STNK, atau NPWP dulu.
 */
export function UnggahDokumen({ mode, pelangganId, status, jenisTersimpan }: { mode: "ktp" | "pendukung"; pelangganId: string; status: string | null; jenisTersimpan?: string | null }) {
  const router = useRouter();
  const [pilih, setPilih] = useState<JenisPendukung>((jenisTersimpan as JenisPendukung) ?? "sim");
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const jenis = mode === "ktp" ? "ktp" : pilih;

  async function unggah(e: React.ChangeEvent<HTMLInputElement>) {
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
    const path = `${user.id}/${jenis}-${Date.now()}.${file.type === "image/png" ? "png" : "jpg"}`;
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

  const ada = status === "lolos" || status === "menunggu";
  const ket = status === "lolos" ? "Tersimpan dan terverifikasi" : status === "menunggu" ? "Terunggah, diperiksa CS" : status === "ditolak" ? "Ditolak, unggah ulang" : mode === "ktp" ? "Foto jelas, keempat sudut terlihat" : "Nama harus sama dengan KTP";
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-abu-garis p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <b className="text-sm">{mode === "ktp" ? "KTP" : `Dokumen pendukung${ada && jenisTersimpan ? ` · ${jenisTersimpan.toUpperCase()}` : ""}`}</b>
          <div className={`text-xs ${status === "ditolak" ? "font-bold text-status-buruk" : status === "lolos" ? "font-bold text-status-baik" : "text-abu"}`}>{ket}</div>
          {galat ? <div role="alert" className="text-xs font-bold text-status-buruk">{galat}</div> : null}
        </div>
        <label className={`inline-flex h-10 shrink-0 cursor-pointer items-center rounded-lg px-3 text-sm font-bold ${ada ? "border border-abu-input" : "bg-navy text-white"}`}>
          {proses ? "Mengunggah…" : ada ? "Ganti" : "Unggah foto"}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={unggah} disabled={proses} />
        </label>
      </div>
      {mode === "pendukung" && !ada ? (
        <div role="radiogroup" aria-label="Jenis dokumen pendukung" className="grid grid-cols-4 gap-2">
          {PENDUKUNG.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={pilih === p.id} onClick={() => setPilih(p.id)}
              className={`h-10 rounded-lg text-sm font-bold ${pilih === p.id ? "border-[1.5px] border-navy bg-teal-muda" : "border border-abu-input bg-white"}`}>
              {p.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
