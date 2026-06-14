import type { Metadata } from "next";
import "./globals.css";
import { AmbientBackground } from "@/components/AmbientBackground";
import { GlobalBackgroundMusic } from "@/components/GlobalBackgroundMusic";

export const metadata: Metadata = {
  title: "Friends' Game",
  description: "Пиксельная игра про дружбу — узнай, насколько хорошо ты знаешь друга",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="scanlines">
        <AmbientBackground />
        <GlobalBackgroundMusic />
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
