const COLORS = ['#7C3AED', '#A78BFA', '#22C55E', '#5B21B6', '#FACC15']

/** Pequena explosão de confete a partir de um elemento (respeita reduced-motion). */
export function celebrate(origin?: Element | null) {
  if (typeof window === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const rect = origin?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
  for (let i = 0; i < 26; i++) {
    const piece = document.createElement('span')
    piece.className = 'confetti-piece'
    const angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.4
    const distance = 60 + Math.random() * 90
    piece.style.left = `${x}px`
    piece.style.top = `${y}px`
    piece.style.background = COLORS[i % COLORS.length]
    piece.style.setProperty('--dx', `${Math.cos(angle) * distance}px`)
    piece.style.setProperty('--dy', `${Math.sin(angle) * distance - 30}px`)
    piece.style.setProperty('--rot', `${Math.random() * 540 - 270}deg`)
    if (i % 3 === 0) piece.style.borderRadius = '50%'
    document.body.appendChild(piece)
    setTimeout(() => piece.remove(), 950)
  }
}
