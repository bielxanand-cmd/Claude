/**
 * Arte padrão da capa (usada quando o vendedor não envia imagem).
 * SVG inline — não depende de rede e sai nítida no PDF.
 */
function coverSvg(brand: string, ink: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 900" width="800" height="900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ink}"/>
      <stop offset="1" stop-color="#1D2939"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.72" cy="0.28" r="0.6">
      <stop offset="0" stop-color="${brand}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${brand}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${brand}"/>
      <stop offset="1" stop-color="#FF8A3D"/>
    </linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect width="800" height="900" fill="url(#bg)"/>
  <rect width="800" height="900" fill="url(#glow)"/>
  <g fill="none" stroke="${brand}" stroke-opacity="0.35">
    <circle cx="610" cy="250" r="140" stroke-width="2"/>
    <circle cx="610" cy="250" r="220" stroke-width="1.5" stroke-opacity="0.22"/>
    <circle cx="610" cy="250" r="310" stroke-width="1" stroke-opacity="0.14"/>
  </g>
  <g fill="#FFFFFF" fill-opacity="0.06">
    ${Array.from({ length: 8 }, (_, r) =>
      Array.from({ length: 6 }, (_, c) => `<circle cx="${70 + c * 26}" cy="${620 + r * 26}" r="2.5"/>`).join(''),
    ).join('')}
  </g>
  <g filter="url(#sh)" transform="translate(250 150) rotate(-6)">
    <rect width="300" height="600" rx="44" fill="#0B1220"/>
    <rect x="12" y="12" width="276" height="576" rx="34" fill="#F5F7FA"/>
    <rect x="110" y="26" width="80" height="18" rx="9" fill="#0B1220"/>
    <rect x="32" y="70" width="120" height="12" rx="6" fill="${ink}" fill-opacity="0.85"/>
    <rect x="32" y="92" width="80" height="10" rx="5" fill="${ink}" fill-opacity="0.25"/>
    <rect x="32" y="126" width="236" height="150" rx="22" fill="url(#card)"/>
    <circle cx="228" cy="166" r="22" fill="#FFFFFF" fill-opacity="0.25"/>
    <rect x="54" y="150" width="90" height="10" rx="5" fill="#FFFFFF" fill-opacity="0.7"/>
    <rect x="54" y="176" width="150" height="30" rx="8" fill="#FFFFFF"/>
    <rect x="54" y="226" width="110" height="10" rx="5" fill="#FFFFFF" fill-opacity="0.55"/>
    <g transform="translate(32 300)">
      <rect width="112" height="96" rx="18" fill="#FFFFFF"/>
      <circle cx="30" cy="30" r="14" fill="${brand}" fill-opacity="0.15"/>
      <rect x="18" y="58" width="70" height="9" rx="4.5" fill="${ink}" fill-opacity="0.8"/>
      <rect x="18" y="74" width="46" height="8" rx="4" fill="${ink}" fill-opacity="0.25"/>
      <rect x="124" width="112" height="96" rx="18" fill="${ink}"/>
      <circle cx="154" cy="30" r="14" fill="${brand}"/>
      <rect x="142" y="58" width="70" height="9" rx="4.5" fill="#FFFFFF" fill-opacity="0.85"/>
      <rect x="142" y="74" width="46" height="8" rx="4" fill="#FFFFFF" fill-opacity="0.35"/>
    </g>
    <g transform="translate(32 420)">
      ${[0, 1, 2]
        .map(
          (i) => `<g transform="translate(0 ${i * 50})">
        <rect width="236" height="40" rx="12" fill="#FFFFFF"/>
        <circle cx="22" cy="20" r="10" fill="${brand}" fill-opacity="${0.9 - i * 0.25}"/>
        <rect x="42" y="14" width="${110 - i * 18}" height="8" rx="4" fill="${ink}" fill-opacity="0.7"/>
        <rect x="180" y="14" width="40" height="12" rx="6" fill="${brand}" fill-opacity="0.18"/>
      </g>`,
        )
        .join('')}
    </g>
  </g>
  <g filter="url(#sh)" transform="translate(520 560)">
    <rect width="210" height="92" rx="22" fill="#FFFFFF"/>
    <circle cx="46" cy="46" r="24" fill="${brand}"/>
    <path d="M36 47 l7 7 l13 -15" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="84" y="30" width="96" height="11" rx="5.5" fill="${ink}"/>
    <rect x="84" y="52" width="66" height="9" rx="4.5" fill="${ink}" fill-opacity="0.3"/>
  </g>
  <g filter="url(#sh)" transform="translate(90 250)">
    <circle r="56" cx="56" cy="56" fill="url(#card)"/>
    <circle r="40" cx="56" cy="56" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="3"/>
    <path d="M56 34 v44 M44 44 h18 a8 8 0 0 1 0 16 h-12 a8 8 0 0 0 0 16 h18" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>
</svg>`
}

export function defaultCoverImage(brand = '#FF5C00', ink = '#101828') {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(coverSvg(brand, ink))}`
}
