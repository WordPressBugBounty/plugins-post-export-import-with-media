jQuery(document).ready(function ($) {
    'use strict';

    // Initialize checkbox default states
    $('#peiwm-check-media-library').prop('checked', true);
    $('#peiwm-download-missing-images').prop('checked', true);

    // Author mapping toggle - show/hide fallback options (PRO only; disabled on free)
    $('#peiwm_smart_author_mapping').on('change', function () {
        if ($(this).prop('disabled')) return; // locked on free plan
        if ($(this).is(':checked')) {
            $('#peiwm-author-fallback-options').slideDown(200);
        } else {
            $('#peiwm-author-fallback-options').slideUp(200);
        }
    });

    // WPML Support toggle - save setting via AJAX
    
    // ── Advanced Options Toggle ──────────────────────────────────────────────
    $(document).on('click', '.peiwm-advanced-toggle', function () {
        var $btn    = $(this);
        var targetId = $btn.attr('aria-controls');
        var $panel  = $('#' + targetId);
        var isOpen  = $btn.hasClass('is-open');

        $btn.toggleClass('is-open', !isOpen)
            .attr('aria-expanded', String(!isOpen));

        $panel.toggleClass('is-open', !isOpen)
              .attr('aria-hidden', String(isOpen));
    });

    // ── PRO inline row click → show toast (only for locked rows) ─────────────
    $(document).on('click', '.peiwm-pro-inline-row.is-locked', function (e) {
        // Don't fire if user clicked a real link or checkbox
        if ($(e.target).is('a, input, label')) return;

        var $section = $(this).closest('.peiwm-export-section, .peiwm-import-section, .peiwm-section');
        var $toast   = $section.find('.peiwm-pro-toast');
        if ($toast.length) {
            $toast.show().addClass('is-visible');
            setTimeout(function() {
                if ($toast[0]) {
                    $toast[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 50);
        }
    });

    // ── Toast close button ────────────────────────────────────────────────────
    $(document).on('click', '.peiwm-pro-toast-close', function () {
        $(this).closest('.peiwm-pro-toast').removeClass('is-visible').fadeOut(200);
    });

    // ── Keyboard: Enter/Space on toggle ──────────────────────────────────────
    $(document).on('keydown', '.peiwm-advanced-toggle', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            $(this).trigger('click');
        }
    });
    
});