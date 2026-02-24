import "./globals.css";

export const metadata = {
  title: "Sankalpa — From intention to action",
  description: "Voice-first habit tracking. Speak naturally, we handle the rest.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-stone-50 text-stone-800">
        {children}
      </body>
    </html>
  );
}
