import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crelab",
  description:
    "A dark, cinematic marketplace where video is the first thing you see and quality speaks louder than follower count.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
