'use strict';

// Prescription Chart
if ($('#prescription-chart').length > 0) {

    const canvas = document.getElementById('prescription-chart');
    const ctx = canvas.getContext('2d');

		const createGradient = (color1, color2) => {
		const gradient = ctx.createLinearGradient(0, 0, 0, 400); // Adjust height based on your chart size
		gradient.addColorStop(0, color1);
		gradient.addColorStop(1, color2);
		return gradient;
	};

	new Chart(ctx, {

		type: 'doughnut',
		data: {
			labels: ['Cancelled', 'Pending', 'Completed'],
			datasets: [{
			data: [100, 312, 845], // Adjust values to match your image segments
			backgroundColor: [
				createGradient('#f74838c8', '#e44233'), // Red Gradient
				createGradient('#fa920080', '#FA9200'), // Orange Gradient
				createGradient('#3848f580', '#3848F5')  // Blue Gradient
			],
			borderWidth: 8,       // Creates the gap between segments
			borderColor: '#ffffff', // Matches the background to look like a "cutout"
			borderRadius: 15,    // Rounds the edges of each segment
			hoverOffset: 4
			}]
		},
		options: {
			cutout: '70%', // Makes the ring thinner
			plugins: {
			legend: { display: false }, // Hides labels at the top
			tooltip: { 
				enabled: true,
				usePointStyle: true,      // Uses a clean circle instead of a square
				displayColors: true,     
				boxWidth: 8,             // Smaller, cleaner icon
				boxHeight: 8,
				borderColor: 'transparent', // Removes the border around the tooltip icon
				borderWidth: 0  
			}
			}
		},
      // Custom plugin to draw "1,234 Prescriptions" in the center
    });

}
