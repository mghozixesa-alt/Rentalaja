import Image from "next/image";
import Link from "next/link";
import { penggunaSaatIni } from "@/lib/auth";
import { bacaKeranjang } from "@/lib/keranjang";

export async function Header() {
  const user = await penggunaSaatIni();
  const k = bacaKeranjang();
  const n = k?.items.reduce((a, i) => a + i.jumlah, 0) ?? 0;
  return (
    <header className="sticky top-0 z-20 border-b border-abu-garis bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" aria-label="Rentalaja beranda" className="flex items-center">
          <Image src="/logo.png" alt="Rentalaja" width={132} height={30} priority className="h-7 w-auto" />
        </Link>
        <nav aria-label="Menu utama" className="hidden items-center gap-6 text-sm font-bold md:flex">
          <Link href="/katalog?lini=transportation">Transportation</Link>
          <Link href="/katalog?lini=hub">Hub</Link>
          <Link href="/experience">Experience</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/keranjang" className="relative inline-flex h-10 items-center rounded-full border border-abu-input px-3 text-sm font-bold">
            Keranjang
            {n > 0 ? <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-navy px-1.5 text-xs text-white">{n}</span> : null}
          </Link>
          <Link href={user ? "/akun" : "/masuk"} className="inline-flex h-10 items-center rounded-full bg-navy px-4 text-sm font-bold text-white">
            {user ? "Akun" : "Masuk"}
          </Link>
        </div>
      </div>
    </header>
  );
}
