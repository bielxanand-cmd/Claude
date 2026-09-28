import { NextResponse } from "next/server";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

export async function readBody(req: Request): Promise<unknown> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return req.json();
  if (ct.includes("form")) {
    const fd = await req.formData();
    return Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
  }
  const text = await req.text();
  try {
    return JSON.parse(text);
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

export function toDate(v: unknown) {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}
