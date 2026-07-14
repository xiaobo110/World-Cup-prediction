'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface RadarChartProps {
  data: { name: string; values: number[] }[];
  indicators: { name: string; max: number }[];
  title?: string;
  height?: number;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function RadarChart({
  data,
  indicators,
  title,
  height = 350,
}: RadarChartProps) {
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
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        itemWidth: 12,
        itemHeight: 8,
      },
      radar: {
        center: ['50%', title ? '55%' : '50%'],
        radius: '65%',
        indicator: indicators.map((ind) => ({
          name: ind.name,
          max: ind.max,
        })),
        axisName: {
          color: '#94a3b8',
          fontSize: 11,
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'],
          },
        },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.08)' },
        },
        axisLine: {
          lineStyle: { color: 'rgba(255,255,255,0.1)' },
        },
      },
      series: [
        {
          type: 'radar',
          data: data.map((item, idx) => ({
            name: item.name,
            value: item.values,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: {
              width: 2,
              color: COLORS[idx % COLORS.length],
            },
            areaStyle: {
              color: COLORS[idx % COLORS.length],
              opacity: 0.2,
            },
            itemStyle: {
              color: COLORS[idx % COLORS.length],
            },
          })),
          animationDuration: 1000,
          animationEasing: 'cubicOut',
        },
      ],
    }),
    [data, indicators, title]
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
