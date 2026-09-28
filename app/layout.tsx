import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, EB_Garamond, Literata, Lora, Merriweather } from "next/font/google";
import "./globals.css";

// Fontes de leitura oferecidas no botão "Aa" (app/lib/readingFonts.ts).
// preload: false — cada arquivo só é baixado quando o leitor escolhe a fonte.
const literata = Literata({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-literata" });
const merriweather = Merriweather({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-merriweather" });
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-lora" });
const garamond = EB_Garamond({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-garamond" });
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false, variable: "--font-atkinson" });
const readingFontVars = [literata, merriweather, lora, garamond, atkinson].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "Bíblia Origens",
  description: "Estudo bíblico com análise interlinear em hebraico e grego.",
  appleWebApp: { capable: true, title: "Bíblia", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`h-full antialiased ${readingFontVars}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("biblia-origens-theme");if(t==="light")document.documentElement.setAttribute("data-theme","light");}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
