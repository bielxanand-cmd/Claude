import { revalidatePath } from "next/cache";
import { usuarioAtualId } from "@/server/usuario";
import { gerarBackup, restaurarBackup } from "@/server/backup";
import { hoje } from "@/lib/datas";

export async function GET() {
  const userId = await usuarioAtualId();
  const backup = await gerarBackup(userId);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="metas-sdr-backup-${hoje()}.json"`,
    },
  });
}

export async function POST(req: Request) {
  const userId = await usuarioAtualId();
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ ok: false, erro: "Arquivo JSON inválido." }, { status: 400 });
  }
  const r = await restaurarBackup(userId, json);
  if (r.ok) revalidatePath("/", "layout");
  return Response.json(r, { status: r.ok ? 200 : 400 });
}
