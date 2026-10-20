import { ProdukKartu } from "@/components/ProdukKartu";
import { Judul } from "@/components/ui";
import { ambilKatalog } from "@/lib/katalog";

export const metadata = { title: "Experience: menginap dan trip Jeep di Garut" };

export default async function Experience() {
  const semua = await ambilKatalog({ lini: "experience" });
  const inap = semua.filter((p) => p.jenis_layanan === "penginapan");
  const jeep = semua.filter((p) => p.jenis_layanan === "trip");
  return (
    <>
      <Judul sub="Tanpa KTP. Langsung terkunci setelah bayar. Check-in 14.00, check-out 12.00. Tidak ada pembatalan; tanggal bisa diubah sekali paling lambat H-3.">Experience</Judul>
      <h2 className="text-xl font-extrabold">Menginap</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{inap.map((p) => <ProdukKartu key={p.id} p={p} />)}</div>
      <h2 className="text-xl font-extrabold">Trip Jeep dengan sopir</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{jeep.map((p) => <ProdukKartu key={p.id} p={p} />)}</div>
    </>
  );
}
