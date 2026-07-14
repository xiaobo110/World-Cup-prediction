import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatCurrency(eur: number): string {
  if (eur >= 1_000_000_000) {
    return '€' + (eur / 1_000_000_000).toFixed(2) + 'B';
  }
  if (eur >= 1_000_000) {
    return '€' + (eur / 1_000_000).toFixed(1) + 'M';
  }
  if (eur >= 1_000) {
    return '€' + (eur / 1_000).toFixed(0) + 'K';
  }
  return '€' + eur.toString();
}

export function formatPercent(value: number, decimals: number = 1): string {
  return (value * 100).toFixed(decimals) + '%';
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}/${day}`;
}

export function getResultColor(result: number[]): string {
  // 3 = win, 1 = draw, 0 = loss
  const colors = result.map(r => {
    if (r === 3) return 'bg-emerald-500';
    if (r === 1) return 'bg-amber-500';
    return 'bg-red-500';
  });
  return colors.join(' ');
}

export function getFormColor(value: number): string {
  if (value === 3 || value === 1) return 'bg-emerald-500';
  if (value === 0) return 'bg-amber-500';
  return 'bg-red-500';
}

export function getQualificationColor(prob: number): string {
  if (prob >= 0.7) return 'text-emerald-400';
  if (prob >= 0.4) return 'text-amber-400';
  return 'text-red-400';
}

export function getQualificationBgColor(prob: number): string {
  if (prob >= 0.7) return 'bg-emerald-500';
  if (prob >= 0.4) return 'bg-amber-500';
  return 'bg-red-500';
}

export function getStageName(stage: string): string {
  const stageMap: Record<string, string> = {
    'group': '小组赛',
    'r32': '32强',
    'r16': '16强',
    'qf': '四分之一决赛',
    'sf': '半决赛',
    'third_place': '季军赛',
    'final': '决赛',
    'round_of_32': '32强',
    'round_of_16': '16强',
    'quarter_final': '四分之一决赛',
    'semi_final': '半决赛',
  };
  return stageMap[stage] || stage;
}

export function getPositionName(position: string): string {
  const posMap: Record<string, string> = {
    'GK': '门将',
    'DF': '后卫',
    'MF': '中场',
    'FW': '前锋',
  };
  return posMap[position] || position;
}

export function getPositionColor(position: string): string {
  const colorMap: Record<string, string> = {
    'GK': 'text-amber-400',
    'DF': 'text-blue-400',
    'MF': 'text-emerald-400',
    'FW': 'text-red-400',
  };
  return colorMap[position] || 'text-slate-400';
}
