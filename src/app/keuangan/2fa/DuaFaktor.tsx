"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { input, label, tombol } from "@/components/ui";

type Daftar = { id: string; qr?: string; secret?: string };

/** Daftarkan authenticator (sekali) atau masukkan kode 6 digit untuk membuka Panel Keuangan. */
export function DuaFaktor() {
  const router = useRouter();
  const [faktor, setFaktor] = useState<Daftar | null>(null);
  const [baru, setBaru] = useState(false);
  const [kode, setKode] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) return setGalat(error.message);
      const ada = data.totp.find((f) => f.status === "verified");
      if (ada) return setFaktor({ id: ada.id });
      // Pendaftaran yang belum selesai dari kunjungan sebelumnya dihapus supaya tidak menumpuk
      for (const f of data.all.filter((x) => x.status === "unverified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
      const daftar = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Keuangan ${Date.now()}` });
      if (daftar.error) return setGalat(daftar.error.message);
      const d = daftar.data;
      if (d.type !== "totp") return setGalat("Jenis 2FA tidak didukung");
      setBaru(true);
      setFaktor({ id: d.id, qr: d.totp.qr_code, secret: d.totp.secret });
    })();
  }, []);

  async function verifikasi(e: React.FormEvent) {
    e.preventDefault();
    if (!faktor) return;
    setProses(true); setGalat(null);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: faktor.id, code: kode.trim() });
    setProses(false);
    if (error) return setGalat("Kode salah atau kedaluwarsa. Coba kode terbaru di aplikasi.");
    router.replace("/keuangan");
    router.refresh();
  }

  if (!faktor && !galat) return <p className="text-sm text-abu">Menyiapkan…</p>;
  return (
    <form onSubmit={verifikasi} className="flex flex-col gap-4 rounded-kartu border border-abu-garis bg-white p-5">
      {baru && faktor?.qr ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <b>1. Pindai kode QR ini di aplikasi authenticator</b>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={faktor.qr} alt="Kode QR authenticator" width={180} height={180} />
          <span className="text-xs text-abu">Tidak bisa memindai? Masukkan kode: <code className="break-all font-bold">{faktor.secret}</code></span>
        </div>
      ) : null}
      <label className={label}>
        {baru ? "2. Masukkan kode 6 digit dari aplikasi" : "Kode 6 digit dari aplikasi authenticator"}
        <input className={input} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={kode} onChange={(e) => setKode(e.target.value.replace(/\D/g, ""))} required />
      </label>
      {galat ? <p role="alert" className="text-sm text-status-buruk">{galat}</p> : null}
      <button className={tombol} disabled={proses || kode.length !== 6}>{proses ? "Memeriksa…" : "Buka Panel Keuangan"}</button>
    </form>
  );
}
