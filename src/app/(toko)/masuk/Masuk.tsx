"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Kartu, Pesan, input, label, tombol } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/** Nomor Indonesia ke format E.164: 0812… / 62812… / +62812… → +62812… */
function normal(n: string) {
  const d = n.replace(/\D/g, "");
  if (d.startsWith("0")) return "+62" + d.slice(1);
  if (d.startsWith("62")) return "+" + d;
  return "+62" + d;
}

export function Masuk({ lanjut }: { lanjut: string }) {
  const router = useRouter();
  const [langkah, setLangkah] = useState<"nomor" | "kode">("nomor");
  const [nama, setNama] = useState("");
  const [nomor, setNomor] = useState("");
  const [kode, setKode] = useState("");
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const supabase = createClient();

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    const hp = normal(nomor);
    if (hp.length < 11) return setGalat("Nomor WhatsApp belum lengkap.");
    setProses(true);
    setGalat(null);
    const { error } = await supabase.auth.signInWithOtp({ phone: hp, options: { channel: "whatsapp" } });
    setProses(false);
    if (error) return setGalat("Kode belum bisa dikirim. Periksa nomor lalu coba lagi.");
    setLangkah("kode");
  }

  async function verifikasi(e: React.FormEvent) {
    e.preventDefault();
    const hp = normal(nomor);
    setProses(true);
    setGalat(null);
    const { error } = await supabase.auth.verifyOtp({ phone: hp, token: kode.trim(), type: "sms" });
    if (error) {
      setProses(false);
      return setGalat("Kode salah atau sudah kedaluwarsa.");
    }
    // Staf tidak didaftarkan sebagai pelanggan.
    const { data: staf } = await supabase.from("pengguna").select("peran").maybeSingle();
    if (!staf) await supabase.rpc("daftar_pelanggan", { p_nama: nama, p_nomor_wa: hp });
    const tujuan = staf ? "/cabang" : lanjut;
    router.replace(tujuan);
    router.refresh();
  }

  return (
    <Kartu className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-extrabold">Masuk ke Rentalaja</h1>
        <p className="text-sm text-abu">Tanpa kata sandi. Kode masuk dikirim ke WhatsApp Anda.</p>
      </div>
      {galat ? <Pesan nada="buruk">{galat}</Pesan> : null}
      {langkah === "nomor" ? (
        <form onSubmit={kirim} className="flex flex-col gap-3">
          <label className={label}>Nama<input value={nama} onChange={(e) => setNama(e.target.value)} autoComplete="name" placeholder="Sesuai KTP" className={input} /></label>
          <label className={label}>Nomor WhatsApp<input value={nomor} onChange={(e) => setNomor(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="0812 3456 7890" required className={input} /></label>
          <button className={tombol} disabled={proses}>{proses ? "Mengirim…" : "Kirim kode lewat WhatsApp"}</button>
        </form>
      ) : (
        <form onSubmit={verifikasi} className="flex flex-col gap-3">
          <label className={label}>Kode 6 angka dari WhatsApp<input value={kode} onChange={(e) => setKode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className={`${input} text-center text-2xl tracking-[0.4em]`} /></label>
          <button className={tombol} disabled={proses}>{proses ? "Memeriksa…" : "Masuk"}</button>
          <button type="button" onClick={() => setLangkah("nomor")} className="text-sm font-bold underline">Ganti nomor</button>
        </form>
      )}
    </Kartu>
  );
}
