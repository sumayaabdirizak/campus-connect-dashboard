'use strict';

// Collected
if ($('#medicine-chart-1').length > 0) {
  var sLineArea = {
    chart: {
      height: 60,
      width: 120,
      type: 'area',
      sparkline: {
        enabled: true 
      }
    },
    // Updated to the purple from your screenshot
    colors: ['#C8AAF0'], 
    stroke: {
      curve: 'smooth',
      width: 0
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.8, 
        opacityTo: 0.1,   
        stops: [0, 100],
        colorStops: [
          {
            offset: 0,
            color: '#C8AAF0',
            opacity: 0.8
          },
          {
            offset: 100,
            color: '#FFFFFF',
            opacity: 0.1
          }
        ]
      }
    },
    series: [{
      name: 'Collected',
      data: [15, 86, 60, 75, 64, 55, 95, 70, 65, 25] 
    }],
    xaxis: {
      crosshairs: {
        show: true,
        stroke: {
          color: '#CBD5E1', 
          width: 1,
          dashArray: 4
        }
      }
    },
    markers: {
      size: 0,
      colors: ['#C8AAF0'], 
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: {
        size: 5 
      }
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      custom: function({series, seriesIndex, dataPointIndex, w}) {
        var value = series[seriesIndex][dataPointIndex];
        return '<div style="background: #1e293b; padding: 5px 10px; border-radius: 4px; border: none;">' +
          '<span style="color: #C8AAF0; font-weight: bold;">' + value.toLocaleString() + '</span>' +
          '</div>';
      }
    }
  };

  var chart = new ApexCharts(document.querySelector("#medicine-chart-1"), sLineArea);
  chart.render();
}

// Collected
if ($('#medicine-chart-2').length > 0) {
  var sLineArea = {
    chart: {
      height: 60,
      width: 120,
      type: 'area',
      sparkline: {
        enabled: true 
      }
    },
    // Updated to the purple from your screenshot
    colors: ['#0F9213'], 
    stroke: {
      curve: 'smooth',
      width: 0
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.8, 
        opacityTo: 0.1,   
        stops: [0, 100],
        colorStops: [
          {
            offset: 0,
            color: '#0F9213',
            opacity: 0.8
          },
          {
            offset: 100,
            color: '#FFFFFF',
            opacity: 0.1
          }
        ]
      }
    },
    series: [{
      name: 'Collected',
      data: [25, 76, 50, 65, 74, 45, 85, 80, 75, 35] 
    }],
    xaxis: {
      crosshairs: {
        show: true,
        stroke: {
          color: '#CBD5E1', 
          width: 1,
          dashArray: 4
        }
      }
    },
    markers: {
      size: 0,
      colors: ['#0F9213'], 
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: {
        size: 5 
      }
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      custom: function({series, seriesIndex, dataPointIndex, w}) {
        var value = series[seriesIndex][dataPointIndex];
        return '<div style="background: #1e293b; padding: 5px 10px; border-radius: 4px; border: none;">' +
          '<span style="color: #C8AAF0; font-weight: bold;">' + value.toLocaleString() + '</span>' +
          '</div>';
      }
    }
  };

  var chart = new ApexCharts(document.querySelector("#medicine-chart-2"), sLineArea);
  chart.render();
}

// Collected
if ($('#medicine-chart-3').length > 0) {
  var sLineArea = {
    chart: {
      height: 60,
      width: 120,
      type: 'area',
      sparkline: {
        enabled: true 
      }
    },
    // Updated to the purple from your screenshot
    colors: ['#FA9200'], 
    stroke: {
      curve: 'smooth',
      width: 0
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.8, 
        opacityTo: 0.1,   
        stops: [0, 100],
        colorStops: [
          {
            offset: 0,
            color: '#FA9200',
            opacity: 0.8
          },
          {
            offset: 100,
            color: '#FFFFFF',
            opacity: 0.1
          }
        ]
      }
    },
    series: [{
      name: 'Collected',
      data: [35, 76, 80, 75, 54, 65, 85, 70, 75, 35] 
    }],
    xaxis: {
      crosshairs: {
        show: true,
        stroke: {
          color: '#CBD5E1', 
          width: 1,
          dashArray: 4
        }
      }
    },
    markers: {
      size: 0,
      colors: ['#FA9200'], 
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: {
        size: 5 
      }
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      custom: function({series, seriesIndex, dataPointIndex, w}) {
        var value = series[seriesIndex][dataPointIndex];
        return '<div style="background: #1e293b; padding: 5px 10px; border-radius: 4px; border: none;">' +
          '<span style="color: #C8AAF0; font-weight: bold;">' + value.toLocaleString() + '</span>' +
          '</div>';
      }
    }
  };

  var chart = new ApexCharts(document.querySelector("#medicine-chart-3"), sLineArea);
  chart.render();
}

// Collected
if ($('#medicine-chart-4').length > 0) {
  var sLineArea = {
    chart: {
      height: 60,
      width: 120,
      type: 'area',
      sparkline: {
        enabled: true 
      }
    },
    // Updated to the purple from your screenshot
    colors: ['#F07066'], 
    stroke: {
      curve: 'smooth',
      width: 0
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.8, 
        opacityTo: 0.1,   
        stops: [0, 100],
        colorStops: [
          {
            offset: 0,
            color: '#F07066',
            opacity: 0.8
          },
          {
            offset: 100,
            color: '#FFFFFF',
            opacity: 0.1
          }
        ]
      }
    },
    series: [{
      name: 'Collected',
      data: [25, 76, 70, 85, 74, 45, 85, 50, 65, 25] 
    }],
    xaxis: {
      crosshairs: {
        show: true,
        stroke: {
          color: '#CBD5E1', 
          width: 1,
          dashArray: 4
        }
      }
    },
    markers: {
      size: 0,
      colors: ['#F07066'], 
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: {
        size: 5 
      }
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      custom: function({series, seriesIndex, dataPointIndex, w}) {
        var value = series[seriesIndex][dataPointIndex];
        return '<div style="background: #1e293b; padding: 5px 10px; border-radius: 4px; border: none;">' +
          '<span style="color: #C8AAF0; font-weight: bold;">' + value.toLocaleString() + '</span>' +
          '</div>';
      }
    }
  };

  var chart = new ApexCharts(document.querySelector("#medicine-chart-4"), sLineArea);
  chart.render();
}

if ($('#expiry-chart').length > 0) {
	var options = {
		series: [{
			name: 'Data',
			data: [210, 280, 284, 200]
		}],
		chart: {
			type: 'bar',
			height: 110,
			toolbar: { show: false }
		},
		plotOptions: {
			bar: {
				borderRadius: 10, // Rounded tops
				columnWidth: '80%',
				colors: {
					backgroundBarColors: ['#F5F7FA'],
					backgroundBarOpacity: 1,
					backgroundBarRadius: 10,
				},
			}
		},
		dataLabels: {
			enabled: false
		},
		grid: {
			show: false, // This removes the horizontal/vertical background lines
			padding: {
			left: 0,
			right: 0,
			top: -30
			}
		},
		xaxis: {
			categories: ['Jun', 'Jul', 'Aug', 'Sep'],
			axisBorder: { show: false },
			axisTicks: { show: false }
		},
		yaxis: {
			show: false,
			axisBorder: { show: false },
		},
		fill: {
			type: 'gradient',
			gradient: {
			shade: 'light',
			type: "vertical",
			gradientToColors: ['#E0F2F1'], // Light teal/white at bottom
			stops: [0, 100],
			colorStops: [
				{
				offset: 0,
				color: "#26A69A", // Main teal at top
				opacity: 1
				},
				{
				offset: 100,
				color: "#E0F2F1", // Light fade at bottom
				opacity: 0.5
				}
			]
			}
		},
		tooltip: {
			enabled: true,
			custom: function({series, seriesIndex, dataPointIndex, w}) {
			return '<div class="custom-tooltip p-2">' +
				'<span>' + series[seriesIndex][dataPointIndex] + '</span>' +
				'</div>'
			}
		}
	};

	var chart = new ApexCharts(document.querySelector("#expiry-chart"), options);
	chart.render();
}

// Weekly Sales
if ($('#sale-chart').length > 0) {
	var options = {
		series: [
			{ name: 'Product 4', data: [2, 7, 5, 8, 5, 7, 2] },   
			{ name: 'Product 3', data: [3, 6, 5, 8, 5, 7, 3] },
			{ name: 'Product 2', data: [3, 7, 5, 7, 5, 8, 3] },
			{ name: 'Product 1', data: [4, 7, 5, 7, 5, 8, 4] }  
		],
		chart: {
			type: 'bar',
			height: 150,
			stacked: true, // Crucial for the segmented look
			toolbar: { show: false }
		},
		colors: ['#B5D7D6', '#A2CDCC', '#7CB9B8', '#389C9B'], 
		plotOptions: {
			bar: {
			borderRadius: 10,
			columnWidth: '60%',
			// Only the top series gets the rounded corners
			borderRadiusApplication: 'top', 
			}
		},
		dataLabels: { enabled: false },
		grid: {
			show: false,
			borderColor: '#f1f1f1',
			xaxis: { lines: { show: false } },
			yaxis: { lines: { show: true } } // Keep these for the "30K, 20K" scale
		},
		states: {
			hover: {
			filter: {
				type: 'none', // Disables the default "lighten" effect
			}
			},
			active: {
			filter: {
				type: 'none'
			}
			}
		},
		tooltip: {
			enabled: true,
			marker: {
				show: false, // This removes the teal colored circle
			},
			x: {
				show: false // Optional: hides the x-axis label in the tooltip since you hid it on the chart
			}
		},
		xaxis: {
			show: false,
			labels: { show: false },
			categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
			axisBorder: { show: false },
			axisTicks: { show: false }
		},
		yaxis: {
			min: 0,
			max: 30,
			setInterval: 10,
			labels: {
			offsetX: -15,
			formatter: (val) => val + "K", // Matches your "10K, 20K" labels
			style: { colors: '#9e9e9e' }
			}
		},
		legend: { show: false },
		responsive: [{
			breakpoint: 1399,
			options: {
			chart: {
				height: 135 // Reduced height for mobile
			},
			plotOptions: {
				bar: {
				columnWidth: '80%', // Make bars wider on mobile to stay visible
				borderRadius: 6     // Slightly smaller radius for smaller bars
				
				}
			}
			}
		}],
	};

	var chart = new ApexCharts(document.querySelector("#sale-chart"), options);
	chart.render();
}

// Sales & Purchase
if ($('#sales-purchase-chart').length > 0) {
	var options = {
		series: [
			{ name: 'Sales', data: [31, 33, 35, 41, 45, 33, 36, ] },
			{ name: 'Purchase', data: [19, 21, 29, 24, 35, 28,  20] }
		],
		chart: {
			type: 'area',
			height: 350,
			toolbar: { show: false },
			zoom: { enabled: false }
		},
		colors: ['#0F9291', '#FF9500'], // Teal and Orange
		stroke: {
			curve: 'smooth',
			width: 2
		},
		fill: {
			type: 'gradient',
			gradient: {
			shadeIntensity: 1,
			opacityFrom: 0.45,
			opacityTo: 0.15,
			stops: [0, 100]
			}
		},
		markers: {
			size: [0, 0], // Hidden by default
			strokeWidth: 2,
			hover: { size: 6 },
			// To hardcode the dots on Wednesday as seen in your image:
			discrete: [{
			seriesIndex: 0,
			dataPointIndex: 5, // Adjust based on your Wed data point
			fillColor: '#00848E',
			strokeColor: '#fff',
			size: 6
			}, {
			seriesIndex: 1,
			dataPointIndex: 5,
			fillColor: '#FF9F00',
			strokeColor: '#fff',
			size: 6
			}]
		},
		grid: {
			show: false // No background lines as per image
		},
		xaxis: {
			categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri',  'Sat', 'Sun'],
			axisBorder: { show: false },
			axisTicks: { show: false },
			labels: { style: { colors: '#9e9e9e' } }
		},
		yaxis: {
			min: 0,
			max: 60,
			tickAmount: 6,
			labels: {
				offsetX: -15,
			formatter: (val) => val + "K",
			style: { colors: '#9e9e9e' }
			}
		},
		dataLabels: {
			enabled: false // This hides the numbers inside or near the points
		},
		tooltip: {
			marker: { show: false } // Keeping your previous preference
		},
		legend: { show: false },		
	};

	var chart = new ApexCharts(document.querySelector("#sales-purchase-chart"), options);
	chart.render();
}

if ($('#statistics-chart').length > 0) {
	var options = {
		series: [{
			name: 'Progress',
			data: [90, 75, 60]
		}],
		chart: {
			height: 180,
			type: 'bar',
			toolbar: { show: false },
			sparkline: true,
		},
		colors: ['#0F9291', '#D97F06', '#D42314'], // Teal, Orange, Red
		plotOptions: {
			bar: {
			distributed: true, // Allows each bar to have its own color
			borderRadius: 4,
			columnWidth: '80%',
			colors: {
				backgroundBarColors: ['#0F92911A', '#D97F0633', '#D4231433'], // Dark "container" colors
				backgroundBarOpacity: 1,
				backgroundBarRadius: 4,
			},
			dataLabels: {
				position: 'top', // Labels inside at the top
			},
			}
		},
		dataLabels: {
			enabled: true,
			formatter: function (val) {
			return val + "%";
			},
			offsetY: 20, // Moves text down inside the bar
			style: {
			fontSize: '12px',
			fontWeight: 'bold',
			colors: ['#fff']
			}
		},
		fill: {
			type: 'gradient',
			gradient: {
			shade: 'light',
			type: "vertical",
			shadeIntensity: 0.5,
			gradientToColors: undefined, 
			inverseColors: true,
			opacityFrom: 1,
			opacityTo: 0.85, // Creates a slight fade
			stops: [0, 100]
			}
		},
		grid: { 
			show: false,
			padding: {
				left: 0,
				right: 0,
				bottom: 0	
			}
		},
		xaxis: {
			categories: ['Low Stock', 'Available', 'Out of Stock'], 
			labels: { show: false },
			axisBorder: { show: false },
			axisTicks: { show: false }
		},
		yaxis: {
			max: 100, // Important to show the "empty" part of the container
			show: false
		},
		tooltip: { enabled: false },
		legend: { show: false },
			tooltip: {
			enabled: true,
			theme: 'dark', // Matches your dark chart style
			custom: function({ series, seriesIndex, dataPointIndex, w }) {
			const category = w.globals.labels[dataPointIndex];
			const value = series[seriesIndex][dataPointIndex];
			
			// Returns a clean, custom HTML box with no empty gaps
			return '<div style="padding: 8px; background: #1a1a1a; color: #fff; border: 1px solid #333;">' +
					'<span>' + category + ': ' + value + '%</span>' +
					'</div>';
			},
			marker: { show: false } // Keeping it clean
		},
	};

	var chart = new ApexCharts(document.querySelector("#statistics-chart"), options);
	chart.render();
}

// Overview Chart 1
if ($('#overview-chart-1').length > 0) {
    var options = {
        series: [{
            name: 'Medicines',
            data: [80]
        }],
        chart: {
            height: 120,
            width: 45,
            type: 'bar',
            sparkline: { enabled: true },
            toolbar: { show: false }
        },

        colors: ['#B07AF6'], // Main bar color

        plotOptions: {
            bar: {
                borderRadius: 15,
                columnWidth: '100%',
                colors: {
                    backgroundBarColors: ['#F1E6FF'],
                    backgroundBarOpacity: 1,
                    backgroundBarRadius: 15
                }
            }
        },

        fill: {
            type: 'solid',
            opacity: 1
        },

        stroke: {
            width: 0
        },

        yaxis: {
            max: 100,
            show: false
        },

        xaxis: {
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },

        grid: { show: false },

        tooltip: { enabled: false }
    };

    var chart = new ApexCharts(document.querySelector("#overview-chart-1"), options);
    chart.render();
}

// Overview Chart 2
if ($('#overview-chart-2').length > 0) {
    var options = {
        series: [{
            name: 'Medicines',
            data: [80]
        }],
        chart: {
            height: 120,
            width: 45,
            type: 'bar',
            sparkline: { enabled: true },
            toolbar: { show: false }
        },

        colors: ['#0F9291'], // Main bar color

        plotOptions: {
            bar: {
                borderRadius: 15,
                columnWidth: '100%',
                colors: {
                    backgroundBarColors: ['#E6F5F5'],
                    backgroundBarOpacity: 1,
                    backgroundBarRadius: 15
                }
            }
        },

        fill: {
            type: 'solid',
            opacity: 1
        },

        stroke: {
            width: 0
        },

        yaxis: {
            max: 100,
            show: false
        },

        xaxis: {
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },

        grid: { show: false },

        tooltip: { enabled: false }
    };

    var chart = new ApexCharts(document.querySelector("#overview-chart-2"), options);
    chart.render();
}

// Overview Chart 3
if ($('#overview-chart-3').length > 0) {
    var options = {
        series: [{
            name: 'Medicines',
            data: [80]
        }],
        chart: {
            height: 120,
            width: 45,
            type: 'bar',
            sparkline: { enabled: true },
            toolbar: { show: false }
        },

        colors: ['#B07AF6'], // Main bar color

        plotOptions: {
            bar: {
                borderRadius: 15,
                columnWidth: '100%',
                colors: {
                    backgroundBarColors: ['#F1E6FF'],
                    backgroundBarOpacity: 1,
                    backgroundBarRadius: 15
                }
            }
        },

        fill: {
            type: 'solid',
            opacity: 1
        },

        stroke: {
            width: 0
        },

        yaxis: {
            max: 100,
            show: false
        },

        xaxis: {
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },

        grid: { show: false },

        tooltip: { enabled: false }
    };

    var chart = new ApexCharts(document.querySelector("#overview-chart-3"), options);
    chart.render();
}

// Overview Chart 4
if ($('#overview-chart-4').length > 0) {
    var options = {
        series: [{
            name: 'Medicines',
            data: [80]
        }],
        chart: {
            height: 120,
            width: 45,
            type: 'bar',
            sparkline: { enabled: true },
            toolbar: { show: false }
        },

        colors: ['#FF9500'], // Main bar color

        plotOptions: {
            bar: {
                borderRadius: 15,
                columnWidth: '100%',
                colors: {
                    backgroundBarColors: ['#FFEBD6'],
                    backgroundBarOpacity: 1,
                    backgroundBarRadius: 15
                }
            }
        },

        fill: {
            type: 'solid',
            opacity: 1
        },

        stroke: {
            width: 0
        },

        yaxis: {
            max: 100,
            show: false
        },

        xaxis: {
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },

        grid: { show: false },

        tooltip: { enabled: false }
    };

    var chart = new ApexCharts(document.querySelector("#overview-chart-4"), options);
    chart.render();
}

// Revenue & Expense Chart
if ($('#revenue-expense-chart').length > 0) {
    var options = {
        series: [{
            name: 'Base',
            data: [40, 15, 25, 32, 28, 42, 35, 26, 33, 39, 29, 11]
        }, {
            name: 'Growth',
            data: [35, 15, 28, 33, 29, 44, 36, 27, 34, 42, 31, 13]
        }, {
            name: 'Projected',
            data: [10, 5, 7, 8, 6, 11, 9, 7, 10, 9, 7, 3]
        }],
        chart: {
            type: 'bar',
            height: 350,
            stacked: true,
            toolbar: { show: false },
            zoom: { enabled: false }
        },
        // Using the Orange-to-Peach palette from the screenshot
        colors: ['#FF9800', '#FFCC80', '#FFF3E0'], 
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '60%',
                // In your screenshot, only the very top segment is rounded
                borderRadius: 8,
                borderRadiusApplication: 'end', 
                borderRadiusWhenStacked: 'last', 
            },
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            min: 0,
            max: 100,
            tickAmount: 5,
            labels: {
                formatter: function (val) { return "$" + val; } ,
                offsetX: -15,
            }
        },
        grid: {
            borderColor: '#f1f1f1',
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
            padding: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
            }
        },
        legend: { show: false },
        tooltip: {
          enabled: true,
          custom: function({ series, seriesIndex, dataPointIndex, w }) {
              // This targets the specific value of the hovered bar
              var value = series[seriesIndex][dataPointIndex];
              return (
                  '<div class="custom-apex-tooltip">' +
                      '<span>Expense: $' + value + '</span>' +
                  '</div>'
              );
          }
      },
        fill: { opacity: 1 }
    };

    var chart = new ApexCharts(document.querySelector("#revenue-expense-chart"), options);
    chart.render();
}

// Purchase Value Chart
if ($('#purchase-value').length > 0) {
    var options = {
        series: [{
            name: 'Revenue',
            data: [45, 60, 52, 58, 40, 30, 55, 48, 22, 15, 30, 60]
        }, {
            name: 'Expense',
            data: [-12, -18, -15, -13, -8, -14, -16, -14, -20, -15, -18, -22]
        }],
        chart: {
            type: 'bar',
            height: 350,
            stacked: true,
            toolbar: { show: false },
        },
        // Teal colors from your target screenshot
        colors: ['#0F9291', '#8BC4BF'], 
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                borderRadius: 10, 
                borderRadiusApplication: 'end', 
                borderRadiusWhenStacked: 'all', 
            },
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: { colors: '#8E9FB1', fontSize: '12px', fontWeight: 500 }
            }
        },
        yaxis: {
            tickAmount: 5,
            labels: {
                style: { colors: '#8E9FB1', fontSize: '12px', fontWeight: 500 },
                formatter: function (val) { return "$" + Math.abs(val); },
                offsetX: -15,
            }
        },
        grid: {
            borderColor: '#E2E8F0',
            strokeDashArray: 0,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
            padding: { top: 0, right: 0, bottom: 0, left: 10 }
        },
        legend: { show: false },
        tooltip: {
            enabled: true,
            custom: function({ series, seriesIndex, dataPointIndex, w }) {
                const month = w.globals.labels[dataPointIndex];
                const revenue = series[0][dataPointIndex];
                return '<div class="custom-apex-tooltip">' +
                    '<div style="margin-bottom: 2px;">' + month + '</div>' +
                    '<div>Revenue : $' + revenue + '00</div>' +
                    '</div>';
            }
        }
    };

    var chart = new ApexCharts(document.querySelector("#purchase-value"), options);
    chart.render();
}