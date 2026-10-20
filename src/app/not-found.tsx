import Link from "next/link";

export default function TidakAda() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-extrabold">Halaman tidak ditemukan</h1>
      <p className="text-sm text-abu">Mungkin tautannya sudah berubah. Kembali ke beranda untuk mulai lagi.</p>
      <Link href="/" className="font-bold">Ke beranda</Link>
    </main>
  );
}
