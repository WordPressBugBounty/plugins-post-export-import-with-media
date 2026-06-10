jQuery(document).ready(function ($) {
    'use strict';

    console.log('Pages.js loaded successfully');

    // Premium Modal handler
    $(document).on('click', '.peiwm-open-premium-modal, .peiwm-locked-section', function (e) {
        if ($(e.target).is('input, select, textarea, button:not(.peiwm-open-premium-modal), label, a')) return;
        e.preventDefault();
        e.stopPropagation();
        const modal = $('#peiwm-premium-modal');
        modal.show().addClass('peiwm-show');
        modal.find('.peiwm-premium-close, .peiwm-modal-close').off('click').on('click', function () {
            modal.removeClass('peiwm-show').hide();
        });
        modal.off('click.premium').on('click.premium', function (ev) {
            if (ev.target === this) modal.removeClass('peiwm-show').hide();
        });
        $(document).off('keydown.premium-modal').on('keydown.premium-modal', function (ev) {
            if (ev.key === 'Escape') modal.removeClass('peiwm-show').hide();
        });
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