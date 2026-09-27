import "./globals.css";
import "./refresh.css";
import "./onboarding.css";
import "./chat.css";

export const metadata = {
  title: "Jelly",
  description: "Track betting activity, spending, wins, and losses in one place."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
