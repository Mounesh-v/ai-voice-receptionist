import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hospital Admin",
  description: "Hospital administration dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
