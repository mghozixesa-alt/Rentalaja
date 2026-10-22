import { HalamanPengeluaran } from "../Pengeluaran";
import type { SPKeu } from "../Bingkai";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pembelian · Keuangan" };

export default function Pembelian({ searchParams }: { searchParams: SPKeu }) {
  return <HalamanPengeluaran jenis="pembelian" sp={searchParams} />;
}
