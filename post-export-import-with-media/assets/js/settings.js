jQuery(document).ready(function ($) {
    'use strict';

    // Initialize checkbox default states
    $('input[name="export_settings_groups[]"]').prop('checked', true);

    function showConfirm(title, message, callback) {
        showModal('confirm', title, message);
        
        $('#peiwm-confirm-yes').off('click').on('click', function () {
            $('.peiwm-modal-overlay').removeClass('peiwm-show').hide();
            if (callback) callback();
        });
        
        $('#peiwm-confirm-no').off('click').on('click', function () {
            $('.peiwm-modal-overlay').removeClass('peiwm-show').hide();
        });
    }

    function addLog(message, logContainer = null, className = '') {
        if (!logContainer) {
            logContainer = $('#peiwm-settings-progress .peiwm-log');
        }

        const time = new Date().toLocaleTimeString();
        const classAttr = className ? ' class="peiwm-log-entry ' + className + '"' : ' class="peiwm-log-entry"';
        logContainer.append('<div' + classAttr + '>[' + time + '] ' + message + '</div>');
        logContainer.scrollTop(logContainer[0].scrollHeight);
    }

    // Export Settings
   

    // Close modal handlers
    $('.peiwm-modal-close, .peiwm-modal-overlay').on('click', function (e) {
        if (e.target === this) {
            $('.peiwm-modal-overlay').removeClass('peiwm-show').hide();
            $(document).off('keydown.peiwm-modal');
        }
    });
});