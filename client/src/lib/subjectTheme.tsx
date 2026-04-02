type SubjectTheme = {
  bg: string;
  banner: React.ReactNode;
  pill: string;
  pillText: string;
};

export function getSubjectTheme(subject: string): SubjectTheme {
  const s = (subject || "").toLowerCase();

  if (/math|algebra|geometry|calculus|arithmetic|number/.test(s)) return {
    bg: "bg-violet-50",
    pill: "bg-violet-100 text-violet-700",
    pillText: "text-violet-700",
    banner: (
      <svg viewBox="0 0 320 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="320" height="100" fill="#ede9fe"/>
        <text x="26" y="62" fontSize="48" fill="#c4b5fd" fontFamily="serif" opacity="0.7">∑</text>
        <text x="90" y="52" fontSize="36" fill="#a78bfa" fontFamily="serif" opacity="0.6">π</text>
        <text x="148" y="68" fontSize="28" fill="#c4b5fd" fontFamily="monospace" opacity="0.7">x²</text>
        <text x="198" y="48" fontSize="38" fill="#a78bfa" fontFamily="serif" opacity="0.5">∫</text>
        <text x="248" y="66" fontSize="26" fill="#c4b5fd" fontFamily="monospace" opacity="0.6">÷</text>
        <text x="280" y="44" fontSize="32" fill="#a78bfa" fontFamily="monospace" opacity="0.4">√</text>
        <circle cx="72" cy="22" r="5" fill="#ddd6fe" opacity="0.6"/>
        <circle cx="180" cy="18" r="4" fill="#c4b5fd" opacity="0.5"/>
        <circle cx="290" cy="80" r="6" fill="#ddd6fe" opacity="0.5"/>
      </svg>
    ),
  };

  if (/science|biology|chemistry|physics|lab|nature|earth/.test(s)) return {
    bg: "bg-emerald-50",
    pill: "bg-emerald-100 text-emerald-700",
    pillText: "text-emerald-700",
    banner: (
      <svg viewBox="0 0 320 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="320" height="100" fill="#ecfdf5"/>
        <path d="M60 20 L60 52 L42 80 L78 80 Z" fill="none" stroke="#6ee7b7" strokeWidth="3" strokeLinejoin="round"/>
        <path d="M50 62 L70 62 L78 80 L42 80 Z" fill="#a7f3d0" opacity="0.7"/>
        <line x1="54" y1="20" x2="66" y2="20" stroke="#6ee7b7" strokeWidth="2.5"/>
        <path d="M130 15 Q150 35 130 55 Q110 75 130 95" fill="none" stroke="#6ee7b7" strokeWidth="2.5" opacity="0.7"/>
        <path d="M155 15 Q135 35 155 55 Q175 75 155 95" fill="none" stroke="#a7f3d0" strokeWidth="2.5" opacity="0.6"/>
        <line x1="130" y1="35" x2="155" y2="35" stroke="#34d399" strokeWidth="1.5" opacity="0.5"/>
        <line x1="130" y1="55" x2="155" y2="55" stroke="#34d399" strokeWidth="1.5" opacity="0.5"/>
        <circle cx="240" cy="50" r="6" fill="#6ee7b7"/>
        <ellipse cx="240" cy="50" rx="28" ry="10" fill="none" stroke="#a7f3d0" strokeWidth="2" opacity="0.7"/>
        <ellipse cx="240" cy="50" rx="28" ry="10" fill="none" stroke="#6ee7b7" strokeWidth="2" opacity="0.6" transform="rotate(60 240 50)"/>
        <ellipse cx="240" cy="50" rx="28" ry="10" fill="none" stroke="#a7f3d0" strokeWidth="2" opacity="0.5" transform="rotate(120 240 50)"/>
        <circle cx="295" cy="20" r="3" fill="#d1fae5" opacity="0.7"/>
        <circle cx="305" cy="75" r="4" fill="#a7f3d0" opacity="0.5"/>
      </svg>
    ),
  };

  if (/art|draw|paint|music|creative|design|craft/.test(s)) return {
    bg: "bg-pink-50",
    pill: "bg-pink-100 text-pink-700",
    pillText: "text-pink-700",
    banner: (
      <svg viewBox="0 0 320 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="320" height="100" fill="#fdf2f8"/>
        <ellipse cx="70" cy="52" rx="36" ry="28" fill="#fbcfe8" opacity="0.8"/>
        <circle cx="52" cy="38" r="7" fill="#f9a8d4"/>
        <circle cx="72" cy="30" r="7" fill="#c4b5fd"/>
        <circle cx="92" cy="38" r="7" fill="#6ee7b7"/>
        <circle cx="96" cy="58" r="7" fill="#fde68a"/>
        <circle cx="64" cy="68" r="5" fill="#fff" opacity="0.9"/>
        <line x1="100" y1="75" x2="148" y2="28" stroke="#f9a8d4" strokeWidth="4" strokeLinecap="round"/>
        <ellipse cx="148" cy="26" rx="5" ry="8" fill="#f472b6" transform="rotate(-45 148 26)"/>
        <text x="175" y="45" fontSize="28" fill="#f9a8d4" opacity="0.7">✦</text>
        <text x="218" y="72" fontSize="20" fill="#c4b5fd" opacity="0.6">✦</text>
        <text x="255" y="38" fontSize="16" fill="#fbcfe8" opacity="0.8">✦</text>
        <rect x="268" y="50" width="14" height="14" rx="3" fill="#f9a8d4" opacity="0.7"/>
        <rect x="286" y="50" width="14" height="14" rx="3" fill="#c4b5fd" opacity="0.7"/>
        <rect x="268" y="68" width="14" height="14" rx="3" fill="#6ee7b7" opacity="0.7"/>
        <rect x="286" y="68" width="14" height="14" rx="3" fill="#fde68a" opacity="0.7"/>
      </svg>
    ),
  };

  if (/history|social|civics|geography|world|culture/.test(s)) return {
    bg: "bg-amber-50",
    pill: "bg-amber-100 text-amber-700",
    pillText: "text-amber-700",
    banner: (
      <svg viewBox="0 0 320 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="320" height="100" fill="#fffbeb"/>
        <circle cx="65" cy="50" r="32" fill="none" stroke="#fcd34d" strokeWidth="2.5"/>
        <ellipse cx="65" cy="50" rx="16" ry="32" fill="none" stroke="#fde68a" strokeWidth="2" opacity="0.8"/>
        <line x1="33" y1="50" x2="97" y2="50" stroke="#fcd34d" strokeWidth="1.5" opacity="0.7"/>
        <line x1="38" y1="32" x2="92" y2="32" stroke="#fde68a" strokeWidth="1.5" opacity="0.6"/>
        <line x1="38" y1="68" x2="92" y2="68" stroke="#fde68a" strokeWidth="1.5" opacity="0.6"/>
        <rect x="128" y="28" width="60" height="44" rx="4" fill="#fde68a" opacity="0.7"/>
        <rect x="122" y="28" width="8" height="44" rx="4" fill="#fcd34d" opacity="0.8"/>
        <rect x="188" y="28" width="8" height="44" rx="4" fill="#fcd34d" opacity="0.8"/>
        <line x1="138" y1="42" x2="178" y2="42" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6"/>
        <line x1="138" y1="52" x2="178" y2="52" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6"/>
        <line x1="138" y1="62" x2="165" y2="62" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5"/>
        <text x="220" y="42" fontSize="26" fill="#fcd34d" opacity="0.7">★</text>
        <text x="258" y="68" fontSize="18" fill="#fde68a" opacity="0.6">★</text>
        <text x="285" y="38" fontSize="14" fill="#fcd34d" opacity="0.5">★</text>
      </svg>
    ),
  };

  if (/english|writing|reading|language|lit|grammar|spelling|phonics/.test(s)) return {
    bg: "bg-sky-50",
    pill: "bg-sky-100 text-sky-700",
    pillText: "text-sky-700",
    banner: (
      <svg viewBox="0 0 320 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="320" height="100" fill="#f0f9ff"/>
        <path d="M40 70 L40 28 Q65 22 80 35 L80 70 Q65 60 40 70Z" fill="#bae6fd" opacity="0.8"/>
        <path d="M80 35 Q95 22 120 28 L120 70 Q95 60 80 70 L80 35Z" fill="#7dd3fc" opacity="0.7"/>
        <line x1="80" y1="35" x2="80" y2="70" stroke="#38bdf8" strokeWidth="1.5"/>
        <line x1="50" y1="44" x2="73" y2="41" stroke="#38bdf8" strokeWidth="1.5" opacity="0.5"/>
        <line x1="50" y1="52" x2="73" y2="50" stroke="#38bdf8" strokeWidth="1.5" opacity="0.5"/>
        <line x1="50" y1="60" x2="73" y2="59" stroke="#38bdf8" strokeWidth="1.5" opacity="0.4"/>
        <line x1="87" y1="41" x2="110" y2="44" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.5"/>
        <line x1="87" y1="50" x2="110" y2="52" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.5"/>
        <line x1="87" y1="59" x2="105" y2="60" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.4"/>
        <text x="148" y="55" fontSize="38" fill="#7dd3fc" fontFamily="Georgia, serif" opacity="0.7">Aa</text>
        <text x="220" y="42" fontSize="24" fill="#bae6fd" fontFamily="Georgia, serif" opacity="0.6">Bb</text>
        <text x="262" y="68" fontSize="20" fill="#7dd3fc" fontFamily="Georgia, serif" opacity="0.5">Cc</text>
        <text x="290" y="32" fontSize="16" fill="#bae6fd" fontFamily="Georgia, serif" opacity="0.5">Dd</text>
      </svg>
    ),
  };

  return {
    bg: "bg-slate-50",
    pill: "bg-slate-100 text-slate-600",
    pillText: "text-slate-600",
    banner: (
      <svg viewBox="0 0 320 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="320" height="100" fill="#f8fafc"/>
        <circle cx="60" cy="50" r="28" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeDasharray="6 4"/>
        <circle cx="160" cy="50" r="22" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2"/>
        <circle cx="250" cy="50" r="18" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 3"/>
        <text x="148" y="56" fontSize="18" fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">✦</text>
      </svg>
    ),
  };
}
