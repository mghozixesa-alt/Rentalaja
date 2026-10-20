import type { ReactNode } from "react";
import { PanelShell } from "@/components/PanelShell";
import { Pesan } from "@/components/ui";
import { wajibPeran } from "@/lib/auth";

export async function BingkaiExp({ aktif, judul, sub, sp, children }: { aktif: string; judul: string; sub?: string; sp: { galat?: string; ok?: string }; children: ReactNode }) {
  const staf = await wajibPeran("cs_experience", "manajer_experience");
  const menu = [
    { judul: "Experience", item: [{ href: "/panel-experience", label: "Hari ini" }, { href: "/panel-experience/jadwal", label: "Jadwal 30 hari" }] },
  ];
  return (
    <PanelShell menu={menu} aktif={aktif} nama={staf.nama} peran={staf.peran}>
      <header>
        <div className="text-sm font-bold text-teal-tua">Ruma Metua · Ertap Village · Jeep Trip Garut</div>
        <h1 className="text-[26px] font-extrabold leading-8">{judul}</h1>
        {sub ? <p className="text-sm text-abu">{sub}</p> : null}
      </header>
      {sp.galat ? <Pesan nada="buruk">{sp.galat}</Pesan> : null}
      {sp.ok ? <Pesan nada="baik">Tersimpan.</Pesan> : null}
      {children}
    </PanelShell>
  );
}
