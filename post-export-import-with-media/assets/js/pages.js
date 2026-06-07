jQuery(document).ready(function ($) {
    'use strict';

    console.log('Pages.js loaded successfully');

    // Initialize checkbox default state
    $('#peiwm-download-missing-page-images').prop('checked', true);

    // Modal Utility Functions (reuse from main admin.js)
    function showModal(type, title, message) {
        $('.peiwm-modal-overlay').removeClass('peiwm-show').hide();
        $(document).off('keydown.peiwm-modal');

        let modalId = '#peiwm-modal-overlay';

        switch (type) {
            case 'success':
                modalId = '#peiwm-success-modal';
                break;
            case 'error':
                modalId = '#peiwm-error-modal';
                break;
            case 'confirm':
                modalId = '#peiwm-modal-overlay';
                break;
        }

        const modal = $(modalId);
        
        if (type === 'success') {
            modal.find('#peiwm-success-message').html(message);
        } else if (type === 'error') {
            modal.find('#peiwm-error-message').html(message);
        } else {
            modal.find('#peiwm-modal-title').text(title);
            modal.find('#peiwm-modal-message').html(message);
        }
        
        modal.addClass('peiwm-show').show();

        $(document).on('keydown.peiwm-modal', function (e) {
            if (e.key === 'Escape') {
                modal.removeClass('peiwm-show').hide();
                $(document).off('keydown.peiwm-modal');
            }
        });
    }

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

    function addLog(message, logContainer = null, className = '') {
        if (!logContainer) {
            logContainer = $('#peiwm-pages-progress .peiwm-log');
        }

        const time = new Date().toLocaleTimeString();
        const classAttr = className ? ' class="peiwm-log-entry ' + className + '"' : ' class="peiwm-log-entry"';
        logContainer.append('<div' + classAttr + '>[' + time + '] ' + message + '</div>');
        logContainer.scrollTop(logContainer[0].scrollHeight);
    }

    // Export Pages
    $('#peiwm-export-pages').on('click', function () {
        const button = $(this);
        const originalText = button.text();
        
        button.prop('disabled', true).text(peiwm_ajax.strings.processing);
        
        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_export_pages',
                nonce: peiwm_ajax.nonce
            },
            success: function (response) {
                if (response.success) {
                    const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = 'pages-export-' + new Date().toISOString().slice(0, 10) + '.json';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    
                    showSuccess('Pages exported successfully! ' + response.data.count + ' pages exported.');
                } else {
                    showError(response.data.message || 'Export failed');
                }
            },
            error: function (xhr, status, error) {
                showError('Export failed: ' + error);
            },
            complete: function () {
                button.prop('disabled', false).text(originalText);
            }
        });
    });

    // Select Pages File
    $('#peiwm-select-pages-file').on('click', function () {
        $('#peiwm-pages-file').click();
    });

    $('#peiwm-pages-file').on('change', function () {
        const file = this.files[0];
        if (file) {
            if (file.type !== 'application/json') {
                showError('Please select a JSON file.');
                return;
            }
            
            $('#peiwm-select-pages-file').text(file.name);
            $('#peiwm-import-pages').show();
        }
    });

    // Import Pages
    $('#peiwm-import-pages').on('click', function () {
        const fileInput = $('#peiwm-pages-file')[0];
        if (!fileInput.files.length) {
            showError('Please select a file to import.');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function (e) {
            try {
                const pages = JSON.parse(e.target.result);
                if (!Array.isArray(pages)) {
                    throw new Error('Invalid file format');
                }
                
                startPagesImport(pages);
            } catch (error) {
                showError('Invalid JSON file: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    });

    function startPagesImport(pages) {
        const progress = $('#peiwm-pages-progress');
        const progressFill = progress.find('.peiwm-progress-fill');
        const progressText = progress.find('.peiwm-progress-text');
        const log = progress.find('.peiwm-log');
        
        progress.show();
        log.empty();
        progressFill.css('width', '0%');
        progressText.text('Starting import...');
        
        let currentIndex = 0;
        const totalPages = pages.length;
        
        addLog('Starting import of ' + totalPages + ' page(s)...', log);
        
        function processNextPage() {
            if (currentIndex >= totalPages) {
                progressText.text('Import complete!');
                addLog('All pages processed successfully!', log);
                showSuccess('Pages import completed successfully!');
                return;
            }

            const page = pages[currentIndex];
            const downloadMissingImages = $('#peiwm-download-missing-page-images').is(':checked') ? '1' : '0';
            const checkMediaLibrary = $('#peiwm-check-media-library-pages').is(':checked') ? '1' : '0';
            
            // Show what we're about to do
            addLog('📝 Processing: ' + page.post_title, log, 'peiwm-log-info');
            
            // If download is enabled and page has images, show download intent
            if (downloadMissingImages === '1') {
                let imageCount = 0;
                if (page.content_images) imageCount += page.content_images.length;
                if (page.featured_image) imageCount += 1;
                
                if (imageCount > 0) {
                    addLog('  🔍 Checking ' + imageCount + ' image(s) - will download if missing', log, 'peiwm-log-info');
                }
            }
            
            $.ajax({
                url: peiwm_ajax.ajax_url,
                type: 'POST',
                timeout: 120000, // 2 minutes timeout for downloads
                data: {
                    action: 'peiwm_import_page',
                    nonce: peiwm_ajax.nonce,
                    page_data: JSON.stringify(page),
                    download_missing_images: downloadMissingImages,
                    check_media_library: checkMediaLibrary
                },
                success: function (response) {
                    if (response.success) {
                        if (response.data.status === 'skipped') {
                            addLog('⚠ Skipped: ' + page.post_title + ' (' + response.data.reason + ')', log);
                        } else {
                            let logMessage = '✓ Imported: ' + page.post_title;
                            
                            // Show missing images information
                            if (response.data.missing_images && response.data.missing_images.length > 0) {
                                const downloadStatus = response.data.download_enabled ? 'download attempted' : 'download disabled';
                                logMessage += ' (⚠ ' + response.data.missing_images.length + ' image(s) not found - ' + downloadStatus + ')';
                            }
                            
                            addLog(logMessage, log);
                        }
                    } else {
                        addLog('✗ Failed: ' + page.post_title + ' - ' + response.data.message, log);
                    }
                },
                error: function (xhr, status, error) {
                    addLog('✗ Error: ' + page.post_title + ' - ' + error, log);
                },
                complete: function () {
                    currentIndex++;
                    const progressPercent = Math.round((currentIndex / totalPages) * 100);
                    progressFill.css('width', progressPercent + '%');
                    progressText.text('Importing pages... (' + currentIndex + ' of ' + totalPages + ')');

                    // Process next page with a small delay
                    setTimeout(processNextPage, 100);
                }
            });
        }
        
        processNextPage();
    }

    // Delete All Pages
    $('#peiwm-delete-pages').on('click', function () {
        console.log('Delete pages button clicked');
        const deleteMessage = `
            <div class="peiwm-danger-text">
                ⚠ <strong>WARNING:</strong> This will permanently delete ALL pages from your website.
            </div>
            <p>This action cannot be undone and will remove all pages, including drafts and published content.</p>
            <p>Are you sure you want to continue?</p>
        `;
        
        showConfirm('Delete All Pages', deleteMessage, function () {
            const progress = $('#peiwm-delete-pages-progress');
            const progressFill = progress.find('.peiwm-progress-fill');
            const progressText = progress.find('.peiwm-progress-text');
            const log = progress.find('.peiwm-log');
            
            progress.show();
            log.empty();
            progressFill.css('width', '0%');
            progressText.text('Deleting pages...');
            
            addLog('Starting page deletion...', log);
            
            $.ajax({
                url: peiwm_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'peiwm_delete_pages',
                    nonce: peiwm_ajax.nonce
                },
                success: function (response) {
                    if (response.success) {
                        progressFill.css('width', '100%');
                        progressText.text('Deletion complete!');
                        addLog('✓ ' + response.data.message, log);
                        showSuccess(response.data.message);
                    } else {
                        progressText.text('Deletion failed: ' + response.data.message);
                        addLog('✗ Error: ' + response.data.message, log);
                        showError('Delete failed: ' + response.data.message);
                    }
                },
                error: function (xhr, status, error) {
                    progressText.text('Deletion failed: ' + error);
                    addLog('✗ Error: ' + error, log);
                    showError('Delete failed: ' + error);
                }
            });
        });
    });

    // Close modal handlers
    $('.peiwm-modal-close, .peiwm-modal-overlay').on('click', function (e) {
        if (e.target === this) {
            $('.peiwm-modal-overlay').removeClass('peiwm-show').hide();
            $(document).off('keydown.peiwm-modal');
        }
    });
});