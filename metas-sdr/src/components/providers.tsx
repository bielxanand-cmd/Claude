"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { RegistroRapidoProvider } from "@/components/registro/registro-rapido";
import type { LeadOpcao } from "@/components/registro/lead-picker";

export function Providers({ leads, children }: { leads: LeadOpcao[]; children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <RegistroRapidoProvider leads={leads}>{children}</RegistroRapidoProvider>
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}
