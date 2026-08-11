/*
Author       : Dreams Technologies
Template Name: Pharmacy POS - Bootstrap Admin Template
*/


$(document).ready(function(){

	const $wrapper = $('.main-wrapper');
	const $overlay = $('<div class="sidebar-overlay"></div>');
	$overlay.insertBefore('.main-wrapper');

	// Toggle Mobile Menu
	$(document).on('click', '#mobile_btn', function (e) {
		e.preventDefault();
		$wrapper.toggleClass('slide-nav');
		$overlay.toggleClass('opened');
		$('html').toggleClass('menu-opened');
	});

	// Close sidebar on close button click
	$(document).on('click', '.sidebar-close, .sidebar-overlay', function () {
		$wrapper.removeClass('slide-nav');
		$overlay.removeClass('opened');
		$('html').removeClass('menu-opened');
	});

	// Sidebar
	function initSidebarMenu() {
		const $menuLinks = $('.sidebar-menu a');

		$menuLinks.on('click', function (e) {
			const $link = $(this);
			const $submenu = $link.next('ul');

			if ($link.parent().hasClass('submenu')) {
				e.preventDefault();

				if (!$link.hasClass('subdrop')) {
					// Collapse all other open submenus
					$link.closest('ul').find('ul:visible').slideUp(250);
					$link.closest('ul').find('a.subdrop').removeClass('subdrop');

					// Expand current
					$submenu.stop(true, true).slideDown(350);
					$link.addClass('subdrop');
				} else {
					// Collapse current
					$link.removeClass('subdrop');
					$submenu.stop(true, true).slideUp(350);
				}
			}
		});

		// Ensure any active link's submenu is shown with animation-ready state
		$('.sidebar-menu ul li.submenu a.active').each(function () {
			const $submenu = $(this).closest('ul');
			const $parentLink = $submenu.prev('a');

			$parentLink.addClass('active subdrop');
			$submenu.css('display', 'block'); // force show without using .show()

			// Now mark it manually as ready for animation
			$submenu.height($submenu.height()); // set explicit height
			$submenu.css('height', 'auto');     // restore auto height
		});
	}
	
	// Initialize Sidebar
	initSidebarMenu();


	// Mouse Over
	$(document).on('mouseover', function(e) {
        e.stopPropagation();
        if ($('body').hasClass('mini-sidebar') && $('#toggle_btn').is(':visible')) {
            var targ = $(e.target).closest('.sidebar, .header-left').length;
            if (targ) {
               	$('body').addClass('expand-menu');
                $('.subdrop + ul').slideDown();
            } else {
               	$('body').removeClass('expand-menu');
                $('.subdrop + ul').slideUp();
            }
            return false;
        }
    });

	// Toggle Button
	$(document).on('click', '#toggle_btn, #toggle_btn2', function () {
		const $body = $('body');
		const $html = $('html');
		const isMini = $body.hasClass('mini-sidebar');
	
		if (isMini) {
			$body.removeClass('mini-sidebar');
			$(this).addClass('active');
			localStorage.setItem('screenModeNightTokenState', 'night');
			setTimeout(function () {
				$(".header-left").addClass("active");
			}, 100);
		} else {
			$body.addClass('mini-sidebar');
			$(this).removeClass('active');
			localStorage.removeItem('screenModeNightTokenState');
			setTimeout(function () {
				$(".header-left").removeClass("active");
			}, 100);
		}
	
		return false;
	});
		
	// Tooltip
	if($('[data-bs-toggle="tooltip"]').length > 0) {
		var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
		var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
			return new bootstrap.Tooltip(tooltipTriggerEl)
		})
	}

	// Booking Range
	if($('.bookingrange').length > 0) {
		var start = moment().subtract(6, 'days');
		var end = moment();
		function booking_range(start, end) {
			$('.bookingrange span').html(start.format('M/D/YYYY') + ' - ' + end.format('M/D/YYYY'));
		}

		$('.bookingrange').daterangepicker({
			startDate: start,
			endDate: end,
			ranges: {
				'Today': [moment(), moment()],
				'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
				'Last 7 Days': [moment().subtract(6, 'days'), moment()],
				'Last 30 Days': [moment().subtract(29, 'days'), moment()],
				'This Year': [moment().startOf('year'), moment().endOf('year')],
				'Next Year': [moment().add(1, 'year').startOf('year'), moment().add(1, 'year').endOf('year')]
			}
		}, booking_range);
		booking_range(start, end);
	}

	// Datatable
	if($('.datatable').length > 0) {
		$('.datatable').DataTable({
			"bFilter": true,
			"dom": 'lfrtipB', 
			// Change this from 'numbers' to 'simple_numbers'
			"pagingType": 'simple_numbers', 
			"ordering": true,
			"language": {
				"search": ' ',
				"sLengthMenu": 'Go to Page _MENU_',
				"searchPlaceholder": "Search...",
				"info": "Showing 1-10 of 1200 medicines",
				"paginate": {
					// Ensure these classes match your CSS library
					"next": '<span><i class="icon-chevron-right"></i></span>', 
					"previous": '<span><i class="icon-chevron-left"></i></span>'
				},
			},
			"initComplete": function(settings, json) {
				$('.dataTables_filter').detach().appendTo('#tablefilter');
				$('.dataTables_info').detach().appendTo('#tableinfo');
				$('.dataTables_paginate').detach().appendTo('#tablepage');
				$('.dataTables_length').detach().appendTo('#tablelength');
			}
		});
	}

	// Reusable "Show More/Less" Toggle for Multiple Sections
	for (let i = 0; i <= 6; i++) {
		const moreMenu = $(`.more-menu${i || ''}`);
		const viewAllBtn = $(`.viewall${i || ''}-button`);
		
		if (moreMenu.length > 0) {
			moreMenu.hide();
			viewAllBtn.on("click", function () {
				const isLess = $(this).text() === "view Less";
				$(this).text(isLess ? "View More" : "View Less");
				moreMenu.slideToggle(900);
			});
		}
	}

	// Select 2
	if ($('.select').length > 0) {
		$('.select').select2({
			minimumResultsForSearch: -1,
			width: '100%'
		});
	}

	// Flatpicker
	document.querySelectorAll('[data-provider="flatpickr"]').forEach(el => {
		const config = {
			disableMobile: true
		};
		if (el.hasAttribute('data-date-format')) {
			config.dateFormat = el.getAttribute('data-date-format');
		}
		if (el.hasAttribute('data-enable-time')) {
			config.enableTime = true;
			config.dateFormat = config.dateFormat ? `${config.dateFormat} H:i` : 'Y-m-d H:i';
		}
		if (el.hasAttribute('data-altFormat')) {
			config.altInput = true;
			config.altFormat = el.getAttribute('data-altFormat');
		}
		if (el.hasAttribute('data-minDate')) {
			config.minDate = el.getAttribute('data-minDate');
		}
		if (el.hasAttribute('data-maxDate')) {
			config.maxDate = el.getAttribute('data-maxDate');
		}
		if (el.hasAttribute('data-default-date')) {
			const defaultDate = el.getAttribute('data-default-date');
			// Check if it's a valid date string
			if (!["true", "false", "", null].includes(defaultDate) && !isNaN(Date.parse(defaultDate))) {
				config.defaultDate = defaultDate;
			}
		}
		if (el.hasAttribute('data-multiple-date')) {
			config.mode = 'multiple';
		}
		if (el.hasAttribute('data-range-date')) {
			config.mode = 'range';
		}
		if (el.hasAttribute('data-inline-date')) {
			config.inline = true;
			const inlineDate = el.getAttribute('data-inline-date');
			if (!["true", "false", "", null].includes(inlineDate) && !isNaN(Date.parse(inlineDate))) {
				config.defaultDate = inlineDate;
			}
		}
		if (el.hasAttribute('data-disable-date')) {
			config.disable = el.getAttribute('data-disable-date').split(',');
		}
		if (el.hasAttribute('data-week-number')) {
			config.weekNumbers = true;
		}
		flatpickr(el, config);
	});

	// Time Picker
    document.querySelectorAll('[data-provider="timepickr"]').forEach(item => {
        const attrs = item.attributes;
        const config = {
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i"
        };

        if (attrs["data-time-hrs"]) {
            config.time_24hr = true;
        }

        if (attrs["data-min-time"]) {
            config.minTime = attrs["data-min-time"].value;
        }

        if (attrs["data-max-time"]) {
            config.maxTime = attrs["data-max-time"].value;
        }

        if (attrs["data-default-time"]) {
            config.defaultDate = attrs["data-default-time"].value;
        }

        if (attrs["data-time-inline"]) {
            config.inline = true;
            config.defaultDate = attrs["data-time-inline"].value;
        }

        flatpickr(item, config);
    });

	// Fix for Slick Slider + jQuery 4 incompatibility
	if (typeof jQuery.type !== 'function') {
		jQuery.type = function(obj) {
			if (obj === null) return "null";
			if (obj === undefined) return "undefined";
			return Object.prototype.toString.call(obj)
				.replace(/^\[object (.+)\]$/, "$1")
				.toLowerCase();
		};
	}


	//Increment Decrement Numberes	
	document.querySelectorAll(".quantity-control").forEach(container => {
		const input = container.querySelector(".quantity-input");
		container.querySelector(".add-btn").addEventListener("click", () => {
			input.value = Number(input.value) + 1;
		});
		container.querySelector(".minus-btn").addEventListener("click", () => {
			if (Number(input.value) > 1) input.value = Number(input.value) - 1;
		});
	});

	// Add Active Class
	document.querySelectorAll('.pos-item').forEach(item => {
		item.addEventListener('click', function() {
			this.classList.toggle('active');
		});
	});

	// Add Active Class
	document.querySelectorAll('.print-item').forEach(item => {
		item.addEventListener('click', function() {
			// 1. Remove 'active' from all items
			document.querySelectorAll('.print-item').forEach(el => {
				el.classList.remove('active');
			});

			// 2. Add 'active' to the clicked item
			this.classList.add('active');
		});
	});

  	// Target the modal by its class or a generic selector
	document.querySelectorAll('.modal').forEach(modal => {
		
		modal.addEventListener('shown.bs.modal', function () {
			// Find elements INSIDE this specific modal using 'this'
			const loader = this.querySelector('.loading-state');
			const content = this.querySelector('.content-state');

			// Start 2-second timer
			setTimeout(() => {
				if (loader && content) {
					loader.classList.add('d-none');    // Hide Loader
					content.classList.remove('d-none'); // Show Content
				}
			}, 2000);
		});

		// Reset when closed so it shows loading again next time
		modal.addEventListener('hidden.bs.modal', function () {
			const loader = this.querySelector('.loading-state');
			const content = this.querySelector('.content-state');
			
			if (loader && content) {
				loader.classList.remove('d-none');
				content.classList.add('d-none');
			}
		});
	});

	// Select the content area and all tab links
	const uploadContent = document.querySelector('.upload-content');
	const tabs = document.querySelectorAll('.prescription-tab a');

	tabs.forEach(tab => {
		tab.addEventListener('click', function(e) {
			e.preventDefault(); // Stop page from jumping

			// 1. Manage Active Class
			tabs.forEach(t => t.classList.remove('active'));
			this.classList.add('active');

			// 2. Show/Hide Logic based on ID
			if (this.id === 'upload-prescription') {
				// Show the content
				uploadContent.style.display = 'block'; 
				// If using Bootstrap, use: uploadContent.classList.remove('d-none');
			} 
			else if (this.id === 'scan-prescription') {
				// Hide the content
				uploadContent.style.display = 'none';
				// If using Bootstrap, use: uploadContent.classList.add('d-none');
			}
		});
	});

	// Payment Split
	const handlePaymentChange = (element) => {
		const contents = document.querySelectorAll('.split-content');
		contents.forEach((content) => {
			if (element.id === 'split') {
				content.classList.add('d-none');
			} else {
				content.classList.remove('d-none');
			}
		});
	};

	document.querySelectorAll('input[name="payment-method"]').forEach((radio) => {
		// Handle changes
		radio.addEventListener('change', function() {
			handlePaymentChange(this);
		});

		// Sync state on load if already checked
		if (radio.checked) handlePaymentChange(radio);
	});


	// Payment Method
	document.querySelectorAll('input[name="payment"]').forEach((radio) => {
		radio.addEventListener('change', function() {
			// 1. Find all elements that belong to payment content
			const allContent = document.querySelectorAll('.payment-content');
			
			// 2. Hide everything by default
			allContent.forEach(content => content.classList.add('d-none'));

			// 3. Show specific classes based on the clicked ID
			if (this.id === 'card') {
				document.querySelectorAll('.card-info').forEach(el => el.classList.remove('d-none'));
			} 
			else if (this.id === 'upi') {
				document.querySelectorAll('.upi-info').forEach(el => el.classList.remove('d-none'));
			}
			// If 'cash' is clicked, it stays hidden because of step 2
		});
	});


});


// Toggle Password
if ($('.toggle-password').length > 0) {
	$(document).on('click', '.toggle-password', function () {
		const $icon = $(this).find('i');
		const $input = $(this).closest('.input-group').find('.pass-input');
		if ($input.attr('type') === 'password') {
			$input.attr('type', 'text');
			$icon.removeClass('icon-eye-off').addClass('icon-eye');
		} else {
			$input.attr('type', 'password');
			$icon.removeClass('icon-eye').addClass('icon-eye-off');
		}
	});
}

// Add Item
// document.getElementById("addRow").addEventListener("click", function() {
//     let table = document.getElementById("itemTable");

//     let rowHtml = `
//     <tr>
//         <td>
//             <div class="d-flex align-items-center gap-2">
//                 <button class="btn p-0 text-danger delete-row" type="button">
//                     <i class="icon-trash-2"></i>
//                 </button>
//                 <i class="icon-grip-vertical text-body"></i>
//                 <select class="select">
//                     <option>Select</option>
//                     <option>Paracetamol</option>
//                     <option>Amoxicillin</option>
//                     <option>Ibuprofen</option>
//                     <option>Azithromycin</option>
//                     <option>Ciprofloxacin</option>
//                 </select>
//             </div>
//         </td>
//         <td><input type="text" class="form-control rounded-pill text-center"></td>
//         <td><input type="text" class="form-control rounded-pill text-center"></td>
//         <td><input type="text" class="form-control rounded-pill text-center"></td>
//         <td><input type="text" class="form-control rounded-pill text-center"></td>
//         <td><input type="text" class="form-control rounded-pill text-center"></td>
//         <td><input type="text" class="form-control rounded-pill text-center"></td>
//     </tr>`;

//     // 1. Insert the row
//     table.insertAdjacentHTML("beforeend", rowHtml);

//     // 2. Refresh Icons
//     if (typeof lucide !== 'undefined') { lucide.createIcons(); }

//     // 3. FIX: Re-initialize the Select Library
//     // Replace '.select' with your specific library init code:
    
//     // If you are using Select2:
//     if ($.fn.select2) {
//         $('.select').select2(); 
//     }
    
//     // If you are using a standard Bootstrap plugin or custom JS:
//     // Some templates use a custom function like initSelect()
// });

// // Delete functionality remains the same
// document.addEventListener("click", function(e) {
//     const deleteBtn = e.target.closest(".delete-row");
//     if (deleteBtn) {
//         deleteBtn.closest("tr").remove();
//     }
// });

