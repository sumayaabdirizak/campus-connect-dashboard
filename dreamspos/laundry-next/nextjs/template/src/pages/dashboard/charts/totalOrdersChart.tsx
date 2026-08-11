"use client";
import dynamic from "next/dynamic";
import React from "react";
const Chart = dynamic(
  () => import("react-apexcharts"),
  { ssr: false }
);

const RevenueBarMiniChart3: React.FC = () => {
  const options: ApexCharts.ApexOptions = {
    chart: {
      height: 50,
      width: 90,
      type: "bar",
      toolbar: { show: false },
      sparkline: { enabled: true }
    },
    plotOptions: {
      bar: {
        borderRadius: 3,
        borderRadiusApplication: "around",
        distributed: true,
        columnWidth: "80%"
      }
    },
    fill: {
      type: "solid",
      opacity: 1
    },
    colors: ["#F9C126", "#F9C126", "#F9C126", "#F9C126", "#F9C126"],
    stroke: {
      show: true,
      width: 2,
      colors: ["#fff"]
    },
    dataLabels: {
      enabled: false
    },
    grid: {
      padding: {
        left: 5,
        right: 5
      }
    },
    tooltip: {
      enabled: true
    }
  };

  const series = [
    {
      name: "Categories",
      data: [70, 40, 65, 30, 80]
    }
  ];

  return (
    <Chart
      options={options}
      series={series}
      type="bar"
      height={50}
      width={90}
    />
  );
};

export default RevenueBarMiniChart3;
