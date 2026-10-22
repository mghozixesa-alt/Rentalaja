import { wajibPeran } from "@/lib/auth";
import { DuaFaktor } from "./DuaFaktor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verifikasi 2FA · Keuangan" };

export default async function Halaman2FA() {
  const staf = await wajibPeran("keuangan");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6">
      <div>
        <div className="text-sm font-bold text-teal-tua">Panel Keuangan · {staf.nama}</div>
        <h1 className="text-[26px] font-extrabold leading-8">Verifikasi dua langkah</h1>
        <p className="text-sm text-abu">Panel Keuangan wajib 2FA. Pakai aplikasi authenticator (Google Authenticator, Microsoft Authenticator, atau 1Password) di HP Anda.</p>
      </div>
      <DuaFaktor />
    </main>
  );
}
