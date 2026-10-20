import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-abu-garis bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-abu md:grid-cols-3">
        <div>
          <b className="text-navy">Rentalaja</b>
          <p className="mt-2 leading-5">Nggak semua harus dibeli. Sewa saat butuh: motor, iPhone, kamera, perlengkapan camping, penginapan, dan trip Jeep di Garut dan Bandung.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/katalog?lini=transportation">Sewa motor dan mobil</Link>
          <Link href="/katalog?lini=hub">Sewa barang</Link>
          <Link href="/experience">Menginap dan trip Jeep</Link>
        </div>
        <div className="flex flex-col gap-2">
          <a href="https://wa.me/6281324700077">WhatsApp +62 813-2470-0077</a>
          <Link href="/syarat">Syarat dan ketentuan</Link>
          <span>PT Popo Karya Investama · Garut</span>
        </div>
      </div>
    </footer>
  );
}
