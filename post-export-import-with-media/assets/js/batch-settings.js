jQuery(document).ready(function ($) {
	'use strict';

	/* =========================
	   PREMIUM MODAL HANDLER
	========================= */
	$(document).on('click', '.peiwm-open-premium-modal, .peiwm-locked-section', function (e) {
		if ($(e.target).is('input, select, textarea, button:not(.peiwm-open-premium-modal), label, a')) return;

		e.preventDefault();
		e.stopPropagation();

		const modal = $('#peiwm-premium-modal');
		modal.show().addClass('peiwm-show');

		modal.find('.peiwm-premium-close, .peiwm-modal-close')
			.off('click')
			.on('click', function () {
				modal.removeClass('peiwm-show').hide();
			});

		modal.off('click.premium').on('click.premium', function (ev) {
			if (ev.target === this) modal.removeClass('peiwm-show').hide();
		});

		$(document).off('keydown.premium-modal').on('keydown.premium-modal', function (ev) {
			if (ev.key === 'Escape') modal.removeClass('peiwm-show').hide();
		});
	});


	/* =========================
	   PRESET MODES CONFIG
	========================= */
	const MODES = {
		default:     { post_batch_size:10,  page_batch_size:10,  media_batch_size:10,  concurrent_requests:2,  export_list_page_size:50,   export_json_size:100,  media_zip_size_limit:10,  batch_delay:2000 },
		micro:       { post_batch_size:10,  page_batch_size:10,  media_batch_size:10,  concurrent_requests:2,  export_list_page_size:50,   export_json_size:100,  media_zip_size_limit:10,  batch_delay:2000 },
		low:         { post_batch_size:10,  page_batch_size:10,  media_batch_size:20,  concurrent_requests:4,  export_list_page_size:80,   export_json_size:200,  media_zip_size_limit:20,  batch_delay:1500 },
		light:       { post_batch_size:20,  page_batch_size:20,  media_batch_size:30,  concurrent_requests:10, export_list_page_size:100,  export_json_size:300,  media_zip_size_limit:30,  batch_delay:1000 },
		standard:    { post_batch_size:50,  page_batch_size:50,  media_batch_size:50,  concurrent_requests:20, export_list_page_size:300,  export_json_size:500,  media_zip_size_limit:50,  batch_delay:500  },
		balanced:    { post_batch_size:100, page_batch_size:100, media_batch_size:100, concurrent_requests:30, export_list_page_size:600,  export_json_size:1000, media_zip_size_limit:100, batch_delay:300  },
		performance: { post_batch_size:200, page_batch_size:200, media_batch_size:200, concurrent_requests:50, export_list_page_size:700,  export_json_size:2000, media_zip_size_limit:200, batch_delay:100  },
		turbo:       { post_batch_size:500, page_batch_size:500, media_batch_size:500, concurrent_requests:100,export_list_page_size:900,  export_json_size:5000, media_zip_size_limit:300, batch_delay:50   },
		max:         { post_batch_size:1000,page_batch_size:1000,media_batch_size:1000,concurrent_requests:200,export_list_page_size:1000, export_json_size:10000,media_zip_size_limit:500, batch_delay:0    }
	};

	const FIELDS = [
		'post_batch_size','page_batch_size','media_batch_size','concurrent_requests',
		'export_list_page_size','export_json_size','media_zip_size_limit','batch_delay'
	];

	let currentMode = $('#peiwm_preset_mode').val() || 'standard';

	/* =========================
	   TOGGLE BATCH UI
	========================= */
	$('#enable_batch_processing').on('change', function () {
		if ($(this).is(':checked')) {
			$('#peiwm-batch-config, #peiwm-preset-row').slideDown();
		} else {
			$('#peiwm-batch-config, #peiwm-preset-row').slideUp();
		}
	});


	/* =========================
	   LOAD CONTENT STATS (AJAX)
	========================= */
	loadContentStats();

	function loadContentStats() {
		$.ajax({
			url: peiwm_batch_ajax.ajax_url, // ✅ FIXED (was ajaxurl)
			type: 'POST',
			data: {
				action: 'peiwm_get_content_stats',
				nonce: peiwm_batch_ajax.nonce
			},
			success: function (response) {
				if (response.success) {
					displayContentStats(response.data);
				}
			}
		});
	}

	function displayContentStats(stats) {
		let html = `
			<div class="peiwm-stat-row">
				<div class="peiwm-stat-item">
					<div class="peiwm-stat-label">Total Posts</div>
					<div class="peiwm-stat-value">${stats.total_posts}</div>
				</div>
				<div class="peiwm-stat-item">
					<div class="peiwm-stat-label">Total Pages</div>
					<div class="peiwm-stat-value">${stats.total_pages}</div>
				</div>
				<div class="peiwm-stat-item">
					<div class="peiwm-stat-label">Total Media</div>
					<div class="peiwm-stat-value">${stats.total_media}</div>
				</div>
			</div>
		`;

		if (stats.total_posts > 500 || stats.total_pages > 500 || stats.total_media > 500) {
			html += `
				<div class="peiwm-recommendation">
					<strong>✓ Recommendation:</strong> Large content detected. Enable batch processing.
				</div>`;
		} else {
			html += `
				<div class="peiwm-recommendation">
					<strong>ℹ Info:</strong> Moderate content. Batch is optional.
				</div>`;
		}

		$('#peiwm-content-stats').html(html);
	}


	/* =========================
	   INIT
	========================= */
	renderPresetUI();

});