import Image from "next/image";
import Link from "next/link";
import type { ItemKatalog } from "@/lib/katalog";
import { rupiah } from "@/lib/format";

export function ProdukKartu({ p }: { p: ItemKatalog }) {
  const href = p.lini === "experience" ? `/experience/${p.slug}` : `/produk/${p.slug}`;
  return (
    <Link href={href} className="group flex flex-col overflow-hidden rounded-kartu border border-abu-garis bg-white no-underline transition hover:border-navy">
      <div className="relative aspect-[4/3] bg-[#F1F3F5]">
        {p.foto?.[0] ? (
          <Image src={p.foto[0]} alt={p.nama} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-bold text-[#6B7385]">Foto menyusul</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-xs font-extrabold uppercase tracking-wide text-teal-tua">{p.kategori_nama}</span>
        <b className="text-[15px] leading-5">{p.nama}</b>
        <span className="mt-auto pt-1 text-sm">
          {p.harga_mulai ? (
            <>
              mulai <b>{rupiah(p.harga_mulai)}</b>/{p.satuan}
            </>
          ) : (
            <span className="text-abu">Harga segera</span>
          )}
        </span>
      </div>
    </Link>
  );
}
