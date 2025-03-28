import type { Metadata } from "next";

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider";

import { Providers } from "@/components/provider";


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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}