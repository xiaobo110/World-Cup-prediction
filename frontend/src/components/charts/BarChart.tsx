'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface BarChartProps {
  data: { name: string; value: number; color?: string }[];
  title?: string;
  horizontal?: boolean;
  height?: number;
  showLabel?: boolean;
}

export default function BarChart({
  data,
  title,
  horizontal = false,
  height = 350,
  showLabel = false,
}: BarChartProps) {
  const option = useMemo(() => {
    const categoryAxis = data.map((d) => d.name);
    const values = data.map((d) => d.value);
    const colors = data.map(
      (d, i) =>
        d.color ||
        new (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__echartsGraphic__ || { LinearGradient: class {} }
        )()
    );

    const categoryData = horizontal ? { type: 'value' as const } : undefined;
    const valueData = horizontal ? { type: 'category' as const } : undefined;

    return {
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
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: horizontal ? '3%' : '8%',
        right: horizontal ? '15%' : '4%',
        top: title ? 50 : 20,
        bottom: horizontal ? '8%' : '12%',
        containLabel: true,
      },
      xAxis: horizontal
        ? {
            type: 'value',
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
            axisLabel: { color: '#94a3b8', fontSize: 11 },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
          }
        : {
            type: 'category',
            data: categoryAxis,
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
            axisLabel: {
              color: '#94a3b8',
              fontSize: 11,
              rotate: data.length > 8 ? 30 : 0,
            },
            axisTick: { show: false },
          },
      yAxis: horizontal
        ? {
            type: 'category',
            data: categoryAxis,
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
            axisLabel: { color: '#94a3b8', fontSize: 11 },
            axisTick: { show: false },
          }
        : {
            type: 'value',
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
            axisLabel: { color: '#94a3b8', fontSize: 11 },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
          },
      series: [
        {
          type: 'bar',
          data: values.map((val, i) => ({
            value: val,
            itemStyle: data[i].color
              ? { color: data[i].color }
              : {
                  color: {
                    type: 'linear',
                    x: horizontal ? 0 : 0,
                    y: horizontal ? 0 : 1,
                    x2: horizontal ? 1 : 0,
                    y2: 0,
                    colorStops: [
                      { offset: 0, color: '#3b82f6' },
                      { offset: 1, color: '#8b5cf6' },
                    ],
                  },
                },
          })),
          barMaxWidth: 32,
          label: {
            show: showLabel,
            position: horizontal ? 'right' : 'top',
            color: '#94a3b8',
            fontSize: 11,
            formatter: (params: { value: number }) =>
              params.value % 1 === 0
                ? params.value.toString()
                : params.value.toFixed(1),
          },
          animationDuration: 1000,
          animationEasing: 'cubicOut',
        },
      ],
    };
  }, [data, title, horizontal, showLabel]);

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'canvas' }}
      notMerge
    />
  );
}
