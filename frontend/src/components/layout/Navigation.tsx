'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Grid3X3,
  GitBranch,
  Trophy,
  Brain,
  MessageSquare,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: '总览', icon: LayoutDashboard, href: '/dashboard' },
  { label: '球队分析', icon: Users, href: '/teams' },
  { label: '小组赛', icon: Grid3X3, href: '/groups' },
  { label: '淘汰赛', icon: GitBranch, href: '/knockout' },
  { label: '冠军预测', icon: Trophy, href: '/champion' },
  { label: '可解释AI', icon: Brain, href: '/explain' },
  { label: 'AI助手', icon: MessageSquare, href: '/chat' },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard';
    }
    return pathname?.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <span className="text-2xl">🏆</span>
        <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
          WC Predictor
        </span>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden ml-auto text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-5 py-4 border-t border-white/10 space-y-1">
        <p className="text-xs text-slate-500">数据更新: {new Date().toISOString().slice(0, 10)}</p>
        <p className="text-xs text-slate-600">v1.0.0</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl text-slate-300 hover:text-white transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="lg:hidden fixed top-0 left-0 z-50 h-full w-[240px] bg-[#0a0a1a]/95 backdrop-blur-xl border-r border-white/10"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-30 h-full w-[240px] bg-white/5 backdrop-blur-xl border-r border-white/10 flex-col">
        {sidebarContent}
      </aside>
    </>
  );
}
