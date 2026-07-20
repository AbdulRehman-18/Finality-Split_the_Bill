import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/AuthContext";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://tally.finality.app"),
  title: {
    default: "Tally — Onchain Debt Surveillance & Micro-Settlement Protocol",
    template: "%s | Tally Protocol",
  },
  description:
    "Tally turns group expenses into an interactive live debt graph. Watch balances rebalance automatically with parallel topological optimization and settle in seconds on Monad EVM.",
  keywords: [
    "Tally",
    "Onchain Debt Surveillance",
    "Debt Surveillance Dashboard",
    "Group Expense Tracker",
    "Split Bills Onchain",
    "Monad EVM",
    "Micro Settlement Engine",
    "Zero Custody Split",
    "Cryptographic Shared Ledger",
    "Topological Rebalancing",
  ],
  authors: [{ name: "Tally Protocol Team", url: "https://github.com/finality-app" }],
  creator: "Tally Protocol",
  publisher: "Tally Protocol",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Tally — Every debt. Watched. Until it's paid.",
    description:
      "Continuous topological debt graph rebalancing with instant sub-second Monad EVM micro-settlements and zero custodial risk.",
    url: "https://tally.finality.app",
    siteName: "Tally Protocol",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Tally Protocol — Onchain Debt Surveillance Dashboard",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tally — Every debt. Watched. Until it's paid.",
    description:
      "Continuous topological debt graph rebalancing with instant sub-second Monad EVM micro-settlements.",
    images: ["/logo.png"],
    creator: "@finality_app",
  },
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
  alternates: {
    canonical: "https://tally.finality.app",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Tally Protocol",
  operatingSystem: "Web",
  applicationCategory: "FinanceApplication",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Tally turns group expenses into an interactive live debt graph with parallel topological rebalancing and instant Monad EVM micro-settlements.",
  image: "https://tally.finality.app/logo.png",
  url: "https://tally.finality.app",
  author: {
    "@type": "Organization",
    name: "Tally Protocol",
    url: "https://github.com/finality-app",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}


