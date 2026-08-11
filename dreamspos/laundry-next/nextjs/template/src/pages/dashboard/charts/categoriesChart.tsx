"use client";
import dynamic from "next/dynamic";
import React from "react";
const ReactApexChart = dynamic(
  () => import("react-apexcharts"),
  { ssr: false }
);


const RevenueChart1: React.FC = () => {

  const series = [
    {
      name: "Categories",
      data: [60, 20, 12, 18]
    }
  ];

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      height: 290,
      toolbar: { show: false }
    },

    plotOptions: {
      bar: {
        borderRadius: 20,
        borderRadiusApplication: "around",
        distributed: true,
        columnWidth: "85%",
        colors: {
          backgroundBarColors: ["#F2F2F2"],
          backgroundBarOpacity: 0.4,
          backgroundBarRadius: 20
        }
      }
    },

    colors: ["#13B5C9", "#F9C126", "#FF7EE9", "#14B51D"],

    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0.3,
        opacityFrom: 1,
        opacityTo: 0.6,
        stops: [0, 100]
      }
    },

    dataLabels: {
      enabled: false
    },

    xaxis: {
      categories: ["", "", "", ""],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          fontSize: "14px",
          fontWeight: 600,
          colors: "#666"
        }
      }
    },

    yaxis: { show: false },
    grid: { show: false },
    legend: { show: false }
  };

  return (
    <div id="revenue-chart-1">
      <ReactApexChart
        options={options}
        series={series}
        type="bar"
        height={290}
      />
    </div>
  );
};

export default RevenueChart1;
