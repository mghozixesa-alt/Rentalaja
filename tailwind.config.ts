import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1F2B4D",
        teal: { DEFAULT: "#09BEAF", tua: "#077A70", muda: "#E3F7F5" },
        abu: { DEFAULT: "#4A5468", garis: "#E6E8EC", latar: "#F6F7F9", input: "#D5D9E0" },
        status: { baikBg: "#E4F2EA", baik: "#1E6B45", waspadaBg: "#FFF1D6", waspada: "#8A4B00", burukBg: "#FDECEA", buruk: "#A12A1F", infoBg: "#E8EEF8" },
      },
      fontFamily: { sans: ["var(--font-jakarta)", "system-ui", "sans-serif"] },
      borderRadius: { kartu: "16px" },
    },
  },
  plugins: [],
};
export default config;
