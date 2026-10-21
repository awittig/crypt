import type { Metadata } from "next";

import { AppConvexProvider } from "@/components/convex-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Cryptic Together",
    template: "%s · Cryptic Together",
  },
  description: "A private room for solving Guardian cryptic crosswords together.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full">
        <AppConvexProvider>{children}</AppConvexProvider>
      </body>
    </html>
  );
}
