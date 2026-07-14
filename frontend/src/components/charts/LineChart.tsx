'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface LineChartProps {
  series: { name: string; data: number[] }[];
  labels: string[];
  title?: string;
  height?: number;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function LineChart({
  series,
  labels,
  title,
  height = 350,
}: LineChartProps) {
  const option = useMemo(
    () => ({
      backgroundColor: 'transparent',
      title: title
        ? {
            text: title,
            left: 'center',
            top: 10,
            textStyle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600 },
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        itemWidth: 16,
        itemHeight: 8,
      },
      grid: {
        left: '3%',
        right: '4%',
        top: title ? 50 : 20,
        bottom: 40,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      },
      series: series.map((s, idx) => ({
        name: s.name,
        type: 'line',
        data: s.data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color: COLORS[idx % COLORS.length],
        },
        itemStyle: {
          color: COLORS[idx % COLORS.length],
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: COLORS[idx % COLORS.length] + '40' },
              { offset: 1, color: COLORS[idx % COLORS.length] + '05' },
            ],
          },
        },
        animationDuration: 1200,
        animationEasing: 'cubicOut',
      })),
    }),
    [series, labels, title]
  );

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'canvas' }}
      notMerge
    />
  );
}
