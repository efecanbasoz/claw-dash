import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Sidebar, MobileNav } from '@/components/sidebar';
import { Header } from '@/components/header';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OCDS — OpenClaw Dashboard',
  description: 'Monitoring dashboard for OpenClaw',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
                {children}
              </main>
            </div>
          </div>
          <MobileNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
