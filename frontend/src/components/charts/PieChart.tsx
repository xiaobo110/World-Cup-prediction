'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface PieChartProps {
  data: { name: string; value: number }[];
  title?: string;
  donut?: boolean;
  height?: number;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export default function PieChart({
  data,
  title,
  donut = false,
  height = 350,
}: PieChartProps) {
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
        formatter: (params: { name: string; value: number; percent: number }) =>
          `${params.name}: ${params.value} (${params.percent}%)`,
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        itemWidth: 12,
        itemHeight: 8,
        type: 'scroll',
        pageTextStyle: { color: '#94a3b8' },
      },
      color: COLORS,
      series: [
        {
          type: 'pie',
          radius: donut ? ['40%', '65%'] : '65%',
          center: ['50%', title ? '50%' : '48%'],
          data: data.map((d, i) => ({
            name: d.name,
            value: d.value,
            itemStyle: { color: COLORS[i % COLORS.length] },
          })),
          label: {
            show: !donut,
            color: '#94a3b8',
            fontSize: 11,
            formatter: '{b}: {d}%',
          },
          labelLine: {
            lineStyle: { color: 'rgba(255,255,255,0.2)' },
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0,0,0,0.3)',
            },
            label: {
              show: true,
              fontSize: 13,
              fontWeight: 'bold',
            },
          },
          ...(donut
            ? {
                label: {
                  show: true,
                  position: 'outside',
                  color: '#94a3b8',
                  fontSize: 11,
                  formatter: '{b}: {d}%',
                },
              }
            : {}),
          animationType: 'scale',
          animationDuration: 1000,
          animationEasing: 'cubicOut',
        },
      ],
    }),
    [data, title, donut]
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
