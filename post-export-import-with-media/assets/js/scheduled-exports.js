jQuery(document).ready(function($) {
	'use strict';

	// Premium Modal handler for scheduled exports page
	
	/**
	 * Delete backup
	 */
	$(document).on('click', '.peiwm-delete-backup', function() {
		const $button = $(this);
		const filename = $button.data('filename');
		
		// Show delete confirmation modal
		showDeleteModal(filename).then(function() {
			// User confirmed - proceed with deletion
			$button.prop('disabled', true).text('Deleting...');

			$.ajax({
				url: peiwm_scheduled_exports.ajax_url,
				type: 'POST',
				data: {
					action: 'peiwm_delete_scheduled_backup',
					nonce: peiwm_scheduled_exports.nonce,
					filename: filename
				},
				success: function(response) {
					if (response.success) {
						$button.closest('.peiwm-backup-item').fadeOut(300, function() {
							$(this).remove();
							
							// Check if no backups left
							if ($('.peiwm-backup-item').length === 0) {
								loadBackups();
							}
						});
						showSuccess('Backup deleted successfully');
					} else {
						showError('Failed to delete backup: ' + response.data.message);
						$button.prop('disabled', false).text('Delete');
					}
				},
				error: function(xhr, status, error) {
					showError('Error deleting backup: ' + error);
					$button.prop('disabled', false).text('Delete');
				}
			});
		}).catch(function() {
			// User cancelled - do nothing
		});
	});

	/**
	 * Show delete confirmation modal
	 */
	function showDeleteModal(filename) {
		return new Promise(function(resolve, reject) {
			const modal = $('#peiwm-delete-modal');
			
			// Set filename in modal
			modal.find('.peiwm-modal-filename').text(filename);
			
			// Show modal
			modal.show().addClass('peiwm-show');
			
			// Handle confirm button
			$('#peiwm-delete-confirm').off('click').on('click', function() {
				hideModal('#peiwm-delete-modal');
				resolve();
			});
			
			// Handle cancel button
			$('#peiwm-delete-cancel').off('click').on('click', function() {
				hideModal('#peiwm-delete-modal');
				reject();
			});
			
			// Handle close button
			modal.find('.peiwm-modal-close').off('click').on('click', function() {
				hideModal('#peiwm-delete-modal');
				reject();
			});
			
			// Handle overlay click
			modal.off('click').on('click', function(e) {
				if (e.target === this) {
					hideModal('#peiwm-delete-modal');
					reject();
				}
			});
			
			// Handle escape key
			$(document).off('keydown.peiwm-modal').on('keydown.peiwm-modal', function(e) {
				if (e.key === 'Escape') {
					hideModal('#peiwm-delete-modal');
					reject();
				}
			});
		});
	}

	/**
	 * Hide modal
	 */
	function hideModal(modalId) {
		$(modalId).removeClass('peiwm-show').fadeOut(300);
		$(document).off('keydown.peiwm-modal');
	}

	/**
	 * Show success message
	 */
	function showSuccess(message) {
		showToast('success', message);
	}

	/**
	 * Show error message
	 */
	function showError(message) {
		showToast('error', message);
	}

	/**
	 * Show toast notification
	 */
	function showToast(type, message) {
		// Remove any existing toasts
		$('.peiwm-notification').remove();
		
		const toast = $('<div class="peiwm-notification peiwm-' + type + '">' + message + '</div>');
		$('body').append(toast);
		
		// Show toast
		setTimeout(function() {
			toast.addClass('peiwm-show');
		}, 100);
		
		// Auto-hide after 3 seconds
		setTimeout(function() {
			toast.removeClass('peiwm-show');
			setTimeout(function() {
				toast.remove();
			}, 300);
		}, 3000);
	}
});
