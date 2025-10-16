import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

import Navbar from "../components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "InvoiceX",
  description: "Make easy invoices for your clients",
  image: "./favicon.ico",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
