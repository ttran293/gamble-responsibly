import "./globals.css";

export const metadata = {
  title: "Stillwater | A calmer way to reflect",
  description: "A private gambling-harm awareness companion."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
