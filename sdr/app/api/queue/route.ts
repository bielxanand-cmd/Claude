import { json } from "@/lib/http";
import { buildQueue } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  return json(await buildQueue());
}
