"use client";

import { useState } from "react";

export function SalinNomor({ nomor }: { nomor: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(nomor.replace(/\s/g, ""));
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        } catch {
          setOk(false);
        }
      }}
      className="h-10 rounded-lg border border-abu-input bg-white px-3 text-sm font-bold"
    >
      {ok ? "Tersalin" : "Salin nomor"}
    </button>
  );
}
