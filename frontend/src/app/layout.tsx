import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { ThreeBackground } from '@/components/ThreeBackground';
import { AIChat } from '@/components/AIChat';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '2026 FIFA 世界杯冠军预测系统',
  description: '基于AI多模型融合的2026年FIFA世界杯冠军预测分析平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={`${inter.className} bg-[#0a0a1a] text-slate-100 min-h-screen`}>
        <Providers>
          <ThreeBackground />
          <div className="relative z-10 flex min-h-screen">
            <Navigation />
            <main className="flex-1 ml-0 lg:ml-[240px] min-h-screen">
              <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
                {children}
              </div>
              <Footer />
            </main>
          </div>
          <AIChat />
        </Providers>
      </body>
    </html>
  );
}
