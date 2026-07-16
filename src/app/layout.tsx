import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Кітап Клубы",
  description: "Кітап оқудың дағдысын қалыптастырыңыз",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="kk">
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
