import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "NexusOS | Gestão inteligente de Tickets",
    template: "%s | NexusOS"
  },
  description: "Plataforma para gestão de tickets, atendimento técnico, prazos, cobranças e portal do cliente.",
  applicationName: "NexusOS",
  authors: [{ name: "NexusOS" }],
  keywords: [
    "tickets",
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
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nexusos.theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}})()`
          }}
        />
      </head>
      <body className={inter.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
