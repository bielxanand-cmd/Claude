import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navegacao } from "@/components/layout/navegacao";
import { usuarioAtualId } from "@/server/usuario";
import { leadsParaSelecao } from "@/server/queries/hoje";

export const metadata: Metadata = {
  title: "Metas SDR",
  description: "Registro de atividades e acompanhamento de metas de agendamento",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafc" },
    { media: "(prefers-color-scheme: dark)", color: "#16171d" },
  ],
};

// Dados sempre frescos: o app é um painel em tempo real.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const userId = await usuarioAtualId();
  const leads = await leadsParaSelecao(userId);
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers leads={leads}>
          <Navegacao />
          <main className="mx-auto max-w-6xl px-4 pb-40 pt-6 md:pb-12">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
