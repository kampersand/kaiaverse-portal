import type { Metadata } from "next";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';

export const metadata: Metadata = {
  title: "Kaiaverse Portal | Your AI-First Gateway to the Kaia Ecosystem",
  description: "Kaiaverse Portal is your comprehensive gateway to the Kaia Ecosystem, offering AI-powered tools, resources, and insights for the next generation of digital innovation.",
  keywords: "Kaiaverse, AI, artificial intelligence, blockchain, digital ecosystem, innovation, web3",
  authors: [{ name: "Kaiaverse Team" }],
  creator: "Kaiaverse",
  publisher: "Kaiaverse",
  robots: "index, follow",
  icons: {
    icon: '/images/kaiaverse_icon.png',
    apple: '/images/kaiaverse_icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://kaiaverse.xyz',
    title: 'Kaiaverse Portal | Your AI-First Gateway to the Kaia Ecosystem',
    description: 'Kaiaverse Portal is your comprehensive gateway to the Kaia Ecosystem, offering AI-powered tools, resources, and insights for the next generation of digital innovation.',
    siteName: 'Kaiaverse Portal',
    images: [{
      url: '/images/kaiaverse-og.jpg',
      width: 1200,
      height: 630,
      alt: 'Kaiaverse Portal Preview'
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kaiaverse Portal | Your AI-First Gateway to the Kaia Ecosystem',
    description: 'Kaiaverse Portal is your comprehensive gateway to the Kaia Ecosystem, offering AI-powered tools, resources, and insights for the next generation of digital innovation.',
    images: ['/images/kaiaverse-og.jpg'],
    creator: '@kaiaverse',
  },
  verification: {
    google: 'your-google-verification-code',
  },
  alternates: {
    canonical: 'https://kaiaverse.xyz',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
} 