<script setup lang="ts">
import { computed } from "vue";
import VChart from "vue-echarts";
import { LineChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import { use } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import type { ComposeOption } from "echarts/core";
import type { GridComponentOption } from "echarts/components";
import type { LineSeriesOption } from "echarts/charts";
import type { ResourceSample } from "../../shared/types";

use([GridComponent, LineChart, SVGRenderer]);

type ChartOption = ComposeOption<GridComponentOption | LineSeriesOption>;

const props = defineProps<{
  samples: ResourceSample[];
  metric: "cpu" | "memory";
  color: string;
}>();

const option = computed<ChartOption>(() => {
  const data = props.samples.map((sample) =>
    props.metric === "cpu" ? sample.cpuPercent : Math.round(sample.memoryBytes / 1024 / 1024),
  );

  return {
    animation: false,
    grid: {
      left: 0,
      right: 0,
      top: 4,
      bottom: 4,
    },
    xAxis: {
      type: "category",
      show: false,
      data: data.map((_, index) => index),
    },
    yAxis: {
      type: "value",
      show: false,
      min: 0,
    },
    series: [
      {
        type: "line",
        data,
        showSymbol: false,
        smooth: true,
        lineStyle: {
          width: 2,
          color: props.color,
        },
        areaStyle: {
          color: `${props.color}22`,
        },
      },
    ],
  };
});
</script>

<template>
  <VChart class="spark-chart" :option="option" autoresize />
</template>
