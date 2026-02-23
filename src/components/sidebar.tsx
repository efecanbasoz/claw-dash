'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, MessageSquare, Rss, DollarSign,
  Brain, Activity, Server, Clock, GitBranch,
  Settings, ChevronLeft, ChevronRight, Zap, ShieldAlert, SlidersHorizontal
} from 'lucide-react';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sessions', label: 'Sessions', icon: MessageSquare },
  { href: '/feed', label: 'Live Feed', icon: Rss },
  { href: '/costs', label: 'Cost Analysis', icon: DollarSign },
  { href: '/memory', label: 'Memory', icon: Brain },
  { href: '/health', label: 'System Health', icon: Activity },
  { href: '/security', label: 'Security', icon: ShieldAlert },
  { href: '/services', label: 'Services', icon: Server },
  { href: '/cron', label: 'Cron Jobs', icon: Clock },
  { href: '/git', label: 'Git Activity', icon: GitBranch },
  { href: '/config', label: 'Config', icon: SlidersHorizontal },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      'hidden md:flex flex-col border-r border-border bg-surface/50 backdrop-blur-xl transition-all duration-300',
      collapsed ? 'w-16' : 'w-60'
    )}>
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Zap className="h-6 w-6 text-primary shrink-0" />
        {!collapsed && <span className="font-bold text-lg">OCDS</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded hover:bg-secondary transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              active
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}>
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const mobileNav = nav.slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background/80 backdrop-blur-xl">
      {mobileNav.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={cn(
            'flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors',
            active ? 'text-primary' : 'text-muted-foreground'
          )}>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
