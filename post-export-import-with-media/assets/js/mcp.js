/**
 * JavaScript for MCP & Remote Sync (Free preview and interactions).
 *
 * @package Post_Export_Import_With_Media
 * @since 1.3.0
 */

(function($) {
    'use strict';

    $(document).ready(function() {
        // Tab switching for Free MCP preview tabs
        $('.peiwm-mcp-tab-btn').on('click', function(e) {
            e.preventDefault();
            var targetTab = $(this).data('tab');

            $('.peiwm-mcp-tab-btn').removeClass('active');
            $(this).addClass('active');

            $('.peiwm-mcp-tab-pane').removeClass('active').hide();
            $('#' + targetTab).addClass('active').show();
        });

        // Copy button in preview snippet
        $('.peiwm-mcp-copy-snippet').on('click', function(e) {
            e.preventDefault();
            var $btn = $(this);
            var textToCopy = $btn.data('clipboard-text') || $btn.siblings('pre').text();

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(function() {
                    var originalHtml = $btn.html();
                    $btn.text('Copied!');
                    setTimeout(function() {
                        $btn.html(originalHtml);
                    }, 2000);
                });
            }
        });
    });
})(jQuery);
