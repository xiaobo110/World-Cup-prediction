'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface GaugeChartProps {
  value: number; // 0-100
  title?: string;
  height?: number;
  color?: string;
}

export default function GaugeChart({
  value,
  title,
  height = 280,
  color,
}: GaugeChartProps) {
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
      series: [
        {
          type: 'gauge',
          center: ['50%', title ? '60%' : '55%'],
          radius: '80%',
          startAngle: 210,
          endAngle: -30,
          min: 0,
          max: 100,
          splitNumber: 5,
          axisLine: {
            lineStyle: {
              width: 12,
              color: color
                ? [
                    [value / 100, color],
                    [1, 'rgba(255,255,255,0.08)'],
                  ]
                : [
                    [0.3, '#ef4444'],
                    [0.5, '#f59e0b'],
                    [0.7, '#3b82f6'],
                    [1, '#10b981'],
                  ],
            },
          },
          pointer: {
            itemStyle: {
              color: color || '#3b82f6',
            },
            width: 4,
            length: '60%',
          },
          axisTick: {
            distance: -12,
            length: 4,
            lineStyle: { color: 'rgba(255,255,255,0.15)', width: 1 },
          },
          splitLine: {
            distance: -14,
            length: 8,
            lineStyle: { color: 'rgba(255,255,255,0.2)', width: 1 },
          },
          axisLabel: {
            color: '#64748b',
            distance: 20,
            fontSize: 10,
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            color: color || '#e2e8f0',
            fontSize: 22,
            fontWeight: 700,
            offsetCenter: [0, '30%'],
          },
          data: [
            {
              value: parseFloat(value.toFixed(1)),
            },
          ],
          animationDuration: 1500,
          animationEasing: 'cubicOut',
        },
      ],
    }),
    [value, title, color]
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
