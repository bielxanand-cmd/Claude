import { json } from "@/lib/http";
import { suggestSlots } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

export async function GET() {
  return json(await suggestSlots());
}
