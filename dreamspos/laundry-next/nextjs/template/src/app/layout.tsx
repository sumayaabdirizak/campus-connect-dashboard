// src/app/layout.tsx
import type { Metadata } from "next";
import "../../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "./globals.scss";
import { Providers } from "@/core/providers";
import BootstrapJs from "@/components/bootstrap-js/bootstrapjs";
import "../style/fonts/lucide/lucide.css";

export const metadata: Metadata = {
  title: "Dashboard | Laundry POS - Bootstrap 5 Admin Dashboard",
  description: "Dreams POS is a powerful Bootstrap based Inventory Management Admin Template",
  authors: [{ name: "Dreams Technologies" }],
  icons: {
    icon: "favicon.png",
    apple: "apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body cz-shortcut-listen="true">
        <Providers>
          {children}
          <BootstrapJs />
        </Providers>
      </body>
    </html>
  );
}