import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareerPilot – Your AI Career Co-Pilot",
  description:
    "Analyze job fits, practice mock interviews, and map your path to the next level — all powered by AI.",
  openGraph: {
    title: "CareerPilot – Your AI Career Co-Pilot",
    description: "Analyze job fits, practice mock interviews, and map your path to the next level — all powered by AI.",
    url: "https://careerpilot.vercel.app",
    siteName: "CareerPilot",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CareerPilot Social Card",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareerPilot – Your AI Career Co-Pilot",
    description: "Analyze job fits, practice mock interviews, and map your path to the next level — all powered by AI.",
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
      className={`${plusJakartaSans.variable} ${inter.variable}`}
    >
      <body className="antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#111827",
              border: "1px solid #1E3A5F",
              color: "#F1F5F9",
            },
          }}
        />
      </body>
    </html>
  );
}
