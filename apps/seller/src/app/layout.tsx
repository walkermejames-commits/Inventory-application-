import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[var(--duck-background-primary)] text-[var(--duck-cream)] antialiased">
        {children}
      </body>
    </html>
  );
}
