import { Masuk } from "./Masuk";

export const metadata = { title: "Masuk" };

export default function MasukPage({ searchParams }: { searchParams: { lanjut?: string } }) {
  const lanjut = searchParams.lanjut?.startsWith("/") && !searchParams.lanjut.startsWith("//") ? searchParams.lanjut : "/akun";
  return (
    <div className="mx-auto w-full max-w-md">
      <Masuk lanjut={lanjut} />
    </div>
  );
}
