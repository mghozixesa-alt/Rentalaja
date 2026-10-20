"use client";

export default function Galat({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-extrabold">Ada yang tidak beres</h1>
      <p className="text-sm text-abu">Coba muat ulang. Bila masih terjadi, hubungi CS lewat WhatsApp +62 813-2470-0077.</p>
      <button onClick={reset} className="h-11 rounded-xl bg-teal px-5 font-extrabold text-navy">Coba lagi</button>
    </main>
  );
}
