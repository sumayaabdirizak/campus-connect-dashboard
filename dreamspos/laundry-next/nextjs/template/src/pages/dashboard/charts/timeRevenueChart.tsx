"use client";
import dynamic from "next/dynamic";
import React from "react";
const Chart = dynamic(
  () => import("react-apexcharts"),
  { ssr: false }
);

const StatisticChart: React.FC = () => {
  const options: ApexCharts.ApexOptions = {
    chart: {
      height: 260,
      type: "area",
      zoom: { enabled: false },
      toolbar: { show: false },
      animations: {
        enabled: true,
        speed: 800
      }
    },

    stroke: {
      curve: "smooth",
      width: 2
    },

    markers: {
      size: 0,
      hover: {
        size: 6
      }
    },

    tooltip: {
      enabled: true,
      marker: { show: false },
      y: {
        formatter: (val: number) => `$${val}`
      }
    },

    dataLabels: {
      enabled: false
    },

    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0,
        stops: [0, 90, 100]
      }
    },

    grid: {
      borderColor: "#eaeaea",
      strokeDashArray: 4,
      xaxis: {
        lines: { show: true }
      },
      yaxis: {
        lines: { show: false }
      },
      padding: {
        top: 0,
        left: 10,
        right: 10,
        bottom: 0
      }
    },

    xaxis: {
      categories: [
        "10:00","11:00","12:00","13:00","14:00","15:00",
        "16:00","17:00","18:00","19:00","20:00","21:00"
      ],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "#8c8c8c",
          fontSize: "11px"
        }
      }
    },

    yaxis: {
      labels: { show: false }
    },

    colors: ["#22c1dc"]
  };

  const series = [
    {
      name: "Orders",
      data: [40, 35, 45, 44, 63, 50, 84, 72, 68, 60, 55, 62]
    }
  ];

  return (
    <Chart
      options={options}
      series={series}
      type="area"
      height={260}
    />
  );
};

export default StatisticChart;
