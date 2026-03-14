export const dynamic = 'force-dynamic'

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { ThemeProvider } from "@/contexts/theme-context"
import { UserPreferencesProvider } from "@/contexts/user-preferences-context"
import { StaticDataProvider } from "@/providers/static-data-provider"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "AgentFlow - Development Pipeline",
  description: "Autonomous development pipeline orchestrator",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased min-h-screen`}
        suppressHydrationWarning
      >
        <StaticDataProvider>
          <ThemeProvider>
            <UserPreferencesProvider agentId={1}>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
            </UserPreferencesProvider>
          </ThemeProvider>
        </StaticDataProvider>
      </body>
    </html>
  )
}
