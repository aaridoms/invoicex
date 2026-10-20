import { DEFAULT_THEME, themeBootScript } from "@/lib/theme";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "InvoiceX",
  description: "Facturas rápidas y limpias en PDF",
};

export default function RootLayout({ children }) {
  return (
    // data-theme lo ajusta el script antes de pintar; suppressHydrationWarning
    // evita el aviso de React porque el valor puede diferir del del servidor
    <html
      lang="es"
      className={inter.variable}
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
