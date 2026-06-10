/**
 * Batch Processing for Posts, Pages, and Media
 * 
 * @package Post_Export_Import_With_Media
 * @since 1.3.0
 */

jQuery(document).ready(function ($) {
    'use strict';

    // Check if batch mode is enabled
    const batchEnabled = typeof peiwm_batch_settings !== 'undefined' && peiwm_batch_settings.enabled;

    if (!batchEnabled) {
        return; // Exit if batch mode is not enabled
    }

    // Global image cache to avoid re-checking same images
    const imageCache = {
        existing: {},
        missing: {},
        checked: false
    };

    // Override export posts button
    $('#peiwm-export-posts').off('click').on('click', function () {
        // If selective mode is on, use chunked selective export
        if ($('#peiwm-export-posts-selective').is(':checked')) {
            const button = $(this);
            const originalText = button.text();
            const ids = [];
            $('#peiwm-posts-export-list .peiwm-selective-checkbox:checked').each(function () {
                const id = parseInt($(this).attr('data-id'), 10);
                if (id > 0) ids.push(id);
            });
            if (ids.length === 0) {
                showError('Please select at least one post to export.');
                return;
            }
            button.prop('disabled', true).text('Exporting...');
            $('#peiwm-posts-progress').show();
            $('html, body').animate({ scrollTop: $('#peiwm-posts-progress').offset().top - 40 }, 400);

            const ajaxChunkSize = 50;
            let allData = [];
            let selectiveOffset = 0; // tracks position in ids array

            function exportChunk() {
                // Pre-slice IDs in JS - avoids sending all IDs every request and offset confusion
                const chunkIds = ids.slice(selectiveOffset, selectiveOffset + ajaxChunkSize);
                if (chunkIds.length === 0) {
                    // All done
                    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'posts_export_' + new Date().toISOString().slice(0, 10) + '.json';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    showSuccess('Posts exported successfully! (' + allData.length + ' posts)');
                    button.prop('disabled', false).text(originalText);
                    return;
                }

                button.text('Exporting... (' + allData.length + ' of ' + ids.length + ' posts)');
                $.ajax({
                    url: peiwm_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'peiwm_export_posts_chunk',
                        nonce: peiwm_ajax.nonce,
                        offset: 0,           // always 0 - IDs are pre-sliced
                        chunk_size: chunkIds.length,
                        post_ids: chunkIds.join(','),
                        export_wpml_data: $('#peiwm-export-wpml-data').is(':checked') ? '1' : '0'
                    },
                    success: function (response) {
                        if (response.success) {
                            allData = allData.concat(response.data.data);
                            selectiveOffset += response.data.data.length;
                            if (selectiveOffset < ids.length) {
                                setTimeout(exportChunk, 100);
                            } else {
                                const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = 'posts_export_' + new Date().toISOString().slice(0, 10) + '.json';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                                showSuccess('Posts exported successfully! (' + allData.length + ' posts)');
                                button.prop('disabled', false).text(originalText);
                            }
                        } else {
                            showError('Export failed: ' + response.data.message);
                            button.prop('disabled', false).text(originalText);
                        }
                    },
                    error: function (xhr, status, error) {
                        showError('Export failed: ' + error);
                        button.prop('disabled', false).text(originalText);
                    }
                });
            }
            exportChunk();
            return;
        }
        batchExportPosts();
    });

    // Override export pages button (if exists)
    $('#peiwm-export-pages').off('click').on('click', function () {
        // If selective mode is on, use regular selective export (not batch)
        if ($('#peiwm-export-pages-selective').is(':checked')) {
            const button = $(this);
            const originalText = button.text();
            const ids = [];
            $('#peiwm-pages-export-list .peiwm-selective-checkbox:checked').each(function () {
                const id = parseInt($(this).attr('data-id'), 10);
                if (id > 0) ids.push(id);
            });
            if (ids.length === 0) {
                showError('Please select at least one page to export.');
                return;
            }
            button.prop('disabled', true).text('Exporting...');
            $.ajax({
                url: peiwm_ajax.ajax_url,
                type: 'POST',
                data: { action: 'peiwm_export_pages', nonce: peiwm_ajax.nonce, post_ids: ids.join(',') },
                success: function (response) {
                    if (response.success) {
                        const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'pages-export-' + new Date().toISOString().slice(0, 10) + '.json';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        showSuccess('Pages exported successfully! (' + response.data.count + ' pages)');
                    } else {
                        showError('Export failed: ' + response.data.message);
                    }
                },
                error: function (xhr, status, error) { showError('Export failed: ' + error); },
                complete: function () { button.prop('disabled', false).text(originalText); }
            });
            return;
        }
        batchExportPages();
    });

    // Override export media button
    $('#peiwm-export-media').off('click').on('click', function () {
        batchExportMedia();
    });

    // Override import posts button - supports multiple JSON files
    $('#peiwm-import-posts').off('click').on('click', function () {
        const button = $(this);
        const fileInput = $('#peiwm-posts-file')[0];
        if (!fileInput.files.length) {
            showError(peiwm_ajax.strings.select_file);
            return;
        }

        const files = Array.from(fileInput.files);
        const totalFiles = files.length;
        const isSelective = $('#peiwm-import-posts-selective').is(':checked');

        button.prop('disabled', true).text(totalFiles > 1 ? 'Reading files...' : 'Importing...');
        $('#peiwm-posts-progress').show();
        $('html, body').animate({ scrollTop: $('#peiwm-posts-progress').offset().top - 40 }, 400);

        let allFilesData = [];
        let filesRead = 0;

        files.forEach(function (file, fileIdx) {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    let data = JSON.parse(e.target.result);
                    if (!Array.isArray(data)) data = [];
                    allFilesData[fileIdx] = data;
                } catch (err) {
                    allFilesData[fileIdx] = [];
                }
                filesRead++;
                if (filesRead === totalFiles) {
                    // Always use the shared startImportFromAllFiles with batchImportPosts
                    const startImport = window.peiwmStartImportFromAllFiles;
                    if (startImport) {
                        startImport(allFilesData, files, isSelective, button, totalFiles, batchImportPosts);
                    } else {
                        let idx = 0;
                        function next() {
                            if (idx >= allFilesData.length) { button.prop('disabled', false).text('Start Import'); return; }
                            batchImportPosts(allFilesData[idx] || [], files[idx] ? files[idx].name : ('file' + (idx + 1)), 1, 1, function () { idx++; next(); });
                        }
                        next();
                    }
                }
            };
            reader.readAsText(file);
        });
    });

    // Override import pages button - supports multiple JSON files
    $('#peiwm-import-pages').off('click').on('click', function () {
        const button = $(this);
        const fileInput = $('#peiwm-pages-file')[0];
        if (!fileInput.files.length) {
            showError(peiwm_ajax.strings.select_file);
            return;
        }

        const files = Array.from(fileInput.files);
        const totalFiles = files.length;
        let currentFileIndex = 0;

        button.prop('disabled', true).text(totalFiles > 1 ? 'Importing file 1 of ' + totalFiles + '...' : 'Importing...');
        $('#peiwm-pages-progress').show();
        $('html, body').animate({ scrollTop: $('#peiwm-pages-progress').offset().top - 40 }, 400);

        function processNextFile() {
            if (currentFileIndex >= totalFiles) {
                button.prop('disabled', false).text('Start Import');
                if (totalFiles > 1) showSuccess('All ' + totalFiles + ' files imported successfully!');
                return;
            }

            const file = files[currentFileIndex];
            if (totalFiles > 1) button.text('Importing file ' + (currentFileIndex + 1) + ' of ' + totalFiles + '...');

            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    let data = JSON.parse(e.target.result);
                    if (!Array.isArray(data)) {
                        showError('File ' + file.name + ': Invalid format.');
                        currentFileIndex++;
                        processNextFile();
                        return;
                    }

                    const pageSettings = window.peiwmPageImportSettings || {};
                    data = data.map(function (page, i) {
                        const s = pageSettings[i];
                        return Object.assign({}, page, { _force_status: s ? s.force_status : 'original' });
                    });

                    if ($('#peiwm-import-pages-selective').is(':checked')) {
                        const selectedIndexes = [];
                        $('#peiwm-pages-list .peiwm-selective-checkbox:checked').each(function () {
                            selectedIndexes.push(parseInt($(this).attr('data-index'), 10));
                        });
                        if (selectedIndexes.length === 0 && totalFiles === 1) {
                            showError('Please select at least one page to import.');
                            button.prop('disabled', false).text('Start Import');
                            return;
                        }
                        if (selectedIndexes.length > 0) {
                            data = data.filter((_, i) => selectedIndexes.includes(i));
                        }
                    }

                    batchImportPages(data, function () {
                        currentFileIndex++;
                        processNextFile();
                    });
                } catch (error) {
                    showError('File ' + file.name + ': ' + error.message);
                    currentFileIndex++;
                    processNextFile();
                }
            };
            reader.readAsText(file);
        }

        processNextFile();
    });

    // Override import media button
    $('#peiwm-import-media').off('click').on('click', function () {
        const button = $(this);
        const fileInput = $('#peiwm-media-file')[0];
        if (!fileInput.files.length) {
            showError(peiwm_ajax.strings.select_file);
            return;
        }

        const files = Array.from(fileInput.files);
        const maxSize = 500 * 1024 * 1024; // 500MB hard limit

        // Get server upload limits
        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_get_upload_limits',
                nonce: peiwm_ajax.nonce
            },
            success: function(response) {
                if (response.success) {
                    const serverLimit = response.data.limit_bytes;
                    const serverLimitMB = response.data.limit_mb;
                    
                    // Validate all files first
                    for (const file of files) {
                        if (!file.name.toLowerCase().endsWith('.zip')) {
                            showError(file.name + ': ' + peiwm_ajax.strings.select_zip);
                            return;
                        }
                        
                        // Check against server limit first
                        if (file.size > serverLimit) {
                            showError(file.name + ' is too large (' + (file.size / (1024 * 1024)).toFixed(1) + 'MB). ' +
                                'Your server upload limit is ' + serverLimitMB + 'MB. ' +
                                'Contact your hosting provider to increase upload_max_filesize and post_max_size in php.ini.');
                            return;
                        }
                        
                        // Check against plugin limit
                        if (file.size > maxSize) {
                            showError(file.name + ' is too large (' + (file.size / (1024 * 1024)).toFixed(1) + 'MB). Max 500MB per file.');
                            return;
                        }
                    }

                    const totalFiles = files.length;
                    let currentFileIndex = 0;
                    button.prop('disabled', true);

                    function processNextMediaFile() {
                        if (currentFileIndex >= totalFiles) {
                            button.prop('disabled', false).text('Start Import');
                            if (totalFiles > 1) showSuccess('All ' + totalFiles + ' ZIP files imported successfully!');
                            return;
                        }
                        const file = files[currentFileIndex];
                        button.text(totalFiles > 1 ? 'Importing ZIP ' + (currentFileIndex + 1) + ' of ' + totalFiles + '...' : 'Importing...');
                        batchImportMedia(file, function () {
                            currentFileIndex++;
                            processNextMediaFile();
                        });
                    }

                    processNextMediaFile();
                } else {
                    // Fallback to basic validation if we can't get server limits
                    for (const file of files) {
                        if (!file.name.toLowerCase().endsWith('.zip')) {
                            showError(file.name + ': ' + peiwm_ajax.strings.select_zip);
                            return;
                        }
                        if (file.size > maxSize) {
                            showError(file.name + ' is too large (' + (file.size / (1024 * 1024)).toFixed(1) + 'MB). Max 500MB per file.');
                            return;
                        }
                    }

                    const totalFiles = files.length;
                    let currentFileIndex = 0;
                    button.prop('disabled', true);

                    function processNextMediaFile() {
                        if (currentFileIndex >= totalFiles) {
                            button.prop('disabled', false).text('Start Import');
                            if (totalFiles > 1) showSuccess('All ' + totalFiles + ' ZIP files imported successfully!');
                            return;
                        }
                        const file = files[currentFileIndex];
                        button.text(totalFiles > 1 ? 'Importing ZIP ' + (currentFileIndex + 1) + ' of ' + totalFiles + '...' : 'Importing...');
                        batchImportMedia(file, function () {
                            currentFileIndex++;
                            processNextMediaFile();
                        });
                    }

                    processNextMediaFile();
                }
            },
            error: function() {
                // Fallback to basic validation if AJAX fails
                for (const file of files) {
                    if (!file.name.toLowerCase().endsWith('.zip')) {
                        showError(file.name + ': ' + peiwm_ajax.strings.select_zip);
                        return;
                    }
                    if (file.size > maxSize) {
                        showError(file.name + ' is too large (' + (file.size / (1024 * 1024)).toFixed(1) + 'MB). Max 500MB per file.');
                        return;
                    }
                }

                const totalFiles = files.length;
                let currentFileIndex = 0;
                button.prop('disabled', true);

                function processNextMediaFile() {
                    if (currentFileIndex >= totalFiles) {
                        button.prop('disabled', false).text('Start Import');
                        if (totalFiles > 1) showSuccess('All ' + totalFiles + ' ZIP files imported successfully!');
                        return;
                    }
                    const file = files[currentFileIndex];
                    button.text(totalFiles > 1 ? 'Importing ZIP ' + (currentFileIndex + 1) + ' of ' + totalFiles + '...' : 'Importing...');
                    batchImportMedia(file, function () {
                        currentFileIndex++;
                        processNextMediaFile();
                    });
                }

                processNextMediaFile();
            }
        });
    });

    // Batch Export Posts
    function batchExportPosts() {
        const button = $('#peiwm-export-posts');
        const originalText = button.text();
        const progress = $('#peiwm-posts-progress');
        const progressFill = progress.find('.peiwm-progress-fill');
        const progressText = progress.find('.peiwm-progress-text');
        const log = progress.find('.peiwm-log');

        button.prop('disabled', true).text('Initializing...');
        progress.show();
        $('html, body').animate({ scrollTop: progress.offset().top - 40 }, 400);
        progressFill.css('width', '0%');
        log.empty();

        // Start batch export
        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_batch_export_posts_start',
                nonce: peiwm_ajax.nonce,
                export_wpml_data: $('#peiwm-export-wpml-data').is(':checked') ? '1' : '0'
            },
            success: function (response) {
                if (response.success) {
                    const batchId = response.data.batch_id;
                    const totalBatches = response.data.total_batches;
                    const totalCount = response.data.total_count;

                    addLog('📦 Batch export started: ' + totalCount + ' posts in ' + totalBatches + ' batches', log);
                    
                    processBatchExport(batchId, 0, totalBatches, 'posts', button, originalText);
                } else {
                    showError('Export failed: ' + response.data.message);
                    button.prop('disabled', false).text(originalText);
                    progress.hide();
                }
            },
            error: function (xhr, status, error) {
                showError('Export failed: ' + error);
                button.prop('disabled', false).text(originalText);
                progress.hide();
            }
        });
    }

    // Batch Export Pages
    

    function showSuccess(message) {
        // Use the existing showModal function from admin.js
        if (typeof window.showModal === 'function') {
            window.showModal('success', 'Success!', message);
        } else if (typeof showModal === 'function') {
            showModal('success', 'Success!', message);
        } else {
            // Fallback to custom modal
            showCustomModal('success', message);
        }
    }

    function showError(message) {
        // Use the existing showModal function from admin.js
        if (typeof window.showModal === 'function') {
            window.showModal('error', 'Error', message);
        } else if (typeof showModal === 'function') {
            showModal('error', 'Error', message);
        } else {
            // Fallback to custom modal
            showCustomModal('error', message);
        }
    }

    function showCustomModal(type, message) {
        const modalId = type === 'success' ? '#peiwm-success-modal' : '#peiwm-error-modal';
        const modal = $(modalId);
        
        if (modal.length) {
            modal.find('.peiwm-modal-body p').html(message);
            modal.show().addClass('peiwm-show');
            
            modal.find('.peiwm-modal-close').off('click').on('click', function () {
                modal.removeClass('peiwm-show');
                setTimeout(function () {
                    modal.hide();
                }, 300);
            });
        }
    }
});