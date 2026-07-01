import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DemoRoleSwitcher from "@/components/DemoRoleSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sima Booth Administration System",
  description: "Digitalisasi dan monitoring administrasi transaksi emas PT Sima (Sinar Inti Maju) pada booth event secara cepat, akurat, dan real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const theme = localStorage.getItem('sbas_theme') || 'dark';
              if (theme === 'dark') {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
              } else {
                document.documentElement.classList.add('light');
                document.documentElement.classList.remove('dark');
              }
            } catch (e) {}
          })()
        ` }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200 antialiased">
        <main className="flex-1 flex flex-col">{children}</main>
        {process.env.NEXT_PUBLIC_APP_ENV === "staging" && <DemoRoleSwitcher />}
      </body>
    </html>
  );
}
