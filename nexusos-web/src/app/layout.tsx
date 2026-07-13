import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "NexusOS | Gestão inteligente de Ordens de Serviço",
    template: "%s | NexusOS"
  },
  description: "Plataforma para gestão de ordens de serviço, atendimento técnico, prazos, cobranças e portal do cliente.",
  applicationName: "NexusOS",
  authors: [{ name: "NexusOS" }],
  keywords: [
    "ordens de serviço",
    "gestão técnica",
    "SLA",
    "portal do cliente",
    "workflow técnico",
    "NexusOS"
  ],
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
