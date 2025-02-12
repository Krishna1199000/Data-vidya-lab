'use client'

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { SessionProvider } from "next-auth/react"
import { type ThemeProviderProps } from "next-themes"

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <SessionProvider>
      <NextThemesProvider {...props} attribute="class" defaultTheme="dark" enableSystem>
        {children}
      </NextThemesProvider>
    </SessionProvider>
  )
}

