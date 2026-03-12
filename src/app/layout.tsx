import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { LayoutWrapper } from "@/components/layout/layout-wrapper"

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
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-slate-950 text-white min-h-screen`}
      >
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  )
}