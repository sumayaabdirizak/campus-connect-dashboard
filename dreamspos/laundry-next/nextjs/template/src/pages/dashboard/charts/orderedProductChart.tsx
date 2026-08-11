"use client";
import dynamic from "next/dynamic";
import React from "react";
const ReactApexChart = dynamic(
  () => import("react-apexcharts"),
  { ssr: false }
);

const BarChart1: React.FC = () => {

  const series = [
    {
      name: "Order",
      data: [214, 192, 151, 120, 98]
    }
  ];

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      height: 178,
      toolbar: { show: false },
      sparkline: { enabled: true }
    },

    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        barHeight: "90%",
        borderRadius: 8,
        borderRadiusApplication: "around",
        dataLabels: {
          position: "top"
        }
      }
    },

    colors: [
      "#3EBCC9",
      "#77CCD5",
      "#9DDBE2",
      "#BDE7EC",
      "#DFF3F6"
    ],

    fill: {
      type: "solid",
      opacity: 1
    },

    grid: {
      show: false,
      padding: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      }
    },

    xaxis: {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },

    yaxis: {
      labels: { show: false }
    },

    legend: { show: false },
    tooltip: { enabled: false }
  };

  return (
    <div id="bar-chart-1">
      <ReactApexChart
        options={options}
        series={series}
        type="bar"
        height={178}
      />
    </div>
  );
};

export default BarChart1;
