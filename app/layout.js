import './globals.css';

export const metadata = {
  title: 'BeSkinPro Mobile',
  description: 'Diagnóstico dermo-cosmético profesional - App móvil para farmacéuticos',
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  themeColor: '#0f0f1a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BeSkinPro',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0f0f1a" />
      </head>
      <body>
        <div className="app-shell">
          {children}
        </div>
      </body>
    </html>
  );
}
