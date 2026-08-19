import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oqyrman",
  description: "Кітап оқудың дағдысын қалыптастырыңыз",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Oqyrman",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="kk" className={nunito.variable}>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: "12px",
              background: "#14532d",
              color: "#fff",
              fontSize: "14px",
            },
            success: { style: { background: "#16a34a" } },
            error: { style: { background: "#dc2626" } },
          }}
        />
      </body>
    </html>
  );
}
