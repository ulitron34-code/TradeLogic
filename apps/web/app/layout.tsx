import './globals.css';

export const metadata = {
  title: 'TradeLogic',
  description: 'Plataforma de inteligencia aduanera y fiscal',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body className="bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
