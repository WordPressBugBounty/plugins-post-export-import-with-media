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
    $('#peiwm_enable_wpml_support').on('change', function () {
        const isChecked = $(this).is(':checked') ? 1 : 0;
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'peiwm_save_wpml_setting',
                nonce: peiwmData.nonce,
                enabled: isChecked
            },
            success: function (response) {
                if (response.success) {
                    // Setting saved successfully
                } else {
                    // Revert checkbox on error
                    $('#peiwm_enable_wpml_support').prop('checked', !isChecked);
                }
            },
            error: function () {
                // Revert checkbox on error
                $('#peiwm_enable_wpml_support').prop('checked', !isChecked);
            }
        });
    });

    // Modal Utility Functions
    function showModal(type, title, message) {
        // Always close any open modal overlays first
        $('.peiwm-modal-overlay').removeClass('peiwm-show').hide();
        $(document).off('keydown.peiwm-modal');

        let modalId = '#peiwm-modal-overlay';
        let modalClass = '';

        switch (type) {
            case 'success':
                modalId = '#peiwm-success-modal';
                modalClass = 'peiwm-success-modal';
                break;
            case 'error':
                modalId = '#peiwm-error-modal';
                modalClass = 'peiwm-error-modal';
                break;
            case 'warning':
                modalId = '#peiwm-modal-overlay';
                modalClass = 'peiwm-warning-modal';
                break;
            case 'danger':
                modalId = '#peiwm-modal-overlay';
                modalClass = 'peiwm-danger-modal';
                break;
        }

        const modal = $(modalId);
        const modalContent = modal.find('.peiwm-modal');

        // Set content
        modal.find('.peiwm-modal-header h3').text(title);
        modal.find('.peiwm-modal-body p').html(message);

        // Add warning/danger styling to body if needed
        if (type === 'warning' || type === 'danger') {
            modalContent.addClass(modalClass);
        } else {
            modalContent.removeClass('peiwm-warning-modal peiwm-danger-modal');
        }

        // Detach previous handlers before attaching new ones
        const confirmBtn = modal.find('#peiwm-modal-confirm');
        const cancelBtn = modal.find('#peiwm-modal-cancel');
        confirmBtn.off('click');
        cancelBtn.off('click');

        // Return a promise for confirmation modals
        if (type === 'warning' || type === 'danger') {
            return new Promise((resolve, reject) => {
                confirmBtn.on('click', function () {
                    hideModal(modalId);
                    resolve();
                });
                cancelBtn.on('click', function () {
                    hideModal(modalId);
                    reject();
                });
                // Show modal
                modal.show().addClass('peiwm-show');
                // Handle close button
                modal.find('.peiwm-modal-close').off('click').on('click', function () {
                    hideModal(modalId);
                    reject();
                });
                // Handle overlay click to close
                modal.off('click').on('click', function (e) {
                    if (e.target === this) {
                        hideModal(modalId);
                        reject();
                    }
                });
                // Handle escape key
                $(document).off('keydown.peiwm-modal').on('keydown.peiwm-modal', function (e) {
                    if (e.key === 'Escape') {
                        hideModal(modalId);
                        reject();
                    }
                });
            });
        } else {
            // Show modal
            modal.show().addClass('peiwm-show');
            // Handle close button
            modal.find('.peiwm-modal-close').off('click').on('click', function () {
                hideModal(modalId);
            });
            // Handle overlay click to close
            modal.off('click').on('click', function (e) {
                if (e.target === this) {
                    hideModal(modalId);
                }
            });
            // Handle escape key
            $(document).off('keydown.peiwm-modal').on('keydown.peiwm-modal', function (e) {
                if (e.key === 'Escape') {
                    hideModal(modalId);
                }
            });
        }
    }

    function hideModal(modalId) {
        const modal = $(modalId);
        modal.removeClass('peiwm-show');
        setTimeout(function () {
            modal.hide();
        }, 300);
    }

    function showConfirmation(title, message) {
        return showModal('warning', title, message);
    }

    function showSuccess(message) {
        showModal('success', 'Success!', message);
    }

    function showError(message) {
        showModal('error', 'Error', message);
    }

    function showDangerConfirmation(title, message) {
        return showModal('danger', title, message);
    }

    function showToast(message, type, duration) {
        // Handle argument swap if called as showToast('success', 'message')
        if (message === 'success' || message === 'error' || message === 'warning' || message === 'info') {
            var tmp = message;
            message = type;
            type = tmp;
        }
        type = type || 'success';
        duration = duration || 3500;
        $('.peiwm-notification').remove();

        var icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        else if (type === 'error') icon = '❌';
        else if (type === 'warning') icon = '⚠️';
        else if (type === 'info') icon = '💡';

        var $toast = $('<div class="peiwm-notification peiwm-' + type + '">' +
            '<span class="peiwm-toast-icon" style="font-size: 16px; flex-shrink: 0;">' + icon + '</span>' +
            '<div class="peiwm-toast-msg" style="flex: 1; color: #f8fafc; font-size: 13.5px; font-weight: 500; line-height: 1.4;">' + $('<div>').text(message).html() + '</div>' +
            '<button type="button" class="peiwm-toast-close" style="background: none; border: none; color: #94a3b8; font-size: 18px; line-height: 1; cursor: pointer; padding: 0 0 0 8px; margin-left: 6px;">&times;</button>' +
        '</div>');

        $('body').append($toast);

        $toast.find('.peiwm-toast-close').on('click', function () {
            $toast.removeClass('peiwm-show');
            setTimeout(function () { $toast.remove(); }, 300);
        });

        setTimeout(function () {
            $toast.addClass('peiwm-show');
        }, 10);

        setTimeout(function () {
            $toast.removeClass('peiwm-show');
            setTimeout(function () {
                $toast.remove();
            }, 300);
        }, duration);
    }

    // Expose plugin modal & toast functions globally
    window.peiwmToast = showToast;
    window.peiwmShowConfirmation = showConfirmation;
    window.peiwmShowDangerConfirmation = showDangerConfirmation;
    window.peiwmShowSuccess = showSuccess;
    window.peiwmShowError = showError;
    window.peiwmOpenPremiumModal = function () {
        const modal = $('#peiwm-premium-modal');
        modal.show().addClass('peiwm-show');
        modal.find('.peiwm-premium-close, .peiwm-modal-close').off('click.premium').on('click.premium', function (e) {
            e.preventDefault();
            e.stopPropagation();
            modal.removeClass('peiwm-show').hide();
        });
        modal.off('click.premium-overlay').on('click.premium-overlay', function (ev) {
            if (ev.target === this) {
                modal.removeClass('peiwm-show').hide();
            }
        });
        $(document).off('keydown.premium-modal').on('keydown.premium-modal', function (ev) {
            if (ev.key === 'Escape') {
                modal.removeClass('peiwm-show').hide();
            }
        });
    };

    // Global document delegated listener for modal close buttons & overlay clicks
    $(document).on('click', '.peiwm-modal-overlay .peiwm-modal-close, .peiwm-modal-overlay .peiwm-premium-close', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const $overlay = $(this).closest('.peiwm-modal-overlay');
        $overlay.removeClass('peiwm-show').hide();
    });

    $(document).on('click', '.peiwm-modal-overlay', function (e) {
        if (e.target === this) {
            $(this).removeClass('peiwm-show').hide();
        }
    });

    // Premium Modal - triggered by any locked section or PRO badge click
    $(document).on('click', '.peiwm-open-premium-modal, .peiwm-locked-section, .peiwm-pro-only-btn', function (e) {
        // Don't trigger if clicking a real interactive element inside unless tagged with .peiwm-open-premium-modal
        if ($(e.target).is('input, select, textarea, button:not(.peiwm-open-premium-modal):not(.peiwm-pro-only-btn), label, a:not(.peiwm-open-premium-modal)')) return;
        e.preventDefault();
        e.stopPropagation();
        window.peiwmOpenPremiumModal();
    });

    // --- End Drag and Drop Modal Logic ---

    // Drop Zone handlers
    function setupDropZone(dropZoneId, fileInputId) {
        const dropZone = $(dropZoneId);
        const fileInput = $(fileInputId);

        dropZone.on('click', function () {
            fileInput.click();
        });

        dropZone.on('dragover', function(e) {
            e.preventDefault();
            dropZone.addClass('dragover');
        });

        dropZone.on('dragleave', function(e) {
            e.preventDefault();
            dropZone.removeClass('dragover');
        });

        dropZone.on('drop', function(e) {
            e.preventDefault();
            dropZone.removeClass('dragover');
            if (e.originalEvent.dataTransfer.files.length) {
                fileInput[0].files = e.originalEvent.dataTransfer.files;
                fileInput.trigger('change');
            }
        });
    }

    setupDropZone('#peiwm-select-posts-file', '#peiwm-posts-file');
    setupDropZone('#peiwm-select-media-file', '#peiwm-media-file');

    $('#peiwm-posts-file').on('change', function () {
        if (this.files.length > 0) {
            const label = this.files.length > 1 ? this.files.length + ' files selected' : this.files[0].name;
            $('#peiwm-select-posts-file b').text(label);
            $('#peiwm-select-posts-file span').text('Click to change file(s)');
            $('#peiwm-import-posts').show();
            // Load ALL selected files and merge posts into one list
            loadPostsSelectionListFromFiles(Array.from(this.files));
        } else {
            $('#peiwm-select-posts-file b').text('Drop your JSON file(s) here');
            $('#peiwm-select-posts-file span').text('or click to browse');
            $('#peiwm-import-posts').hide();
        }
    });

    $('#peiwm-media-file').on('change', function () {
        if (this.files.length > 0) {
            const label = this.files.length > 1 ? this.files.length + ' files selected' : this.files[0].name;
            $('#peiwm-select-media-file b').text(label);
            $('#peiwm-select-media-file span').text('Click to change file(s)');
            $('#peiwm-import-media').show();
        } else {
            $('#peiwm-select-media-file b').text('Drop your ZIP file(s) here');
            $('#peiwm-select-media-file span').text('or click to browse');
            $('#peiwm-import-media').hide();
        }
    });

    // Toggle selective panel for posts
    $('#peiwm-import-posts-selective').on('change', function () {
        if ($(this).is(':checked')) {
            $('#peiwm-posts-selective-panel').slideDown();
            // If list is already populated (file was loaded), nothing to do
            // If not, the empty state message guides the user
        } else {
            $('#peiwm-posts-selective-panel').slideUp();
        }
    });

    // Search posts in selective list
    $('#peiwm-posts-search').on('input', function () {
        const query = $(this).val().toLowerCase();
        $('#peiwm-posts-list .peiwm-selective-item').each(function () {
            const title = $(this).find('.peiwm-selective-title').text().toLowerCase();
            $(this).toggle(title.includes(query));
        });
    });

    // Select all posts
    $('#peiwm-posts-select-all').on('change', function () {
        const checked = $(this).is(':checked');
        $('#peiwm-posts-list .peiwm-selective-item:visible .peiwm-selective-checkbox').prop('checked', checked);
        updatePostsSelectedCount();
    });

    // Load posts from a single file (kept for backward compat)
    function loadPostsSelectionList(file) {
        loadPostsSelectionListFromFiles([file]);
    }

    // Load and merge posts from ALL selected files
    function loadPostsSelectionListFromFiles(files) {
        $('#peiwm-posts-list').html('<div class="peiwm-selective-loading"><div class="peiwm-loading-spinner"></div><p>Loading posts from ' + files.length + ' file(s)...</p></div>');

        let allPosts = [];
        let loaded = 0;
        let errors = 0;
        // Store file boundaries so import knows which file each post came from
        const fileBoundaries = []; // [{fileIdx, startIndex, endIndex}]

        files.forEach(function (file, fileIdx) {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const posts = JSON.parse(e.target.result);
                    if (!Array.isArray(posts)) throw new Error('Invalid format');
                    const startIndex = allPosts.length;
                    posts.forEach(function (post) {
                        post._sourceFile = fileIdx;
                        post._fileLocalIndex = posts.indexOf(post); // local index within this file
                    });
                    allPosts = allPosts.concat(posts);
                    fileBoundaries.push({ fileIdx: fileIdx, startIndex: startIndex, endIndex: allPosts.length - 1 });
                } catch (err) {
                    errors++;
                }
                loaded++;
                if (loaded === files.length) {
                    if (errors > 0 && allPosts.length === 0) {
                        $('#peiwm-posts-list').html('<p class="peiwm-selective-empty">Invalid JSON file(s).</p>');
                    } else {
                        if (errors > 0) {
                            $('#peiwm-posts-list').before('<p style="color:#d97706;font-size:0.85rem;margin-bottom:0.5rem;">⚠️ ' + errors + ' file(s) could not be read.</p>');
                        }
                        // Store boundaries globally for import handler
                        window.peiwmPostFileBoundaries = fileBoundaries;
                        renderPostsSelectionList(allPosts);
                    }
                }
            };
            reader.readAsText(file);
        });
    }    function renderPostsSelectionList(posts) {
        const list = $('#peiwm-posts-list');
        if (!posts.length) {
            list.html('<p class="peiwm-selective-empty">No posts found in file.</p>');
            return;
        }

        const globalStatus = $('#peiwm-global-import-status').val() || 'original';
        let html = '';
        posts.forEach(function (post, index) {
            const originalStatus = post.post_status || 'publish';
            const s = postImportSettings[index];
            const isCustom = s && s.force_status && s.force_status !== 'default';
            const effectiveStatus = isCustom
                ? (s.force_status === 'original' ? originalStatus : s.force_status)
                : (globalStatus !== 'original' ? globalStatus : originalStatus);
            const date = post.post_date ? post.post_date.slice(0, 10) : '';
            const sourceFile = post._sourceFile !== undefined ? post._sourceFile : 0;
            const originLabel = isCustom ? '⚙ Custom' : '↗ Global';
            const originClass = isCustom ? 'peiwm-origin-custom' : 'peiwm-origin-global';

            html += '<div class="peiwm-selective-item" data-index="' + index + '" data-source-file="' + sourceFile + '" data-original-status="' + originalStatus + '">' +
                '<label style="display:flex;align-items:center;gap:0.5rem;flex:1;cursor:pointer;min-width:0;">' +
                    '<input type="checkbox" class="peiwm-selective-checkbox" data-index="' + index + '" checked>' +
                    '<span class="peiwm-selective-info">' +
                        '<span class="peiwm-selective-title">' + $('<div>').text(post.post_title || 'Untitled').html() + '</span>' +
                        '<span class="peiwm-selective-meta">' + date + '</span>' +
                    '</span>' +
                '</label>' +
                '<span class="peiwm-selective-status-wrap">' +
                    '<span class="peiwm-status-origin-badge ' + originClass + '">' + originLabel + '</span>' +
                    '<span class="peiwm-selective-status peiwm-status-' + effectiveStatus + '" data-index="' + index + '">' + effectiveStatus + '</span>' +
                    '<button type="button" class="peiwm-item-settings-btn" data-index="' + index + '" title="Configure import status">⚙️</button>' +
                '</span>' +
            '</div>';
        });
        list.html(html);
        $('#peiwm-posts-select-all').prop('checked', true);
        updatePostsSelectedCount();

        list.off('change').on('change', '.peiwm-selective-checkbox', function () {
            updatePostsSelectedCount();
            const allChecked = $('#peiwm-posts-list .peiwm-selective-item:visible .peiwm-selective-checkbox:not(:checked)').length === 0;
            $('#peiwm-posts-select-all').prop('checked', allChecked);
        });

        list.off('click.settings').on('click.settings', '.peiwm-item-settings-btn', function () {
            const index = parseInt($(this).attr('data-index'), 10);
            const post = posts[index];
            openImportSettingsModal('posts', index, post);
        });
    }

    // Real-time update for posts using Global Status when Global setting changes
    $('#peiwm-global-import-status').off('change.peiwmGlobalStatus').on('change.peiwmGlobalStatus', function () {
        const newGlobalStatus = $(this).val() || 'original';
        $('#peiwm-posts-list .peiwm-selective-item').each(function () {
            const index = parseInt($(this).attr('data-index'), 10);
            const originalStatus = $(this).attr('data-original-status') || 'publish';
            const s = postImportSettings[index];
            const isCustom = s && s.force_status && s.force_status !== 'default';
            if (!isCustom) {
                const effectiveStatus = newGlobalStatus !== 'original' ? newGlobalStatus : originalStatus;
                $(this).find('.peiwm-selective-status')
                    .attr('class', 'peiwm-selective-status peiwm-status-' + effectiveStatus)
                    .text(effectiveStatus);
                $(this).find('.peiwm-status-origin-badge')
                    .attr('class', 'peiwm-status-origin-badge peiwm-origin-global')
                    .text('↗ Global');
            }
        });
    });

    function updatePostsSelectedCount() {
        const count = $('#peiwm-posts-list .peiwm-selective-checkbox:checked').length;
        $('#peiwm-posts-selected-count').text(count + ' selected');
    }

    // Per-item import settings storage: { index: { force_status: 'default'|'publish'|'draft'|'pending'|'private'|'original' } }
    // Exposed globally so admin-batch.js can access them
    window.peiwmPostImportSettings = {};
    window.peiwmPageImportSettings = {};
    const postImportSettings = window.peiwmPostImportSettings;
    const pageImportSettings = window.peiwmPageImportSettings;

    function openImportSettingsModal(type, index, item) {
        const settings = type === 'posts' ? postImportSettings : pageImportSettings;
        const current = settings[index] || { force_status: 'default' };
        const currentSetting = current.force_status || 'default';
        const title = item.post_title || 'Untitled';
        const originalStatus = item.post_status || 'publish';

        const globalStatus = (type === 'posts' ? $('#peiwm-global-import-status').val() : 'original') || 'original';
        const globalDisplay = globalStatus === 'original' ? 'Keep Original (' + originalStatus + ')' : globalStatus;

        const body = `
            <div style="text-align:left;">
                <p style="margin-bottom:1rem;color:#4a5568;">
                    <strong>${$('<div>').text(title).html()}</strong><br>
                    <small>Original status in export: <span class="peiwm-selective-status peiwm-status-${originalStatus}">${originalStatus}</span></small>
                </p>
                <label style="display:block;margin-bottom:0.5rem;font-weight:600;">Import status for this post:</label>
                <div class="peiwm-status-options" style="display:flex; flex-direction:column; gap:8px;">
                    <label class="peiwm-status-option" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="radio" name="peiwm_force_status" value="default" ${currentSetting === 'default' ? 'checked' : ''}>
                        <span><strong>Use Global Setting</strong> (${globalDisplay})</span>
                    </label>
                    <label class="peiwm-status-option" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="radio" name="peiwm_force_status" value="original" ${currentSetting === 'original' ? 'checked' : ''}>
                        <span>Keep original <span class="peiwm-selective-status peiwm-status-${originalStatus}">${originalStatus}</span></span>
                    </label>
                    <label class="peiwm-status-option" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="radio" name="peiwm_force_status" value="publish" ${currentSetting === 'publish' ? 'checked' : ''}>
                        <span><span class="peiwm-selective-status peiwm-status-publish">publish</span></span>
                    </label>
                    <label class="peiwm-status-option" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="radio" name="peiwm_force_status" value="draft" ${currentSetting === 'draft' ? 'checked' : ''}>
                        <span><span class="peiwm-selective-status peiwm-status-draft">draft</span></span>
                    </label>
                    <label class="peiwm-status-option" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="radio" name="peiwm_force_status" value="pending" ${currentSetting === 'pending' ? 'checked' : ''}>
                        <span><span class="peiwm-selective-status peiwm-status-pending">pending</span></span>
                    </label>
                    <label class="peiwm-status-option" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="radio" name="peiwm_force_status" value="private" ${currentSetting === 'private' ? 'checked' : ''}>
                        <span><span class="peiwm-selective-status peiwm-status-private">private</span></span>
                    </label>
                </div>
                <p style="margin-top:1rem;font-size:0.8rem;color:#718096;">
                    If this post already exists and the status differs, it will be updated to the selected status upon import.
                </p>
            </div>
        `;

        // Use existing modal
        const modal = $('#peiwm-modal-overlay');
        modal.find('.peiwm-modal-header h3').text('Import Status Settings');
        modal.find('.peiwm-modal-body p').html(body);
        modal.find('.peiwm-modal').removeClass('peiwm-warning-modal peiwm-danger-modal');
        modal.show().addClass('peiwm-show');

        // Override confirm button
        const confirmBtn = modal.find('#peiwm-modal-confirm');
        const cancelBtn = modal.find('#peiwm-modal-cancel');
        confirmBtn.off('click').text('Apply');
        cancelBtn.off('click').text('Cancel');

        confirmBtn.on('click', function () {
            const selected = modal.find('input[name="peiwm_force_status"]:checked').val() || 'default';
            if (type === 'posts') {
                postImportSettings[index] = { force_status: selected };
                const isCustom = selected !== 'default';
                const effectiveStatus = isCustom
                    ? (selected === 'original' ? originalStatus : selected)
                    : (globalStatus !== 'original' ? globalStatus : originalStatus);

                const itemEl = $('#peiwm-posts-list .peiwm-selective-item[data-index="' + index + '"]');
                itemEl.find('.peiwm-selective-status')
                    .attr('class', 'peiwm-selective-status peiwm-status-' + effectiveStatus)
                    .text(effectiveStatus);
                itemEl.find('.peiwm-status-origin-badge')
                    .attr('class', 'peiwm-status-origin-badge ' + (isCustom ? 'peiwm-origin-custom' : 'peiwm-origin-global'))
                    .text(isCustom ? '⚙ Custom' : '↗ Global');
            } else {
                pageImportSettings[index] = { force_status: selected };
                const isCustom = selected !== 'default';
                const effectiveStatus = selected === 'default'
                    ? originalStatus
                    : (selected === 'original' ? originalStatus : selected);

                const itemEl = $('#peiwm-pages-list .peiwm-selective-item[data-index="' + index + '"]');
                itemEl.find('.peiwm-selective-status')
                    .attr('class', 'peiwm-selective-status peiwm-status-' + effectiveStatus)
                    .text(effectiveStatus);
                itemEl.find('.peiwm-status-origin-badge')
                    .attr('class', 'peiwm-status-origin-badge ' + (isCustom ? 'peiwm-origin-custom' : 'peiwm-origin-global'))
                    .text(isCustom ? '⚙ Custom' : '↗ Global');
            }
            modal.removeClass('peiwm-show').hide();
            $(document).off('keydown.peiwm-modal');
        });

        cancelBtn.on('click', function () {
            modal.removeClass('peiwm-show').hide();
            $(document).off('keydown.peiwm-modal');
        });

        modal.find('.peiwm-modal-close').off('click').on('click', function () {
            modal.removeClass('peiwm-show').hide();
            $(document).off('keydown.peiwm-modal');
        });

        modal.off('click').on('click', function (e) {
            if (e.target === this) {
                modal.removeClass('peiwm-show').hide();
                $(document).off('keydown.peiwm-modal');
            }
        });

        $(document).off('keydown.peiwm-modal').on('keydown.peiwm-modal', function (e) {
            if (e.key === 'Escape') {
                modal.removeClass('peiwm-show').hide();
                $(document).off('keydown.peiwm-modal');
            }
        });
    }

    $('#peiwm-media-file').on('change', function () {
        if (this.files.length > 0) {
            const label = this.files.length > 1
                ? this.files.length + ' ZIP files selected'
                : this.files[0].name;
            $('#peiwm-select-media-file').text(label);
            $('#peiwm-import-media').show();
        } else {
            $('#peiwm-import-media').hide();
        }
    });

    // Toggle selective export panel for posts
    $('#peiwm-export-posts-selective').on('change', function () {
        if ($(this).is(':checked')) {
            $('#peiwm-posts-export-selective-panel').slideDown();
            loadPostsExportList();
        } else {
            $('#peiwm-posts-export-selective-panel').slideUp();
        }
    });

    // -- NEW: Date range filter ------------------------------------------------
    window.peiwmDateFilter = { date_from: '', date_to: '' };

    $('#peiwm-export-posts-daterange').on('change', function () {
        if ($(this).is(':checked')) {
            $('#peiwm-daterange-filter-ui').slideDown(200);
            if ($('#peiwm-posts-export-selective-panel').is(':hidden')) {
                $('#peiwm-posts-export-selective-panel').slideDown();
                loadPostsExportList();
            }
        } else {
            $('#peiwm-daterange-filter-ui').slideUp(200);
            window.peiwmDateFilter = { date_from: '', date_to: '' };
            $('#peiwm-daterange-summary').hide();
            $('#peiwm-daterange-error').hide();
            if ($('#peiwm-posts-export-selective-panel').is(':visible')) {
                loadPostsExportList();
            }
        }
    });

    $('#peiwm-apply-date-filter').on('click', function () {
        const btn       = $(this);
        const dateFrom  = $('#peiwm-export-date-from').val().trim();
        const dateTo    = $('#peiwm-export-date-to').val().trim();
        const errorEl   = $('#peiwm-daterange-error');
        const summaryEl = $('#peiwm-daterange-summary');

        if (!dateFrom && !dateTo) {
            errorEl.text('Please enter at least a From date or a To date.').show();
            summaryEl.hide();
            return;
        }
        if (dateFrom && dateTo && dateFrom > dateTo) {
            errorEl.text('"From" date cannot be after "To" date.').show();
            summaryEl.hide();
            return;
        }
        errorEl.hide();

        window.peiwmDateFilter = { date_from: dateFrom, date_to: dateTo };

        if ($('#peiwm-posts-export-selective-panel').is(':hidden')) {
            $('#peiwm-posts-export-selective-panel').slideDown();
        }

        const origText = btn.text();
        btn.prop('disabled', true).text('Applying...');

        loadPostsExportList(function (totalShown) {
            btn.prop('disabled', false).text(origText);
            const parts = [];
            if (dateFrom) parts.push('from ' + dateFrom);
            if (dateTo)   parts.push('to ' + dateTo);
            summaryEl.text('Showing ' + totalShown + ' posts ' + parts.join(' ')).show();
        });
    });
    // -- END date range --------------------------------------------------------

    // Search posts in export list
    $('#peiwm-posts-export-search').on('input', function () {
        const query = $(this).val().toLowerCase();
        $('#peiwm-posts-export-list .peiwm-selective-item').each(function () {
            $(this).toggle($(this).find('.peiwm-selective-title').text().toLowerCase().includes(query));
        });
    });

    // Select all posts export
    $('#peiwm-posts-export-select-all').on('change', function () {
        const checked = $(this).is(':checked');
        $('#peiwm-posts-export-list .peiwm-selective-item:visible .peiwm-selective-checkbox').prop('checked', checked);
        updatePostsExportCount();
    });

    function loadPostsExportList(onComplete) {
        $('.peiwm-batch-warn').remove();
        const pageSize = (typeof peiwm_batch_settings !== 'undefined' && peiwm_batch_settings.export_list_page_size)
            ? peiwm_batch_settings.export_list_page_size
            : 300;
        window._peiwmExportListPageSize = pageSize;
        $('#peiwm-posts-export-list').html('<div class="peiwm-selective-loading"><div class="peiwm-loading-spinner"></div><p>Loading posts...</p></div>');
        $('#peiwm-posts-export-load-more-wrap').empty();
        loadPostsExportPage(0, [], onComplete);
    }

    function loadPostsExportPage(offset, existingPosts, onComplete) {
        const reqData = { action: 'peiwm_get_posts_list', nonce: peiwm_ajax.nonce, offset: offset };
        const df = window.peiwmDateFilter || {};
        if (df.date_from) reqData.date_from = df.date_from;
        if (df.date_to)   reqData.date_to   = df.date_to;

        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: reqData,
            success: function (response) {
                if (response.success) {
                    const data = response.data;
                    const allPosts = existingPosts.concat(data.posts);
                    const pageSize = window._peiwmExportListPageSize || 300;

                    // Show batch warning once at top
                    if (data.show_batch_warn && offset === 0) {
                        const warn = $('<div class="peiwm-batch-warn" style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:0.75rem 1rem;margin-bottom:0.75rem;font-size:0.875rem;">' +
                            '⚠️ Your site has <strong>' + data.total_count + ' posts</strong>. Enable <strong><a href="?page=peiwm-batch-settings">Batch Processing</a></strong> for better performance on large sites.' +
                        '</div>');
                        $('#peiwm-posts-export-selective-panel').prepend(warn);
                    }

                    // Render only the new posts (renderPostsExportList appends if items already exist)
                    renderPostsExportList(data.posts);

                    // Update footer: show "Load next N" button beside selected count
                    const loadMoreWrap = $('#peiwm-posts-export-load-more-wrap');
                    if (data.has_more) {
                        const nextOffset = offset + data.count;
                        const remaining  = data.total_count - nextOffset;
                        loadMoreWrap.html(
                            '<button type="button" class="button button-secondary peiwm-load-more-posts" style="margin-left:0.5rem;font-size:0.8rem;padding:2px 10px;">' +
                                '⬇️ Load next ' + pageSize + ' (' + remaining + ' more)' +
                            '</button>'
                        );
                        loadMoreWrap.find('.peiwm-load-more-posts').on('click', function () {
                            loadMoreWrap.html('<span style="font-size:0.8rem;color:#6b7280;margin-left:0.5rem;">Loading...</span>');
                            loadPostsExportPage(nextOffset, [], null);
                        });
                        // First page done — re-enable the Apply button even if more pages exist
                        if (typeof onComplete === 'function') {
                            const totalShown = $('#peiwm-posts-export-list').find('.peiwm-selective-item').length;
                            onComplete(totalShown);
                        }
                    } else {
                        const totalShown = $('#peiwm-posts-export-list').find('.peiwm-selective-item').length;
                        loadMoreWrap.html('<span style="font-size:0.8rem;color:#10b981;margin-left:0.5rem;">✓ ' + totalShown + ' loaded</span>');
                        if (typeof onComplete === 'function') onComplete(totalShown);
                    }
                } else {
                    $('#peiwm-posts-export-list').html('<p class="peiwm-selective-empty">Failed to load posts.</p>');
                    if (typeof onComplete === 'function') onComplete(0);
                }
            },
            error: function () {
                $('#peiwm-posts-export-list').html('<p class="peiwm-selective-empty">Error loading posts.</p>');
                if (typeof onComplete === 'function') onComplete(0);
            }
        });
    }

    function renderPostsExportList(posts) {
        const list = $('#peiwm-posts-export-list');
        if (!posts || !posts.length) {
            list.html('<p class="peiwm-selective-empty">No posts found.</p>');
            return;
        }
        let html = '';
        posts.forEach(function (post) {
            const status = post.post_status ? '<span class="peiwm-selective-status peiwm-status-' + post.post_status + '">' + post.post_status + '</span>' : '';
            const date = post.post_date ? post.post_date.slice(0, 10) : '';
            html += '<label class="peiwm-selective-item" data-id="' + post.ID + '">' +
                '<input type="checkbox" class="peiwm-selective-checkbox" data-id="' + post.ID + '" checked>' +
                '<span class="peiwm-selective-info">' +
                    '<span class="peiwm-selective-title">' + $('<div>').text(post.post_title || 'Untitled').html() + '</span>' +
                    '<span class="peiwm-selective-meta">' + date + ' ' + status + '</span>' +
                '</span>' +
            '</label>';
        });

        // On first load (offset 0) replace; on subsequent loads append new items only
        const existingCount = list.find('.peiwm-selective-item').length;
        if (existingCount === 0) {
            list.html(html);
        } else {
            // Only append posts not already in the list
            const existingIds = new Set();
            list.find('.peiwm-selective-checkbox').each(function () {
                existingIds.add(String($(this).attr('data-id')));
            });
            let newHtml = '';
            posts.forEach(function (post) {
                if (!existingIds.has(String(post.ID))) {
                    const status = post.post_status ? '<span class="peiwm-selective-status peiwm-status-' + post.post_status + '">' + post.post_status + '</span>' : '';
                    const date = post.post_date ? post.post_date.slice(0, 10) : '';
                    newHtml += '<label class="peiwm-selective-item" data-id="' + post.ID + '">' +
                        '<input type="checkbox" class="peiwm-selective-checkbox" data-id="' + post.ID + '" checked>' +
                        '<span class="peiwm-selective-info">' +
                            '<span class="peiwm-selective-title">' + $('<div>').text(post.post_title || 'Untitled').html() + '</span>' +
                            '<span class="peiwm-selective-meta">' + date + ' ' + status + '</span>' +
                        '</span>' +
                    '</label>';
                }
            });
            if (newHtml) list.append(newHtml);
        }

        $('#peiwm-posts-export-select-all').prop('checked', true);
        updatePostsExportCount();
        list.off('change').on('change', '.peiwm-selective-checkbox', function () {
            updatePostsExportCount();
            const allChecked = list.find('.peiwm-selective-item:visible .peiwm-selective-checkbox:not(:checked)').length === 0;
            $('#peiwm-posts-export-select-all').prop('checked', allChecked);
        });
    }

    function updatePostsExportCount() {
        const count = $('#peiwm-posts-export-list .peiwm-selective-checkbox:checked').length;
        $('#peiwm-posts-export-selected-count').text(count + ' selected');
    }

    // Export Posts - splits into multiple JSON files to avoid browser memory exhaustion
    // For 1M posts: downloads posts_export.json, posts_export_part2.json, etc.
    $('#peiwm-export-posts').on('click', function () {
        const button = $(this);
        const originalText = button.text();
        const isSelective = $('#peiwm-export-posts-selective').is(':checked');
        const isDateRange = $('#peiwm-export-posts-daterange').is(':checked');
        // Either mode uses the checked IDs from the visible list
        const useIdList = isSelective || isDateRange;

        let selectedIds = [];
        if (useIdList) {
            $('#peiwm-posts-export-list .peiwm-selective-checkbox:checked').each(function () {
                const id = parseInt($(this).attr('data-id'), 10);
                if (id > 0) selectedIds.push(id);
            });
            if (selectedIds.length === 0) {
                showError('Please select at least one post to export.');
                return;
            }
        }

        button.prop('disabled', true).text('Exporting...');
        $('#peiwm-posts-progress').show();
        $('html, body').animate({ scrollTop: $('#peiwm-posts-progress').offset().top - 40 }, 400);

        // For selective/date-range mode: export all selected IDs into ONE file
        // For non-selective: split into files of postsPerFile each
        const postsPerFile = useIdList
            ? selectedIds.length  // all selected go into one file
            : Math.max(
                (typeof peiwm_batch_settings !== 'undefined' && peiwm_batch_settings.export_json_size)
                    ? peiwm_batch_settings.export_json_size
                    : 500,
                500
              );

        // AJAX chunk size - small to avoid PHP memory exhaustion per request
        const ajaxChunkSize = 50;

        let globalOffset = 0;
        let fileNum = 0;
        let totalExported = 0;
        let exportSessionKey = null;
        // For selective: track position in selectedIds array
        let selectiveOffset = 0;

        function downloadFile(posts) {
            fileNum++;
            totalExported += posts.length;
            const suffix = fileNum > 1 ? '_part' + fileNum : '';
            const blob = new Blob([JSON.stringify(posts, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'posts_export' + suffix + '_' + new Date().toISOString().slice(0, 19).replace(/T|:/g, '-') + '.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        }

        function exportNextFile() {
            let currentFilePosts = [];

            function fetchChunk() {
                const needed = postsPerFile - currentFilePosts.length;
                const reqData = {
                    action: 'peiwm_export_posts_chunk',
                    nonce: peiwm_ajax.nonce,
                    chunk_size: Math.min(needed, ajaxChunkSize),
                    export_acf_fields: $('#peiwm-export-acf-fields').is(':checked') ? '1' : '0',
                    export_wpml_data: $('#peiwm-export-wpml-data').is(':checked') ? '1' : '0'
                };

                if (useIdList && selectedIds.length > 0) {
                    // For selective/date-range: send a slice of IDs directly
                    const chunkIds = selectedIds.slice(selectiveOffset, selectiveOffset + Math.min(needed, ajaxChunkSize));
                    if (chunkIds.length === 0) {
                        if (currentFilePosts.length > 0) {
                            downloadFile(currentFilePosts);
                        }
                        return;
                    }
                    reqData.post_ids = chunkIds.join(',');
                    reqData.offset = 0;
                } else {
                    reqData.offset = globalOffset;
                    if (exportSessionKey) {
                        reqData.export_session = exportSessionKey;
                    }
                }

                button.text('Exporting file ' + (fileNum + 1) + '... (' + (totalExported + currentFilePosts.length) + ' posts done)');

                $.ajax({
                    url: peiwm_ajax.ajax_url,
                    type: 'POST',
                    data: reqData,
                    success: function (response) {
                        if (!response.success) {
                            showError('Export failed: ' + (response.data.debug || response.data.message));
                            button.prop('disabled', false).text(originalText);
                            return;
                        }

                        // Capture session key from first response (reuse same key for all chunks)
                        if (response.data.session_key && !exportSessionKey) {
                            exportSessionKey = response.data.session_key;
                        }

                        currentFilePosts = currentFilePosts.concat(response.data.data);
                        const fetched = response.data.data.length;

                        if (useIdList) {
                            selectiveOffset += fetched;
                        } else {
                            globalOffset = globalOffset + fetched;
                        }

                        const moreExist = useIdList
                            ? selectiveOffset < selectedIds.length
                            : response.data.has_more;

                        if (currentFilePosts.length >= postsPerFile || !moreExist) {
                            downloadFile(currentFilePosts);

                            if (moreExist) {
                                setTimeout(exportNextFile, 500);
                            } else {
                                const msg = fileNum > 1
                                    ? 'Export complete! ' + totalExported + ' posts in ' + fileNum + ' files.'
                                    : 'Posts exported! (' + totalExported + ' posts)';
                                showSuccess(msg);
                                button.prop('disabled', false).text(originalText);
                            }
                        } else {
                            setTimeout(fetchChunk, 100);
                        }
                    },
                    error: function (xhr, status, error) {
                        const hint = xhr.status === 500 ? ' (HTTP 500 - check server error log)' : '';
                        showError('Export failed: ' + error + hint);
                        button.prop('disabled', false).text(originalText);
                    }
                });
            }

            fetchChunk();
        }

        exportNextFile();
    });

    // Import Posts - supports multiple JSON files, processes one by one
    $('#peiwm-import-posts').on('click', function () {
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

        // Read ALL files first, then process
        let allFilesData = []; // array of arrays, one per file
        let filesRead = 0;

        files.forEach(function (file, fileIdx) {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    // Strip Unicode line/paragraph separators that some editors flag as unusual
                    const raw = e.target.result.replace(/[\u2028\u2029]/g, ' ');
                    let data = JSON.parse(raw);
                    if (!Array.isArray(data)) data = [];
                    allFilesData[fileIdx] = data;
                } catch (err) {
                    allFilesData[fileIdx] = [];
                }
                filesRead++;
                if (filesRead === totalFiles) {
                    startImportFromAllFiles(allFilesData, files, isSelective, button, totalFiles);
                }
            };
            reader.readAsText(file);
        });
    });

    // Expose for batch mode - accepts optional importFn (defaults to importPosts)
    window.peiwmStartImportFromAllFiles = startImportFromAllFiles;

    function startImportFromAllFiles(allFilesData, files, isSelective, button, totalFiles, importFn) {
        const doImport = typeof importFn === 'function' ? importFn : importPosts;

        // Attach force_status settings using hierarchy:
        // Individual Setting (if != 'default') > Global Import Setting (if != 'original') > Original Status ('original')
        const globalStatus = $('#peiwm-global-import-status').val() || 'original';
        let globalPostIdx = 0;
        let perFileData = allFilesData.map(function (data) {
            return data.map(function (post) {
                const s = postImportSettings[globalPostIdx];
                globalPostIdx++;
                let resolvedStatus = 'original';
                if (s && s.force_status && s.force_status !== 'default') {
                    resolvedStatus = s.force_status;
                } else if (globalStatus && globalStatus !== 'original') {
                    resolvedStatus = globalStatus;
                }
                return Object.assign({}, post, { _force_status: resolvedStatus });
            });
        });

        if (isSelective) {
            const selectedGlobalIndexes = [];
            $('#peiwm-posts-list .peiwm-selective-checkbox:checked').each(function () {
                selectedGlobalIndexes.push(parseInt($(this).attr('data-index'), 10));
            });

            if (selectedGlobalIndexes.length === 0) {
                showError('Please select at least one post to import.');
                button.prop('disabled', false).text('Start Import');
                return;
            }

            // Map global indexes back to per-file arrays
            let globalIdx = 0;
            perFileData = perFileData.map(function (data) {
                return data.filter(function () {
                    const keep = selectedGlobalIndexes.includes(globalIdx);
                    globalIdx++;
                    return keep;
                });
            });
        }

        // Filter out empty files
        const filesToProcess = perFileData.map(function (data, i) {
            return { data: data, name: files[i] ? files[i].name : ('file' + (i + 1)) };
        }).filter(function (f) { return f.data.length > 0; });

        if (filesToProcess.length === 0) {
            showError('No posts to import.');
            button.prop('disabled', false).text('Start Import');
            return;
        }

        const totalFilesToProcess = filesToProcess.length;

        // Build file tracker UI inside the progress panel
        const progress = $('#peiwm-posts-progress');
        let trackerHtml = '<div id="peiwm-file-tracker" style="margin-bottom:0.75rem;padding:0.6rem 0.75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:0.82rem;">';
        trackerHtml += '<div style="font-weight:600;margin-bottom:0.4rem;color:#374151;">📁 Files (' + totalFilesToProcess + ' total)</div>';
        trackerHtml += '<div id="peiwm-file-tracker-list">';
        filesToProcess.forEach(function (f, i) {
            trackerHtml += '<div id="peiwm-file-row-' + i + '" style="display:flex;align-items:center;gap:0.4rem;padding:2px 0;">' +
                '<span id="peiwm-file-icon-' + i + '" style="width:1.1rem;text-align:center;">⏳</span>' +
                '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + f.name + '">' + f.name + '</span>' +
                '<span id="peiwm-file-status-' + i + '" style="color:#6b7280;font-size:0.78rem;">' + f.data.length + ' posts — pending</span>' +
            '</div>';
        });
        trackerHtml += '</div></div>';

        // Remove any previous tracker and insert fresh
        progress.find('#peiwm-file-tracker').remove();
        progress.find('.peiwm-progress-bar').before(trackerHtml);

        let currentFileIndex = 0;

        function markFileRunning(i) {
            $('#peiwm-file-icon-' + i).text('🔄');
            $('#peiwm-file-status-' + i).text(filesToProcess[i].data.length + ' posts — running…').css('color', '#2563eb');
        }

        function markFileDone(i) {
            $('#peiwm-file-icon-' + i).text('✅');
            $('#peiwm-file-status-' + i).text(filesToProcess[i].data.length + ' posts — done').css('color', '#16a34a');
        }

        function markFilePartial(i, failedCount) {
            $('#peiwm-file-icon-' + i).text('⚠️');
            $('#peiwm-file-status-' + i).text(filesToProcess[i].data.length + ' posts — done (' + failedCount + ' failed - retrying)').css('color', '#d97706');
        }

        function processNextFile() {
            if (currentFileIndex >= totalFilesToProcess) {
                button.prop('disabled', false).text('Start Import');
                if (totalFilesToProcess > 1) {
                    showSuccess('All ' + totalFilesToProcess + ' files imported successfully!');
                }
                return;
            }

            const fileInfo = filesToProcess[currentFileIndex];
            markFileRunning(currentFileIndex);

            if (totalFilesToProcess > 1) {
                button.text('Importing file ' + (currentFileIndex + 1) + ' of ' + totalFilesToProcess + '...');
            }

            // Pass file name, 1-based index, and total so the import fn can label progress correctly
            // onComplete receives optional failedCount so the tracker can show partial state
            const capturedIdx = currentFileIndex;
            doImport(fileInfo.data, fileInfo.name, capturedIdx + 1, totalFilesToProcess, function (failedCount) {
                if (failedCount && failedCount > 0) {
                    markFilePartial(capturedIdx, failedCount);
                } else {
                    markFileDone(capturedIdx);
                }
                currentFileIndex++;
                processNextFile();
            });
        }

        processNextFile();
    }

    // -- Media Advanced Options: date range toggle ----------------------------
    $('#peiwm-media-export-daterange').on('change', function () {
        if ($(this).is(':checked')) {
            $('#peiwm-media-daterange-filter-ui').slideDown(200);
        } else {
            $('#peiwm-media-daterange-filter-ui').slideUp(200);
            $('#peiwm-media-export-date-from').val('');
            $('#peiwm-media-export-date-to').val('');
            $('#peiwm-media-daterange-error').hide();
            $('#peiwm-media-daterange-summary').hide();
        }
    });

    // Validate date inputs on change
    $('#peiwm-media-export-date-from, #peiwm-media-export-date-to').on('change', function () {
        const from = $('#peiwm-media-export-date-from').val();
        const to   = $('#peiwm-media-export-date-to').val();
        const err  = $('#peiwm-media-daterange-error');
        const sum  = $('#peiwm-media-daterange-summary');
        err.hide();
        sum.hide();
        if (from && to && from > to) {
            err.text('"From" date cannot be later than "To" date.').show();
            return;
        }
        if (from || to) {
            let msg = 'Filtering media uploaded';
            if (from && to)       msg += ' between ' + from + ' and ' + to;
            else if (from)        msg += ' on or after ' + from;
            else                  msg += ' on or before ' + to;
            sum.text(msg).show();
        }
    });

    // -- Media Advanced Options: export by post toggle -------------------------
    $('#peiwm-media-export-by-post').on('change', function () {
        if ($(this).is(':checked')) {
            $('#peiwm-media-by-post-panel').slideDown(200);
            loadMediaPostList();
        } else {
            $('#peiwm-media-by-post-panel').slideUp(200);
        }
    });

    // Search filtering for the media post list
    $('#peiwm-media-post-search').on('input', function () {
        const term = $(this).val().toLowerCase();
        $('#peiwm-media-post-list .peiwm-media-post-item').each(function () {
            const label = $(this).find('label').text().toLowerCase();
            $(this).toggle(label.indexOf(term) !== -1);
        });
    });

    // Select all / deselect all
    $('#peiwm-media-post-select-all').on('click', function () {
        $('#peiwm-media-post-list .peiwm-media-post-cb:visible').prop('checked', true);
        updateMediaPostCount();
    });
    $('#peiwm-media-post-deselect-all').on('click', function () {
        $('#peiwm-media-post-list .peiwm-media-post-cb').prop('checked', false);
        updateMediaPostCount();
    });

    function updateMediaPostCount() {
        const count = $('#peiwm-media-post-list .peiwm-media-post-cb:checked').length;
        const total = $('#peiwm-media-post-list .peiwm-media-post-cb').length;
        $('#peiwm-media-post-selected-count').text(count + ' of ' + total + ' posts selected');
    }

    function loadMediaPostList() {
        const pageSize = (typeof peiwm_batch_settings !== 'undefined' && peiwm_batch_settings.export_list_page_size)
            ? peiwm_batch_settings.export_list_page_size
            : 300;
        window._peiwmMediaPostPageSize = pageSize;
        const list = $('#peiwm-media-post-list');
        list.html('<div class="peiwm-selective-loading"><div class="peiwm-loading-spinner"></div><p>Loading posts\u2026</p></div>');
        $('#peiwm-media-post-load-more-wrap').empty();
        loadMediaPostPage(0);
    }

    function loadMediaPostPage(offset) {
        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: { action: 'peiwm_get_posts_list', nonce: peiwm_ajax.nonce, offset: offset },
            success: function (response) {
                if (!response.success) {
                    $('#peiwm-media-post-list').html('<p style="color:#dc2626;font-size:0.85rem;margin:0.5rem;">Failed to load posts.</p>');
                    return;
                }
                const data     = response.data;
                const pageSize = window._peiwmMediaPostPageSize || 300;

                // Show batch warning on first load for large sites
                if (data.show_batch_warn && offset === 0) {
                    const warn = $('<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:0.5rem 0.75rem;margin-bottom:0.5rem;font-size:0.8rem;">' +
                        '\u26a0\ufe0f ' + data.total_count + ' posts on this site. Enable <a href="?page=peiwm-batch-settings">Batch Processing</a> for better performance.' +
                    '</div>');
                    if ($('#peiwm-media-post-list').find('.peiwm-media-batch-warn').length === 0) {
                        $('#peiwm-media-by-post-panel').prepend(warn.addClass('peiwm-media-batch-warn'));
                    }
                }

                renderMediaPostList(data.posts);

                const loadMoreWrap = $('#peiwm-media-post-load-more-wrap');
                if (data.has_more) {
                    const nextOffset = offset + data.count;
                    const remaining  = data.total_count - nextOffset;
                    loadMoreWrap.html(
                        '<button type="button" class="button button-secondary peiwm-media-load-more" style="font-size:0.8rem;padding:3px 10px;">' +
                            '\u2b07 Load next ' + pageSize + ' (' + remaining + ' more)' +
                        '</button>'
                    );
                    loadMoreWrap.find('.peiwm-media-load-more').on('click', function () {
                        loadMoreWrap.html('<span style="font-size:0.8rem;color:#6b7280;">Loading\u2026</span>');
                        loadMediaPostPage(nextOffset);
                    });
                } else {
                    const totalShown = $('#peiwm-media-post-list').find('.peiwm-media-post-item').length;
                    loadMoreWrap.html('<span style="font-size:0.8rem;color:#10b981;">\u2713 ' + totalShown + ' posts loaded</span>');
                }
                updateMediaPostCount();
            },
            error: function () {
                $('#peiwm-media-post-list').html('<p style="color:#dc2626;font-size:0.85rem;margin:0.5rem;">Error loading posts.</p>');
            }
        });
    }

    function renderMediaPostList(posts) {
        const list = $('#peiwm-media-post-list');
        if (!posts || !posts.length) {
            if (list.find('.peiwm-media-post-item').length === 0) {
                list.html('<p style="color:#9ca3af;font-size:0.85rem;margin:0.5rem;">No posts found.</p>');
            }
            return;
        }

        // Deduplicate — skip IDs already rendered
        const existingIds = new Set();
        list.find('.peiwm-media-post-cb').each(function () {
            existingIds.add(String($(this).attr('data-id')));
        });

        let html = '';
        posts.forEach(function (post) {
            if (existingIds.has(String(post.ID))) return;
            const status = post.post_status ? ' <span style="font-size:0.72rem;background:#e5e7eb;padding:1px 5px;border-radius:3px;">' + post.post_status + '</span>' : '';
            const date = post.post_date ? post.post_date.slice(0, 10) : '';
            html += '<div class="peiwm-media-post-item" style="display:flex;align-items:center;gap:6px;padding:4px 2px;border-bottom:1px solid #f3f4f6;">' +
                '<input type="checkbox" class="peiwm-media-post-cb" data-id="' + post.ID + '" id="mpost-' + post.ID + '" checked>' +
                '<label for="mpost-' + post.ID + '" style="cursor:pointer;font-size:0.85rem;flex:1;margin:0;">' +
                $('<span>').text(post.post_title || '(no title)').html() + status +
                ' <span style="color:#9ca3af;font-size:0.75rem;">(' + date + ')</span></label></div>';
        });

        // First page: replace loading placeholder; subsequent pages: append
        if (list.find('.peiwm-media-post-item').length === 0) {
            list.html(html);
        } else {
            list.append(html);
        }

        list.find('.peiwm-media-post-cb').off('change.mpc').on('change.mpc', updateMediaPostCount);
    }

    // Helper: collect media advanced filter params (exposed globally for admin-batch.js)
    window.getMediaExportParams = function getMediaExportParams() {
        const params = {};
        // Date range
        if ($('#peiwm-media-export-daterange').is(':checked')) {
            const from = $('#peiwm-media-export-date-from').val().trim();
            const to   = $('#peiwm-media-export-date-to').val().trim();
            if (from) params.media_date_from = from;
            if (to)   params.media_date_to   = to;
        }
        // By post
        if ($('#peiwm-media-export-by-post').is(':checked')) {
            const ids = [];
            $('#peiwm-media-post-list .peiwm-media-post-cb:checked').each(function () {
                const id = parseInt($(this).attr('data-id'), 10);
                if (id > 0) ids.push(id);
            });
            if (ids.length === 0) {
                return null; // caller should show error
            }
            params.media_post_ids = ids.join(',');
        }
        return params;
    }

    // Export Media
    $('#peiwm-export-media').on('click', function () {
        const button = $(this);
        const originalText = button.text();
        const exportAllSizes = $('#peiwm-export-all-image-sizes').is(':checked');

        // Validate advanced options
        const advancedParams = getMediaExportParams();
        if (advancedParams === null) {
            showError('Please select at least one post to export media from.');
            return;
        }

        // Validate date range
        if ($('#peiwm-media-export-daterange').is(':checked') && $('#peiwm-media-daterange-error').is(':visible')) {
            showError('Please fix the date range error before exporting.');
            return;
        }

        button.prop('disabled', true).text('Exporting...');

        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: Object.assign({
                action: 'peiwm_export_media',
                nonce: peiwm_ajax.nonce,
                export_all_sizes: exportAllSizes ? '1' : '0'
            }, advancedParams),
            success: function (response) {
                if (response.success) {
                    // Create download link
                    const link = document.createElement('a');
                    link.href = response.data.download_url;
                    link.download = response.data.filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    let message = 'Media exported successfully!\n\n';
                    
                    // Show clear breakdown
                    if (response.data.export_all_sizes) {
                        message += '📊 Total files: ' + response.data.count + ' (including size variations)\n';
                        message += '🖼️ Unique media: ' + response.data.unique_count + ' original files\n';
                    } else {
                        message += '📊 Total files: ' + response.data.count + ' (originals only)\n';
                    }
                    message += '📦 ZIP size: ' + response.data.total_size_formatted;
                    
                    // Show warning if files were skipped
                    if (response.data.skipped_count && response.data.skipped_count > 0) {
                        message += '\n\n⚠️ Warning: ' + response.data.skipped_count + ' attachment(s) were skipped because their files are missing from the server.';
                        message += '\n\nDatabase records: ' + response.data.total_attachments;
                        message += '\nSuccessfully exported: ' + response.data.unique_count + ' media items';
                    }
                    
                    // Delay showing success message to allow download to start
                    setTimeout(function() {
                        showSuccess(message);
                    }, 500);
                } else {
                    showError('Export failed: ' + response.data.message);
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

    // Import Media - supports multiple ZIP files sequentially
    $('#peiwm-import-media').on('click', function () {
        const button = $(this);
        const fileInput = $('#peiwm-media-file')[0];
        if (!fileInput.files.length) {
            showError(peiwm_ajax.strings.select_file);
            return;
        }

        const files = Array.from(fileInput.files);
        const totalFiles = files.length;
        const maxSize = 500 * 1024 * 1024; // 500MB per file
        let currentFileIndex = 0;

        // Get server upload limits first
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

                    button.prop('disabled', true);

                    function processNextMediaFile() {
                        if (currentFileIndex >= totalFiles) {
                            button.prop('disabled', false).text('Start Import');
                            if (totalFiles > 1) showSuccess('All ' + totalFiles + ' ZIP files imported successfully!');
                            return;
                        }

                        const file = files[currentFileIndex];
                        button.text(totalFiles > 1 ? 'Importing ZIP ' + (currentFileIndex + 1) + ' of ' + totalFiles + '...' : 'Importing...');

                        importMedia(file, function () {
                            currentFileIndex++;
                            processNextMediaFile();
                        });
                    }

                    processNextMediaFile();
                } else {
                    // Fallback to basic validation
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

                    button.prop('disabled', true);

                    function processNextMediaFile() {
                        if (currentFileIndex >= totalFiles) {
                            button.prop('disabled', false).text('Start Import');
                            if (totalFiles > 1) showSuccess('All ' + totalFiles + ' ZIP files imported successfully!');
                            return;
                        }

                        const file = files[currentFileIndex];
                        button.text(totalFiles > 1 ? 'Importing ZIP ' + (currentFileIndex + 1) + ' of ' + totalFiles + '...' : 'Importing...');

                        importMedia(file, function () {
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

                button.prop('disabled', true);

                function processNextMediaFile() {
                    if (currentFileIndex >= totalFiles) {
                        button.prop('disabled', false).text('Start Import');
                        if (totalFiles > 1) showSuccess('All ' + totalFiles + ' ZIP files imported successfully!');
                        return;
                    }

                    const file = files[currentFileIndex];
                    button.text(totalFiles > 1 ? 'Importing ZIP ' + (currentFileIndex + 1) + ' of ' + totalFiles + '...' : 'Importing...');

                    importMedia(file, function () {
                        currentFileIndex++;
                        processNextMediaFile();
                    });
                }

                processNextMediaFile();
            }
        });
    });

    // Test Configuration
    $('#peiwm-test-config').on('click', function () {
        const button = $(this);
        const originalText = button.text();

        button.prop('disabled', true).text('Testing...');

        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_test_config',
                nonce: peiwm_ajax.nonce
            },
            success: function (response) {
                if (response.success) {
                    displayTestResults(response.data);
                } else {
                    showError('Test failed: ' + response.data.message);
                }
            },
            error: function (xhr, status, error) {
                showError('Test failed: ' + error);
            },
            complete: function () {
                button.prop('disabled', false).text(originalText);
            }
        });
    });

    // Export Everything
    $('#peiwm-export-everything').on('click', function () {
        $('#peiwm-export-posts').trigger('click');
        setTimeout(function() {
            $('#peiwm-export-media').trigger('click');
        }, 500);
    });

    // Load Media Statistics
    loadMediaStats();

    // Check post count on page load and show batch warning on export button if needed
    $.ajax({
        url: peiwm_ajax.ajax_url,
        type: 'POST',
        data: { action: 'peiwm_get_posts_list', nonce: peiwm_ajax.nonce, offset: 0 },
        success: function (response) {
            if (response.success && response.data.show_batch_warn) {
                const total = response.data.total_count;
                const notice = $(
                    '<div id="peiwm-batch-notice" style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:14px;padding:11px 14px;background:#f0f6fc;border-left:3px solid #2271b1;border-radius:0 3px 3px 0;">' +
                        '<div style="display:flex;align-items:center;gap:10px;">' +
                            '<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:#2271b1;border-radius:50%;flex-shrink:0;">' +
                                '<svg width="14" height="14" fill="#fff" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L13 10.414V15a1 1 0 01-.553.894l-4 2A1 1 0 017 17v-6.586L3.293 6.707A1 1 0 013 6V4z"/></svg>' +
                            '</div>' +
                            '<div style="font-size:13px;color:#1d2327;line-height:1.4;">' +
                                '<strong style="font-weight:600;color:#135e96;">' + total.toLocaleString() + ' posts</strong> ready to export' +
                                '<span style="color:#50575e;font-size:12px;display:block;margin-top:1px;">Enable batch mode to export faster and avoid timeouts on large sets</span>' +
                            '</div>' +
                        '</div>' +
                        '<a href="?page=peiwm-batch-settings" style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;background:#2271b1;color:#fff;font-size:12px;font-weight:500;border-radius:3px;text-decoration:none;white-space:nowrap;flex-shrink:0;">' +
                            'Enable batch mode' +
                            '<svg width="11" height="11" fill="#fff" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>' +
                        '</a>' +
                    '</div>'
                );
                $('#peiwm-export-posts').after(notice);
            }
        }
    });

    // Refresh Media Statistics
    $('#peiwm-refresh-stats').on('click', function () {
        loadMediaStats();
    });

    // Delete Posts
    $('#peiwm-delete-posts').on('click', function () {
        const deleteMessage = `
            <div class="peiwm-danger-text">
                ⚠️ <strong>WARNING:</strong> This will permanently delete ALL posts from your website.
            </div>
            <p>This action cannot be undone and will remove all posts, including drafts and published content.</p>
            <p><strong>Are you absolutely sure you want to continue?</strong></p>
        `;
        showDangerConfirmation('Delete All Posts', deleteMessage)
            .then(() => {
                deleteAllPosts();
            })
            .catch(() => { });
    });

    // Delete Media
    $('#peiwm-delete-media').on('click', function () {
        const deleteMessage = `
            <div class="peiwm-danger-text">
                ⚠️ <strong>WARNING:</strong> This will permanently delete ALL media files from your library.
            </div>
            <p>This action cannot be undone and will remove all images, videos, and other media files.</p>
            <p><strong>Are you absolutely sure you want to continue?</strong></p>
        `;
        showDangerConfirmation('Delete All Media', deleteMessage)
            .then(() => {
                deleteAllMedia();
            })
            .catch(() => { });
    });

    // Helper Functions

    function deleteAllPosts() {
        const button = $('#peiwm-delete-posts');
        const progress = $('#peiwm-delete-posts-progress');
        const progressFill = progress.find('.peiwm-progress-fill');
        const progressText = progress.find('.peiwm-progress-text');

        button.prop('disabled', true).text('Deleting...');
        progress.show();
        progressFill.css('width', '0%');
        progressText.text('Starting deletion...');

        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_delete_posts',
                nonce: peiwm_ajax.nonce
            },
            success: function (response) {
                if (response.success) {
                    progressFill.css('width', '100%');
                    progressText.text('Deletion complete!');
                    showSuccess(response.data.message);
                } else {
                    progressText.text('Deletion failed: ' + response.data.message);
                    showError('Delete failed: ' + response.data.message);
                }
            },
            error: function (xhr, status, error) {
                progressText.text('Deletion failed: ' + error);
                showError('Delete failed: ' + error);
            },
            complete: function () {
                button.prop('disabled', false).text('Delete All Posts');
            }
        });
    }

    function deleteAllMedia() {
        const button = $('#peiwm-delete-media');
        const progress = $('#peiwm-delete-media-progress');
        const progressFill = progress.find('.peiwm-progress-fill');
        const progressText = progress.find('.peiwm-progress-text');
        const log = progress.find('.peiwm-log');

        button.prop('disabled', true).text('Deleting...');
        progress.show();
        progressFill.css('width', '0%');
        progressText.text('Starting deletion...');
        log.empty();

        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_delete_media',
                nonce: peiwm_ajax.nonce
            },
            success: function (response) {
                if (response.success) {
                    progressFill.css('width', '100%');
                    progressText.text('Deletion complete!');
                    addLog('✅ ' + response.data.message);
                    showSuccess(response.data.message);
                } else {
                    progressText.text('Deletion failed: ' + response.data.message);
                    addLog('❌ Error: ' + response.data.message);
                    showError('Delete failed: ' + response.data.message);
                }
            },
            error: function (xhr, status, error) {
                progressText.text('Deletion failed: ' + error);
                addLog('❌ Error: ' + error);
                showError('Delete failed: ' + error);
            },
            complete: function () {
                button.prop('disabled', false).text('Delete All Media');
            }
        });
    }

    function importPosts(posts, fileLabel, fileIndex, totalFiles, onComplete) {
        // Normalise arguments - legacy callers may pass (posts, onComplete)
        if (typeof fileLabel === 'function') {
            onComplete  = fileLabel;
            fileLabel   = 'file 1';
            fileIndex   = 1;
            totalFiles  = 1;
        }
        if (typeof fileIndex !== 'number') fileIndex  = 1;
        if (typeof totalFiles !== 'number') totalFiles = 1;
        if (!fileLabel) fileLabel = 'file ' + fileIndex;

        const progress = $('#peiwm-posts-progress');
        const progressFill = progress.find('.peiwm-progress-fill');
        const progressText = progress.find('.peiwm-progress-text');
        const log = progress.find('.peiwm-log');

        progress.show();
        progressFill.css('width', '0%');
        progressText.text('Starting import…');
        log.empty();

        let currentIndex = 0;
        const totalPosts = posts.length;
        let isProcessing = false;
        const failedPosts = [];

        function processNextPost() {
            if (currentIndex >= totalPosts) {
                progressText.text('Import complete!');

                if (failedPosts.length > 0) {
                    const failedCount = failedPosts.length;
                    addLog('⚠️ ' + failedCount + ' post(s) failed due to timeout or errors.', log);

                    const retryBtn = $('<button type="button" class="button peiwm-retry-failed-btn" style="margin-top:0.75rem;background:#f97316;color:#fff;border-color:#f97316;">' +
                        '🔄 Some were missed \u2014 retry ' + failedCount + ' failed post(s) now</button>');

                    log.after(retryBtn);
                    retryBtn.on('click', function () {
                        retryBtn.remove();
                        const retryData = failedPosts.splice(0);
                        addLog('🔄 Retrying ' + retryData.length + ' failed post(s)...', log);
                        importPosts(retryData, fileLabel, fileIndex, totalFiles, onComplete);
                    });

                    showSuccess('Import done! ' + totalPosts + ' processed. A few items may need retry.');
                    // Always advance to next file even with failures; pass failed count so tracker can show partial state
                    if (typeof onComplete === 'function') onComplete(failedCount);
                } else {
                    addLog('All posts processed successfully!', log);
                    showSuccess('Posts import completed successfully!');
                    if (typeof onComplete === 'function') onComplete(0);
                }
                return;
            }

            if (isProcessing) {
                return; // Prevent concurrent processing
            }

            isProcessing = true;
            const post = posts[currentIndex];
            const downloadMissingImages = $('#peiwm-download-missing-images').is(':checked') ? '1' : '0';
            
            // Show what we're about to do
            addLog('🔄 Processing: ' + post.post_title, log, 'peiwm-log-info');
            
            // Process images first if download is enabled
            if (downloadMissingImages === '1') {
                processPostImages(post, function() {
                    // After images are processed, import the post
                    importPostContent(post);
                });
            } else {
                // No downloads needed, import directly
                importPostContent(post);
            }
        }

        function processPostImages(post, callback) {
            const imagesToProcess = [];
            
            // Collect all images that need processing
            if (post.content_images) {
                post.content_images.forEach(function(img) {
                    imagesToProcess.push({type: 'content', data: img});
                });
            }
            if (post.featured_image) {
                imagesToProcess.push({type: 'featured', data: post.featured_image});
            }
            
            if (imagesToProcess.length === 0) {
                callback();
                return;
            }
            
            addLog('  🖼️ Checking ' + imagesToProcess.length + ' image(s)...', log, 'peiwm-log-info');
            
            let processedCount = 0;
            
            function processNextImage() {
                if (processedCount >= imagesToProcess.length) {
                    callback();
                    return;
                }
                
                const imageItem = imagesToProcess[processedCount];
                const filename = imageItem.data.filename;
                
                addLog('  🔍 Checking: ' + filename, log, 'peiwm-log-info');
                
                $.ajax({
                    url: peiwm_ajax.ajax_url,
                    type: 'POST',
                    timeout: 30000, // 30 seconds per image
                    data: {
                        action: 'peiwm_check_and_download_image',
                        nonce: peiwm_ajax.nonce,
                        image_data: JSON.stringify(imageItem.data),
                        post_id: 0 // Temporary post ID
                    },
                    success: function (response) {
                        if (response.success) {
                            if (response.data.status === 'found_local') {
                                addLog('    ✅ Found locally: ' + filename, log, 'peiwm-log-success');
                            } else if (response.data.status === 'downloaded') {
                                addLog('    ⬇️ Downloaded: ' + filename, log, 'peiwm-log-success');
                            } else if (response.data.status === 'failed') {
                                addLog('    ❌ Failed: ' + filename + ' - ' + response.data.message, log, 'peiwm-log-error');
                            }
                        } else {
                            addLog('    ❌ Error: ' + filename + ' - ' + response.data.message, log, 'peiwm-log-error');
                        }
                    },
                    error: function (xhr, status, error) {
                        addLog('    ❌ Error: ' + filename + ' - ' + error, log, 'peiwm-log-error');
                    },
                    complete: function () {
                        processedCount++;
                        setTimeout(processNextImage, 100); // Small delay between images
                    }
                });
            }
            
            processNextImage();
        }

        function importPostContent(post) {
            const downloadMissingImages = $('#peiwm-download-missing-images').is(':checked') ? '1' : '0';
            const checkMediaLibrary = $('#peiwm-check-media-library').is(':checked') ? '1' : '0';
            const forceStatus = post._force_status || 'original';
            const mediaMatchMode = $('input[name="peiwm_media_match_mode"]:checked').val() || 'match_and_reuse';
            
            $.ajax({
                url: peiwm_ajax.ajax_url,
                type: 'POST',
                timeout: 90000, // 90 seconds per post
                data: {
                    action: 'peiwm_import_post',
                    nonce: peiwm_ajax.nonce,
                    post_data: JSON.stringify(post),
                    download_missing_images: downloadMissingImages,
                    check_media_library: checkMediaLibrary,
                    media_match_mode: mediaMatchMode,
                    attach_media_to_post: document.getElementById('peiwm-attach-media-to-post') && document.getElementById('peiwm-attach-media-to-post').checked ? '1' : '0',
                    force_status: forceStatus,
                    peiwm_smart_author_mapping: $('#peiwm_smart_author_mapping').is(':checked') ? '1' : '0',
                    peiwm_author_fallback: $('input[name="peiwm_author_fallback"]:checked').val() || 'current_user',
                    peiwm_enable_wpml_support: $('#peiwm_enable_wpml_support').is(':checked') ? '1' : '0'
                },
                success: function (response) {
                    if (response.success) {
                        let logMessage = '';
                        let logClass = '';
                        
                        if (response.data.status === 'skipped') {
                            logMessage = '⏭️ Skipped: ' + post.post_title + ' (' + response.data.reason + ')';
                            logClass = '';
                        } else if (response.data.status === 'updated') {
                            logMessage = '🔄 Updated: ' + post.post_title + ' (' + response.data.reason + ')';
                            logClass = 'peiwm-log-info';
                        } else {
                            logMessage = '✅ Imported: ' + post.post_title;
                            logClass = 'peiwm-log-success';
                        }
                        
                        // Add language info if available
                        if (response.data.language_info && response.data.language_info.success) {
                            logMessage += ' | ' + response.data.language_info.message;
                        } else if (response.data.language_info && !response.data.language_info.success) {
                            logMessage += ' | ⚠️ ' + response.data.language_info.message;
                        }
                        
                        addLog(logMessage, log, logClass);
                    } else {
                        failedPosts.push(post);
                        addLog('❌ Failed: ' + post.post_title + ' - ' + response.data.message, log);
                    }
                },
                error: function (xhr, status, error) {
                    failedPosts.push(post);
                    if (status === 'timeout') {
                        addLog('⌛ Timeout: ' + post.post_title + ' - will be available for retry', log, 'peiwm-log-warning');
                    } else {
                        addLog('❌ Error: ' + post.post_title + ' - ' + error, log);
                    }
                },
                complete: function () {
                    isProcessing = false;
                    currentIndex++;
                    const progressPercent = Math.round((currentIndex / totalPosts) * 100);
                    progressFill.css('width', progressPercent + '%');
                    const fileLabel2 = totalFiles > 1 ? ' - File ' + fileIndex + '/' + totalFiles + ' (' + fileLabel + ')' : '';
                    progressText.text('Processing: ' + currentIndex + ' of ' + totalPosts + ' posts (' + progressPercent + '%)' + fileLabel2);

                    // Process next post with a delay to prevent server overload
                    setTimeout(processNextPost, 500);
                }
            });
        }

        processNextPost();
    }

    // Media Import (3-Phase Chunked Architecture)
    function importMedia(file, onComplete) {
        const progress = $('#peiwm-media-progress');
        const progressFill = progress.find('.peiwm-progress-fill');
        const progressText = progress.find('.peiwm-progress-text');
        const log = progress.find('.peiwm-log');

        progress.show();
        progressFill.css('width', '0%');
        progressText.text('Phase 1/3: Uploading archive...');
        log.empty();

        addLog('📦 Starting media import...', log);
        addLog('File: ' + file.name + ' (' + (file.size / (1024 * 1024)).toFixed(2) + ' MB)', log);

        // Phase 1: Upload ZIP only without blocking extraction
        const formData = new FormData();
        formData.append('action', 'peiwm_import_media_upload');
        formData.append('nonce', peiwm_ajax.nonce);
        formData.append('media_file', file);

        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            timeout: 600000, // 10 minutes timeout for large file upload
            xhr: function () {
                const xhr = new window.XMLHttpRequest();
                xhr.upload.addEventListener('progress', function (evt) {
                    if (evt.lengthComputable) {
                        const percentComplete = Math.round((evt.loaded / evt.total) * 100);
                        progressFill.css('width', percentComplete + '%');
                        progressText.text('Uploading archive... (' + percentComplete + '%)');
                    }
                }, false);
                return xhr;
            },
            success: function (response) {
                if (response.success) {
                    const batchId = response.data.batch_id;
                    const totalZipFiles = response.data.total_files;
                    addLog('✓ Phase 1 complete: Archive uploaded successfully (' + totalZipFiles + ' entries).', log);

                    // Phase 2: Chunked extraction
                    runChunkedExtraction(batchId, totalZipFiles);
                } else {
                    const msg = (response.data && response.data.message) ? response.data.message : 'Unknown upload error';
                    progressText.text('Upload failed: ' + msg);
                    addLog('Error: ' + msg, log, 'peiwm-log-error');
                    showError('Upload failed: ' + msg);
                    if (typeof onComplete === 'function') onComplete();
                }
            },
            error: function (xhr, status, error) {
                let errorMsg = error;
                if (xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message) {
                    errorMsg = xhr.responseJSON.data.message;
                } else if (xhr.responseText) {
                    try {
                        const parsed = JSON.parse(xhr.responseText);
                        if (parsed.data && parsed.data.message) {
                            errorMsg = parsed.data.message;
                        }
                    } catch (e) {
                        if (xhr.responseText.includes('Maximum execution time')) {
                            errorMsg = 'Server timeout - server upload limit or time limit exceeded';
                        } else if (xhr.responseText.includes('memory')) {
                            errorMsg = 'Server memory limit exceeded';
                        } else if (xhr.status === 413) {
                            errorMsg = 'File too large - exceeds server upload limit';
                        } else if (xhr.status === 0) {
                            errorMsg = 'Network error - check your connection';
                        }
                    }
                }
                
                addLog('AJAX Error - Status: ' + status + ', Error: ' + errorMsg, log, 'peiwm-log-error');
                if (status === 'timeout') {
                    progressText.text('Upload timed out. Please try with a smaller file or increase server upload timeout.');
                    addLog('Upload timed out after 10 minutes', log, 'peiwm-log-error');
                    showError('Upload timed out. Please try with a smaller file or contact your server administrator.');
                } else {
                    progressText.text('Upload failed: ' + errorMsg);
                    addLog('Upload failed: ' + errorMsg, log, 'peiwm-log-error');
                    showError('Upload failed: ' + errorMsg);
                }
                if (typeof onComplete === 'function') onComplete();
            }
        });

        // Phase 2: Chunked Extraction loop
        function runChunkedExtraction(batchId, totalZipFiles) {
            progressFill.css('width', '0%');
            progressText.text('Phase 2/3: Unpacking archive in chunks...');
            addLog('📦 Unpacking archive in small chunks to prevent server timeouts...', log);

            const chunkSize = 35;
            let currentOffset = 0;

            function extractNextChunk() {
                $.ajax({
                    url: peiwm_ajax.ajax_url,
                    type: 'POST',
                    timeout: 120000,
                    data: {
                        action: 'peiwm_import_media_extract_chunk',
                        nonce: peiwm_ajax.nonce,
                        batch_id: batchId,
                        offset: currentOffset,
                        chunk_size: chunkSize
                    },
                    success: function (resp) {
                        if (resp.success) {
                            const processed = resp.data.processed;
                            const total = resp.data.total_files;
                            const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 100;
                            
                            progressFill.css('width', percent + '%');
                            progressText.text('Unpacking archive: ' + processed + ' of ' + total + ' files (' + percent + '%)');

                            if (resp.data.done) {
                                addLog('✓ Phase 2 complete: All ' + total + ' files extracted successfully.', log);
                                finalizeExtraction(batchId);
                            } else {
                                currentOffset = resp.data.next_offset;
                                extractNextChunk();
                            }
                        } else {
                            const msg = (resp.data && resp.data.message) ? resp.data.message : 'Extraction error';
                            addLog('✗ Extraction error: ' + msg, log, 'peiwm-log-error');
                            showError('Extraction failed: ' + msg);
                            if (typeof onComplete === 'function') onComplete();
                        }
                    },
                    error: function (xhr, status, err) {
                        addLog('✗ Extraction request error: ' + err, log, 'peiwm-log-error');
                        showError('Extraction failed: ' + err);
                        if (typeof onComplete === 'function') onComplete();
                    }
                });
            }

            extractNextChunk();
        }

        // Phase 3: Finalize & Read Metadata
        function finalizeExtraction(batchId) {
            progressText.text('Phase 3/3: Reading metadata...');
            addLog('📋 Reading metadata and preparing media library import...', log);

            $.ajax({
                url: peiwm_ajax.ajax_url,
                type: 'POST',
                timeout: 60000,
                data: {
                    action: 'peiwm_import_media_finalize',
                    nonce: peiwm_ajax.nonce,
                    batch_id: batchId
                },
                success: function (resp) {
                    if (resp.success) {
                        const totalFiles = resp.data.total_files;
                        const blockedFiles = resp.data.blocked_files || [];
                        const blockedCount = resp.data.blocked_count || 0;

                        if (blockedCount > 0) {
                            addLog('⚠️ ' + blockedCount + ' file(s) blocked due to disallowed file type', log, 'peiwm-log-warning');
                            blockedFiles.slice(0, 10).forEach(function(filename) {
                                addLog('  ⛔ Blocked: ' + filename, log, 'peiwm-log-warning');
                            });
                            if (blockedCount > 10) {
                                addLog('  ... and ' + (blockedCount - 10) + ' more blocked files', log, 'peiwm-log-warning');
                            }
                            addLog('💡 To allow these file types, go to Settings and update "Allowed Media File Types"', log, 'peiwm-log-info');
                        }

                        addLog('✓ Ready: Found ' + totalFiles + ' media items. Starting import...', log);
                        processMediaFiles(batchId, totalFiles, onComplete, null, null, blockedCount);
                    } else {
                        const msg = (resp.data && resp.data.message) ? resp.data.message : 'Failed to finalize metadata';
                        addLog('✗ Error: ' + msg, log, 'peiwm-log-error');
                        showError('Metadata error: ' + msg);
                        if (typeof onComplete === 'function') onComplete();
                    }
                },
                error: function (xhr, status, err) {
                    addLog('✗ Finalize request error: ' + err, log, 'peiwm-log-error');
                    showError('Failed to read metadata: ' + err);
                    if (typeof onComplete === 'function') onComplete();
                }
            });
        }
    }

    // Process media files with concurrent worker pool (3x-5x faster than serial)
    function processMediaFiles(batchId, totalFiles, onComplete, retryIndices, stats, blockedCount) {
        const progress = $('#peiwm-media-progress');
        const progressFill = progress.find('.peiwm-progress-fill');
        const progressText = progress.find('.peiwm-progress-text');
        const log = progress.find('.peiwm-log');

        if (!stats) {
            stats = { imported: 0, skipped: 0, failed: 0, blocked: blockedCount || 0 };
        }

        const indicesToProcess = Array.isArray(retryIndices)
            ? retryIndices.slice()
            : Array.from({ length: totalFiles }, function (_, i) { return i; });

        let pos = 0;
        let completedCount = 0;
        let activeRequests = 0;
        const failedIndices = [];
        const totalToProcess = indicesToProcess.length;
        const maxConcurrent = 3; // Safe concurrency to avoid server thread exhaustion

        if (totalToProcess === 0) {
            progressFill.css('width', '100%');
            progressText.text('No files to import.');
            if (typeof onComplete === 'function') onComplete();
            return;
        }

        function pumpQueue() {
            while (activeRequests < maxConcurrent && pos < totalToProcess) {
                activeRequests++;
                const fileIndex = indicesToProcess[pos++];

                (function(idx) {
                    $.ajax({
                        url: peiwm_ajax.ajax_url,
                        type: 'POST',
                        timeout: 120000,
                        data: {
                            action: 'peiwm_import_media_file',
                            nonce: peiwm_ajax.nonce,
                            batch_id: batchId,
                            file_index: idx
                        },
                        success: function (response) {
                            if (response.success) {
                                if (response.data.status === 'skipped') {
                                    stats.skipped++;
                                    addLog('⏭️ Skipped: ' + response.data.filename + ' (' + response.data.reason + ')', log);
                                } else if (response.data.status === 'failed') {
                                    stats.failed++;
                                    failedIndices.push(idx);
                                    addLog('❌ Failed: ' + response.data.filename + ' - ' + response.data.reason, log);
                                } else {
                                    stats.imported++;
                                    addLog('✅ Imported: ' + response.data.filename + ' (' + response.data.file_size_formatted + ')', log);
                                }
                            } else {
                                stats.failed++;
                                failedIndices.push(idx);
                                addLog('❌ Failed: ' + (response.data ? response.data.message : 'unknown error'), log);
                            }
                        },
                        error: function (xhr, status, error) {
                            stats.failed++;
                            failedIndices.push(idx);
                            addLog('❌ Error (file ' + idx + '): ' + error, log);
                        },
                        complete: function () {
                            activeRequests--;
                            completedCount++;
                            const progressPercent = Math.round((completedCount / totalToProcess) * 100);
                            progressFill.css('width', progressPercent + '%');
                            progressText.text('Importing media... (' + completedCount + ' of ' + totalToProcess + ')');

                            pumpQueue();
                        }
                    });
                })(fileIndex);
            }

            if (activeRequests === 0 && pos >= totalToProcess) {
                if (failedIndices.length > 0) {
                    progressText.text('Import done with ' + failedIndices.length + ' failed file(s).');
                    addLog('⚠️ ' + failedIndices.length + ' file(s) failed and can be retried.', log);

                    const retryBtn = $('<button type="button" class="button peiwm-retry-failed-btn" style="margin-top:0.75rem;background:#f97316;color:#fff;border-color:#f97316;">' +
                        '🔄 Some were missed \u2014 retry ' + failedIndices.length + ' failed file(s) now</button>');
                    log.after(retryBtn);
                    retryBtn.on('click', function () {
                        retryBtn.remove();
                        const retryList = failedIndices.splice(0);
                        addLog('🔄 Retrying ' + retryList.length + ' failed file(s)...', log);
                        processMediaFiles(batchId, totalFiles, onComplete, retryList, stats, blockedCount);
                    });

                    showSuccess('Media import done! ' + totalToProcess + ' processed. ' + failedIndices.length + ' need retry.');
                } else {
                    progressText.text('Import complete!');
                    
                    const summaryParts = [];
                    if (stats.imported > 0) summaryParts.push(stats.imported + ' imported');
                    if (stats.skipped > 0) summaryParts.push(stats.skipped + ' skipped');
                    if (stats.failed > 0) summaryParts.push(stats.failed + ' failed');
                    if (stats.blocked > 0) summaryParts.push(stats.blocked + ' blocked');
                    
                    const summaryMsg = '✅ Import complete! ' + summaryParts.join(', ');
                    addLog(summaryMsg, log);
                    showSuccess('Media import completed successfully!');

                    // Cleanup temporary files
                    $.ajax({
                        url: peiwm_ajax.ajax_url,
                        type: 'POST',
                        data: {
                            action: 'peiwm_cleanup_media_batch',
                            nonce: peiwm_ajax.nonce,
                            batch_id: batchId
                        },
                        success: function (response) {
                            if (response.success) {
                                addLog('✅ Cleanup completed', log);
                            }
                        },
                        complete: function () {
                            if (typeof onComplete === 'function') onComplete();
                        }
                    });
                }
            }
        }

        pumpQueue();
    }

    function displayTestResults(config) {
        let html = '<div class="peiwm-table-scroll-wrapper" style="max-height:400px;overflow-y:auto;margin:1rem 0;">';
        html += '<table class="peiwm-test-table" style="width:100%;border-collapse:collapse;font-size:13px;">';
        html += '<thead><tr style="background:#f3f4f6;position:sticky;top:0;">';
        html += '<th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;width:50%;">Setting</th>';
        html += '<th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;width:50%;">Value</th>';
        html += '</tr></thead><tbody>';

        html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;font-weight:500;">PHP Version</td><td style="padding:8px;">' + config.php_version + '</td></tr>';
        html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;font-weight:500;">WordPress Version</td><td style="padding:8px;">' + config.wordpress_version + '</td></tr>';
        html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;font-weight:500;">Upload Max Filesize</td><td style="padding:8px;">' + config.upload_max_filesize + '</td></tr>';
        html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;font-weight:500;">Post Max Size</td><td style="padding:8px;">' + config.post_max_size + '</td></tr>';
        html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;font-weight:500;">Max Input Time</td><td style="padding:8px;">' + config.max_input_time + ' seconds</td></tr>';
        html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;font-weight:500;">Max File Uploads</td><td style="padding:8px;">' + config.max_file_uploads + '</td></tr>';
        html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;font-weight:500;">Max Execution Time</td><td style="padding:8px;">' + config.max_execution_time + ' seconds</td></tr>';
        html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;font-weight:500;">Memory Limit</td><td style="padding:8px;">' + config.memory_limit + '</td></tr>';
        html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;font-weight:500;">Current Memory Usage</td><td style="padding:8px;">' + (config.current_memory_usage / 1024 / 1024).toFixed(2) + ' MB</td></tr>';
        html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;font-weight:500;">Peak Memory Usage</td><td style="padding:8px;">' + (config.peak_memory_usage / 1024 / 1024).toFixed(2) + ' MB</td></tr>';
        html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;font-weight:500;">ZipArchive Available</td><td style="padding:8px;">' + (config.ziparchive_available ? '✅ Yes' : '❌ No') + '</td></tr>';
        html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px;font-weight:500;">Upload Directory Writable</td><td style="padding:8px;">' + (config.upload_dir_writable ? '✅ Yes' : '❌ No') + '</td></tr>';

        html += '</tbody></table></div>';

        // Add recommendations
        let recs = [];
        if (parseInt(config.max_execution_time) < 300) {
            recs.push('<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:10px 12px;font-size:12.5px;color:#7c2d12;line-height:1.5;margin-bottom:8px;text-align:left;">' +
                      '<strong style="color:#9a3412;">⚠️ Max Execution Time is low (' + config.max_execution_time + 's)</strong><br>' +
                      'Consider increasing to 300+ seconds for large file uploads.' +
                      '</div>');
        }
        if (parseInt(config.max_input_time) < 300) {
            recs.push('<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:10px 12px;font-size:12.5px;color:#7c2d12;line-height:1.5;margin-bottom:8px;text-align:left;">' +
                      '<strong style="color:#9a3412;">⚠️ Max Input Time is low (' + config.max_input_time + 's)</strong><br>' +
                      'Consider increasing to 300+ seconds for large file uploads.' +
                      '</div>');
        }
        if (!config.ziparchive_available) {
            recs.push('<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:10px 12px;font-size:12.5px;color:#991b1b;line-height:1.5;margin-bottom:8px;text-align:left;">' +
                      '<strong style="color:#b91c1c;">❌ ZipArchive is not available</strong><br>' +
                      'This is required for media import/export.' +
                      '</div>');
        }
        if (!config.upload_dir_writable) {
            recs.push('<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:10px 12px;font-size:12.5px;color:#991b1b;line-height:1.5;margin-bottom:8px;text-align:left;">' +
                      '<strong style="color:#b91c1c;">❌ Upload directory is not writable</strong><br>' +
                      'Check permissions.' +
                      '</div>');
        }

        if (recs.length > 0) {
            html += '<div style="margin-top:1rem;">';
            html += '<h4 style="margin-top:0;margin-bottom:10px;">Recommendations</h4>';
            html += recs.join('');
            html += '</div>';
        } else {
            html += '<div style="margin-top:1rem;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:10px 12px;font-size:12.5px;color:#065f46;text-align:left;">';
            html += '✅ <strong>All systems look good!</strong> No recommendations at this time.';
            html += '</div>';
        }

        const modal = $('#peiwm-modal-overlay');
        modal.find('.peiwm-modal-header h3').text('System Test Results');
        modal.find('.peiwm-modal-body p').html(html);
        modal.find('.peiwm-modal').removeClass('peiwm-warning-modal peiwm-danger-modal peiwm-media-missing-modal');
        modal.find('#peiwm-modal-confirm').hide();
        modal.find('#peiwm-modal-cancel').text('Close').show();
        modal.show().addClass('peiwm-show');
        
        // Modal events
        modal.find('.peiwm-modal-close, #peiwm-modal-cancel').off('click').on('click', function() {
            modal.removeClass('peiwm-show').hide();
            modal.find('#peiwm-modal-confirm').show();
            modal.find('#peiwm-modal-cancel').text('Cancel');
        });
        
        modal.off('click').on('click', function(e) {
            if (e.target === this) {
                modal.removeClass('peiwm-show').hide();
                modal.find('#peiwm-modal-confirm').show();
                modal.find('#peiwm-modal-cancel').text('Cancel');
            }
        });

        $(document).off('keydown.test-modal').on('keydown.test-modal', function(e) {
            if (e.key === 'Escape') {
                modal.removeClass('peiwm-show').hide();
                modal.find('#peiwm-modal-confirm').show();
                modal.find('#peiwm-modal-cancel').text('Cancel');
                $(document).off('keydown.test-modal');
            }
        });
    }

    function addLog(message, logContainer = null, className = '') {
        // If no specific log container is provided, try to find the active one
        if (!logContainer) {
            // Check if media progress is visible
            if ($('#peiwm-media-progress').is(':visible')) {
                logContainer = $('#peiwm-media-progress .peiwm-log');
            }
            // Check if posts progress is visible
            else if ($('#peiwm-posts-progress').is(':visible')) {
                logContainer = $('#peiwm-posts-progress .peiwm-log');
            }
            // Check if delete media progress is visible
            else if ($('#peiwm-delete-media-progress').is(':visible')) {
                logContainer = $('#peiwm-delete-media-progress .peiwm-log');
            }
            // Default to media log if none are visible
            else {
                logContainer = $('#peiwm-media-progress .peiwm-log');
            }
        }

        const time = new Date().toLocaleTimeString();
        const classAttr = className ? ' class="peiwm-log-entry ' + className + '"' : ' class="peiwm-log-entry"';
        logContainer.append('<div' + classAttr + '>[' + time + '] ' + message + '</div>');
        logContainer.scrollTop(logContainer[0].scrollHeight);
    }

    function loadMediaStats() {
        const statsContainer = $('#peiwm-media-stats');
        const refreshButton = $('#peiwm-refresh-stats');

        // Show enhanced loader
        statsContainer.html(`
            <div class="peiwm-stats-loader">
                <div class="peiwm-stats-loader-spinner"></div>
                <div class="peiwm-stats-loader-text">Loading media statistics...</div>
                <div class="peiwm-stats-loader-subtext">Analyzing your media library</div>
            </div>
        `);

        refreshButton.prop('disabled', true).text('Loading...');

        // After 1 second, show skeleton loading
        setTimeout(() => {
            if (statsContainer.find('.peiwm-stats-loader').length > 0) {
                statsContainer.html(`
                    <div class="peiwm-stats-skeleton">
                        <div class="peiwm-stats-skeleton-item">
                            <div class="peiwm-stats-skeleton-number"></div>
                            <div class="peiwm-stats-skeleton-label"></div>
                        </div>
                        <div class="peiwm-stats-skeleton-item">
                            <div class="peiwm-stats-skeleton-number"></div>
                            <div class="peiwm-stats-skeleton-label"></div>
                        </div>
                        <div class="peiwm-stats-skeleton-item">
                            <div class="peiwm-stats-skeleton-number"></div>
                            <div class="peiwm-stats-skeleton-label"></div>
                        </div>
                        <div class="peiwm-stats-skeleton-item">
                            <div class="peiwm-stats-skeleton-number"></div>
                            <div class="peiwm-stats-skeleton-label"></div>
                        </div>
                    </div>
                `);
            }
        }, 1000);

        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_get_media_stats',
                nonce: peiwm_ajax.nonce
            },
            success: function (response) {
                if (response.success) {
                    const stats = response.data;
                    let html = '<div class="peiwm-stats-grid">';

                    // Unique files (attachments)
                    html += '<div class="peiwm-stat-item">';
                    html += '<div class="peiwm-stat-number">' + stats.unique_files + '</div>';
                    html += '<div class="peiwm-stat-label">Unique Files</div>';
                    html += '<div class="peiwm-stat-detail" style="font-size: 11px; color: #666; margin-top: 2px;">' + stats.unique_size_formatted + ' (originals)</div>';
                    html += '</div>';

                    // Total physical files (including size variations)
                    html += '<div class="peiwm-stat-item">';
                    html += '<div class="peiwm-stat-number">' + stats.total_physical_files + '</div>';
                    html += '<div class="peiwm-stat-label">Total Files</div>';
                    html += '<div class="peiwm-stat-detail" style="font-size: 11px; color: #666; margin-top: 2px;">' + stats.total_size_formatted + ' (with sizes)</div>';
                    html += '</div>';

                    // File Status - Available vs Missing
                    html += '<div class="peiwm-stat-item' + (stats.missing_files > 0 ? ' peiwm-stat-warning' : '') + '">';
                    html += '<div class="peiwm-stat-number">' + stats.available_files + ' / ' + stats.unique_files + '</div>';
                    html += '<div class="peiwm-stat-label">Available Files</div>';
                    if (stats.missing_files > 0) {
                        html += '<div class="peiwm-stat-detail" style="font-size: 11px; color: #d97706; margin-top: 2px;">';
                        html += '⚠️ ' + stats.missing_files + ' missing from disk ';
                        html += '<button type="button" class="peiwm-view-missing-btn" style="background:none;border:none;color:#2563eb;cursor:pointer;text-decoration:underline;padding:0;font-size:11px;" title="View missing files">View Details</button>';
                        html += '</div>';
                        // Store missing files data for the modal
                        window.peiwmMissingFiles = stats.missing_files_list;
                    } else {
                        html += '<div class="peiwm-stat-detail" style="font-size: 11px; color: #10b981; margin-top: 2px;">✅ All files present</div>';
                    }
                    html += '</div>';

                    // Largest file
                    if (stats.largest_file.name) {
                        html += '<div class="peiwm-stat-item">';
                        html += '<div class="peiwm-stat-number">' + stats.largest_file.size_formatted + '</div>';
                        html += '<div class="peiwm-stat-label">Largest File</div>';
                        html += '<div class="peiwm-stat-detail">' + stats.largest_file.name + '</div>';
                        html += '</div>';
                    }

                    html += '</div>';

                    // File types breakdown
                    if (Object.keys(stats.file_types).length > 0) {
                        html += '<div class="peiwm-file-types">';
                        html += '<h4><svg class="peiwm-ft-heading-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 2.5h7.5L16 7v10.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M11.25 2.5V7H16" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>File Types</h4>';
                        html += '<div class="peiwm-file-types-list">';

                        let count = 0;
                        const allFileTypes = Object.entries(stats.file_types);

                        // Show first 5 file types
                        for (const [mimeType, fileCount] of allFileTypes) {
                            if (count >= 5) break;
                            const fileType = mimeType.split('/')[1] || mimeType;
                            const displayName = fileType.toUpperCase();
                            const truncatedName = displayName.length > 7 ? displayName.substring(0, 7) + '...' : displayName;

                            html += '<div class="peiwm-file-type-item" title="' + displayName + ' (' + fileCount + ' files)">';
                            html += '<svg class="peiwm-ft-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 2.5h7.5L16 7v10.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M11.25 2.5V7H16" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
                            html += '<span class="peiwm-file-type-name">' + truncatedName + '</span>';
                            html += '<span class="peiwm-file-type-count">' + fileCount + '</span>';
                            html += '</div>';
                            count++;
                        }

                        // Show "+X more types" toggle if there are more than 5
                        if (allFileTypes.length > 5) {
                            const remainingCount = allFileTypes.length - 5;
                            html += '<button type="button" class="peiwm-file-type-item peiwm-more-toggle" aria-expanded="false">';
                            html += '<svg class="peiwm-ft-chevron" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 8l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                            html += '<span class="peiwm-more-text">+' + remainingCount + ' more' + (remainingCount > 1 ? 's' : '') + '</span>';
                            html += '</button>';

                            // Hidden remaining types
                            html += '<div class="peiwm-file-types-hidden">';
                            for (let i = 5; i < allFileTypes.length; i++) {
                                const [mimeType, fileCount] = allFileTypes[i];
                                const fileType = mimeType.split('/')[1] || mimeType;
                                const displayName = fileType.toUpperCase();
                                const truncatedName = displayName.length > 7 ? displayName.substring(0, 7) + '...' : displayName;

                                html += '<div class="peiwm-file-type-item" title="' + displayName + ' (' + fileCount + ' files)">';
                                html += '<svg class="peiwm-ft-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 2.5h7.5L16 7v10.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M11.25 2.5V7H16" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
                                html += '<span class="peiwm-file-type-name">' + truncatedName + '</span>';
                                html += '<span class="peiwm-file-type-count">' + fileCount + '</span>';
                                html += '</div>';
                            }
                            html += '</div>';
                        }

                        html += '</div>';
                        html += '</div>';
                    }

                    statsContainer.html(html);
                    
                    // Add click handler for "more types" toggle
                    statsContainer.find('.peiwm-more-toggle').on('click', function() {
                        const $this = $(this);
                        const $hidden = $this.siblings('.peiwm-file-types-hidden');
                        const isVisible = $hidden.is(':visible');
                        
                        if (isVisible) {
                            $hidden.slideUp(200);
                            const remainingCount = $hidden.find('.peiwm-file-type-item').length;
                            $this.find('.peiwm-more-text').text('+' + remainingCount + ' more' + (remainingCount > 1 ? 's' : ''));
                        } else {
                            $hidden.slideDown(200);
                            $this.find('.peiwm-more-text').text('Show less');
                        }
                    });

                    // Add click handler for "View Details" button
                    statsContainer.find('.peiwm-view-missing-btn').on('click', function() {
                        showMissingFilesModal();
                    });
                } else {
                    statsContainer.html('<p class="peiwm-error">Failed to load statistics: ' + response.data.message + '</p>');
                }
            },
            error: function (xhr, status, error) {
                statsContainer.html('<p class="peiwm-error">Failed to load statistics: ' + error + '</p>');
            },
            complete: function () {
                refreshButton.prop('disabled', false).text('Refresh Stats');
            }
        });
    }

    window.peiwmMissingMediaSelections = {};

    // Show missing files modal
    function showMissingFilesModal() {
        if (!window.peiwmMissingFiles || window.peiwmMissingFiles.length === 0) {
            showError('No missing files data available.');
            return;
        }

        const missingFiles = window.peiwmMissingFiles;
        const isProActive = Boolean(typeof peiwm_ajax !== 'undefined' && (peiwm_ajax.is_pro_active === true || peiwm_ajax.is_pro_active === '1' || peiwm_ajax.is_pro_active === 1));

        let tableHtml = '<div class="peiwm-table-scroll-wrapper" style="max-height:400px;overflow-y:auto;margin:1rem 0;">';
        tableHtml += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
        tableHtml += '<thead><tr style="background:#f3f4f6;position:sticky;top:0;">';
        tableHtml += '<th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">ID</th>';
        tableHtml += '<th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Title</th>';
        tableHtml += '<th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Filename</th>';
        tableHtml += '<th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Expected Path</th>';
        tableHtml += '<th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb;">Action</th>';
        tableHtml += '</tr></thead><tbody>';

        missingFiles.forEach(function(file) {
            const escapedTitle = $('<div>').text(file.title || 'Unknown').html();
            const escapedFilename = $('<div>').text(file.filename).html();

            tableHtml += '<tr style="border-bottom:1px solid #e5e7eb;" data-media-id="' + file.id + '">';
            tableHtml += '<td style="padding:8px;">' + file.id + '</td>';
            tableHtml += '<td style="padding:8px;">' + escapedTitle + '</td>';
            tableHtml += '<td style="padding:8px;font-family:monospace;font-size:12px;">' + escapedFilename + '</td>';
            tableHtml += '<td style="padding:8px;font-family:monospace;font-size:11px;color:#666;word-break:break-all;">' + $('<div>').text(file.path).html() + '</td>';
            tableHtml += '<td style="padding:8px;text-align:center;vertical-align:middle;">';
            tableHtml += '<div class="peiwm-action-cell" style="display:flex;flex-direction:column;align-items:center;gap:6px;">';

            if (!isProActive) {
                tableHtml += '<button type="button" class="button peiwm-update-media-btn peiwm-locked-btn peiwm-open-premium-modal" data-media-id="' + file.id + '" data-title="' + escapedTitle + '" data-filename="' + escapedFilename + '">🔒 Replace</button>';
            } else {
                tableHtml += '<button type="button" class="button peiwm-update-media-btn" data-media-id="' + file.id + '" data-title="' + escapedTitle + '" data-filename="' + escapedFilename + '">Replace</button>';
            }

            tableHtml += '<div class="peiwm-media-preview" style="display:none;margin-top:4px;"></div>';
            tableHtml += '</div>';
            tableHtml += '</td>';
            tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table></div>';

        if (isProActive) {
            tableHtml += '<div style="margin-top:0.75rem;display:flex;justify-content:flex-start;">';
            tableHtml += '<button type="button" id="peiwm-update-all-selected-btn" class="button button-primary" style="display:none;background:#7c3aed;border-color:#7c3aed;">Update All Selected Media (0)</button>';
            tableHtml += '</div>';
        }

        tableHtml += '<div style="margin-top:1rem;display:flex;flex-direction:column;gap:8px;">';

        // Main info row
        tableHtml += '<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;padding:10px 12px;font-size:12.5px;color:#78350f;line-height:1.5; text-align:left;">';
        tableHtml += '<strong style="color:#92400e;">⚠️ Database records exist but files are missing from the server.</strong><br>';
        tableHtml += '<span style="color:#78350f;">Run <strong>Fix Paths</strong> first - it corrects misconfigured paths (e.g. <code style="background:#fff8;padding:1px 5px;border-radius:3px;font-size:11px;">202311</code> → <code style="background:#fff8;padding:1px 5px;border-radius:3px;font-size:11px;">2023/11</code>). If that doesn\'t help, use <strong>Replace</strong> to upload the missing images from server to media library, or use <strong>Clean Up</strong> to remove orphaned entries permanently.</span>';
        tableHtml += '</div>';

        // Unknown entries note
        tableHtml += '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:10px 12px;font-size:12.5px;color:#7c2d12;line-height:1.5; text-align:left;">';
        tableHtml += '<strong style="color:#9a3412;">❓ Entries showing "Unknown" filename or path</strong><br>';
        tableHtml += 'These records are severely corrupted - no valid file path exists in the database. This is usually caused by an invalid external URL stored as a local path, or a file that was never fully uploaded. <strong>Fix Paths cannot repair these.</strong> Use <strong>Clean Up</strong> to remove them, then re-upload the files via the WordPress Media Library if still needed.';
        tableHtml += '</div>';

        tableHtml += '</div>';

        // Action buttons
        tableHtml += '<div style="margin-top:1.25rem;display:flex;gap:10px;justify-content:flex-end;">';
        tableHtml += '<button type="button" id="peiwm-fix-paths-btn" class="button button-primary" style="background:#2563eb;border-color:#2563eb;">Fix Paths</button>';
        tableHtml += '<button type="button" id="peiwm-clean-missing-btn" class="button button-primary" style="background:#dc2626;border-color:#dc2626;">Clean Missing Files</button>';
        tableHtml += '</div>';

        const modal = $('#peiwm-modal-overlay');
        modal.find('.peiwm-modal-header h3').text('Missing Media Files (' + missingFiles.length + ')');
        modal.find('.peiwm-modal-body p').html(tableHtml);
        modal.find('.peiwm-modal').removeClass('peiwm-warning-modal peiwm-danger-modal').addClass('peiwm-media-missing-modal');
        modal.find('#peiwm-modal-confirm, #peiwm-modal-cancel').hide();
        modal.show().addClass('peiwm-show');

        // X button close handler
        modal.find('.peiwm-modal-close').off('click').on('click', function() {
            modal.removeClass('peiwm-show').hide();
            modal.find('.peiwm-modal').removeClass('peiwm-media-missing-modal');
            modal.find('#peiwm-modal-confirm, #peiwm-modal-cancel').show();
        });

        // Fix Paths button handler
        $('#peiwm-fix-paths-btn').on('click', function() {
            const fixBtn = $('#peiwm-fix-paths-btn');
            fixBtn.prop('disabled', true).text('Fixing...');

            $.ajax({
                url: peiwm_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'peiwm_fix_missing_media_paths',
                    nonce: peiwm_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        modal.removeClass('peiwm-show').hide();
                        modal.find('.peiwm-modal').removeClass('peiwm-media-missing-modal');
                        modal.find('#peiwm-modal-confirm, #peiwm-modal-cancel').show();
                        
                        let message = response.data.message;
                        if (response.data.fixed_count > 0) {
                            message += '\n\nFixed paths:\n';
                            response.data.fixed_details.slice(0, 5).forEach(function(detail) {
                                message += '\n• ID ' + detail.id + ': ' + detail.old_path + ' → ' + detail.new_path;
                            });
                            if (response.data.fixed_details.length > 5) {
                                message += '\n... and ' + (response.data.fixed_details.length - 5) + ' more';
                            }
                        }
                        
                        showSuccess(message);
                        // Show processing state on the stat card while stats reload
                        const $statDetail = $('#peiwm-media-stats .peiwm-stat-warning .peiwm-stat-detail');
                        if ($statDetail.length) {
                            $statDetail.html('<span style="color:#6b7280;">🔄 Updating stats...</span>');
                        }
                        loadMediaStats();
                    } else {
                        showError('Fix failed: ' + response.data.message);
                        fixBtn.prop('disabled', false).text('Fix Paths');
                    }
                },
                error: function() {
                    showError('Fix failed. Please try again.');
                    fixBtn.prop('disabled', false).text('Fix Paths');
                }
            });
        });

        // Clean up button handler
        $('#peiwm-clean-missing-btn').on('click', function() {
            // First close the missing files modal and restore buttons
            modal.removeClass('peiwm-show').hide();
            modal.find('.peiwm-modal').removeClass('peiwm-media-missing-modal');
            modal.find('#peiwm-modal-confirm, #peiwm-modal-cancel').show();
            
            // Then show the danger confirmation
            showDangerConfirmation(
                'Clean Up Missing Files?',
                'This will permanently delete ' + missingFiles.length + ' attachment record(s) from your database. This action cannot be undone.<br><br>Are you sure you want to proceed?'
            ).then(function() {
                // -- Show "processing" in the stat card immediately after confirm --
                const $statWarningItem = $('#peiwm-media-stats .peiwm-stat-warning');
                const $statDetail = $statWarningItem.find('.peiwm-stat-detail');
                if ($statDetail.length) {
                    $statDetail.html('<span style="color:#6b7280;">🔄 Cleaning... please wait</span>');
                }

                $.ajax({
                    url: peiwm_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'peiwm_clean_missing_media',
                        nonce: peiwm_ajax.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            showSuccess(response.data.message);
                            // -- Update the stat card directly — fast, no full reload --
                            if ($statWarningItem.length) {
                                $statWarningItem.removeClass('peiwm-stat-warning');
                                $statDetail.html('<span style="color:#10b981;">✅ All files present</span>');
                                // Update the number to reflect 0 missing
                                const $num = $statWarningItem.find('.peiwm-stat-number');
                                if ($num.length) {
                                    // Format: "X / Y" — set missing to 0, keep total
                                    const numText = $num.text();
                                    const parts = numText.split('/');
                                    if (parts.length === 2) {
                                        $num.text(parts[1].trim() + ' / ' + parts[1].trim());
                                    }
                                }
                            } else {
                                // Fallback: full reload if DOM not as expected
                                loadMediaStats();
                            }
                            // Clear stored missing files
                            window.peiwmMissingFiles = [];
                        } else {
                            // Restore the warning state on failure
                            if ($statDetail.length) {
                                $statDetail.html('<span style="color:#d97706;">⚠️ Cleanup failed — <button type="button" class="peiwm-view-missing-btn" style="background:none;border:none;color:#2563eb;cursor:pointer;text-decoration:underline;padding:0;font-size:11px;">View Details</button></span>');
                                $statWarningItem.addClass('peiwm-stat-warning');
                            }
                            showError('Cleanup failed: ' + response.data.message);
                        }
                    },
                    error: function() {
                        // Restore warning state on error
                        if ($statDetail.length) {
                            $statDetail.html('<span style="color:#d97706;">⚠️ Cleanup failed — <button type="button" class="peiwm-view-missing-btn" style="background:none;border:none;color:#2563eb;cursor:pointer;text-decoration:underline;padding:0;font-size:11px;">View Details</button></span>');
                            $statWarningItem.addClass('peiwm-stat-warning');
                        }
                        showError('Cleanup failed. Please try again.');
                    }
                });
            }).catch(function() {
                // User cancelled — restore the stat card if we touched it
                // (We haven't touched it yet at cancel time, so nothing to restore)
            });
        });

        // Close on overlay click
        modal.off('click').on('click', function(e) {
            if (e.target === this) {
                modal.removeClass('peiwm-show').hide();
                modal.find('.peiwm-modal').removeClass('peiwm-media-missing-modal');
                modal.find('#peiwm-modal-confirm, #peiwm-modal-cancel').show();
            }
        });

        // Close on escape key
        $(document).off('keydown.missing-modal').on('keydown.missing-modal', function(e) {
            if (e.key === 'Escape') {
                modal.removeClass('peiwm-show').hide();
                modal.find('.peiwm-modal').removeClass('peiwm-media-missing-modal');
                modal.find('#peiwm-modal-confirm, #peiwm-modal-cancel').show();
                $(document).off('keydown.missing-modal');
            }
        });
    }

    function showMediaSelectionModal(mediaId, title, filename) {
        let modal = $('#peiwm-media-selector-modal-overlay');
        if (!modal.length) {
            let modalHtml = `
                <div id="peiwm-media-selector-modal-overlay" class="peiwm-modal-overlay">
                    <div class="peiwm-modal peiwm-media-selector-modal">
                        <button type="button" class="peiwm-modal-close" aria-label="Close">&times;</button>
                        <div class="peiwm-modal-header">
                            <h3>Select Replacement Media</h3>
                        </div>
                        <div class="peiwm-modal-body">
                            <div class="peiwm-media-source-tabs">
                                <button type="button" class="peiwm-tab-btn active" data-tab="library">📁 Media Library</button>
                                <button type="button" class="peiwm-tab-btn" data-tab="upload">⬆️ Upload File</button>
                            </div>
                            
                            <div class="peiwm-tab-content-area">
                                <div class="peiwm-selector-tab-panel active" data-panel="library">
                                    <div class="peiwm-media-search">
                                        <input type="text" id="peiwm-media-search-input" class="regular-text" placeholder="Search media library...">
                                    </div>
                                    <div id="peiwm-media-grid-container" class="peiwm-media-grid">
                                        <div class="peiwm-loading" style="grid-column: 1/-1; text-align: center; padding: 2rem;">Loading media library...</div>
                                    </div>
                                </div>
                                
                                <div class="peiwm-selector-tab-panel" data-panel="upload" style="display:none;">
                                    <div class="peiwm-upload-area">
                                        <input type="file" id="peiwm-replacement-file-input" style="display:none;" accept="image/*,video/*,audio/*,application/pdf">
                                        <p>Drop file here or click to select</p>
                                        <button type="button" class="button button-secondary" id="peiwm-browse-file-btn">Choose File</button>
                                        <div id="peiwm-upload-file-info" style="margin-top:1rem;font-weight:600;display:none;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="peiwm-modal-footer" style="display:flex;justify-space-between;align-items:center;padding:1rem 1.5rem;border-top:1px solid #e5e7eb;">
                            <div class="peiwm-modal-footer-left">
                                <button type="button" id="peiwm-selector-update-now-btn" class="button button-primary" style="background:#7c3aed;border-color:#7c3aed;display:none;">Update Now</button>
                            </div>
                            <div class="peiwm-modal-footer-right" style="display:flex;gap:10px;">
                                <button type="button" id="peiwm-selector-cancel-btn" class="button button-secondary">Cancel</button>
                                <button type="button" id="peiwm-selector-confirm-btn" class="button button-primary" disabled>Select</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $('body').append(modalHtml);
            modal = $('#peiwm-media-selector-modal-overlay');
            attachMediaSelectorHandlers();
        }

        modal.data('target-media-id', mediaId);
        modal.data('target-filename', filename);
        modal.data('selected-media', null);

        modal.find('.peiwm-modal-header h3').text('Select Replacement for: ' + title + ' (' + filename + ')');
        modal.find('#peiwm-selector-confirm-btn').prop('disabled', true);
        modal.find('#peiwm-selector-update-now-btn').hide();
        modal.find('#peiwm-upload-file-info').hide().text('');
        modal.find('#peiwm-replacement-file-input').val('');
        modal.find('#peiwm-media-search-input').val('');

        modal.find('.peiwm-media-source-tabs .peiwm-tab-btn[data-tab="library"]').addClass('active').siblings().removeClass('active');
        modal.find('.peiwm-selector-tab-panel[data-panel="library"]').show().addClass('active').siblings().hide().removeClass('active');

        loadMediaLibraryForSelection(1, '');
        modal.show().addClass('peiwm-show');
    }

    function attachMediaSelectorHandlers() {
        const modal = $('#peiwm-media-selector-modal-overlay');

        modal.find('.peiwm-media-source-tabs .peiwm-tab-btn').on('click', function() {
            const tab = $(this).data('tab');
            $(this).addClass('active').siblings().removeClass('active');
            modal.find('.peiwm-selector-tab-panel').hide().removeClass('active');
            modal.find(`.peiwm-selector-tab-panel[data-panel="${tab}"]`).show().addClass('active');

            modal.data('selected-media', null);
            modal.find('#peiwm-selector-confirm-btn').prop('disabled', true);
            modal.find('#peiwm-selector-update-now-btn').hide();
            modal.find('.peiwm-media-item').removeClass('selected');
        });

        let searchTimeout;
        modal.find('#peiwm-media-search-input').on('input', function() {
            const query = $(this).val();
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(function() {
                loadMediaLibraryForSelection(1, query);
            }, 300);
        });

        modal.find('#peiwm-browse-file-btn').on('click', function() {
            modal.find('#peiwm-replacement-file-input').trigger('click');
        });

        modal.find('#peiwm-replacement-file-input').on('change', function() {
            const file = this.files[0];
            if (file) {
                modal.find('#peiwm-upload-file-info').text('Selected file: ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(2) + ' MB)').show();
                modal.data('selected-media', {
                    type: 'upload',
                    file: file,
                    name: file.name
                });
                modal.find('#peiwm-selector-confirm-btn').prop('disabled', false);
                modal.find('#peiwm-selector-update-now-btn').show();
            }
        });

        modal.on('click', '.peiwm-media-item', function() {
            modal.find('.peiwm-media-item').removeClass('selected');
            $(this).addClass('selected');

            const selectedData = {
                type: 'library',
                id: $(this).data('id'),
                title: $(this).data('title'),
                url: $(this).data('url'),
                thumbnail: $(this).data('thumbnail')
            };

            modal.data('selected-media', selectedData);
            modal.find('#peiwm-selector-confirm-btn').prop('disabled', false);
            modal.find('#peiwm-selector-update-now-btn').show();
        });

        modal.find('#peiwm-selector-confirm-btn').on('click', function() {
            const targetMediaId = modal.data('target-media-id');
            const selectedMedia = modal.data('selected-media');

            if (targetMediaId && selectedMedia) {
                window.peiwmMissingMediaSelections[targetMediaId] = selectedMedia;
                updateMediaRowPreview(targetMediaId, selectedMedia);
                updateBulkUpdateButton();
            }

            modal.removeClass('peiwm-show').hide();
        });

        modal.find('#peiwm-selector-update-now-btn').on('click', function() {
            const targetMediaId = modal.data('target-media-id');
            const selectedMedia = modal.data('selected-media');

            if (targetMediaId && selectedMedia) {
                modal.removeClass('peiwm-show').hide();
                updateSingleMedia(targetMediaId, selectedMedia);
            }
        });

        modal.find('.peiwm-modal-close, #peiwm-selector-cancel-btn').on('click', function() {
            modal.removeClass('peiwm-show').hide();
        });

        modal.on('click', function(e) {
            if (e.target === this) {
                modal.removeClass('peiwm-show').hide();
            }
        });
    }

    function loadMediaLibraryForSelection(page, search) {
        const grid = $('#peiwm-media-grid-container');
        grid.html('<div class="peiwm-loading" style="grid-column: 1/-1; text-align: center; padding: 2rem;">Loading media library...</div>');

        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_get_media_library',
                nonce: peiwm_ajax.nonce,
                page: page,
                per_page: 50,
                search: search
            },
            success: function(response) {
                if (response.success && response.data.media) {
                    renderMediaGrid(response.data.media);
                } else {
                    grid.html('<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #666;">No media found.</div>');
                }
            },
            error: function() {
                grid.html('<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #dc2626;">Failed to load media library.</div>');
            }
        });
    }

    function renderMediaGrid(mediaItems) {
        const grid = $('#peiwm-media-grid-container');
        if (!mediaItems.length) {
            grid.html('<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #666;">No media found.</div>');
            return;
        }

        let html = '';
        mediaItems.forEach(function(item) {
            const thumbUrl = item.thumbnail || item.url || '';
            const title = $('<div>').text(item.title || 'Untitled').html();

            html += `<div class="peiwm-media-item" data-id="${item.id}" data-title="${title}" data-url="${item.url}" data-thumbnail="${thumbUrl}">`;
            if (thumbUrl) {
                html += `<div class="peiwm-media-thumb" style="background-image: url('${thumbUrl}');"></div>`;
            } else {
                html += `<div class="peiwm-media-thumb" style="display:flex;align-items:center;justify-content:center;background:#e5e7eb;font-size:24px;">📄</div>`;
            }
            html += `<div class="peiwm-media-info"><span class="peiwm-media-title">${title}</span></div>`;
            html += `</div>`;
        });

        grid.html(html);
    }

    function updateMediaRowPreview(mediaId, selectedMedia) {
        const $row = $('tr[data-media-id="' + mediaId + '"]');
        if (!$row.length) return;

        const $preview = $row.find('.peiwm-media-preview');
        let previewHtml = '';

        if (selectedMedia.type === 'library') {
            const thumb = selectedMedia.thumbnail || selectedMedia.url;
            previewHtml = `
                <div class="peiwm-selected-media" style="display:flex;align-items:center;gap:6px;font-size:11px;background:#f3e8ff;padding:4px 8px;border-radius:4px;border:1px solid #c084fc;">
                    ${thumb ? `<img src="${thumb}" class="peiwm-mini-thumb" style="width:24px;height:24px;object-fit:cover;border-radius:2px;">` : '📄'}
                    <span style="max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${$('<div>').text(selectedMedia.title).html()}</span>
                    <button type="button" class="peiwm-clear-selection-btn" data-media-id="${mediaId}" style="background:none;border:none;color:#dc2626;cursor:pointer;padding:0 2px;font-weight:bold;">&times;</button>
                </div>
            `;
        } else if (selectedMedia.type === 'upload') {
            previewHtml = `
                <div class="peiwm-selected-media" style="display:flex;align-items:center;gap:6px;font-size:11px;background:#e0f2fe;padding:4px 8px;border-radius:4px;border:1px solid #38bdf8;">
                    <span>📁</span>
                    <span style="max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${$('<div>').text(selectedMedia.name).html()}</span>
                    <button type="button" class="peiwm-clear-selection-btn" data-media-id="${mediaId}" style="background:none;border:none;color:#dc2626;cursor:pointer;padding:0 2px;font-weight:bold;">&times;</button>
                </div>
            `;
        }

        $preview.html(previewHtml).show();
    }

    function updateBulkUpdateButton() {
        const count = Object.keys(window.peiwmMissingMediaSelections).length;
        const $btn = $('#peiwm-update-all-selected-btn');
        if ($btn.length) {
            if (count > 0) {
                $btn.text('Update All Selected Media (' + count + ')').show();
            } else {
                $btn.hide();
            }
        }
    }

    function updateSingleMedia(mediaId, selectedMedia) {
        const $btn = $('button.peiwm-update-media-btn[data-media-id="' + mediaId + '"]');
        const originalText = $btn.text();
        $btn.prop('disabled', true).text('Updating...');

        const formData = new FormData();
        formData.append('action', 'peiwm_update_missing_media');
        formData.append('nonce', peiwm_ajax.nonce);
        formData.append('media_id', mediaId);
        formData.append('type', selectedMedia.type);

        if (selectedMedia.type === 'library') {
            formData.append('replacement_id', selectedMedia.id);
        } else if (selectedMedia.type === 'upload') {
            formData.append('file', selectedMedia.file);
        }

        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.success) {
                    showSuccess(response.data.message);
                    delete window.peiwmMissingMediaSelections[mediaId];
                    updateBulkUpdateButton();
                    
                    const $row = $('tr[data-media-id="' + mediaId + '"]');
                    $row.css('background-color', '#d1fae5').fadeOut(600, function() {
                        $(this).remove();
                        if ($('#peiwm-modal-overlay table tbody tr').length === 0) {
                            $('#peiwm-modal-overlay').removeClass('peiwm-show').hide();
                        }
                        loadMediaStats();
                    });
                } else {
                    showError('Update failed: ' + (response.data ? response.data.message : 'Unknown error'));
                    $btn.prop('disabled', false).text(originalText);
                }
            },
            error: function(xhr, status, error) {
                showError('Update failed: ' + error);
                $btn.prop('disabled', false).text(originalText);
            }
        });
    }

    function updateAllSelectedMedia() {
        const mediaIds = Object.keys(window.peiwmMissingMediaSelections);
        if (!mediaIds.length) return;

        const $bulkBtn = $('#peiwm-update-all-selected-btn');
        $bulkBtn.prop('disabled', true).text('Updating Media (0/' + mediaIds.length + ')...');

        let completed = 0;
        let errors = 0;

        function processNext(index) {
            if (index >= mediaIds.length) {
                $bulkBtn.prop('disabled', false).text('Update Complete');
                showSuccess('Bulk update complete! Successfully updated ' + completed + ' media item(s).');
                loadMediaStats();
                return;
            }

            const mediaId = mediaIds[index];
            const selectedMedia = window.peiwmMissingMediaSelections[mediaId];

            $bulkBtn.text('Updating Media (' + (index + 1) + '/' + mediaIds.length + ')...');

            const formData = new FormData();
            formData.append('action', 'peiwm_update_missing_media');
            formData.append('nonce', peiwm_ajax.nonce);
            formData.append('media_id', mediaId);
            formData.append('type', selectedMedia.type);

            if (selectedMedia.type === 'library') {
                formData.append('replacement_id', selectedMedia.id);
            } else if (selectedMedia.type === 'upload') {
                formData.append('file', selectedMedia.file);
            }

            $.ajax({
                url: peiwm_ajax.ajax_url,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    if (response.success) {
                        completed++;
                        delete window.peiwmMissingMediaSelections[mediaId];
                        const $row = $('tr[data-media-id="' + mediaId + '"]');
                        $row.css('background-color', '#d1fae5').fadeOut(400, function() {
                            $(this).remove();
                        });
                    } else {
                        errors++;
                    }
                },
                error: function() {
                    errors++;
                },
                complete: function() {
                    processNext(index + 1);
                }
            });
        }

        processNext(0);
    }

    $(document).on('click', '.peiwm-clear-selection-btn', function(e) {
        e.stopPropagation();
        const mediaId = $(this).data('media-id');
        if (mediaId && window.peiwmMissingMediaSelections[mediaId]) {
            delete window.peiwmMissingMediaSelections[mediaId];
            const $row = $('tr[data-media-id="' + mediaId + '"]');
            $row.find('.peiwm-media-preview').empty().hide();
            updateBulkUpdateButton();
        }
    });

    $(document).on('click', '.peiwm-update-media-btn:not(.peiwm-locked-btn)', function(e) {
        e.preventDefault();
        const mediaId = $(this).data('media-id');
        const title = $(this).data('title');
        const filename = $(this).data('filename');
        showMediaSelectionModal(mediaId, title, filename);
    });

    $(document).on('click', '#peiwm-update-all-selected-btn', function(e) {
        e.preventDefault();
        updateAllSelectedMedia();
    });




    // -- Advanced Options Toggle ----------------------------------------------
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

    // -- PRO inline row click → show toast (only for locked rows) -------------
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

    // -- Toast close button ----------------------------------------------------
    $(document).on('click', '.peiwm-pro-toast-close', function () {
        $(this).closest('.peiwm-pro-toast').removeClass('is-visible').fadeOut(200);
    });

    // -- Keyboard: Enter/Space on toggle --------------------------------------
    $(document).on('keydown', '.peiwm-advanced-toggle', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            $(this).trigger('click');
        }
    });

    // ── Post Tools: Tab Switching & Persistence ───────────────────────────────
    $(document).on('click', '.peiwm-pt-tab-btn', function (e) {
        var $btn = $(this);
        // If locked for PRO, open premium modal
        if ($btn.hasClass('peiwm-open-premium-modal') || $btn.hasClass('is-locked')) {
            e.preventDefault();
            if (typeof window.peiwmOpenPremiumModal === 'function') {
                window.peiwmOpenPremiumModal();
            }
            return;
        }

        e.preventDefault();
        var tabKey = $btn.data('tab');
        if (!tabKey) return;

        $('.peiwm-pt-tab-btn').removeClass('active');
        $btn.addClass('active');

        $('.peiwm-pt-tab-pane').removeClass('active').css('display', 'none');
        var $targetPane = $('#peiwm-pane-' + tabKey);
        if ($targetPane.length) {
            $targetPane.addClass('active').css('display', 'block');
        }

        try {
            localStorage.setItem('peiwm_active_post_tools_tab', tabKey);
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', '#tab-' + tabKey);
            }
        } catch (err) {}

        if (tabKey === 'post-diff' && $('#peiwm-diff-table-body tr').length === 0) {
            if (typeof peiwmLoadRecentPostsDiff === 'function') {
                peiwmLoadRecentPostsDiff();
            }
        }
    });

    // Auto-activate persisted Post Tools tab on initial load
    (function () {
        var hashTab = (window.location.hash || '').replace(/^#tab-|^#/, '');
        var savedTab = hashTab || (function () {
            try { return localStorage.getItem('peiwm_active_post_tools_tab'); } catch (e) { return ''; }
        })() || 'internal-links';

        var validTabs = ['internal-links', 'find-replace', 'post-compare', 'post-cleanup', 'missing-media', 'duplicate-detector', 'orphaned-posts', 'post-diff', 'seo-analysis', 'toolkit'];
        if (validTabs.indexOf(savedTab) === -1) {
            savedTab = 'internal-links';
        }

        var $targetBtn = $('.peiwm-pt-tab-btn[data-tab="' + savedTab + '"]');
        var $targetPane = $('#peiwm-pane-' + savedTab);

        if ($targetBtn.length && !$targetBtn.hasClass('peiwm-open-premium-modal') && !$targetBtn.hasClass('is-locked')) {
            $('.peiwm-pt-tab-btn').removeClass('active');
            $targetBtn.addClass('active');
            $('.peiwm-pt-tab-pane').removeClass('active').css('display', 'none');
            if ($targetPane.length) {
                $targetPane.addClass('active').css('display', 'block');
            }
        }

        if (savedTab === 'post-diff') {
            if (typeof peiwmLoadRecentPostsDiff === 'function') {
                peiwmLoadRecentPostsDiff();
            }
        }
    })();

    // Delegate clicks on any PRO lock badge inside tab buttons
    $(document).on('click', '.peiwm-pt-tab-btn .peiwm-pro-lock, .peiwm-pt-tab-btn .peiwm-pro-inline-badge', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.peiwmOpenPremiumModal === 'function') {
            window.peiwmOpenPremiumModal();
        }
    });

    // Ensure all clicks on locked overlays or locked sections open the premium modal
    $(document).on('click', '.peiwm-pro-upgrade-overlay, .peiwm-locked-section', function (e) {
        if (typeof peiwm_ajax !== 'undefined' && peiwm_ajax.is_pro_active) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.peiwmOpenPremiumModal === 'function') {
            window.peiwmOpenPremiumModal();
        }
    });

    // ── Post Tools: Internal Link Finder - Scan ──────────────────────────────
    var peiwmCurrentScanResults = [];

    // Helper: Escape HTML
    function peiwmEscapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Helper: Escape HTML Attribute
    function peiwmEscapeAttr(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Render scan results table
    function renderInternalLinksResults(data) {
        var items = data.items || [];
        var totalPosts = data.total_posts || 0;
        var totalLinks = data.total_links || 0;
        var searchUrl = data.search_url || '';

        $('#peiwm-il-summary-title').text('Found ' + totalLinks + ' occurrences across ' + totalPosts + ' post(s)');
        $('#peiwm-il-summary-desc').text('Searching for: "' + searchUrl + '"');

        var $tbody = $('#peiwm-il-table-body');
        $tbody.empty();

        // Reset selections
        $('#peiwm-il-select-all').prop('checked', false);
        $('#peiwm-il-replace-selected-btn').hide();
        $('#peiwm-il-selected-count').text('0');

        if (items.length === 0) {
            $tbody.html('<tr><td colspan="6" style="text-align: center; padding: 24px; color: #64748b;">No matching posts or links found.</td></tr>');
            return;
        }

        var regex = new RegExp('(' + searchUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');

        $.each(items, function (index, item) {
            var typeBadgeClass = 'peiwm-badge-post';
            if (item.post_type === 'page') typeBadgeClass = 'peiwm-badge-page';
            else if (item.post_type !== 'post') typeBadgeClass = 'peiwm-badge-cpt';

            var snippetsHtml = '';
            if (item.snippets && item.snippets.length > 0) {
                $.each(item.snippets, function (i, snippet) {
                    var safeSnippet = peiwmEscapeHtml(snippet);
                    var highlighted = safeSnippet.replace(regex, '<span class="peiwm-snippet-match">$1</span>');
                    snippetsHtml += '<div class="peiwm-snippet-item">' + highlighted + '</div>';
                });
            } else {
                snippetsHtml = '<span style="color: #94a3b8; font-size: 12px;">(No snippet available)</span>';
            }

            var actionsHtml = '<div class="peiwm-row-actions">';
            if (item.edit_url) {
                actionsHtml += '<a href="' + peiwmEscapeHtml(item.edit_url) + '" target="_blank" class="button button-small peiwm-btn-action peiwm-btn-action-edit" title="Edit in WordPress">' + peiwmEscapeHtml('Edit ↗') + '</a>';
            }
            if (item.view_url) {
                actionsHtml += '<a href="' + peiwmEscapeHtml(item.view_url) + '" target="_blank" class="button button-small peiwm-btn-action peiwm-btn-action-view" title="View on site">' + peiwmEscapeHtml('View ↗') + '</a>';
            }
            actionsHtml += '</div>';

            var rowHtml = '<tr class="peiwm-il-row" data-id="' + item.id + '" data-title="' + peiwmEscapeHtml((item.title || '').toLowerCase()) + '" data-type="' + peiwmEscapeHtml((item.post_type || '').toLowerCase()) + '">' +
                '<td class="peiwm-col-cb"><input type="checkbox" class="peiwm-il-cb" value="' + item.id + '" /></td>' +
                '<td class="peiwm-col-title"><strong>' + (item.edit_url ? '<a href="' + peiwmEscapeHtml(item.edit_url) + '" target="_blank">' + peiwmEscapeHtml(item.title) + '</a>' : peiwmEscapeHtml(item.title)) + '</strong><br><small style="color: #64748b;">ID: #' + item.id + ' &bull; ' + peiwmEscapeHtml(item.date) + '</small></td>' +
                '<td class="peiwm-col-type"><span class="peiwm-post-type-badge ' + typeBadgeClass + '">' + peiwmEscapeHtml(item.post_type) + '</span></td>' +
                '<td class="peiwm-col-matches"><span class="peiwm-link-count-badge">' + item.link_count + '</span></td>' +
                '<td class="peiwm-col-snippets">' + snippetsHtml + '</td>' +
                '<td class="peiwm-col-actions">' + actionsHtml + '</td>' +
                '</tr>';

            $tbody.append(rowHtml);
        });
    }

    // Select all / item checkbox listeners for Internal Links
    $(document).on('change', '#peiwm-il-select-all', function () {
        var isChecked = $(this).is(':checked');
        $('.peiwm-il-cb:visible').prop('checked', isChecked);
        updateIlSelectedState();
    });

    $(document).on('change', '.peiwm-il-cb', function () {
        var totalVisible = $('.peiwm-il-cb:visible').length;
        var checkedVisible = $('.peiwm-il-cb:visible:checked').length;
        $('#peiwm-il-select-all').prop('checked', totalVisible > 0 && totalVisible === checkedVisible);
        updateIlSelectedState();
    });

    function updateIlSelectedState() {
        var count = $('.peiwm-il-cb:checked').length;
        $('#peiwm-il-selected-count').text(count);
        if (count > 0) {
            $('#peiwm-il-replace-selected-btn').css('display', 'inline-flex');
        } else {
            $('#peiwm-il-replace-selected-btn').hide();
        }
    }

    $('#peiwm-il-scan-btn').on('click', function (e) {
        e.preventDefault();
        var oldUrl = $.trim($('#peiwm-il-old-url').val());
        if (!oldUrl) {
            showError(peiwm_ajax.strings && peiwm_ajax.strings.enter_old_url ? peiwm_ajax.strings.enter_old_url : 'Please enter the old domain or URL to scan.');
            $('#peiwm-il-old-url').focus();
            return;
        }

        var includePages = $('#peiwm-il-include-pages').is(':checked') ? 1 : 0;
        var $btn = $(this);
        var $progress = $('#peiwm-il-progress');
        var $progressText = $('#peiwm-il-progress-text');
        var $results = $('#peiwm-il-results');

        $btn.prop('disabled', true);
        $progressText.text(peiwm_ajax.strings && peiwm_ajax.strings.scanning ? peiwm_ajax.strings.scanning : 'Scanning posts...');
        $progress.slideDown(200);
        $results.hide();
        $('#peiwm-il-replace-btn').hide();
        $('#peiwm-il-replace-selected-btn').hide();

        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_scan_internal_links',
                nonce: peiwm_ajax.nonce,
                old_url: oldUrl,
                include_pages: includePages
            },
            success: function (response) {
                $progress.slideUp(200);
                $btn.prop('disabled', false);

                if (response.success && response.data) {
                    peiwmCurrentScanResults = response.data.items || [];
                    renderInternalLinksResults(response.data);
                    $results.slideDown(250);
                    if (peiwmCurrentScanResults.length > 0) {
                        $('#peiwm-il-replace-btn').css('display', 'inline-flex');
                        showToast('Scan complete: Found ' + (response.data.total_links || 0) + ' link(s) across ' + peiwmCurrentScanResults.length + ' post(s).', 'success');
                    } else {
                        showToast('No matching links found for "' + oldUrl + '".', 'warning');
                    }
                } else {
                    var msg = response.data && response.data.message ? response.data.message : ((peiwm_ajax.strings && peiwm_ajax.strings.error) || 'An error occurred during scanning.');
                    showError(msg);
                    showToast(msg, 'error');
                }
            },
            error: function (xhr, status, error) {
                $progress.slideUp(200);
                $btn.prop('disabled', false);
                var errText = ((peiwm_ajax.strings && peiwm_ajax.strings.error) || 'Error: ') + ' ' + error;
                showError(errText);
                showToast(errText, 'error');
            }
        });
    });

    // Filter table results dynamically
    $('#peiwm-il-search-filter').on('input keyup', function () {
        var query = $.trim($(this).val().toLowerCase());
        if (!query) {
            $('.peiwm-il-row').show();
            return;
        }

        $('.peiwm-il-row').each(function () {
            var $row = $(this);
            var title = $row.data('title') || '';
            var type = $row.data('type') || '';
            var text = $row.text().toLowerCase();

            if (title.indexOf(query) > -1 || type.indexOf(query) > -1 || text.indexOf(query) > -1) {
                $row.show();
            } else {
                $row.hide();
            }
        });
    });

    // Intercept clicking on Pro meta checkbox when Free
    $(document).on('click', '#peiwm-il-replace-meta', function (e) {
        if (typeof peiwm_ajax !== 'undefined' && !peiwm_ajax.is_pro_active) {
            e.preventDefault();
            $(this).prop('checked', false);
            if (typeof window.peiwmOpenPremiumModal === 'function') {
                window.peiwmOpenPremiumModal();
            }
        }
    });

    // ── Post Tools: Internal Link Finder - Pro Replacer (All) ──────────────────
    $('#peiwm-il-replace-btn').on('click', function (e) {
        e.preventDefault();
        var $btn = $(this);

        // Always check Pro status & locked state first - opens premium modal if Free
        if ((typeof peiwm_ajax !== 'undefined' && !peiwm_ajax.is_pro_active) || $btn.hasClass('peiwm-open-premium-modal') || $btn.hasClass('peiwm-locked-btn')) {
            e.stopPropagation();
            if (typeof window.peiwmOpenPremiumModal === 'function') {
                window.peiwmOpenPremiumModal();
            }
            return;
        }

        var oldUrl = $.trim($('#peiwm-il-old-url').val());
        var newUrl = $.trim($('#peiwm-il-new-url').val());

        if (!oldUrl || !newUrl) {
            showError(peiwm_ajax.strings && peiwm_ajax.strings.enter_both_urls ? peiwm_ajax.strings.enter_both_urls : 'Please enter both Old URL and New URL for replacement.');
            return;
        }

        if (oldUrl === newUrl) {
            showError('Old URL and New URL cannot be identical.');
            return;
        }

        var confirmMsg = peiwm_ajax.strings && peiwm_ajax.strings.confirm_replace ? peiwm_ajax.strings.confirm_replace : 'Are you sure you want to replace links across all matching posts? We recommend having a database backup.';

        showConfirmation('Confirm Link Replacement', confirmMsg).then(function () {
            var replaceMeta = $('#peiwm-il-replace-meta').is(':checked') ? 1 : 0;
            var postIds = [];
            if (peiwmCurrentScanResults && peiwmCurrentScanResults.length > 0) {
                $.each(peiwmCurrentScanResults, function (idx, item) {
                    if (item.id) postIds.push(item.id);
                });
            }

            var $progress = $('#peiwm-il-progress');
            var $progressText = $('#peiwm-il-progress-text');

            $btn.prop('disabled', true);
            $progressText.text(peiwm_ajax.strings && peiwm_ajax.strings.replacing ? peiwm_ajax.strings.replacing : 'Replacing internal links...');
            $progress.slideDown(200);

            $.ajax({
                url: peiwm_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'peiwm_replace_internal_links',
                    nonce: peiwm_ajax.nonce,
                    old_url: oldUrl,
                    new_url: newUrl,
                    replace_meta: replaceMeta,
                    post_ids: postIds
                },
                success: function (response) {
                    $progress.slideUp(200);
                    $btn.prop('disabled', false);

                    if (response.success && response.data) {
                        var data = response.data;
                        var msg = 'Done! Successfully replaced ' + (data.total_replacements || 0) + ' link occurrence(s) across ' + (data.updated_posts || 0) + ' post(s).';
                        showSuccess(msg);
                        showToast(msg, 'success');
                        // Automatically re-trigger scan to reflect clean state
                        setTimeout(function () {
                            $('#peiwm-il-scan-btn').trigger('click');
                        }, 300);
                    } else {
                        var errMsg = response.data && response.data.message ? response.data.message : ((peiwm_ajax.strings && peiwm_ajax.strings.error) || 'Replacement failed.');
                        showError(errMsg);
                        showToast(errMsg, 'error');
                    }
                },
                error: function (xhr, status, error) {
                    $progress.slideUp(200);
                    $btn.prop('disabled', false);
                    var errText = ((peiwm_ajax.strings && peiwm_ajax.strings.error) || 'Error: ') + ' ' + error;
                    showError(errText);
                    showToast(errText, 'error');
                }
            });
        }).catch(function () {
            // User cancelled confirmation modal
        });
    });

    // ── Post Tools: Internal Link Finder - Pro Replacer (Selected Only) ────────
    $('#peiwm-il-replace-selected-btn').on('click', function (e) {
        e.preventDefault();
        var $btn = $(this);

        // Always check Pro status & locked state first - opens premium modal if Free
        if ((typeof peiwm_ajax !== 'undefined' && !peiwm_ajax.is_pro_active) || $btn.hasClass('peiwm-open-premium-modal') || $btn.hasClass('peiwm-locked-btn')) {
            e.stopPropagation();
            if (typeof window.peiwmOpenPremiumModal === 'function') {
                window.peiwmOpenPremiumModal();
            }
            return;
        }

        var selectedIds = [];
        $('.peiwm-il-cb:checked').each(function () {
            selectedIds.push($(this).val());
        });

        if (selectedIds.length === 0) {
            showError('Please select at least one post to replace links.');
            return;
        }

        var oldUrl = $.trim($('#peiwm-il-old-url').val());
        var newUrl = $.trim($('#peiwm-il-new-url').val());

        if (!oldUrl || !newUrl) {
            showError(peiwm_ajax.strings && peiwm_ajax.strings.enter_both_urls ? peiwm_ajax.strings.enter_both_urls : 'Please enter both Old URL and New URL for replacement.');
            return;
        }

        if (oldUrl === newUrl) {
            showError('Old URL and New URL cannot be identical.');
            return;
        }

        var confirmMsg = 'Are you sure you want to replace links across the ' + selectedIds.length + ' selected post(s)? We recommend having a database backup.';

        showConfirmation('Confirm Selected Link Replacement', confirmMsg).then(function () {
            var replaceMeta = $('#peiwm-il-replace-meta').is(':checked') ? 1 : 0;
            var $progress = $('#peiwm-il-progress');
            var $progressText = $('#peiwm-il-progress-text');

            $btn.prop('disabled', true);
            $progressText.text('Replacing internal links in selected posts...');
            $progress.slideDown(200);

            $.ajax({
                url: peiwm_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'peiwm_replace_internal_links',
                    nonce: peiwm_ajax.nonce,
                    old_url: oldUrl,
                    new_url: newUrl,
                    replace_meta: replaceMeta,
                    post_ids: selectedIds
                },
                success: function (response) {
                    $progress.slideUp(200);
                    $btn.prop('disabled', false);

                    if (response.success && response.data) {
                        var data = response.data;
                        var msg = 'Done! Successfully replaced ' + (data.total_replacements || 0) + ' link occurrence(s) across ' + (data.updated_posts || 0) + ' selected post(s).';
                        showSuccess(msg);
                        showToast(msg, 'success');
                        setTimeout(function () {
                            $('#peiwm-il-scan-btn').trigger('click');
                        }, 300);
                    } else {
                        var errMsg = response.data && response.data.message ? response.data.message : 'Replacement failed.';
                        showError(errMsg);
                        showToast(errMsg, 'error');
                    }
                },
                error: function (xhr, status, error) {
                    $progress.slideUp(200);
                    $btn.prop('disabled', false);
                    showError('Error: ' + error);
                    showToast('Error: ' + error, 'error');
                }
            });
        }).catch(function () {
            // User cancelled confirmation modal
        });
    });

    // ── Post Tools: Post Compare ─────────────────────────────────────────────
    function setupPostPicker(searchId, dropdownId, hiddenId, selectedWrapId, labelId, clearBtnId) {
        var timer = null;
        var $search = $(searchId);
        var $dropdown = $(dropdownId);
        var $hidden = $(hiddenId);
        var $selectedWrap = $(selectedWrapId);
        var $label = $(labelId);

        $search.on('input keyup', function () {
            clearTimeout(timer);
            var q = $.trim($(this).val());
            if (q.length < 2 && !/^\d+$/.test(q)) {
                $dropdown.hide().empty();
                return;
            }

            timer = setTimeout(function () {
                $.ajax({
                    url: peiwm_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'peiwm_search_posts_compare',
                        nonce: peiwm_ajax.nonce,
                        query: q
                    },
                    success: function (res) {
                        if (res.success && res.data && res.data.length > 0) {
                            var html = '';
                            $.each(res.data, function (i, item) {
                                html += '<div class="peiwm-pc-item" data-id="' + item.id + '" data-title="' + peiwmEscapeHtml(item.title) + '" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: 13px;">' +
                                    '<strong>#' + item.id + '</strong> &bull; ' + peiwmEscapeHtml(item.title) +
                                    ' <small style="color: #64748b;">(' + peiwmEscapeHtml(item.type) + ' / ' + peiwmEscapeHtml(item.status) + ')</small>' +
                                    '</div>';
                            });
                            $dropdown.html(html).show();
                        } else {
                            $dropdown.html('<div style="padding: 10px 12px; color: #94a3b8; font-size: 12.5px;">No matching posts found.</div>').show();
                        }
                    }
                });
            }, 250);
        });

        // Click suggestion
        $dropdown.on('click', '.peiwm-pc-item', function () {
            var id = $(this).data('id');
            var title = $(this).data('title');
            $hidden.val(id);
            $label.text('#' + id + ': ' + title);
            $selectedWrap.css('display', 'flex');
            $search.val('').hide();
            $dropdown.hide().empty();
        });

        // Clear selection
        $(clearBtnId).on('click', function () {
            $hidden.val('');
            $selectedWrap.hide();
            $search.show().val('').focus();
        });

        // Close dropdown when clicking outside
        $(document).on('click', function (e) {
            if (!$(e.target).closest($search).length && !$(e.target).closest($dropdown).length) {
                $dropdown.hide();
            }
        });
    }

    setupPostPicker('#peiwm-pc-search-a', '#peiwm-pc-dropdown-a', '#peiwm-pc-id-a', '#peiwm-pc-selected-a', '#peiwm-pc-label-a', '#peiwm-pc-clear-a');
    setupPostPicker('#peiwm-pc-search-b', '#peiwm-pc-dropdown-b', '#peiwm-pc-id-b', '#peiwm-pc-selected-b', '#peiwm-pc-label-b', '#peiwm-pc-clear-b');

    // Programmatic selection helper for Post Compare
    function setPostCompareSelection(slot, id, title) {
        var s = (slot === 'b') ? 'b' : 'a';
        var $search = $('#peiwm-pc-search-' + s);
        var $dropdown = $('#peiwm-pc-dropdown-' + s);
        var $hidden = $('#peiwm-pc-id-' + s);
        var $selectedWrap = $('#peiwm-pc-selected-' + s);
        var $label = $('#peiwm-pc-label-' + s);

        if (!id) {
            $hidden.val('');
            $selectedWrap.hide();
            $label.empty();
            $search.val('').show();
            $dropdown.hide().empty();
            return;
        }

        $hidden.val(id);
        var displayTitle = title ? ('#' + id + ': ' + title) : ('#' + id);
        $label.text(displayTitle);
        $selectedWrap.css('display', 'flex');
        $search.val('').hide();
        $dropdown.hide().empty();
    }
    window.peiwmSetPostCompareSelection = setPostCompareSelection;

    // Hover effect for picker items
    $(document).on('mouseenter', '.peiwm-pc-item', function () {
        $(this).css('background', '#eff6ff');
    }).on('mouseleave', '.peiwm-pc-item', function () {
        $(this).css('background', '#fff');
    });

    // Compare button
    $('#peiwm-pc-btn').on('click', function (e) {
        e.preventDefault();
        var idA = $('#peiwm-pc-id-a').val();
        var idB = $('#peiwm-pc-id-b').val();

        if (!idA || !idB) {
            showError('Please select both Post A and Post B for comparison.');
            return;
        }

        var $btn = $(this);
        var $progress = $('#peiwm-pc-progress');
        var $results = $('#peiwm-pc-results');

        $btn.prop('disabled', true);
        $progress.slideDown(200);
        $results.hide();

        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_compare_posts',
                nonce: peiwm_ajax.nonce,
                post_a: idA,
                post_b: idB
            },
            success: function (response) {
                $progress.slideUp(200);
                $btn.prop('disabled', false);

                if (response.success && response.data) {
                    renderPostCompare(response.data);
                    $results.slideDown(250);
                } else {
                    var msg = response.data && response.data.message ? response.data.message : 'Comparison failed.';
                    showError(msg);
                }
            },
            error: function (xhr, status, error) {
                $progress.slideUp(200);
                $btn.prop('disabled', false);
                showError('Error: ' + error);
            }
        });
    });

    function renderPostCompare(data) {
        var a = data.post_a;
        var b = data.post_b;
        var diffs = data.differences || [];

        // Headers
        $('#peiwm-pc-th-a').html('<strong>' + peiwmEscapeHtml(a.title) + '</strong> <span class="peiwm-post-type-badge peiwm-badge-' + a.type + '">' + peiwmEscapeHtml(a.status) + '</span> ' + (a.edit_url ? '<a href="' + peiwmEscapeHtml(a.edit_url) + '" target="_blank" class="button button-small" style="font-size:11px; vertical-align: middle; min-width: 10px;">Edit ↗</a>' : ''));
        $('#peiwm-pc-th-b').html('<strong>' + peiwmEscapeHtml(b.title) + '</strong> <span class="peiwm-post-type-badge peiwm-badge-' + b.type + '">' + peiwmEscapeHtml(b.status) + '</span> ' + (b.edit_url ? '<a href="' + peiwmEscapeHtml(b.edit_url) + '" target="_blank" class="button button-small" style="font-size:11px; vertical-align: middle; min-width: 10px;">Edit ↗</a>' : ''));

        var rows = [
            { label: 'Post Title', key: 'title', valA: a.title, valB: b.title },
            { label: 'Post Slug', key: 'slug', valA: a.slug, valB: b.slug },
            { label: 'Post Status', key: 'status', valA: a.status, valB: b.status },
            { label: 'Post Type', key: 'type', valA: a.type, valB: b.type },
            { label: 'Author', key: 'author', valA: a.author, valB: b.author },
            { label: 'Published Date', key: 'date', valA: a.date, valB: b.date },
            { label: 'Categories', key: 'categories', valA: a.categories, valB: b.categories },
            { label: 'Tags', key: 'tags', valA: a.tags, valB: b.tags },
            { label: 'Word Count', key: 'word_count', valA: a.word_count + ' words (' + a.char_count + ' chars)', valB: b.word_count + ' words (' + b.char_count + ' chars)' },
            { 
                label: 'Featured Image', 
                key: 'featured_image', 
                valA: a.featured_image ? '<img src="' + peiwmEscapeHtml(a.featured_image) + '" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />' : '<span style="color:#94a3b8;">No Image</span>',
                valB: b.featured_image ? '<img src="' + peiwmEscapeHtml(b.featured_image) + '" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />' : '<span style="color:#94a3b8;">No Image</span>'
            }
        ];

        var $tbody = $('#peiwm-pc-table-body');
        $tbody.empty();

        $.each(rows, function (i, r) {
            var isDiff = diffs.indexOf(r.key) > -1;
            var rowBg = isDiff ? 'style="background: #fffbeb;"' : '';
            var indicator = isDiff ? ' <span style="font-size: 10px; background: #fef08a; color: #854d0e; padding: 2px 5px; border-radius: 3px; font-weight: 700; margin-left: 6px;">≠ Different</span>' : '';

            var tr = '<tr ' + rowBg + '>' +
                '<td><strong>' + peiwmEscapeHtml(r.label) + '</strong>' + indicator + '</td>' +
                '<td>' + (r.key === 'featured_image' ? r.valA : peiwmEscapeHtml(r.valA)) + '</td>' +
                '<td>' + (r.key === 'featured_image' ? r.valB : peiwmEscapeHtml(r.valB)) + '</td>' +
                '</tr>';
            $tbody.append(tr);
        });

        // If PRO: render Content Diff and Meta comparison
        if (data.is_pro && data.diff_content) {
            $('#peiwm-pc-content-diff-output').html(data.diff_content);
        }

        if (data.is_pro && data.meta_comparison && data.meta_comparison.length > 0) {
            var metaRows = '';
            $.each(data.meta_comparison, function (idx, m) {
                var statusColor = '#64748b';
                var statusBg = '#f1f5f9';
                if (m.status === 'added') { statusColor = '#166534'; statusBg = '#dcfce7'; }
                else if (m.status === 'removed') { statusColor = '#991b1b'; statusBg = '#fee2e2'; }
                else if (m.status === 'modified') { statusColor = '#854d0e'; statusBg = '#fef08a'; }

                metaRows += '<tr>' +
                    '<td style="font-family: monospace; font-weight: 600;">' + peiwmEscapeHtml(m.key) + '</td>' +
                    '<td><span style="display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: 700; border-radius: 4px; background: ' + statusBg + '; color: ' + statusColor + ';">' + peiwmEscapeHtml(m.status.toUpperCase()) + '</span></td>' +
                    '<td style="font-family: monospace; font-size: 12px; max-width: 250px; overflow-wrap: break-word;">' + (m.val_a !== null ? peiwmEscapeHtml(m.val_a) : '<em style="color:#94a3b8;">(not set)</em>') + '</td>' +
                    '<td style="font-family: monospace; font-size: 12px; max-width: 250px; overflow-wrap: break-word;">' + (m.val_b !== null ? peiwmEscapeHtml(m.val_b) : '<em style="color:#94a3b8;">(not set)</em>') + '</td>' +
                    '</tr>';
            });

            var metaHtml = '<table class="widefat fixed striped" style="margin-top: 10px;">' +
                '<thead><tr><th style="width: 28%;">Meta Key</th><th style="width: 14%;">Status</th><th style="width: 29%;">Post A Value</th><th style="width: 29%;">Post B Value</th></tr></thead>' +
                '<tbody>' + metaRows + '</tbody>' +
                '</table>';

            $('#peiwm-pc-meta-diff-output').html(metaHtml);
        }
    }

    // ── Post Tools: Post Cleanup Scanner & Health Check ──────────────────────
    var peiwmCleanupItems = [];

    $('#peiwm-cleanup-scan-btn').on('click', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var postTypes = [];
        $('.peiwm-cleanup-scope:checked').each(function () {
            postTypes.push($(this).val());
        });

        if (postTypes.length === 0) {
            showError('Please select at least one post type to scan.');
            return;
        }

        var $progress = $('#peiwm-cleanup-progress');
        var $metrics = $('#peiwm-cleanup-metrics');
        var $fixBar = $('#peiwm-cleanup-fix-bar');
        var $results = $('#peiwm-cleanup-results');

        $btn.prop('disabled', true);
        $progress.slideDown(200);
        $metrics.hide();
        $fixBar.hide();
        $results.hide();

        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_scan_post_cleanup',
                nonce: peiwm_ajax.nonce,
                post_types: postTypes
            },
            success: function (response) {
                $progress.slideUp(200);
                $btn.prop('disabled', false);

                if (response.success && response.data) {
                    var data = response.data;
                    var counts = data.counts || {};
                    peiwmCleanupItems = data.items || [];

                    // Update metrics
                    $('#peiwm-metric-total-posts').text(counts.total_posts || 0);
                    $('#peiwm-metric-missing-cats').text(counts.missing_categories || 0);
                    $('#peiwm-metric-missing-tags').text(counts.missing_tags || 0);
                    $('#peiwm-metric-dup-slugs').text(counts.duplicate_slugs || 0);
                    $('#peiwm-metric-broken-imgs').text(counts.broken_images || 0);

                    $metrics.css('display', 'grid').slideDown(250);

                    if (peiwmCleanupItems.length > 0) {
                        $fixBar.css('display', 'flex').slideDown(250);
                    }

                    renderCleanupResults(peiwmCleanupItems);
                    $results.slideDown(250);
                    showToast('Health scan complete: ' + (counts.total_posts || 0) + ' post(s) analyzed.', 'success');
                } else {
                    var msg = response.data && response.data.message ? response.data.message : 'Health scan failed.';
                    showError(msg);
                    showToast(msg, 'error');
                }
            },
            error: function (xhr, status, error) {
                $progress.slideUp(200);
                $btn.prop('disabled', false);
                showError('Scan error: ' + error);
                showToast('Scan error: ' + error, 'error');
            }
        });
    });

    function renderCleanupResults(items) {
        var $tbody = $('#peiwm-cleanup-table-body');
        $tbody.empty();

        $('#peiwm-cleanup-select-all').prop('checked', false);
        updateCleanupSelectedState();

        if (items.length === 0) {
            $tbody.html('<tr><td colspan="5" style="text-align: center; padding: 28px; color: #16a34a; font-weight: 600;">🎉 Great news! No health or integrity issues detected across scanned posts.</td></tr>');
            return;
        }

        $.each(items, function (idx, item) {
            var typeBadge = item.post_type === 'page' ? 'peiwm-badge-page' : 'peiwm-badge-post';
            var issueBadges = '<div class="peiwm-cleanup-issues-stack">';
            var issueTypes = [];

            $.each(item.issues, function (i, iss) {
                issueTypes.push(iss.type);
                var badgeBg = '#fef3c7';
                var badgeColor = '#92400e';
                if (iss.type === 'missing_category') { badgeBg = '#fee2e2'; badgeColor = '#991b1b'; }
                else if (iss.type === 'missing_tag') { badgeBg = '#dbeafe'; badgeColor = '#1e40af'; }
                else if (iss.type === 'duplicate_slug') { badgeBg = '#ede9fe'; badgeColor = '#5b21b6'; }
                else if (iss.type === 'broken_image') { badgeBg = '#fce7f3'; badgeColor = '#9d174d'; }

                var extraDetails = '';
                if (iss.type === 'broken_image' && iss.images && iss.images.length > 0) {
                    extraDetails += '<div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">';
                    $.each(iss.images, function (imgIdx, imgSrc) {
                        extraDetails += '<div class="peiwm-broken-img-line">' +
                            '<code class="peiwm-broken-img-src" title="' + peiwmEscapeHtml(imgSrc) + '">' + peiwmEscapeHtml(imgSrc || '(empty src)') + '</code>' +
                            '<button type="button" class="button button-small peiwm-btn-action peiwm-btn-action-replace peiwm-replace-single-img-btn" data-post-id="' + item.id + '" data-src="' + peiwmEscapeHtml(imgSrc) + '">Replace ↗</button>' +
                            '</div>';
                    });
                    extraDetails += '</div>';
                }

                issueBadges += '<div class="peiwm-cleanup-issue-badge" style="background: ' + badgeBg + '; color: ' + badgeColor + ';">' +
                    '<div><span>⚠ ' + peiwmEscapeHtml(iss.label) + ':</span> ' +
                    '<span style="font-weight: 400;">' + peiwmEscapeHtml(iss.description) + '</span></div>' +
                    extraDetails +
                    '</div>';
            });
            issueBadges += '</div>';

            var actionsHtml = '<div class="peiwm-row-actions">';
            if (issueTypes.indexOf('duplicate_slug') > -1) {
                actionsHtml += '<button type="button" class="button button-small peiwm-btn-action peiwm-btn-action-slug peiwm-cleanup-row-slug-btn" data-id="' + item.id + '" data-title="' + peiwmEscapeHtml(item.title) + '" data-slug="' + peiwmEscapeHtml(item.slug || '') + '" title="Edit and resolve slug for this post">📑 Edit Slug</button>';
            }
            if (issueTypes.indexOf('broken_image') > -1) {
                actionsHtml += '<button type="button" class="button button-small peiwm-btn-action peiwm-btn-action-replace peiwm-cleanup-row-replace-img-btn" data-id="' + item.id + '" title="Replace broken image via Media Library">🖼️ Replace</button>';
            }
            if (issueTypes.indexOf('missing_category') > -1) {
                actionsHtml += '<button type="button" class="button button-small peiwm-btn-action peiwm-btn-action-category peiwm-cleanup-row-cat-btn" data-id="' + item.id + '" data-title="' + peiwmEscapeHtml(item.title) + '" title="Assign Category to this post">📁 Assign Cat</button>';
            }
            if (issueTypes.indexOf('missing_tag') > -1) {
                actionsHtml += '<button type="button" class="button button-small peiwm-btn-action peiwm-btn-action-tag peiwm-cleanup-row-tag-btn" data-id="' + item.id + '" data-title="' + peiwmEscapeHtml(item.title) + '" title="Assign Tag(s) to this post">🏷️ Assign Tag</button>';
            }
            if (item.edit_url) {
                actionsHtml += '<a href="' + peiwmEscapeHtml(item.edit_url) + '" target="_blank" class="button button-small peiwm-btn-action peiwm-btn-action-edit">Edit ↗</a>';
            }
            if (item.view_url) {
                actionsHtml += '<a href="' + peiwmEscapeHtml(item.view_url) + '" target="_blank" class="button button-small peiwm-btn-action peiwm-btn-action-view">View ↗</a>';
            }
            actionsHtml += '</div>';

            var rowHtml = '<tr class="peiwm-cleanup-row" data-id="' + item.id + '" data-title="' + peiwmEscapeHtml((item.title || '').toLowerCase()) + '" data-slug="' + peiwmEscapeHtml(item.slug || '') + '" data-issues="' + issueTypes.join(' ') + '">' +
                '<td class="peiwm-col-cb"><input type="checkbox" class="peiwm-cleanup-cb" value="' + item.id + '" /></td>' +
                '<td class="peiwm-col-title"><strong>' + (item.edit_url ? '<a href="' + peiwmEscapeHtml(item.edit_url) + '" target="_blank">' + peiwmEscapeHtml(item.title) + '</a>' : peiwmEscapeHtml(item.title)) + '</strong><br><small style="color:#64748b;">ID: #' + item.id + ' &bull; ' + peiwmEscapeHtml(item.date) + '</small></td>' +
                '<td class="peiwm-col-type"><span class="peiwm-post-type-badge ' + typeBadge + '">' + peiwmEscapeHtml(item.post_type) + '</span></td>' +
                '<td class="peiwm-col-issues">' + issueBadges + '</td>' +
                '<td class="peiwm-col-actions">' + actionsHtml + '</td>' +
                '</tr>';

            $tbody.append(rowHtml);
        });
    }

    // Checkbox select all & change listeners for Post Cleanup
    $(document).on('change', '#peiwm-cleanup-select-all', function () {
        var isChecked = $(this).is(':checked');
        $('.peiwm-cleanup-cb:visible').prop('checked', isChecked);
        updateCleanupSelectedState();
    });

    $(document).on('change', '.peiwm-cleanup-cb', function () {
        var totalVisible = $('.peiwm-cleanup-cb:visible').length;
        var checkedVisible = $('.peiwm-cleanup-cb:visible:checked').length;
        $('#peiwm-cleanup-select-all').prop('checked', totalVisible > 0 && totalVisible === checkedVisible);
        updateCleanupSelectedState();
    });

    function updateCleanupSelectedState() {
        var checkedCount = $('.peiwm-cleanup-cb:checked').length;
        var suffix = checkedCount > 0 ? ' (' + checkedCount + ' selected)' : '';

        function updateBtnText($btn, prefix) {
            var $lock = $btn.find('.peiwm-pro-lock');
            if ($lock.length) {
                $btn.html(prefix + suffix + ' ').append($lock);
            } else {
                $btn.text(prefix + suffix);
            }
        }

        updateBtnText($('#peiwm-cleanup-fix-cats-btn'), '📁 Assign Default Category');
        updateBtnText($('#peiwm-cleanup-fix-tags-btn'), '🏷️ Assign Tags');
        updateBtnText($('#peiwm-cleanup-fix-slugs-btn'), '📑 Deduplicate Slugs');
        updateBtnText($('#peiwm-cleanup-fix-imgs-btn'), '🖼️ Clean Broken Images');
    }

    // Filter Buttons
    $(document).on('click', '.peiwm-cleanup-filter-btn', function () {
        var $btn = $(this);
        $('.peiwm-cleanup-filter-btn').removeClass('active');
        $btn.addClass('active');

        var filter = $btn.data('filter');
        if (filter === 'all') {
            $('.peiwm-cleanup-row').show();
        } else {
            $('.peiwm-cleanup-row').each(function () {
                var issues = $(this).data('issues') || '';
                if (issues.indexOf(filter) > -1) {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });
        }
    });

    // Search Filter
    $('#peiwm-cleanup-search-filter').on('input keyup', function () {
        var q = $.trim($(this).val().toLowerCase());
        if (!q) {
            $('.peiwm-cleanup-row').show();
            return;
        }
        $('.peiwm-cleanup-row').each(function () {
            var title = $(this).data('title') || '';
            var id = String($(this).data('id') || '');
            if (title.indexOf(q) > -1 || id.indexOf(q) > -1) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });

    // ── HEALTH & CLEANUP: Taxonomy (Category & Tag) Selection Modal & Media Library Replace ──
    var peiwmCategoriesCache = null;
    var peiwmTagsCache = null;
    var peiwmTargetTaxPostIds = [];
    var peiwmCurrentTaxTab = 'categories';

    function switchTaxModalTab(tab) {
        peiwmCurrentTaxTab = tab || 'categories';
        var $modal = $('#peiwm-assign-category-modal');

        $modal.find('.peiwm-tax-modal-tab-btn').removeClass('active').css({
            'color': '#64748b',
            'border-bottom-color': 'transparent'
        });
        $modal.find('.peiwm-tax-modal-tab-btn[data-tab="' + peiwmCurrentTaxTab + '"]').addClass('active').css({
            'color': (peiwmCurrentTaxTab === 'categories' ? '#b45309' : '#1d4ed8'),
            'border-bottom-color': (peiwmCurrentTaxTab === 'categories' ? '#d97706' : '#2563eb')
        });

        if (peiwmCurrentTaxTab === 'categories') {
            $('#peiwm-tax-modal-header-icon').text('📁');
            $('#peiwm-tax-modal-title').text('Select Category to Assign');
            $('#peiwm-tax-pane-categories').show();
            $('#peiwm-tax-pane-tags').hide();
            $('#peiwm-cat-modal-assign-btn').show();
            $('#peiwm-tag-modal-assign-btn').hide();
        } else {
            $('#peiwm-tax-modal-header-icon').text('🏷️');
            $('#peiwm-tax-modal-title').text('Select or Add Tag(s) to Assign');
            $('#peiwm-tax-pane-categories').hide();
            $('#peiwm-tax-pane-tags').show();
            $('#peiwm-cat-modal-assign-btn').hide();
            $('#peiwm-tag-modal-assign-btn').show();
            loadTags();
        }
    }

    function renderTagList(tags) {
        var $list = $('#peiwm-tag-modal-list');
        $list.empty();

        if (!tags || !tags.length) {
            $list.html('<div style="padding: 16px; text-align: center; color: #64748b;">No tags found. You can create new ones below.</div>').show();
            $('#peiwm-tag-modal-loading').hide();
            return;
        }

        $.each(tags, function (i, tag) {
            var row = $('<label class="peiwm-tag-item" data-name="' + peiwmEscapeHtml(tag.name.toLowerCase()) + '" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.15s;">' +
                '<span style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #1e293b;">' +
                '<input type="checkbox" name="peiwm_selected_tags[]" value="' + tag.id + '" style="margin: 0;" />' +
                '<span>' + peiwmEscapeHtml(tag.name) + '</span>' +
                '</span>' +
                '<span style="font-size: 11px; color: #94a3b8;">' + tag.count + ' post' + (tag.count === 1 ? '' : 's') + '</span>' +
                '</label>');

            $list.append(row);
        });

        $('#peiwm-tag-modal-loading').hide();
        $list.show();
    }

    function loadTags() {
        if (peiwmTagsCache) {
            renderTagList(peiwmTagsCache.tags);
            return;
        }

        $('#peiwm-tag-modal-loading').show();
        $('#peiwm-tag-modal-list').hide();

        var cfg = (typeof getAjaxConfig === 'function') ? getAjaxConfig() : peiwm_ajax;

        $.ajax({
            url: cfg.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_get_tags',
                nonce: cfg.nonce
            },
            success: function (res) {
                if (res.success && res.data) {
                    peiwmTagsCache = res.data;
                    renderTagList(res.data.tags);
                } else {
                    $('#peiwm-tag-modal-loading').html('<span style="color: #ef4444;">Failed to load tags.</span>');
                }
            },
            error: function (xhr, status, error) {
                $('#peiwm-tag-modal-loading').html('<span style="color: #ef4444;">Error loading tags: ' + peiwmEscapeHtml(error) + '</span>');
            }
        });
    }

    function openAssignCategoryModal(postIds, contextLabel, defaultTab) {
        if (!postIds || !postIds.length) {
            showError('No posts selected.');
            return;
        }

        peiwmTargetTaxPostIds = postIds;
        var $modal = $('#peiwm-assign-category-modal');
        var count = postIds.length;

        var descText = count === 1
            ? (contextLabel || ('Assigning to Post #' + postIds[0]))
            : 'Assigning to ' + count + ' post(s).';

        $('#peiwm-cat-modal-target-desc').html('<strong>Target:</strong> ' + peiwmEscapeHtml(descText));
        $('#peiwm-cat-modal-search').val('');
        $('#peiwm-tag-modal-search').val('');
        $('#peiwm-tag-modal-new-input').val('');

        if (!$modal.parent().is('body')) {
            $('body').append($modal);
        }
        $('body').addClass('peiwm-modal-open').css('overflow', 'hidden');
        $modal.addClass('peiwm-show').show();

        // Determine default tab
        var activeTab = defaultTab || 'categories';
        if (!defaultTab) {
            var hasCat = false;
            var hasTag = false;
            $.each(postIds, function (idx, pid) {
                var $row = $('.peiwm-cleanup-row[data-id="' + pid + '"]');
                if ($row.length) {
                    var iss = String($row.data('issues') || '');
                    if (iss.indexOf('missing_category') > -1) hasCat = true;
                    if (iss.indexOf('missing_tag') > -1) hasTag = true;
                }
            });
            if (hasTag && !hasCat) {
                activeTab = 'tags';
            }
        }

        switchTaxModalTab(activeTab);

        function renderCatList(cats, defaultId) {
            var $list = $('#peiwm-cat-modal-list');
            $list.empty();

            if (!cats || !cats.length) {
                $list.html('<div style="padding: 16px; text-align: center; color: #64748b;">No categories found.</div>').show();
                return;
            }

            $.each(cats, function (i, cat) {
                var isDef = cat.is_default;
                var defBadge = isDef ? ' <span style="font-size: 10px; background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 8px; font-weight: 600;">DEFAULT</span>' : '';
                var indent = cat.parent > 0 ? '&mdash; ' : '';

                var row = $('<label class="peiwm-cat-item" data-name="' + peiwmEscapeHtml(cat.name.toLowerCase()) + '" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.15s;">' +
                    '<span style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #1e293b;">' +
                    '<input type="radio" name="peiwm_selected_cat" value="' + cat.id + '" ' + (isDef ? 'checked' : '') + ' style="margin: 0;" />' +
                    '<span>' + indent + peiwmEscapeHtml(cat.name) + defBadge + '</span>' +
                    '</span>' +
                    '<span style="font-size: 11px; color: #94a3b8;">' + cat.count + ' post' + (cat.count === 1 ? '' : 's') + '</span>' +
                    '</label>');

                $list.append(row);
            });

            $('#peiwm-cat-modal-loading').hide();
            $list.show();
        }

        if (peiwmCategoriesCache) {
            renderCatList(peiwmCategoriesCache.categories, peiwmCategoriesCache.default_category_id);
        } else {
            $('#peiwm-cat-modal-loading').show();
            $('#peiwm-cat-modal-list').hide();

            var cfg = (typeof getAjaxConfig === 'function') ? getAjaxConfig() : peiwm_ajax;

            $.ajax({
                url: cfg.ajax_url,
                type: 'POST',
                data: {
                    action: 'peiwm_get_categories',
                    nonce: cfg.nonce
                },
                success: function (res) {
                    if (res.success && res.data) {
                        peiwmCategoriesCache = res.data;
                        renderCatList(res.data.categories, res.data.default_category_id);
                    } else {
                        $('#peiwm-cat-modal-loading').html('<span style="color: #ef4444;">Failed to load categories.</span>');
                    }
                },
                error: function (xhr, status, error) {
                    $('#peiwm-cat-modal-loading').html('<span style="color: #ef4444;">Error loading categories: ' + peiwmEscapeHtml(error) + '</span>');
                }
            });
        }
    }

    // Tab navigation click handler
    $(document).on('click', '.peiwm-tax-modal-tab-btn', function (e) {
        e.preventDefault();
        var tab = $(this).data('tab');
        switchTaxModalTab(tab);
    });

    // Three-dot button in toolbar
    $(document).on('click', '#peiwm-cleanup-choose-cat-btn', function (e) {
        e.preventDefault();
        var $checked = $('.peiwm-cleanup-cb:checked');
        var targetPostIds = [];
        var onlyTags = false;

        if ($checked.length > 0) {
            var hasCat = false;
            var hasTag = false;
            $checked.each(function () {
                var $row = $(this).closest('.peiwm-cleanup-row');
                var issues = String($row.data('issues') || '');
                if (issues.indexOf('missing_category') > -1) {
                    hasCat = true;
                    targetPostIds.push($(this).val());
                }
                if (issues.indexOf('missing_tag') > -1) {
                    hasTag = true;
                }
            });
            if (targetPostIds.length === 0) {
                $checked.each(function () {
                    targetPostIds.push($(this).val());
                });
                if (hasTag && !hasCat) {
                    onlyTags = true;
                }
            }
        } else {
            $('.peiwm-cleanup-row').each(function () {
                var issues = String($(this).data('issues') || '');
                if (issues.indexOf('missing_category') > -1) {
                    targetPostIds.push($(this).data('id'));
                }
            });
            if (targetPostIds.length === 0) {
                $('.peiwm-cleanup-row').each(function () {
                    var issues = String($(this).data('issues') || '');
                    if (issues.indexOf('missing_tag') > -1) {
                        targetPostIds.push($(this).data('id'));
                    }
                });
                if (targetPostIds.length > 0) {
                    onlyTags = true;
                } else {
                    showError('No posts with missing categories or tags found in current scan.');
                    return;
                }
            }
        }

        openAssignCategoryModal(targetPostIds, null, onlyTags ? 'tags' : 'categories');
    });

    // Toolbar Assign Tags button
    $(document).on('click', '#peiwm-cleanup-fix-tags-btn:not(.peiwm-locked-btn), #peiwm-cleanup-choose-tag-btn:not(.peiwm-locked-btn)', function (e) {
        e.preventDefault();
        var $checked = $('.peiwm-cleanup-cb:checked');
        var targetPostIds = [];

        if ($checked.length > 0) {
            $checked.each(function () {
                var $row = $(this).closest('.peiwm-cleanup-row');
                var issues = String($row.data('issues') || '');
                if (issues.indexOf('missing_tag') > -1) {
                    targetPostIds.push($(this).val());
                }
            });
            if (targetPostIds.length === 0) {
                $checked.each(function () {
                    targetPostIds.push($(this).val());
                });
            }
        } else {
            $('.peiwm-cleanup-row').each(function () {
                var issues = String($(this).data('issues') || '');
                if (issues.indexOf('missing_tag') > -1) {
                    targetPostIds.push($(this).data('id'));
                }
            });
            if (targetPostIds.length === 0) {
                showError('No posts with missing tags found in current scan.');
                return;
            }
        }

        openAssignCategoryModal(targetPostIds, null, 'tags');
    });

    // Row-level assign category button
    $(document).on('click', '.peiwm-cleanup-row-cat-btn', function (e) {
        e.preventDefault();
        var pid = $(this).data('id');
        var ptitle = $(this).data('title') || ('Post #' + pid);
        openAssignCategoryModal([pid], 'Assigning category to: ' + ptitle, 'categories');
    });

    // Row-level assign tag button
    $(document).on('click', '.peiwm-cleanup-row-tag-btn', function (e) {
        e.preventDefault();
        var pid = $(this).data('id');
        var ptitle = $(this).data('title') || ('Post #' + pid);
        openAssignCategoryModal([pid], 'Assigning tag(s) to: ' + ptitle, 'tags');
    });

    // Category modal search input
    $(document).on('input keyup', '#peiwm-cat-modal-search', function () {
        var q = $.trim($(this).val().toLowerCase());
        $('#peiwm-cat-modal-list .peiwm-cat-item').each(function () {
            var name = $(this).data('name') || '';
            if (!q || name.indexOf(q) > -1) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });

    // Tag modal search input
    $(document).on('input keyup', '#peiwm-tag-modal-search', function () {
        var q = $.trim($(this).val().toLowerCase());
        $('#peiwm-tag-modal-list .peiwm-tag-item').each(function () {
            var name = $(this).data('name') || '';
            if (!q || name.indexOf(q) > -1) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });

    // Category modal confirm assignment button
    $(document).on('click', '#peiwm-cat-modal-assign-btn', function (e) {
        e.preventDefault();
        var $selectedRadio = $('input[name="peiwm_selected_cat"]:checked');
        if (!$selectedRadio.length) {
            showError('Please select a category to assign.');
            return;
        }

        var catId = parseInt($selectedRadio.val(), 10);
        var append = $('#peiwm-cat-modal-append').is(':checked') ? 1 : 0;
        var $btn = $(this);
        var cfg = (typeof getAjaxConfig === 'function') ? getAjaxConfig() : peiwm_ajax;

        $btn.prop('disabled', true).text('Assigning...');

        $.ajax({
            url: cfg.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_fix_missing_categories',
                nonce: cfg.nonce,
                target_category: catId,
                append: append,
                post_ids: peiwmTargetTaxPostIds
            },
            success: function (res) {
                $btn.prop('disabled', false).text('Assign Category');
                $('#peiwm-assign-category-modal').removeClass('peiwm-show').hide();
                $('body').removeClass('peiwm-modal-open').css('overflow', '');

                if (res.success && res.data) {
                    showToast(res.data.message || 'Category assigned successfully.', 'success');
                    if (typeof window.peiwmShowSuccess === 'function') {
                        window.peiwmShowSuccess(res.data.message);
                    }
                    setTimeout(function () {
                        $('#peiwm-cleanup-scan-btn').trigger('click');
                    }, 300);
                } else {
                    var msg = res.data && res.data.message ? res.data.message : 'Category assignment failed.';
                    showError(msg);
                }
            },
            error: function (xhr, status, error) {
                $btn.prop('disabled', false).text('Assign Category');
                var handled = false;
                if (xhr && xhr.responseText) {
                    try {
                        var jsonStart = xhr.responseText.indexOf('{');
                        var jsonEnd = xhr.responseText.lastIndexOf('}');
                        if (jsonStart !== -1 && jsonEnd !== -1) {
                            var parsed = JSON.parse(xhr.responseText.substring(jsonStart, jsonEnd + 1));
                            if (parsed && parsed.success && parsed.data) {
                                $('#peiwm-assign-category-modal').removeClass('peiwm-show').hide();
                                $('body').removeClass('peiwm-modal-open').css('overflow', '');
                                showToast(parsed.data.message || 'Category assigned successfully.', 'success');
                                if (typeof window.peiwmShowSuccess === 'function') {
                                    window.peiwmShowSuccess(parsed.data.message);
                                }
                                setTimeout(function () {
                                    $('#peiwm-cleanup-scan-btn').trigger('click');
                                }, 300);
                                handled = true;
                            } else if (parsed && parsed.data && parsed.data.message) {
                                showError(parsed.data.message);
                                handled = true;
                            }
                        }
                    } catch (e) {}
                }
                if (!handled) {
                    showError('Error: ' + error);
                }
            }
        });
    });

    // Tag modal confirm assignment button
    $(document).on('click', '#peiwm-tag-modal-assign-btn', function (e) {
        e.preventDefault();
        var selectedTagIds = [];
        $('input[name="peiwm_selected_tags[]"]:checked').each(function () {
            selectedTagIds.push(parseInt($(this).val(), 10));
        });
        var newTags = $.trim($('#peiwm-tag-modal-new-input').val());

        if (selectedTagIds.length === 0 && !newTags) {
            showError('Please select at least one tag or enter a new tag.');
            return;
        }

        var append = $('#peiwm-tag-modal-append').is(':checked') ? 1 : 0;
        var $btn = $(this);
        var cfg = (typeof getAjaxConfig === 'function') ? getAjaxConfig() : peiwm_ajax;

        $btn.prop('disabled', true).text('Assigning...');

        $.ajax({
            url: cfg.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_fix_missing_tags',
                nonce: cfg.nonce,
                tag_ids: selectedTagIds,
                new_tags: newTags,
                append: append,
                post_ids: peiwmTargetTaxPostIds
            },
            success: function (res) {
                $btn.prop('disabled', false).text('Assign Tag(s)');
                $('#peiwm-assign-category-modal').removeClass('peiwm-show').hide();
                $('body').removeClass('peiwm-modal-open').css('overflow', '');

                if (res.success && res.data) {
                    showToast(res.data.message || 'Tags assigned successfully.', 'success');
                    if (typeof window.peiwmShowSuccess === 'function') {
                        window.peiwmShowSuccess(res.data.message);
                    }
                    peiwmTagsCache = null; // Invalidate cache so new tags appear
                    setTimeout(function () {
                        $('#peiwm-cleanup-scan-btn').trigger('click');
                    }, 300);
                } else {
                    var msg = res.data && res.data.message ? res.data.message : 'Tag assignment failed.';
                    showError(msg);
                }
            },
            error: function (xhr, status, error) {
                $btn.prop('disabled', false).text('Assign Tag(s)');
                var handled = false;
                if (xhr && xhr.responseText) {
                    try {
                        var jsonStart = xhr.responseText.indexOf('{');
                        var jsonEnd = xhr.responseText.lastIndexOf('}');
                        if (jsonStart !== -1 && jsonEnd !== -1) {
                            var parsed = JSON.parse(xhr.responseText.substring(jsonStart, jsonEnd + 1));
                            if (parsed && parsed.success && parsed.data) {
                                $('#peiwm-assign-category-modal').removeClass('peiwm-show').hide();
                                $('body').removeClass('peiwm-modal-open').css('overflow', '');
                                showToast(parsed.data.message || 'Tags assigned successfully.', 'success');
                                if (typeof window.peiwmShowSuccess === 'function') {
                                    window.peiwmShowSuccess(parsed.data.message);
                                }
                                peiwmTagsCache = null;
                                setTimeout(function () {
                                    $('#peiwm-cleanup-scan-btn').trigger('click');
                                }, 300);
                                handled = true;
                            } else if (parsed && parsed.data && parsed.data.message) {
                                showError(parsed.data.message);
                                handled = true;
                            }
                        }
                    } catch (e) {}
                }
                if (!handled) {
                    showError('Error: ' + error);
                }
            }
        });
    });

    // Close category assignment modal
    $(document).on('click', '#peiwm-cat-modal-close-btn, #peiwm-cat-modal-cancel-btn, #peiwm-assign-category-modal .peiwm-modal-close', function (e) {
        e.preventDefault();
        $('#peiwm-assign-category-modal').removeClass('peiwm-show').hide();
        $('body').removeClass('peiwm-modal-open').css('overflow', '');
    });

    $(document).on('click', '#peiwm-assign-category-modal', function (e) {
        if ($(e.target).is('#peiwm-assign-category-modal')) {
            $(this).removeClass('peiwm-show').hide();
            $('body').removeClass('peiwm-modal-open').css('overflow', '');
        }
    });

    $(document).on('keydown.peiwm-cat-modal', function (e) {
        if (e.key === 'Escape' && $('#peiwm-assign-category-modal').hasClass('peiwm-show')) {
            $('#peiwm-assign-category-modal').removeClass('peiwm-show').hide();
            $('body').removeClass('peiwm-modal-open').css('overflow', '');
        }
    });

    // Helper function to open WordPress media library and replace broken image
    function openMediaReplaceForPost(postId, oldSrc) {
        if (typeof wp === 'undefined' || !wp.media) {
            showError('WordPress Media Library is not available on this page.');
            return;
        }

        var titleText = oldSrc
            ? ('Replace Broken Image in Post #' + postId)
            : ('Select Replacement Image for Post #' + postId);

        var mediaFrame = wp.media({
            title: titleText,
            button: { text: 'Replace Image' },
            multiple: false,
            library: { type: 'image' }
        });

        mediaFrame.on('select', function () {
            var attachment = mediaFrame.state().get('selection').first().toJSON();
            var newUrl = attachment.url;
            var attId = attachment.id;
            var cfg = (typeof getAjaxConfig === 'function') ? getAjaxConfig() : peiwm_ajax;

            showToast('Replacing image in post #' + postId + '...', 'info', 2500);

            $.ajax({
                url: cfg.ajax_url,
                type: 'POST',
                data: {
                    action: 'peiwm_replace_broken_image',
                    nonce: cfg.nonce,
                    post_id: postId,
                    old_src: oldSrc || '',
                    new_url: newUrl,
                    attachment_id: attId
                },
                success: function (res) {
                    if (res.success && res.data) {
                        showToast(res.data.message || 'Image replaced successfully!', 'success');
                        if (typeof window.peiwmShowSuccess === 'function') {
                            window.peiwmShowSuccess(res.data.message);
                        }
                        setTimeout(function () {
                            $('#peiwm-cleanup-scan-btn').trigger('click');
                        }, 350);
                    } else {
                        var msg = res.data && res.data.message ? res.data.message : 'Failed to replace image.';
                        showError(msg);
                    }
                },
                error: function (xhr, status, error) {
                    showError('Replacement error: ' + error);
                }
            });
        });

        mediaFrame.open();
    }

    // Row-level replace image button (in Actions column)
    $(document).on('click', '.peiwm-cleanup-row-replace-img-btn', function (e) {
        e.preventDefault();
        var postId = $(this).data('id');
        openMediaReplaceForPost(postId, '');
    });

    // Single broken image replace button (next to specific detected broken URL)
    $(document).on('click', '.peiwm-replace-single-img-btn', function (e) {
        e.preventDefault();
        var postId = $(this).data('post-id');
        var oldSrc = $(this).data('src');
        openMediaReplaceForPost(postId, oldSrc);
    });

    // ── HEALTH & CLEANUP: Duplicate Slug Resolution Modal ──
    function openResolveDuplicateSlugsModal(postsToResolve) {
        if (!postsToResolve || !postsToResolve.length) {
            showError('No posts with duplicate or suffixed slugs selected.');
            return;
        }

        var $modal = $('#peiwm-resolve-slugs-modal');
        var $list = $('#peiwm-slug-modal-list');
        $list.empty();

        var count = postsToResolve.length;
        var descText = count === 1
            ? ('Resolving slug for: <strong>' + peiwmEscapeHtml(postsToResolve[0].title) + '</strong> (ID: #' + postsToResolve[0].id + ')')
            : ('Resolving slugs for ' + count + ' post(s). Customize each new slug below:');

        $('#peiwm-slug-modal-target-desc').html(descText);
        $('#peiwm-slug-modal-save-btn').text(count === 1 ? 'Update Slug' : ('Update ' + count + ' Slugs')).prop('disabled', false);

        $.each(postsToResolve, function (idx, p) {
            var currentSlug = p.slug || '';
            // Suggest cleaner slug (strip trailing duplicate numeric suffix like -2, -3)
            var cleanSuggestion = currentSlug ? currentSlug.replace(/-[0-9]+$/, '') : '';
            if (!cleanSuggestion && p.title) {
                cleanSuggestion = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            }

            var itemCard = $(
                '<div class="peiwm-slug-row-item" data-id="' + p.id + '" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">' +
                    '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px; flex-wrap: wrap;">' +
                        '<div style="font-size: 13px; font-weight: 600; color: #1e293b;">' +
                            '<span>' + peiwmEscapeHtml(p.title) + '</span> ' +
                            '<small style="color: #64748b; font-weight: 400;">(ID: #' + p.id + ')</small>' +
                        '</div>' +
                        '<div style="display: flex; align-items: center; gap: 6px; font-size: 12px;">' +
                            '<span style="color: #64748b;">Current Slug:</span>' +
                            '<code class="peiwm-current-slug-badge" style="background: #fee2e2; color: #991b1b; padding: 2px 7px; border-radius: 4px; font-weight: 600; font-size: 11.5px;">' + peiwmEscapeHtml(currentSlug || '(empty)') + '</code>' +
                        '</div>' +
                    '</div>' +
                    '<div style="display: flex; align-items: center; gap: 8px;">' +
                        '<div style="flex: 1; position: relative;">' +
                            '<input type="text" class="peiwm-new-slug-input regular-text" data-post-id="' + p.id + '" value="' + peiwmEscapeHtml(cleanSuggestion || currentSlug) + '" placeholder="Enter new unique slug" style="width: 100%; padding: 7px 12px; font-size: 13px; font-family: monospace; border: 1px solid #cbd5e1; border-radius: 6px;" />' +
                        '</div>' +
                        '<button type="button" class="button peiwm-btn-autoclean-slug" data-id="' + p.id + '" data-clean="' + peiwmEscapeHtml(cleanSuggestion) + '" title="Reset to auto-cleaned slug" style="font-size: 11.5px; height: 33px; line-height: 31px; padding: 0 10px; color: #475569;">' +
                            'Auto-clean' +
                        '</button>' +
                    '</div>' +
                '</div>'
            );

            $list.append(itemCard);
        });

        if (!$modal.parent().is('body')) {
            $('body').append($modal);
        }
        $('body').addClass('peiwm-modal-open').css('overflow', 'hidden');
        $modal.addClass('peiwm-show').show();
    }
    window.openResolveDuplicateSlugsModal = openResolveDuplicateSlugsModal;

    // Row-level Edit Slug button click
    $(document).on('click', '.peiwm-cleanup-row-slug-btn', function (e) {
        e.preventDefault();
        var pid = $(this).data('id');
        var ptitle = $(this).data('title') || ('Post #' + pid);
        var pslug = $(this).data('slug') || '';
        openResolveDuplicateSlugsModal([{
            id: pid,
            title: ptitle,
            slug: pslug
        }]);
    });

    // Auto-clean button click in modal
    $(document).on('click', '.peiwm-btn-autoclean-slug', function (e) {
        e.preventDefault();
        var pid = $(this).data('id');
        var cleanVal = $(this).data('clean') || '';
        $('.peiwm-new-slug-input[data-post-id="' + pid + '"]').val(cleanVal).focus();
    });

    // Toolbar Deduplicate Slugs button click
    $(document).on('click', '#peiwm-cleanup-fix-slugs-btn:not(.peiwm-locked-btn)', function (e) {
        e.preventDefault();
        var $checked = $('.peiwm-cleanup-cb:checked');
        var targetPosts = [];

        if ($checked.length > 0) {
            $checked.each(function () {
                var $row = $(this).closest('.peiwm-cleanup-row');
                var issues = String($row.data('issues') || '');
                if (issues.indexOf('duplicate_slug') > -1) {
                    targetPosts.push({
                        id: $(this).val(),
                        title: $row.find('.peiwm-col-title strong').text() || ('Post #' + $(this).val()),
                        slug: $row.data('slug') || ''
                    });
                }
            });
            if (targetPosts.length === 0) {
                $checked.each(function () {
                    var $row = $(this).closest('.peiwm-cleanup-row');
                    targetPosts.push({
                        id: $(this).val(),
                        title: $row.find('.peiwm-col-title strong').text() || ('Post #' + $(this).val()),
                        slug: $row.data('slug') || ''
                    });
                });
            }
        } else {
            $('.peiwm-cleanup-row').each(function () {
                var issues = String($(this).data('issues') || '');
                if (issues.indexOf('duplicate_slug') > -1) {
                    targetPosts.push({
                        id: $(this).data('id'),
                        title: $(this).find('.peiwm-col-title strong').text() || ('Post #' + $(this).data('id')),
                        slug: $(this).data('slug') || ''
                    });
                }
            });
            if (targetPosts.length === 0) {
                showError('No posts with duplicate or suffixed slugs found in current scan.');
                return;
            }
        }

        openResolveDuplicateSlugsModal(targetPosts);
    });

    // Save Slugs button in modal
    $(document).on('click', '#peiwm-slug-modal-save-btn', function (e) {
        e.preventDefault();
        var slugsMap = {};
        var postIds = [];

        $('.peiwm-new-slug-input').each(function () {
            var pid = $(this).data('post-id');
            var val = $.trim($(this).val());
            if (pid) {
                slugsMap[pid] = val;
                postIds.push(pid);
            }
        });

        if (!postIds.length) {
            showError('No posts to update.');
            return;
        }

        var $btn = $(this);
        var cfg = (typeof getAjaxConfig === 'function') ? getAjaxConfig() : peiwm_ajax;
        $btn.prop('disabled', true).text('Updating Slugs...');

        $.ajax({
            url: cfg.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_fix_duplicate_slugs',
                nonce: cfg.nonce,
                slugs: slugsMap,
                post_ids: postIds
            },
            success: function (res) {
                $btn.prop('disabled', false).text('Update Slugs');
                $('#peiwm-resolve-slugs-modal').removeClass('peiwm-show').hide();
                $('body').removeClass('peiwm-modal-open').css('overflow', '');

                if (res.success && res.data) {
                    showToast(res.data.message || 'Slugs updated successfully.', 'success');
                    if (typeof window.peiwmShowSuccess === 'function') {
                        window.peiwmShowSuccess(res.data.message);
                    }
                    setTimeout(function () {
                        $('#peiwm-cleanup-scan-btn').trigger('click');
                    }, 350);
                } else {
                    var msg = res.data && res.data.message ? res.data.message : 'Slug update failed.';
                    showError(msg);
                }
            },
            error: function (xhr, status, error) {
                $btn.prop('disabled', false).text('Update Slugs');
                showError('Slug update error: ' + error);
            }
        });
    });

    // Close modal handlers
    $(document).on('click', '#peiwm-resolve-slugs-modal .peiwm-modal-close, #peiwm-resolve-slugs-modal .button:contains("Cancel")', function (e) {
        e.preventDefault();
        $('#peiwm-resolve-slugs-modal').removeClass('peiwm-show').hide();
        $('body').removeClass('peiwm-modal-open').css('overflow', '');
    });

    $(document).on('click', '#peiwm-resolve-slugs-modal', function (e) {
        if ($(e.target).is('#peiwm-resolve-slugs-modal')) {
            $(this).removeClass('peiwm-show').hide();
            $('body').removeClass('peiwm-modal-open').css('overflow', '');
        }
    });

    $(document).on('keydown.peiwm-slug-modal', function (e) {
        if (e.key === 'Escape' && $('#peiwm-resolve-slugs-modal').hasClass('peiwm-show')) {
            $('#peiwm-resolve-slugs-modal').removeClass('peiwm-show').hide();
            $('body').removeClass('peiwm-modal-open').css('overflow', '');
        }
    });

    // Duplicate Post Detector (Free Scanner)
    window.peiwmCurrentDuplicateClusters = [];

    $('#peiwm-dd-scan-btn').on('click', function (e) {
        e.preventDefault();
        var criteria = $('#peiwm-dd-criteria').val();
        var postType = $('#peiwm-dd-post-type').val();

        var $btn = $(this);
        var $progress = $('#peiwm-dd-progress');
        var $metrics = $('#peiwm-dd-metrics');
        var $toolbar = $('#peiwm-dd-pro-toolbar');
        var $container = $('#peiwm-dd-clusters-container');
        var $empty = $('#peiwm-dd-empty');

        $btn.prop('disabled', true);
        $progress.slideDown(200);
        $metrics.hide();
        $toolbar.hide();
        $container.empty().hide();
        $empty.hide();

        $.ajax({
            url: peiwm_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_scan_duplicates',
                nonce: peiwm_ajax.nonce,
                criteria: criteria,
                post_type: postType
            },
            success: function (response) {
                $progress.slideUp(200);
                $btn.prop('disabled', false);

                if (response.success && response.data) {
                    var data = response.data;
                    window.peiwmCurrentDuplicateClusters = data.clusters || [];

                    $('#peiwm-metric-dd-clusters').text(data.total_clusters || 0);
                    $('#peiwm-metric-dd-redundant').text(data.total_duplicates || 0);

                    if (window.peiwmCurrentDuplicateClusters.length > 0) {
                        $metrics.css('display', 'grid').slideDown(250);
                        $toolbar.css('display', 'flex').slideDown(250);
                        renderDuplicateClusters(window.peiwmCurrentDuplicateClusters);
                        $container.slideDown(250);
                    } else {
                        $empty.slideDown(250);
                    }
                } else {
                    var msg = response.data && response.data.message ? response.data.message : 'Duplicate scan failed.';
                    showError(msg);
                }
            },
            error: function (xhr, status, error) {
                $progress.slideUp(200);
                $btn.prop('disabled', false);
                showError('Duplicate scan error: ' + error);
            }
        });
    });

    function renderDuplicateClusters(clusters) {
        var $container = $('#peiwm-dd-clusters-container');
        $container.empty();

        $.each(clusters, function (cIdx, cluster) {
            var criteriaLabel = 'Exact Title';
            if (cluster.criteria === 'slug') criteriaLabel = 'Exact Slug';
            else if (cluster.criteria === 'content') criteriaLabel = 'Exact Content Hash';

            var firstPost = (cluster.posts && cluster.posts.length > 0) ? cluster.posts[0] : null;
            var secondPost = (cluster.posts && cluster.posts.length > 1) ? cluster.posts[1] : null;
            var firstId = firstPost ? firstPost.id : '';
            var secondId = secondPost ? secondPost.id : '';
            var firstTitle = firstPost ? (firstPost.title || '') : '';
            var secondTitle = secondPost ? (secondPost.title || '') : '';

            var clusterHtml = '<div class="peiwm-section peiwm-dd-cluster-card" data-cluster-id="' + cluster.id + '" style="margin-bottom: 18px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff;">';
            clusterHtml += '<div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; gap: 10px;">';
            clusterHtml += '<div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">';
            clusterHtml += '<strong style="font-size: 14px; color: #1e293b;">Cluster #' + (cIdx + 1) + ': ' + peiwmEscapeHtml(cluster.match_value) + '</strong>';
            clusterHtml += '<span style="display: inline-block; padding: 2px 8px; border-radius: 12px; background: #fee2e2; color: #991b1b; font-size: 11.5px; font-weight: 600;">' + cluster.count + ' Duplicates</span>';
            clusterHtml += '<span style="display: inline-block; padding: 2px 8px; border-radius: 12px; background: #ede9fe; color: #5b21b6; font-size: 11.5px; font-weight: 600;">' + criteriaLabel + '</span>';
            clusterHtml += '</div>';

            clusterHtml += '<div style="display: flex; gap: 8px; align-items: center;">';
            if (firstId && secondId) {
                clusterHtml += '<button type="button" class="button button-small peiwm-dd-compare-cluster-btn" data-first-id="' + firstId + '" data-first-title="' + peiwmEscapeAttr(firstTitle) + '" data-second-id="' + secondId + '" data-second-title="' + peiwmEscapeAttr(secondTitle) + '">⚖️ Compare in Diff</button>';
            }
            clusterHtml += '<button type="button" class="button button-small peiwm-dd-trash-cluster-btn ' + (!peiwm_ajax.is_pro_active ? 'peiwm-locked-btn peiwm-open-premium-modal' : '') + '" data-cluster-id="' + cluster.id + '" style="color: #ef4444;">🗑️ Trash Duplicates ' + (!peiwm_ajax.is_pro_active ? '<span class="peiwm-pro-lock">🔒 PRO</span>' : '') + '</button>';
            clusterHtml += '</div>';
            clusterHtml += '</div>';

            clusterHtml += '<div class="peiwm-drag-scroll-wrap" style="overflow-x: auto; width: 100%;">';
            clusterHtml += '<table class="widefat fixed striped peiwm-table peiwm-dd-table">';
            clusterHtml += '<thead><tr>';
            clusterHtml += '<th class="peiwm-col-id">ID</th>';
            clusterHtml += '<th class="peiwm-col-title">Title</th>';
            clusterHtml += '<th class="peiwm-col-slug" style="width: 140px; min-width: 140px;">Slug</th>';
            clusterHtml += '<th class="peiwm-col-date" style="width: 150px; min-width: 150px;">Date & Age</th>';
            clusterHtml += '<th class="peiwm-col-status">Status</th>';
            clusterHtml += '<th class="peiwm-col-actions" style="text-align: right;">Action</th>';
            clusterHtml += '</tr></thead><tbody>';

            $.each(cluster.posts, function (pIdx, p) {
                var ageBadge = '';
                if (p.is_oldest) {
                    ageBadge = ' <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; background: #dcfce7; color: #166534; font-size: 10.5px; font-weight: 700;">Oldest (Original)</span>';
                } else if (p.is_newest) {
                    ageBadge = ' <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; background: #fef3c7; color: #92400e; font-size: 10.5px; font-weight: 700;">Newest</span>';
                }

                clusterHtml += '<tr class="peiwm-dd-row" data-post-id="' + p.id + '" data-post-title="' + peiwmEscapeAttr(p.title) + '">';
                clusterHtml += '<td class="peiwm-col-id">#' + p.id + '</td>';
                clusterHtml += '<td class="peiwm-col-title"><strong>' + (p.edit_url ? '<a href="' + peiwmEscapeHtml(p.edit_url) + '" target="_blank">' + peiwmEscapeHtml(p.title) + '</a>' : peiwmEscapeHtml(p.title)) + '</strong></td>';
                clusterHtml += '<td class="peiwm-col-slug"><code style="font-size: 11.5px; color: #475569;">' + peiwmEscapeHtml(p.slug) + '</code></td>';
                clusterHtml += '<td class="peiwm-col-date">' + peiwmEscapeHtml(p.date) + ageBadge + '</td>';
                clusterHtml += '<td class="peiwm-col-status"><span class="peiwm-status-badge">' + peiwmEscapeHtml(p.status) + '</span></td>';
                clusterHtml += '<td class="peiwm-col-actions"><div class="peiwm-row-actions">';
                if (!p.is_oldest && firstId && String(firstId) !== String(p.id)) {
                    clusterHtml += '<button type="button" class="button button-small peiwm-btn-action peiwm-dd-compare-cluster-btn" data-first-id="' + firstId + '" data-first-title="' + peiwmEscapeAttr(firstTitle) + '" data-second-id="' + p.id + '" data-second-title="' + peiwmEscapeAttr(p.title) + '" title="Compare this duplicate against original (# ' + firstId + ')">⚖️ Compare in Diff</button>';
                }
                if (p.edit_url) clusterHtml += '<a href="' + peiwmEscapeHtml(p.edit_url) + '" target="_blank" class="button button-small peiwm-btn-action peiwm-btn-action-edit">Edit ↗</a>';
                if (p.view_url) clusterHtml += '<a href="' + peiwmEscapeHtml(p.view_url) + '" target="_blank" class="button button-small peiwm-btn-action peiwm-btn-action-view">View ↗</a>';
                clusterHtml += '</div></td>';
                clusterHtml += '</tr>';
            });

            clusterHtml += '</tbody></table></div></div>';
            $container.append(clusterHtml);
        });
    }

    // Direct Compare from Duplicate Cluster
    $(document).on('click', '.peiwm-dd-compare-cluster-btn', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var firstId = $btn.attr('data-first-id') || $btn.data('first-id');
        var secondId = $btn.attr('data-second-id') || $btn.data('second-id');
        var firstTitle = $btn.attr('data-first-title') || $btn.data('first-title') || '';
        var secondTitle = $btn.attr('data-second-title') || $btn.data('second-title') || '';

        // Fallback: resolve titles from window.peiwmCurrentDuplicateClusters if missing
        if ((!firstTitle || !secondTitle) && window.peiwmCurrentDuplicateClusters && window.peiwmCurrentDuplicateClusters.length) {
            $.each(window.peiwmCurrentDuplicateClusters, function (idx, cl) {
                if (cl.posts && cl.posts.length) {
                    $.each(cl.posts, function (pIdx, p) {
                        if (String(p.id) === String(firstId) && !firstTitle) {
                            firstTitle = p.title || '';
                        }
                        if (String(p.id) === String(secondId) && !secondTitle) {
                            secondTitle = p.title || '';
                        }
                    });
                }
            });
        }

        if (!firstId || !secondId) {
            showError('Unable to identify both posts for comparison.');
            return;
        }

        // Switch to post-compare tab
        $('.peiwm-pt-tab-btn[data-tab="post-compare"]').trigger('click');

        // Set Post A and Post B selections
        setPostCompareSelection('a', firstId, firstTitle);
        setPostCompareSelection('b', secondId, secondTitle);

        // Auto trigger compare
        $('#peiwm-pc-btn').trigger('click');

        // Smoothly scroll to comparison pane
        var $pane = $('#peiwm-pane-post-compare');
        if ($pane.length) {
            $('html, body').animate({
                scrollTop: $pane.offset().top - 30
            }, 300);
        }
    });

    // ── TAB 8: POST DIFF & REVISIONS (FREE) ───────────────────────────────────
    var peiwmDiffCurrentPostId = null;
    var peiwmDiffVersions = [];
    var peiwmDiffSelectedVersionId = null;
    var peiwmDiffTargetPostTitle = '';
    var peiwmDiffSearchTimer = null;

    // Load recent posts with versions for Post Diff table
    function peiwmLoadRecentPostsDiff() {
        var $loading = $('#peiwm-diff-posts-loading');
        var $empty = $('#peiwm-diff-posts-empty');
        var $tbody = $('#peiwm-diff-table-body');
        var $badge = $('#peiwm-diff-total-badge');
        var searchVal = $.trim($('#peiwm-diff-search').val());
        var postTypeVal = $('#peiwm-diff-post-type').val();
        var cfg = (typeof getAjaxConfig === 'function') ? getAjaxConfig() : peiwm_ajax;

        $loading.show();
        $empty.hide();
        $tbody.empty();

        $.ajax({
            url: cfg.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_get_recent_posts_diff',
                nonce: cfg.nonce,
                search: searchVal,
                post_type: postTypeVal
            },
            success: function (res) {
                $loading.hide();
                if (res.success && res.data && res.data.posts && res.data.posts.length > 0) {
                    $badge.text('(' + res.data.total_posts + ' posts)');
                    $.each(res.data.posts, function (i, p) {
                        var isFirst = (i === 0 && !peiwmDiffCurrentPostId);
                        var rowClass = 'peiwm-diff-post-row' + (isFirst ? ' is-selected' : '');
                        var row = $('<tr class="' + rowClass + '" data-id="' + p.id + '" data-title="' + peiwmEscapeHtml(p.title) + '" data-type="' + p.post_type + '" data-edit="' + (p.edit_url || '') + '">' +
                            '<td class="peiwm-diff-col-id">#' + p.id + '</td>' +
                            '<td class="peiwm-diff-col-title">' +
                            '<div class="peiwm-diff-post-title">' + peiwmEscapeHtml(p.title) + '</div>' +
                            '<div class="peiwm-diff-post-date">' + peiwmEscapeHtml(p.modified) + '</div>' +
                            '</td>' +
                            '<td class="peiwm-diff-col-type"><span class="peiwm-status-badge" style="text-transform: capitalize;">' + peiwmEscapeHtml(p.post_type) + '</span></td>' +
                            '<td class="peiwm-diff-col-versions"><span class="peiwm-version-badge ' + (p.version_count > 1 ? 'is-current' : '') + '">' + p.version_count + ' Ver</span></td>' +
                            '<td class="peiwm-diff-col-actions"><button type="button" class="peiwm-btn-action peiwm-btn-action-view peiwm-diff-select-btn" title="' + peiwmEscapeHtml(p.title) + '">View ↗</button></td>' +
                            '</tr>');
                        $tbody.append(row);
                    });

                    // Auto-select first post if none selected yet
                    if (!peiwmDiffCurrentPostId && res.data.posts && res.data.posts.length > 0) {
                        var firstPost = res.data.posts[0];
                        peiwmSelectPostForDiff(firstPost.id, firstPost.title, firstPost.post_type, firstPost.edit_url);
                    }
                } else {
                    $badge.text('(0 posts)');
                    $empty.show();
                }
            },
            error: function (xhr, status, error) {
                $loading.hide();
                $empty.html('<span style="color: #ef4444;">Error loading posts: ' + peiwmEscapeHtml(error) + '</span>').show();
            }
        });
    }

    // Select post row and fetch up to 3 versions
    function peiwmSelectPostForDiff(postId, title, postType, editUrl) {
        peiwmDiffCurrentPostId = postId;
        peiwmDiffTargetPostTitle = title;

        $('#peiwm-diff-table-body tr').removeClass('is-selected');
        $('#peiwm-diff-table-body tr[data-id="' + postId + '"]').addClass('is-selected');

        $('#peiwm-diff-target-title').text(title || ('Post #' + postId));
        $('#peiwm-diff-target-type-badge').text(postType || 'post');
        if (editUrl) {
            $('#peiwm-diff-target-edit-link').attr('href', editUrl).show();
        } else {
            $('#peiwm-diff-target-edit-link').hide();
        }

        $('#peiwm-diff-placeholder').hide();
        $('#peiwm-diff-workspace').show();
        $('#peiwm-diff-output-wrap').hide();

        var $vContainer = $('#peiwm-diff-versions-container');
        $vContainer.html('<div style="padding: 16px; text-align: center; color: #64748b;"><div class="peiwm-loading-spinner" style="width: 18px; height: 18px; margin: 0 auto 6px;"></div>Loading versions...</div>');

        var cfg = (typeof getAjaxConfig === 'function') ? getAjaxConfig() : peiwm_ajax;

        $.ajax({
            url: cfg.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_get_post_versions',
                nonce: cfg.nonce,
                post_id: postId
            },
            success: function (res) {
                if (res.success && res.data && res.data.versions && res.data.versions.length > 0) {
                    peiwmDiffVersions = res.data.versions;
                    $vContainer.empty();

                    // Pick default version to compare/restore (first historical version if exists, else current)
                    var defaultTarget = peiwmDiffVersions.length > 1 ? peiwmDiffVersions[1].id : peiwmDiffVersions[0].id;
                    peiwmDiffSelectedVersionId = defaultTarget;

                    $.each(peiwmDiffVersions, function (i, v) {
                        var isChecked = (v.id === peiwmDiffSelectedVersionId);
                        var card = $('<label class="peiwm-version-card ' + (isChecked ? 'is-selected' : '') + '" data-version-id="' + v.id + '" data-is-current="' + (v.is_current ? '1' : '0') + '">' +
                            '<div style="display: flex; align-items: center; gap: 10px;">' +
                            '<input type="radio" name="peiwm_diff_version_radio" value="' + v.id + '" ' + (isChecked ? 'checked' : '') + ' style="margin: 0;" />' +
                            '<div>' +
                            '<span class="peiwm-version-badge ' + (v.is_current ? 'is-current' : '') + '">' + peiwmEscapeHtml(v.version_tag) + '</span>' +
                            (v.is_current ? '<strong style="font-size: 13px; color: #1e40af; margin-left: 6px;">Current</strong>' : '<span style="font-size: 12.5px; color: #334155; margin-left: 6px; font-weight: 500;">' + peiwmEscapeHtml(v.date_formatted) + '</span>') +
                            '</div>' +
                            '</div>' +
                            '<div style="font-size: 11.5px; color: #64748b;">' +
                            (v.author ? ('by ' + peiwmEscapeHtml(v.author) + ' ') : '') +
                            '(' + peiwmEscapeHtml(v.date_relative) + ')' +
                            '</div>' +
                            '</label>');
                        $vContainer.append(card);
                    });

                    // Check Pro status
                    var isProActive = Boolean(typeof peiwm_ajax !== 'undefined' && (peiwm_ajax.is_pro_active === true || peiwm_ajax.is_pro_active === '1' || peiwm_ajax.is_pro_active === 1));

                    // Disable restore button if only current version exists (in Pro mode)
                    if (peiwmDiffVersions.length <= 1) {
                        if (isProActive) {
                            $('#peiwm-diff-restore-btn').prop('disabled', true).css('opacity', '0.5');
                        }
                        $('#peiwm-diff-compare-btn').prop('disabled', true).css('opacity', '0.5');
                        $vContainer.append('<div style="font-size: 12px; color: #64748b; font-style: italic; margin-top: 4px;">Only 1 version exists. Previous versions will appear here when updates are made.</div>');
                    } else {
                        if (isProActive) {
                            $('#peiwm-diff-restore-btn').prop('disabled', false).css('opacity', '1');
                        }
                        $('#peiwm-diff-compare-btn').prop('disabled', false).css('opacity', '1');
                    }
                } else {
                    $vContainer.html('<div style="padding: 12px; color: #ef4444;">No version data found for this post.</div>');
                }
            },
            error: function (xhr, status, error) {
                $vContainer.html('<div style="padding: 12px; color: #ef4444;">Error loading versions: ' + peiwmEscapeHtml(error) + '</div>');
            }
        });
    }

    // Version Card selection change
    $(document).on('change', 'input[name="peiwm_diff_version_radio"]', function () {
        peiwmDiffSelectedVersionId = $(this).val();
        $('.peiwm-version-card').removeClass('is-selected');
        $(this).closest('.peiwm-version-card').addClass('is-selected');

        var isProActive = Boolean(typeof peiwm_ajax !== 'undefined' && (peiwm_ajax.is_pro_active === true || peiwm_ajax.is_pro_active === '1' || peiwm_ajax.is_pro_active === 1));
        var isCurrent = $(this).closest('.peiwm-version-card').data('is-current') == '1';
        if (isCurrent && peiwmDiffVersions.length > 1) {
            // Cannot restore current onto current (in Pro mode)
            if (isProActive) {
                $('#peiwm-diff-restore-btn').prop('disabled', true).css('opacity', '0.5');
            }
        } else if (peiwmDiffVersions.length > 1) {
            if (isProActive) {
                $('#peiwm-diff-restore-btn').prop('disabled', false).css('opacity', '1');
            }
        }
    });

    // Click on post row
    $(document).on('click', '.peiwm-diff-post-row', function (e) {
        if ($(e.target).is('a')) return;
        var pid = $(this).data('id');
        var title = $(this).data('title');
        var type = $(this).data('type');
        var edit = $(this).data('edit');
        peiwmSelectPostForDiff(pid, title, type, edit);
    });

    // Compare Versions button
    $('#peiwm-diff-compare-btn').on('click', function (e) {
        e.preventDefault();
        if (!peiwmDiffCurrentPostId || !peiwmDiffSelectedVersionId) return;

        var targetVersion = peiwmDiffSelectedVersionId;
        // If current is selected, compare with the first previous version
        var compareWith = 'current';
        if (targetVersion === 'current' && peiwmDiffVersions.length > 1) {
            targetVersion = peiwmDiffVersions[1].id;
        }

        var $loading = $('#peiwm-diff-compare-loading');
        var $wrap = $('#peiwm-diff-output-wrap');
        var cfg = (typeof getAjaxConfig === 'function') ? getAjaxConfig() : peiwm_ajax;

        $loading.show();
        $wrap.hide();

        $.ajax({
            url: cfg.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_compare_post_versions',
                nonce: cfg.nonce,
                post_id: peiwmDiffCurrentPostId,
                version_from: targetVersion,
                version_to: compareWith
            },
            success: function (res) {
                $loading.hide();
                if (res.success && res.data) {
                    var d = res.data;
                    $('#peiwm-diff-title-content').html(d.diff_title);
                    $('#peiwm-diff-content-container').html(d.diff_content);

                    if (d.has_excerpt_diff) {
                        $('#peiwm-diff-excerpt-content').html(d.diff_excerpt);
                        $('#peiwm-diff-excerpt-box').show();
                    } else {
                        $('#peiwm-diff-excerpt-box').hide();
                    }

                    var charLabel = d.char_diff >= 0 ? ('+' + d.char_diff + ' chars') : (d.char_diff + ' chars');
                    $('#peiwm-diff-stats-badge').text(charLabel);

                    $wrap.slideDown(200);
                } else {
                    var msg = (res.data && res.data.message) ? res.data.message : 'Comparison failed.';
                    showError(msg);
                }
            },
            error: function (xhr, status, error) {
                $loading.hide();
                showError('Comparison error: ' + error);
            }
        });
    });

    // Restore Version button (Opens modal confirmation if PRO, opens premium modal if Free)
    $('#peiwm-diff-restore-btn').on('click', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var isProActive = Boolean(typeof peiwm_ajax !== 'undefined' && (peiwm_ajax.is_pro_active === true || peiwm_ajax.is_pro_active === '1' || peiwm_ajax.is_pro_active === 1));

        // Free mode UI lock: opens premium upgrade modal
        if (!isProActive || $btn.hasClass('peiwm-open-premium-modal') || $btn.hasClass('peiwm-locked-btn')) {
            e.stopPropagation();
            if (typeof window.peiwmOpenPremiumModal === 'function') {
                window.peiwmOpenPremiumModal();
            }
            return;
        }

        if (!peiwmDiffCurrentPostId || !peiwmDiffSelectedVersionId) return;

        if (peiwmDiffSelectedVersionId === 'current') {
            showError('The selected version is already the Current version.');
            return;
        }

        // Find details of selected version
        var targetV = null;
        $.each(peiwmDiffVersions, function (i, v) {
            if (v.id === peiwmDiffSelectedVersionId) targetV = v;
        });

        var targetText = targetV
            ? (targetV.version_tag + ' (' + targetV.date_formatted + (targetV.author ? ' by ' + targetV.author : '') + ')')
            : 'selected version';

        var descHtml = '<strong>Target Post:</strong> ' + peiwmEscapeHtml(peiwmDiffTargetPostTitle) + ' (#' + peiwmDiffCurrentPostId + ')<br>' +
                       '<strong>Restore to:</strong> <span style="color: #b45309; font-weight: 700;">' + peiwmEscapeHtml(targetText) + '</span>';

        $('#peiwm-diff-restore-target-desc').html(descHtml);

        var $modal = $('#peiwm-diff-restore-modal');
        if (!$modal.parent().is('body')) {
            $('body').append($modal);
        }
        $('body').addClass('peiwm-modal-open').css('overflow', 'hidden');
        $modal.addClass('peiwm-show').show();
    });

    // Confirm Restore Version in Modal
    $(document).on('click', '#peiwm-diff-confirm-restore-btn', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var cfg = (typeof getAjaxConfig === 'function') ? getAjaxConfig() : peiwm_ajax;

        $btn.prop('disabled', true).text('Restoring...');

        $.ajax({
            url: cfg.ajax_url,
            type: 'POST',
            data: {
                action: 'peiwm_restore_post_version',
                nonce: cfg.nonce,
                post_id: peiwmDiffCurrentPostId,
                version_id: peiwmDiffSelectedVersionId
            },
            success: function (res) {
                $btn.prop('disabled', false).text('Yes, Restore Version');
                $('#peiwm-diff-restore-modal').removeClass('peiwm-show').hide();
                $('body').removeClass('peiwm-modal-open').css('overflow', '');

                if (res.success && res.data) {
                    showToast(res.data.message || 'Version restored successfully!', 'success');
                    if (typeof window.peiwmShowSuccess === 'function') {
                        window.peiwmShowSuccess(res.data.message);
                    }
                    // Reload versions and refresh list
                    peiwmSelectPostForDiff(peiwmDiffCurrentPostId, peiwmDiffTargetPostTitle, '', '');
                    peiwmLoadRecentPostsDiff();
                } else {
                    var msg = (res.data && res.data.message) ? res.data.message : 'Restore failed.';
                    showError(msg);
                }
            },
            error: function (xhr, status, error) {
                $btn.prop('disabled', false).text('Yes, Restore Version');
                showError('Restore error: ' + error);
            }
        });
    });

    // Close restore modal
    $(document).on('click', '#peiwm-diff-restore-close-btn, #peiwm-diff-restore-cancel-btn, #peiwm-diff-restore-modal .peiwm-modal-close', function (e) {
        e.preventDefault();
        $('#peiwm-diff-restore-modal').removeClass('peiwm-show').hide();
        $('body').removeClass('peiwm-modal-open').css('overflow', '');
    });

    $(document).on('click', '#peiwm-diff-restore-modal', function (e) {
        if ($(e.target).is('#peiwm-diff-restore-modal')) {
            $(this).removeClass('peiwm-show').hide();
            $('body').removeClass('peiwm-modal-open').css('overflow', '');
        }
    });

    // Filter changes
    $(document).on('change', '#peiwm-diff-post-type', function () {
        peiwmLoadRecentPostsDiff();
    });

    $(document).on('input keyup', '#peiwm-diff-search', function () {
        clearTimeout(peiwmDiffSearchTimer);
        peiwmDiffSearchTimer = setTimeout(function () {
            peiwmLoadRecentPostsDiff();
        }, 300);
    });

    $(document).on('click', '#peiwm-diff-refresh-btn', function (e) {
        e.preventDefault();
        peiwmLoadRecentPostsDiff();
    });

    // Delegate clicks on locked buttons in Free mode
    $(document).on('click', '.peiwm-locked-btn, .peiwm-open-premium-modal', function (e) {
        if (!peiwm_ajax.is_pro_active) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.peiwmOpenPremiumModal === 'function') {
                window.peiwmOpenPremiumModal();
            }
        }
    });

    // ── Horizontal Grab & Drag-to-Scroll for All Post Tools Tables ────────────
    function initGrabToScroll() {
        $(document).on('mousedown', '.peiwm-drag-scroll-wrap', function (e) {
            var $wrap = $(this);
            // Ignore if clicking on interactive elements
            if ($(e.target).closest('input, button, a, select, textarea, label, .button, .peiwm-pro-lock, .peiwm-pro-inline-badge').length) {
                return;
            }

            var wrapEl = this;
            if (wrapEl.scrollWidth <= wrapEl.clientWidth) {
                return;
            }

            var startX = e.pageX - $wrap.offset().left;
            var scrollLeft = $wrap.scrollLeft();
            var hasMoved = false;

            $wrap.addClass('is-dragging');

            function onMouseMove(moveEvent) {
                var x = moveEvent.pageX - $wrap.offset().left;
                var walk = (x - startX) * 1.5;
                if (Math.abs(walk) > 4) {
                    hasMoved = true;
                    moveEvent.preventDefault();
                }
                $wrap.scrollLeft(scrollLeft - walk);
            }

            function onMouseUp() {
                $wrap.removeClass('is-dragging');
                $(document).off('mousemove.peiwmDrag', onMouseMove);
                $(document).off('mouseup.peiwmDrag', onMouseUp);

                if (hasMoved) {
                    $wrap.one('click.peiwmPrevent', function (clickEvent) {
                        clickEvent.preventDefault();
                        clickEvent.stopPropagation();
                    });
                }
            }

            $(document).on('mousemove.peiwmDrag', onMouseMove);
            $(document).on('mouseup.peiwmDrag', onMouseUp);
        });
    }
    initGrabToScroll();
    
});

// Global tab switching functions for New-UI design
window.switchTab = function(group, name) {
    // Update the buttons
    var tabs = document.querySelectorAll('.tabs[data-group="' + group + '"] .tab-btn');
    tabs.forEach(function(b) {
        b.classList.remove('active');
        if (b.getAttribute('onclick') && b.getAttribute('onclick').includes("'" + name + "'")) {
            b.classList.add('active');
        }
    });

    // Hide ALL potential panels for this group
    // Case A: Global panels where data-panel="group-name"
    document.querySelectorAll('.tab-panel[data-panel^="' + group + '-"]').forEach(function(p) {
        p.classList.remove('active');
    });
    
    // Case B: Local panels where data-group is set
    document.querySelectorAll('.tab-panel[data-group="' + group + '"]').forEach(function(p) {
        p.classList.remove('active');
    });

    // Show the target panel
    // Try data-group match first
    var targetPanel = document.querySelector('.tab-panel[data-group="' + group + '"][data-panel="' + name + '"]');
    
    // Fallback for global tabs if needed
    if (!targetPanel) {
        targetPanel = document.querySelector('.tab-panel[data-panel="' + group + '-' + name + '"]');
    }
    
    if (targetPanel) {
        targetPanel.classList.add('active');
    }

    // Update journey steps state if they exist
    // Only update steps that belong to the current journey group, avoiding cross-contamination
    var steps = document.querySelectorAll('.journey .step');
    if (steps.length > 0) {
        // First check if any steps in this journey even match this group
        var hasGroupSteps = Array.from(steps).some(s => s.getAttribute('onclick') && s.getAttribute('onclick').includes("'" + group + "'"));
        
        if (hasGroupSteps) {
            var foundActive = false;
            steps.forEach(function(s) {
                s.classList.remove('active', 'done');
                if (s.getAttribute('onclick') && s.getAttribute('onclick').includes("'" + group + "'") && s.getAttribute('onclick').includes("'" + name + "'")) {
                    s.classList.add('active');
                    foundActive = true;
                } else if (!foundActive) {
                    s.classList.add('done');
                }
            });
        }
    }
};

window.switchTabByGroup = function(group, name) {
    window.switchTab(group, name);
    var mainPage = document.getElementById('peiwm-main-content');
    if (mainPage) {
        mainPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.peiwmSwitchJourneyMode = function(mode) {
    if (mode === 1) {
        var btn1 = document.getElementById('peiwm-btn-mode-1');
        var btn2 = document.getElementById('peiwm-btn-mode-2');
        if(btn1) btn1.classList.add('active');
        if(btn2) btn2.classList.remove('active');
        
        var desc1 = document.getElementById('peiwm-journey-desc-1');
        var desc2 = document.getElementById('peiwm-journey-desc-2');
        if(desc1) desc1.style.display = 'block';
        if(desc2) desc2.style.display = 'none';
        
        var steps1 = document.getElementById('peiwm-journey-steps-1');
        var steps2 = document.getElementById('peiwm-journey-steps-2');
        if(steps1) steps1.style.display = 'grid';
        if(steps2) steps2.style.display = 'none';
        
        // Reset to first step of mode 1
        if (window.switchTabByGroup) window.switchTabByGroup('media','export');
    } else {
        var btn1 = document.getElementById('peiwm-btn-mode-1');
        var btn2 = document.getElementById('peiwm-btn-mode-2');
        if(btn2) btn2.classList.add('active');
        if(btn1) btn1.classList.remove('active');
        
        var desc1 = document.getElementById('peiwm-journey-desc-1');
        var desc2 = document.getElementById('peiwm-journey-desc-2');
        if(desc2) desc2.style.display = 'block';
        if(desc1) desc1.style.display = 'none';
        
        var steps1 = document.getElementById('peiwm-journey-steps-1');
        var steps2 = document.getElementById('peiwm-journey-steps-2');
        if(steps2) steps2.style.display = 'grid';
        if(steps1) steps1.style.display = 'none';
        
        // Reset to first step of mode 2
        if (window.switchTabByGroup) window.switchTabByGroup('posts','export');
    }
};

window.peiwmHighlightMagicOptions = function() {
    // Ensure the advanced panel is open
    const advancedToggle = document.querySelector('.peiwm-advanced-toggle[aria-controls="peiwm-advanced-import-posts"]');
    if (advancedToggle && !advancedToggle.classList.contains('is-open')) {
        advancedToggle.click();
    }
    
    // Highlight the specific checkbox
    const missingImagesCheckbox = document.getElementById('peiwm-download-missing-images');
    if (missingImagesCheckbox) {
        const label = missingImagesCheckbox.closest('label');
        if (label) {
            label.style.transition = 'all 0.5s ease';
            label.style.backgroundColor = '#f3e8ff';
            label.style.padding = '8px';
            label.style.borderRadius = '4px';
            label.style.border = '1px solid #c084fc';
            
            setTimeout(() => {
                label.style.backgroundColor = 'transparent';
                label.style.padding = '0';
                label.style.border = 'none';
            }, 3000);
        }
        
        // Ensure it is checked
        if (!missingImagesCheckbox.checked) {
            missingImagesCheckbox.checked = true;
        }
    }
};

window.peiwmToggleLearnMore = function(btn) {
    var details = btn.nextElementSibling;
    if (!details) return;

    var isHidden = details.hasAttribute('hidden');
    if (isHidden) {
        details.removeAttribute('hidden');
        btn.textContent = peiwmLearnMoreLabels.less;
        btn.setAttribute('aria-expanded', 'true');
    } else {
        details.setAttribute('hidden', '');
        btn.textContent = peiwmLearnMoreLabels.more;
        btn.setAttribute('aria-expanded', 'false');
    }
};

// Labels kept translatable — populate via wp_localize_script alongside your other i18n strings.
// Fallback if peiwmLearnMoreLabels isn't localized for some reason:
window.peiwmLearnMoreLabels = window.peiwmLearnMoreLabels || {
    more: 'Learn more',
    less: 'Show less'
};