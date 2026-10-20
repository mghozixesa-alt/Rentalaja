import Link from "next/link";
import type { ReactNode } from "react";
import type { Nada } from "@/lib/format";

const NADA: Record<Nada, string> = {
  baik: "bg-status-baikBg text-status-baik",
  waspada: "bg-status-waspadaBg text-status-waspada",
  buruk: "bg-status-burukBg text-status-buruk",
  info: "bg-status-infoBg text-navy",
  abu: "bg-[#EEF0F3] text-abu",
  teal: "bg-teal-muda text-teal-tua",
};

export function Chip({ nada = "abu", children }: { nada?: Nada; children: ReactNode }) {
  return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-extrabold ${NADA[nada]}`}>{children}</span>;
}

export const tombol =
  "inline-flex h-12 items-center justify-center rounded-xl bg-teal px-5 text-[15px] font-extrabold text-navy transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-abu-garis disabled:text-abu";
export const tombolGaris =
  "inline-flex h-11 items-center justify-center rounded-xl border border-navy bg-white px-4 text-sm font-bold text-navy hover:bg-abu-latar";
export const tombolBahaya =
  "inline-flex h-11 items-center justify-center rounded-xl border-[1.5px] border-status-buruk bg-white px-4 text-sm font-extrabold text-status-buruk";
export const input =
  "h-12 w-full rounded-xl border border-abu-input bg-white px-3 text-base font-semibold text-navy outline-none focus:border-navy focus:ring-2 focus:ring-teal/40";
export const label = "flex flex-col gap-1.5 text-[13px] font-bold text-abu";

export function Kartu({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-kartu border border-abu-garis bg-white p-4 ${className}`}>{children}</section>;
}

export function Judul({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-[26px] font-extrabold leading-8 tracking-tight">{children}</h1>
      {sub ? <p className="text-sm leading-5 text-abu">{sub}</p> : null}
    </div>
  );
}

export function Kosong({ judul, isi, href, aksi }: { judul: string; isi: string; href?: string; aksi?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-kartu border border-dashed border-abu-input bg-white p-8 text-center">
      <b className="text-base">{judul}</b>
      <p className="max-w-sm text-sm text-abu">{isi}</p>
      {href && aksi ? (
        <Link href={href} className={tombol}>
          {aksi}
        </Link>
      ) : null}
    </div>
  );
}

export function Pesan({ nada, children }: { nada: "baik" | "buruk" | "waspada"; children: ReactNode }) {
  const c = nada === "baik" ? "bg-status-baikBg text-[#1F3D2D]" : nada === "buruk" ? "bg-status-burukBg text-[#5E1A13]" : "bg-status-waspadaBg text-[#5A3300]";
  return <div role={nada === "buruk" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm leading-5 ${c}`}>{children}</div>;
}
