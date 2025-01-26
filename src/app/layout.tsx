import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Speech to Speech",
  description: "Speech to Speech",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
