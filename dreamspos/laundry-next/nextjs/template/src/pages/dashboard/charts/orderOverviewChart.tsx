"use client";
import dynamic from "next/dynamic";
import React from "react";
const ReactApexChart = dynamic(
  () => import("react-apexcharts"),
  { ssr: false }
);

const OrderChart: React.FC = () => {

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "polarArea",
      height: 350,
      toolbar: { show: false }
    },

    colors: ["#13b5c9", "#2088ee", "#ffa5da", "#fdb600"],

    plotOptions: {
      polarArea: {
        rings: {
          strokeColor: "#E5E7EB",
          strokeWidth: 1
        },
        spokes: {
          strokeColor: "#E5E7EB"
        }
      } as any
    },

    labels: [],
    legend: { show: false },
    dataLabels: { enabled: false },

    tooltip: {
      enabled: true,
      x: { show: false },
      y: {
        formatter: (val: number) => val.toString(),
        title: { formatter: () => "" }
      }
    },

    stroke: {
      colors: ["#fff"]
    },

    fill: {
      opacity: 0.85
    },

    yaxis: {
      show: false
    }
  };

  const series = [14, 23, 21, 17];

  return (
    <div id="order-chart">
      <ReactApexChart
        options={options}
        series={series}
        type="polarArea"
        height={350}
      />
    </div>
  );
};

export default OrderChart;
