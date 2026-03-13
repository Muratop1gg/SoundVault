import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"
import { GlobalPlayer } from "@/components/player/global-player"
import { PlayerProvider } from "@/components/player/player-context"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SoundVault — Online Audio Player",
  description:
    "Upload, manage and share your audio files with SoundVault — a sleek online audio player with access control and beautiful waveform visualization.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="dark">
      <body className="font-sans antialiased bg-background text-foreground">
        <PlayerProvider>
          {children}
          <GlobalPlayer />
        </PlayerProvider>

        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
