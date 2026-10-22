import { HalamanPengeluaran } from "../Pengeluaran";
import type { SPKeu } from "../Bingkai";

export const dynamic = "force-dynamic";
export const metadata = { title: "Biaya · Keuangan" };

export default function Biaya({ searchParams }: { searchParams: SPKeu }) {
  return <HalamanPengeluaran jenis="biaya" sp={searchParams} />;
}
