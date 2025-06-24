import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Inter } from "next/font/google";
import "../globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Web3Provider from "../components/Web3Provider";
import { GoogleAnalytics } from "@next/third-parties/google";
import { GA_TRACKING_ID } from "../lib/gtag";
import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kaiaverse Portal | Your AI-First Gateway to the Kaia Ecosystem",
  description:
    "Kaiaverse Portal is your comprehensive gateway to the Kaia Ecosystem, offering AI-powered tools, resources, and insights for the next generation of digital innovation.",
  keywords:
    "Kaiaverse, AI, artificial intelligence, blockchain, digital ecosystem, innovation, web3",
  authors: [{ name: "Kaiaverse Team" }],
  creator: "Kaiaverse",
  publisher: "Kaiaverse",
  robots: "index, follow",
  icons: {
    icon: "/images/kaiaverse_icon.png",
    apple: "/images/kaiaverse_icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://kaiaverse.xyz",
    title: "Kaiaverse Portal | Your AI-First Gateway to the Kaia Ecosystem",
    description:
      "Kaiaverse Portal is your comprehensive gateway to the Kaia Ecosystem, offering AI-powered tools, resources, and insights for the next generation of digital innovation.",
    siteName: "Kaiaverse Portal",
    images: [
      {
        url: "/images/kaiaverse-og.jpg",
        width: 1200,
        height: 630,
        alt: "Kaiaverse Portal Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kaiaverse Portal | Your AI-First Gateway to the Kaia Ecosystem",
    description:
      "Kaiaverse Portal is your comprehensive gateway to the Kaia Ecosystem, offering AI-powered tools, resources, and insights for the next generation of digital innovation.",
    images: ["/images/kaiaverse-og.jpg"],
    creator: "@kaiaverse",
  },
  verification: {
    google: "your-google-verification-code",
  },
  alternates: {
    canonical: "https://kaiaverse.xyz",
  },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  // Await params in Next.js 15
  const { locale } = await params;

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <NextIntlClientProvider messages={messages}>
          <Web3Provider>
            <Navbar />
            <main className="container mx-auto px-4 flex-grow">{children}</main>
            <Footer />
          </Web3Provider>
        </NextIntlClientProvider>

        <GoogleAnalytics gaId={GA_TRACKING_ID} />
      </body>
    </html>
  );
}
