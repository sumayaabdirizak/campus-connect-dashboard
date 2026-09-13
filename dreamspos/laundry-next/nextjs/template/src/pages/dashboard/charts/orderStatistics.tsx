"use client";
import dynamic from "next/dynamic";
import React from "react";
const Chart = dynamic(
  () => import("react-apexcharts"),
  { ssr: false }
);

const RevenueChart: React.FC = () => {

  const options: ApexCharts.ApexOptions = {
    chart: {
      height: 220,
      type: "bar",
      toolbar: { show: false }
    },

    plotOptions: {
      bar: {
        borderRadius: 10,
        dataLabels: {
          position: "top"
        }
      }
    },

    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val}%`,
      offsetY: -20,
      style: {
        fontSize: "12px",
        colors: ["#304758"]
      }
    },

    xaxis: {
      categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      axisBorder: { show: false },
      axisTicks: { show: false },

      crosshairs: {
        fill: {
          type: "gradient",
          gradient: {
            colorFrom: "#13B5C9",
            colorTo: "#F9C126",
            stops: [0, 100],
            opacityFrom: 0.4,
            opacityTo: 0.5
          }
        }
      },

      tooltip: { enabled: true }
    },

    yaxis: {
      axisBorder: { show: false },
      axisTicks: { show: true },

      labels: {
        show: true,
        formatter: (val: number) => `${val}k`
      }
    },

    colors: ["#0D76E1"]
  };

  const series = [
    {
      name: "Order",
      data: [4, 2, 3.5, 3, 2, 2.8, 3.2]
    }
  ];

  return (
    <Chart
      options={options}
      series={series}
      type="bar"
      height={220}
    />
  );
};

export default RevenueChart;
