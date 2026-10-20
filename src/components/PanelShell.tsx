import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export type MenuPanel = { judul: string; item: { href: string; label: string; badge?: number }[] }[];

/** Kerangka panel staf: sidebar menu dikelompokkan, konten di kanan. */
export function PanelShell({ menu, aktif, nama, peran, children }: { menu: MenuPanel; aktif: string; nama: string; peran: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap bg-abu-latar">
      <aside className="flex w-full flex-col gap-5 border-b border-abu-garis bg-white p-4 md:w-60 md:border-b-0 md:border-r">
        <Link href="/"><Image src="/logo.png" alt="Rentalaja" width={120} height={28} className="h-7 w-auto" /></Link>
        <nav aria-label="Menu panel" className="flex flex-col gap-4">
          {menu.map((g) => (
            <div key={g.judul} role="group" aria-label={g.judul} className="flex flex-col gap-0.5">
              <div className="px-3 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-[#8A93A6]">{g.judul}</div>
              {g.item.map((i) => (
                <Link key={i.href} href={i.href} aria-current={aktif === i.href ? "page" : undefined}
                  className={`flex h-10 items-center rounded-lg px-3 text-sm no-underline ${aktif === i.href ? "bg-teal-muda font-extrabold" : "font-semibold text-abu hover:bg-abu-latar"}`}>
                  {i.label}
                  {i.badge ? <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-navy px-1.5 text-xs font-extrabold text-white">{i.badge}</span> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between border-t border-abu-garis pt-4">
          <div className="flex flex-col"><b className="text-sm">{nama}</b><span className="text-xs text-abu">{peran.replace("_", " ")}</span></div>
          <form action="/auth/keluar" method="post"><button className="text-xs font-bold underline">Keluar</button></form>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-7">{children}</main>
    </div>
  );
}
