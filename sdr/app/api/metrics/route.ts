import { json, toDate } from "@/lib/http";
import { computeMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") === "week" ? "week" : "day";
  const ref = toDate(url.searchParams.get("date")) ?? new Date();
  return json(await computeMetrics(range, ref));
}
