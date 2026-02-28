// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import { Nunito, Poppins } from "next/font/google";
import { Providers } from "@/components/ui/Providers";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800", "900"],
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  title: "FitAI – Your Smart Gym Buddy",
  description: "AI-powered gym assistant with pose detection, diet planning and workout coaching",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${poppins.variable}`}>
      <body>
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#0d2137",
                color: "#fff",
                border: "1px solid rgba(79,195,247,0.3)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
