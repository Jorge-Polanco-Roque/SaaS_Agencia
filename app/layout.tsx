import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JSM Flow — Operación de agencia",
  description:
    "Plataforma de cotización, proyectos, compras y cobranza para JSM.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('jsm-theme')||'indigo';document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
