jQuery(document).ready(function ($) {
    'use strict';

    console.log('Themes & Plugins JS loaded successfully');


    function showSuccess(message) {
        showModal('success', 'Success!', message);
    }

    function showError(message) {
        showModal('error', 'Error', message);
    }

    function showConfirm(title, message, callback) {
        const modal = $('#peiwm-modal-overlay');
        modal.find('#peiwm-modal-title').text(title);
        modal.find('#peiwm-modal-message').html(message);
        modal.addClass('peiwm-show').show();

        $(document).on('keydown.peiwm-modal', function (e) {
            if (e.key === 'Escape') {
                modal.removeClass('peiwm-show').hide();
                $(document).off('keydown.peiwm-modal');
            }
        });
        
        $('#peiwm-modal-confirm').off('click').on('click', function () {
            modal.removeClass('peiwm-show').hide();
            $(document).off('keydown.peiwm-modal');
            if (callback) callback();
        });
        
        $('#peiwm-modal-cancel').off('click').on('click', function () {
            modal.removeClass('peiwm-show').hide();
            $(document).off('keydown.peiwm-modal');
        });
    }

    
    // Export Plugins
    $('#peiwm-export-plugins').on('click', function () {
        const button = $(this);
        const originalText = button.text();
        const exportType = $('input[name="plugin_export_type"]:checked').val();
        const selectedPlugins = [];
        
        if (exportType === 'selected') {
            $('input[name="selected_plugins[]"]:checked').each(function() {
                selectedPlugins.push($(this).val());
            });
            
            if (selectedPlugins.length === 0) {
                showError('Please select at least one plugin to export.');
                return;
            }
        }
        
        const progress = $('#peiwm-plugins-export-progress');
        const progressFill = progress.find('.peiwm-progress-fill');
        const progressText = progress.find('.peiwm-progress-text');
        const log = progress.find('.peiwm-log');
        
        button.prop('disabled', true).text(peiwm_ajax.strings.processing);
        progress.show();
        log.empty();
        progressFill.css('width', '0%');
        progressText.text('Creating plugins backup...');
        
        addLog('Starting plugins export...', log);
        
        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_export_plugins',
                nonce: peiwm_ajax.nonce,
                export_type: exportType,
                selected_plugins: selectedPlugins
            },
            success: function (response) {
                if (response.success) {
                    progressFill.css('width', '100%');
                    progressText.text('Export complete!');
                    addLog('✓ ' + response.data.message, log, 'peiwm-log-success');
                    
                    // Trigger download
                    const link = document.createElement('a');
                    link.href = response.data.download_url;
                    link.download = '';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    showSuccess(response.data.message + ' File size: ' + formatFileSize(response.data.file_size));
                } else {
                    progressText.text('Export failed: ' + response.data.message);
                    addLog('✗ Error: ' + response.data.message, log, 'peiwm-log-error');
                    showError('Export failed: ' + response.data.message);
                }
            },
            error: function (xhr, status, error) {
                progressText.text('Export failed: ' + error);
                addLog('✗ Error: ' + error, log, 'peiwm-log-error');
                showError('Export failed: ' + error);
            },
            complete: function () {
                button.prop('disabled', false).text(originalText);
            }
        });
    });

    // Select themes file
    $('#peiwm-select-themes-file').on('click', function () {
        $('#peiwm-themes-file').click();
    });

    $('#peiwm-themes-file').on('change', function () {
        const file = this.files[0];
        if (file) {
            if (file.type !== 'application/zip' && !file.name.toLowerCase().endsWith('.zip')) {
                showError('Please select a ZIP file.');
                return;
            }
            
            $('#peiwm-select-themes-file').text(file.name);
            $('#peiwm-import-themes').show();
            $('#peiwm-themes-import-options').show();
        }
    });

    // Select plugins file
    $('#peiwm-select-plugins-file').on('click', function () {
        $('#peiwm-plugins-file').click();
    });

    $('#peiwm-plugins-file').on('change', function () {
        const file = this.files[0];
        if (file) {
            if (file.type !== 'application/zip' && !file.name.toLowerCase().endsWith('.zip')) {
                showError('Please select a ZIP file.');
                return;
            }
            
            $('#peiwm-select-plugins-file').text(file.name);
            $('#peiwm-import-plugins').show();
            $('#peiwm-plugins-import-options').show();
        }
    });

    // Import Themes
    $('#peiwm-import-themes').on('click', function () {
        const fileInput = $('#peiwm-themes-file')[0];
        if (!fileInput.files.length) {
            showError('Please select a file to import.');
            return;
        }

        const file = fileInput.files[0];
        const replaceExisting = $('#peiwm-replace-existing-themes').is(':checked');
        const skipExisting    = $('#peiwm-skip-existing-themes').is(':checked');
        const activateTheme   = $('#peiwm-activate-imported-theme').is(':checked');
        
        const progress = $('#peiwm-themes-import-progress');
        const progressFill = progress.find('.peiwm-progress-fill');
        const progressText = progress.find('.peiwm-progress-text');
        const log = progress.find('.peiwm-log');
        
        progress.show();
        log.empty();
        progressFill.css('width', '0%');
        progressText.text('Starting themes import...');
        
        addLog('Starting themes import...', log);
        
        const formData = new FormData();
        formData.append('action', 'peiwm_import_themes');
        formData.append('nonce', peiwm_ajax.nonce);
        formData.append('themes_file', file);
        formData.append('replace_existing', replaceExisting ? '1' : '0');
        formData.append('skip_existing', skipExisting ? '1' : '0');
        formData.append('activate_theme', activateTheme ? '1' : '0');
        
        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                if (response.success) {
                    progressFill.css('width', '100%');
                    progressText.text('Import complete!');
                    addLog('✓ ' + response.data.message, log, 'peiwm-log-success');
                    
                    // Show detailed results
                    if (response.data.imported_themes && response.data.imported_themes.length > 0) {
                        addLog('📥 Imported Themes:', log, 'peiwm-log-success');
                        response.data.imported_themes.forEach(function(theme) {
                            addLog('  ✓ ' + theme, log, 'peiwm-log-success');
                        });
                    }
                    
                    if (response.data.skipped_themes && response.data.skipped_themes.length > 0) {
                        addLog('⚠ Skipped Themes (already exist):', log, 'peiwm-log-warning');
                        response.data.skipped_themes.forEach(function(theme) {
                            addLog('  ⚠ ' + theme, log, 'peiwm-log-warning');
                        });
                    }
                    
                    if (response.data.failed_themes && response.data.failed_themes.length > 0) {
                        addLog('❌ Failed Themes:', log, 'peiwm-log-error');
                        response.data.failed_themes.forEach(function(theme) {
                            addLog('  ❌ ' + theme, log, 'peiwm-log-error');
                        });
                    }
                    
                    if (response.data.activated_theme) {
                        addLog('🎨 Activated Theme: ' + response.data.activated_theme, log, 'peiwm-log-info');
                    }
                    
                    showSuccess(response.data.message);
                } else {
                    progressText.text('Import failed: ' + response.data.message);
                    addLog('✗ Error: ' + response.data.message, log, 'peiwm-log-error');
                    showError('Import failed: ' + response.data.message);
                }
            },
            error: function (xhr, status, error) {
                progressText.text('Import failed: ' + error);
                addLog('✗ Error: ' + error, log, 'peiwm-log-error');
                showError('Import failed: ' + error);
            }
        });
    });

    // Import Plugins
    $('#peiwm-import-plugins').on('click', function () {
        const fileInput = $('#peiwm-plugins-file')[0];
        if (!fileInput.files.length) {
            showError('Please select a file to import.');
            return;
        }

        const file = fileInput.files[0];
        const replaceExisting = $('#peiwm-replace-existing-plugins').is(':checked');
        const skipExisting    = $('#peiwm-skip-existing-plugins').is(':checked');
        const activatePlugins = $('#peiwm-activate-imported-plugins').is(':checked');
        
        const progress = $('#peiwm-plugins-import-progress');
        const progressFill = progress.find('.peiwm-progress-fill');
        const progressText = progress.find('.peiwm-progress-text');
        const log = progress.find('.peiwm-log');
        
        progress.show();
        log.empty();
        progressFill.css('width', '0%');
        progressText.text('Starting plugins import...');
        
        addLog('Starting plugins import...', log);
        
        const formData = new FormData();
        formData.append('action', 'peiwm_import_plugins');
        formData.append('nonce', peiwm_ajax.nonce);
        formData.append('plugins_file', file);
        formData.append('replace_existing', replaceExisting ? '1' : '0');
        formData.append('skip_existing', skipExisting ? '1' : '0');
        formData.append('activate_plugins', activatePlugins ? '1' : '0');
        
        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                if (response.success) {
                    progressFill.css('width', '100%');
                    progressText.text('Import complete!');
                    addLog('✓ ' + response.data.message, log, 'peiwm-log-success');
                    
                    // Show detailed results
                    if (response.data.imported_plugins && response.data.imported_plugins.length > 0) {
                        addLog('📥 Imported Plugins:', log, 'peiwm-log-success');
                        response.data.imported_plugins.forEach(function(plugin) {
                            addLog('  ✓ ' + plugin, log, 'peiwm-log-success');
                        });
                    }
                    
                    if (response.data.skipped_plugins && response.data.skipped_plugins.length > 0) {
                        addLog('⚠ Skipped Plugins (already exist):', log, 'peiwm-log-warning');
                        response.data.skipped_plugins.forEach(function(plugin) {
                            addLog('  ⚠ ' + plugin, log, 'peiwm-log-warning');
                        });
                    }
                    
                    if (response.data.failed_plugins && response.data.failed_plugins.length > 0) {
                        addLog('❌ Failed Plugins:', log, 'peiwm-log-error');
                        response.data.failed_plugins.forEach(function(plugin) {
                            addLog('  ❌ ' + plugin, log, 'peiwm-log-error');
                        });
                    }
                    
                    if (response.data.activated_plugins && response.data.activated_plugins.length > 0) {
                        addLog('🔌 Activated Plugins:', log, 'peiwm-log-info');
                        response.data.activated_plugins.forEach(function(plugin) {
                            addLog('  🔌 ' + plugin, log, 'peiwm-log-info');
                        });
                    }
                    
                    showSuccess(response.data.message);
                } else {
                    progressText.text('Import failed: ' + response.data.message);
                    addLog('✗ Error: ' + response.data.message, log, 'peiwm-log-error');
                    showError('Import failed: ' + response.data.message);
                }
            },
            error: function (xhr, status, error) {
                progressText.text('Import failed: ' + error);
                addLog('✗ Error: ' + error, log, 'peiwm-log-error');
                showError('Import failed: ' + error);
            }
        });
    });

    // Format file size
    function formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let i = 0;
        
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        
        return Math.round(bytes * 100) / 100 + ' ' + units[i];
    }

    // Close modal handlers
    $('.peiwm-modal-close, .peiwm-modal-overlay').on('click', function (e) {
        if (e.target === this) {
            $('.peiwm-modal-overlay').removeClass('peiwm-show').hide();
            $(document).off('keydown.peiwm-modal');
        }
    });
});