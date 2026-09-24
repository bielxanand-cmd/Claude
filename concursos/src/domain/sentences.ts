/**
 * Divide um texto em frases sem cortar abreviações comuns em textos
 * jurídicos ("art. 60", "inc. II", "nº 8.112", "p. 12") nem antes de números.
 */
const SENTENCE_BREAK = /(?<!\b(?:art|arts|inc|incs|al|n|nº|p|pp|fl|fls|cf|ex|dr|dra|sr|sra|prof|vol|cap|pág|págs|obs)\.)(?<=[.!?;])\s+(?=["“(]?[A-ZÀ-Ý])/i

export const splitSentences = (text: string): string[] => text.split(SENTENCE_BREAK)
