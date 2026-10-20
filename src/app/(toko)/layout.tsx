import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function TokoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">{children}</main>
      <Footer />
    </>
  );
}
