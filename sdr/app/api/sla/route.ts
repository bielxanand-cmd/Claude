import { json } from "@/lib/http";
import { slaState } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  return json(await slaState());
}
