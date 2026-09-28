"use client";
// Alertas sonoros (Web Audio, sem arquivos) e notificações do navegador.

let ctx: AudioContext | null = null;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
}

function tone(freq: number, start: number, dur: number) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.05);
}

/** Lead novo: três bipes subindo. */
export function soundNewLead() {
  unlockAudio();
  tone(660, 0, 0.15);
  tone(880, 0.18, 0.15);
  tone(1100, 0.36, 0.25);
}

/** Falta 1 minuto: dois bipes graves. */
export function soundWarning() {
  unlockAudio();
  tone(520, 0, 0.25);
  tone(520, 0.35, 0.25);
}

export function notificationsEnabled() {
  return typeof Notification !== "undefined" && Notification.permission === "granted";
}

export async function enableAlerts() {
  unlockAudio();
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    await Notification.requestPermission();
  }
  return notificationsEnabled();
}

export function notify(title: string, body: string, url?: string) {
  if (!notificationsEnabled()) return;
  const n = new Notification(title, { body, tag: title + body, requireInteraction: false });
  n.onclick = () => {
    window.focus();
    if (url) window.location.href = url;
    n.close();
  };
}
