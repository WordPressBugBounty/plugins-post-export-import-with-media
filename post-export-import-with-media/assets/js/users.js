jQuery(document).ready(function ($) {
    'use strict';

    // ── Cached download URL from last export ──────────────────────────────
    var lastExportFilename = '';

    // ── Premium modal listener (admin.js not loaded on this page) ─────────
    
    // ── Import Users ───────────────────────────────────────────────────────
    $('#peiwm-import-users').on('click', function () {
        var file = $('#peiwm-users-file')[0].files[0];
        if (!file) {
            alert(peiwm_users_ajax.strings.select_file);
            return;
        }

        var $btn = $(this);
        $btn.prop('disabled', true).text(peiwm_users_ajax.strings.importing);
        $('#peiwm-users-import-result').hide().empty();

        var reader = new FileReader();
        reader.onload = function (e) {
            var usersJson = e.target.result;

            // Validate JSON before sending
            try {
                JSON.parse(usersJson);
            } catch (err) {
                $btn.prop('disabled', false).text(peiwm_users_ajax.strings.import_btn);
                $('#peiwm-users-import-result').html(
                    '<p style="color:#ef4444;">❌ ' + peiwm_users_ajax.strings.invalid_json + '</p>'
                ).show();
                return;
            }

            var defaultPassword = $('#peiwm-users-set-password').is(':checked')
                ? $('#peiwm-users-default-password').val()
                : '';

            $.ajax({
                url:  peiwm_users_ajax.ajax_url,
                type: 'POST',
                data: {
                    action:           'peiwm_import_users',
                    nonce:            peiwm_users_ajax.nonce,
                    users_json:       usersJson,
                    default_password: defaultPassword,
                    send_email:       $('#peiwm-users-send-email').is(':checked') ? '1' : '0',
                    force_same_id:    $('#peiwm-users-force-id').is(':checked') ? '1' : '0',
                    import_password:  $('#peiwm-export-password').is(':checked') && !$('#peiwm-export-password').prop('disabled') ? '1' : '0',
                    import_meta:      $('#peiwm-export-meta').is(':checked')     && !$('#peiwm-export-meta').prop('disabled')     ? '1' : '0',
                    import_woocommerce: $('#peiwm-export-woocommerce').is(':checked') && !$('#peiwm-export-woocommerce').prop('disabled') ? '1' : '0',
                    import_acf:       $('#peiwm-export-acf').is(':checked')      && !$('#peiwm-export-acf').prop('disabled')      ? '1' : '0',
                },
                success: function (response) {
                    $btn.prop('disabled', false).text(peiwm_users_ajax.strings.import_btn);
                    if (response.success) {
                        renderImportSummary(response.data);
                    } else {
                        $('#peiwm-users-import-result').html(
                            '<p style="color:#ef4444;">❌ ' + $('<div>').text(response.data.message || peiwm_users_ajax.strings.error).html() + '</p>'
                        ).show();
                    }
                },
                error: function () {
                    $btn.prop('disabled', false).text(peiwm_users_ajax.strings.import_btn);
                    $('#peiwm-users-import-result').html(
                        '<p style="color:#ef4444;">❌ ' + peiwm_users_ajax.strings.error + '</p>'
                    ).show();
                }
            });
        };
        reader.readAsText(file);
    });

    // ── Build import summary card from JSON response ───────────────────────
    function renderImportSummary(data) {
        var sendEmail   = $('#peiwm-users-send-email').is(':checked');
        var forceId     = $('#peiwm-users-force-id').is(':checked');
        var hasMismatch = data.id_mismatches && data.id_mismatches.length > 0;

        var rows = '';

        rows += summaryRow('✅', peiwm_users_ajax.strings.summary_imported, data.imported);
        rows += summaryRow('⏭', peiwm_users_ajax.strings.summary_skipped, data.skipped);

        if (forceId) {
            rows += summaryRow('🔒', peiwm_users_ajax.strings.summary_id_preserved, data.id_preserved);

            if (hasMismatch) {
                var detailRows = '';
                $.each(data.id_mismatches, function (i, m) {
                    detailRows += '<tr><td>' + $('<div>').text(m.login).html() + '</td>' +
                        '<td>' + m.original_id + ' → ' + m.new_id + '</td></tr>';
                });
                rows += '<tr>' +
                    '<td>⚠</td>' +
                    '<td>' + peiwm_users_ajax.strings.summary_id_mismatch + '</td>' +
                    '<td>' + data.id_mismatches.length +
                        ' <button type="button" class="button-link peiwm-toggle-mismatch" style="font-size:0.8rem;">▼ ' +
                        peiwm_users_ajax.strings.show_details + '</button>' +
                    '</td>' +
                '</tr>' +
                '<tr class="peiwm-mismatch-details" style="display:none;">' +
                    '<td colspan="3">' +
                        '<table style="width:100%;font-size:0.8rem;margin-top:0.5rem;">' +
                            '<thead><tr><th style="text-align:left;">Login</th><th style="text-align:left;">ID change</th></tr></thead>' +
                            '<tbody>' + detailRows + '</tbody>' +
                        '</table>' +
                    '</td>' +
                '</tr>';
            }
        }

        if (sendEmail) {
            if (data.mail_not_configured) {
                rows += '<tr><td>ℹ</td><td colspan="2">' + peiwm_users_ajax.strings.mail_not_configured + '</td></tr>';
            } else {
                rows += summaryRow('✉', peiwm_users_ajax.strings.summary_emails_sent, data.emails_sent);
                if (data.emails_failed > 0) {
                    rows += summaryRow('✉', peiwm_users_ajax.strings.summary_emails_failed, data.emails_failed);
                }
            }
        }

        var html = '<div class="peiwm-users-summary-card">' +
            '<h4>' + peiwm_users_ajax.strings.summary_title + '</h4>' +
            '<table class="peiwm-users-summary-table">' +
                '<tbody>' + rows + '</tbody>' +
            '</table>' +
        '</div>';

        $('#peiwm-users-import-result').html(html).show();

        // Toggle mismatch details
        $(document).off('click.mismatch').on('click.mismatch', '.peiwm-toggle-mismatch', function () {
            var $row = $(this).closest('tr').next('.peiwm-mismatch-details');
            $row.toggle();
            $(this).text($row.is(':visible') ? '▲ ' + peiwm_users_ajax.strings.hide_details : '▼ ' + peiwm_users_ajax.strings.show_details);
        });
    }

    function summaryRow(icon, label, value) {
        return '<tr><td>' + icon + '</td><td>' + label + '</td><td><strong>' + value + '</strong></td></tr>';
    }

    // ── Advanced Options Toggle ──────────────────────────────────────────────
    

});
