import type { Metadata } from "next";

import "./globals.css"
import { ThemeProvider } from "./components/theme-provider";
import { Providers } from "./components/providers";



export const metadata: Metadata = {
  title: "Data Vidhya Labs",
  description: "Provision your learning Infra in a click!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body >
      <Providers>
      <ThemeProvider attribute="class" defaultTheme="dark">
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </ThemeProvider>
      </Providers>
      
      </body>
    </html>
  );
}
