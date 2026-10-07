"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { RegistroRapidoProvider } from "@/components/registro/registro-rapido";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <RegistroRapidoProvider>{children}</RegistroRapidoProvider>
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}
