import type { Metadata } from "next";
import { Syne, DM_Sans, DM_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import "./globals.css";

const syne = Syne({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareerOS — Your Professional Command Center",
  description:
    "Analyze job fits, practice mock interviews, and map your career path — powered by AI. Your operating system for career growth.",
  openGraph: {
    title: "CareerOS — Your Professional Command Center",
    description: "Analyze job fits, practice mock interviews, and map your career path — powered by AI. Your operating system for career growth.",
    url: "https://careerpilot.vercel.app",
    siteName: "CareerOS",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CareerOS Social Card",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareerOS — Your Professional Command Center",
    description: "Analyze job fits, practice mock interviews, and map your career path — powered by AI. Your operating system for career growth.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${dmMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#1a1916",
                border: "1px solid #2d2a26",
                color: "#fafaf9",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
