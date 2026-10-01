import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://clause.app"),
  title: {
    default: "Clause — Contract answers you can verify, word for word",
    template: "%s | Clause",
  },
  description:
    "AI-powered legal contract analysis backed by server-verified quotations. Zero hallucinations, exact page-offset jump, and semantic redline comparisons.",
  keywords: [
    "contract analysis",
    "legal ai",
    "contract review",
    "verified citations",
    "redline comparison",
    "legal tech",
    "clause extraction",
  ],
  authors: [{ name: "Clause" }],
  creator: "Clause",
  publisher: "Clause Inc.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://clause.app",
    siteName: "Clause",
    title: "Clause — Contract answers you can verify, word for word",
    description:
      "Interrogate covenants and liabilities with zero hallucinations. Every answer is backed by exact document character coordinates.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Clause — Verifiable Legal Contract Analysis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Clause — Contract answers you can verify, word for word",
    description:
      "Interrogate covenants and liabilities with zero hallucinations. Every answer is backed by exact document character coordinates.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} dark`}>
      <body className="min-h-screen bg-bg text-text antialiased selection:bg-accent/30 selection:text-white">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            },
          }}
        />
      </body>
    </html>
  );
}
