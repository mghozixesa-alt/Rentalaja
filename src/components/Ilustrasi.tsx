/** Ilustrasi pemandangan Garut berwarna merek, dipakai bila banner belum punya foto. */
export type Tema = "motor" | "camp" | "inap" | "jeep";

const LANGIT: Record<Tema, [string, string]> = {
  motor: ["#1F2B4D", "#2E4A7A"],
  camp: ["#2A3D63", "#E08A4F"],
  inap: ["#1F2B4D", "#3B5E8C"],
  jeep: ["#3B2F5C", "#E08A4F"],
};

export function Ilustrasi({ tema, id }: { tema: Tema; id: string }) {
  const [a, b] = LANGIT[tema];
  return (
    <svg viewBox="0 0 290 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id={`langit-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="290" height="150" fill={`url(#langit-${id})`} />
      <path d="M0 93 L52 57 L96 82 L151 45 L209 78 L249 60 L290 84 L290 150 L0 150z" fill="#18233F" opacity="0.9" />
      <path d="M0 112 Q72 90 145 108 T290 102 L290 150 L0 150z" fill="#077A70" />
      <path d="M0 129 Q87 114 174 129 T290 123 L290 150 L0 150z" fill="#09BEAF" />
      {tema === "motor" ? (
        <g transform="translate(200 108)" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="0" cy="12" r="8" /><circle cx="38" cy="12" r="8" /><path d="M0 12l12-14h13l13 14M12-2l-4-7h-7M25-2l5-6" />
        </g>
      ) : null}
      {tema === "camp" ? (
        <g><g transform="translate(190 90)"><path d="M0 36 L27 0 L54 36z" fill="#FFF1D6" /><path d="M27 0 L27 36 L20 36z" fill="#D9782C" /></g><circle cx="250" cy="40" r="14" fill="#FFD27A" /></g>
      ) : null}
      {tema === "inap" ? (
        <g transform="translate(190 80)"><path d="M0 20 L25 0 L50 20z" fill="#FFF1D6" /><rect x="5" y="20" width="40" height="27" fill="#F6F7F9" /><rect x="20" y="31" width="10" height="16" fill="#077A70" /><rect x="9" y="25" width="8" height="7" fill="#FFD27A" /><rect x="33" y="25" width="8" height="7" fill="#FFD27A" /></g>
      ) : null}
      {tema === "jeep" ? (
        <g><g transform="translate(185 96)"><rect x="0" y="6" width="54" height="20" rx="4" fill="#FFF1D6" /><path d="M8 6 L13 -7 H37 L42 6z" fill="#FFF1D6" /><circle cx="11" cy="28" r="6" fill="#1F2B4D" /><circle cx="43" cy="28" r="6" fill="#1F2B4D" /></g><circle cx="60" cy="42" r="16" fill="#FFD27A" /></g>
      ) : null}
    </svg>
  );
}
