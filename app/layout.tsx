import "./globals.css";
import "./refresh.css";
import "./onboarding.css";

export const metadata = {
  title: "Stillwater | Track betting habits and spending",
  description: "Track betting activity, spending, wins, and losses in one place."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
