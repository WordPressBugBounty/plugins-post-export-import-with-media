/**
 * CPT & ACF Export/Import Page JavaScript
 *
 * Mirrors admin.js + admin-batch.js patterns exactly:
 * - Export: selective panel with load-more (300/batch-setting per page),
 *   chunked export splitting into multiple JSON files (postsPerFile),
 *   batch mode via PHP batch session
 * - Import: multi-file support, file tracker UI, per-post status gear modal,
 *   retry failed posts, regular sequential mode + batch concurrent mode
 *
 * Localized via `peiwm_cpt_acf` object:
 * {ajax_url, nonce, is_pro_active, batch_mode, batch_size, concurrent_requests,
 *  export_json_size, batch_delay, strings}
 *
 * @package Post_Export_Import_With_Media
 * @since   1.5.0
 */

( function ( $ ) {
	'use strict';

	var cfg   = window.peiwm_cpt_acf || {};
	var s     = cfg.strings || {};
	var isBatch = cfg.batch_mode === '1';

	// =========================================================================
	// UTILITY HELPERS
	// =========================================================================

	function updateProgress( $wrapper, pct, msg ) {
		$wrapper.show();
		$wrapper.find( '.peiwm-progress-fill' ).css( 'width', Math.min( pct, 100 ) + '%' );
		$wrapper.find( '.peiwm-progress-text' ).text( msg );
	}

	
	function cptSequentialImportPosts( posts, fileLabel, fileIndex, totalFiles, checkMedia, downloadMedia, onComplete ) {
		var $progress    = $( '#peiwm-cpt-import-progress' );
		var $fill        = $progress.find( '.peiwm-progress-fill' );
		var $text        = $progress.find( '.peiwm-progress-text' );
		var $log         = $progress.find( '.peiwm-log' );
		var totalPosts   = posts.length;
		var currentIndex = 0;
		var isProcessing = false;
		var failedPosts  = [];

		$progress.show();
		$fill.css( 'width', '0%' );
		$text.text( 'Starting import…' );
		$log.empty();

		function processNextPost() {
			if ( currentIndex >= totalPosts ) {
				$text.text( 'Import complete!' );
				if ( failedPosts.length > 0 ) {
					var failedCount = failedPosts.length;
					appendLog( $progress, '⚠ ' + failedCount + ' post(s) failed.', true );
					var $retryBtn = $( '<button type="button" class="button peiwm-retry-failed-btn" style="margin-top:0.75rem;background:#f97316;color:#fff;border-color:#f97316;">🔄 Retry ' + failedCount + ' failed post(s)</button>' );
					$log.after( $retryBtn );
					$retryBtn.on( 'click', function () {
						$retryBtn.remove();
						var retryData = failedPosts.splice( 0 );
						cptSequentialImportPosts( retryData, fileLabel, fileIndex, totalFiles, checkMedia, downloadMedia, onComplete );
					} );
					showSuccess( 'Import done! ' + totalPosts + ' processed. ' + failedCount + ' need retry.' );
					if ( typeof onComplete === 'function' ) { onComplete( failedCount ); }
				} else {
					appendLog( $progress, '✓ All posts processed successfully!' );
					showSuccess( 'CPT import completed! ' + totalPosts + ' posts processed.' );
					if ( typeof onComplete === 'function' ) { onComplete( 0 ); }
				}
				return;
			}

			if ( isProcessing ) { return; }
			isProcessing = true;

			var post           = posts[ currentIndex ];
			var fileLabel2     = totalFiles > 1 ? ' — File ' + fileIndex + '/' + totalFiles : '';

			appendLog( $progress, '📝 Processing: ' + ( post.post_title || '(no title)' ) );

			$.ajax( {
				url:     cfg.ajax_url,
				type:    'POST',
				timeout: 90000,
				data: {
					action:                  'peim_import_cpt_post',
					nonce:                   cfg.nonce,
					post_data:               JSON.stringify( post ),
					check_media_library:     checkMedia,
					download_missing_images: downloadMedia,
					force_status:            post._force_status || 'original',
				},
				success: function ( res ) {
					var title = post.post_title || '(no title)';
					if ( res.success ) {
						if ( res.data.status === 'skipped' ) {
							appendLog( $progress, '⚠ Skipped: ' + title + ' (' + ( res.data.message || '' ) + ')' );
						} else if ( res.data.status === 'updated' ) {
							appendLog( $progress, '🔄 Updated: ' + title + ' (' + ( res.data.message || '' ) + ')' );
						} else {
							appendLog( $progress, '✓ Imported: ' + title );
						}
					} else {
						failedPosts.push( post );
						appendLog( $progress, '✗ Failed: ' + title + ' — ' + ( res.data && res.data.message ? res.data.message : 'Error' ), true );
					}
				},
				error: function ( xhr, status ) {
					failedPosts.push( post );
					appendLog( $progress, '✗ ' + ( status === 'timeout' ? 'Timeout' : 'Error' ) + ': ' + ( post.post_title || '(no title)' ), true );
				},
				complete: function () {
					isProcessing = false;
					currentIndex++;
					var pct = Math.round( ( currentIndex / totalPosts ) * 100 );
					$fill.css( 'width', pct + '%' );
					$text.text( 'Processing: ' + currentIndex + ' of ' + totalPosts + ' posts (' + pct + '%)' + fileLabel2 );
					setTimeout( processNextPost, 500 );
				},
			} );
		}

		processNextPost();
	}

	// =========================================================================
	// IMPORT: BATCH MODE (mirrors batchImportPosts in admin-batch.js)
	// =========================================================================

	function cptBatchImportPosts( posts, fileLabel, fileIndex, totalFiles, checkMedia, downloadMedia, onComplete ) {
		var $progress    = $( '#peiwm-cpt-import-progress' );
		var $fill        = $progress.find( '.peiwm-progress-fill' );
		var $text        = $progress.find( '.peiwm-progress-text' );
		var $log         = $progress.find( '.peiwm-log' );

		$progress.show();
		$fill.css( 'width', '0%' );
		$log.empty();

		var batchSize          = cfg.batch_size          ? parseInt( cfg.batch_size, 10 )          : 20;
		var rawConcurrent      = cfg.concurrent_requests ? parseInt( cfg.concurrent_requests, 10 ) : 3;
		var concurrentRequests = Math.min( rawConcurrent, 3 ); // hard cap at 3 like admin-batch.js
		var batchDelay         = cfg.batch_delay         ? parseInt( cfg.batch_delay, 10 )         : 500;
		var totalPosts         = posts.length;
		var totalBatches       = Math.ceil( totalPosts / batchSize );
		var currentBatch       = 0;
		var processedCount     = 0;
		var failedPosts        = [];
		var completed          = false;
		var myGeneration       = ( window._peiwmCptBatchGen = ( window._peiwmCptBatchGen || 0 ) + 1 );
		var startTime          = Date.now();

		// Time-tracking info bar
		if ( ! $( '#peiwm-cpt-batch-time-info' ).length ) {
			$progress.find( '.peiwm-progress-bar' ).after( '<div id="peiwm-cpt-batch-time-info" style="margin-top:10px;padding:10px;background:#f0f6fc;border-radius:4px;font-size:13px;"></div>' );
		}
		var $timeInfo = $( '#peiwm-cpt-batch-time-info' );

		appendLog( $progress, '📦 Batch import: ' + totalPosts + ' posts in ' + totalBatches + ' batches' + ( totalFiles > 1 ? ' — File ' + fileIndex + '/' + totalFiles : '' ) );
		appendLog( $progress, '⚡ Processing ' + concurrentRequests + ' posts simultaneously' );
		$text.text( 'Starting batch import…' );

		function updateTimeInfo() {
			var elapsed    = Math.floor( ( Date.now() - startTime ) / 1000 );
			var elMin      = Math.floor( elapsed / 60 );
			var elSec      = elapsed % 60;
			var remaining  = processedCount > 0 ? Math.floor( ( elapsed / processedCount ) * ( totalPosts - processedCount ) ) : 0;
			var remMin     = Math.floor( remaining / 60 );
			var remSec     = remaining % 60;
			$timeInfo.html(
				'<strong>⏱️ Time:</strong> Elapsed: ' + elMin + 'm ' + elSec + 's' +
				( processedCount > 0 ? ' | Remaining: ~' + remMin + 'm ' + remSec + 's' : '' ) +
				' | <strong>📊 Status:</strong> ' + processedCount + ' of ' + totalPosts + ' posts completed' +
				' | <strong>🚀 Speed:</strong> ' + ( processedCount > 0 ? ( processedCount / ( elapsed || 1 ) ).toFixed( 1 ) : '0' ) + ' posts/sec'
			);
		}

		function processNextBatch() {
			if ( completed ) { return; }
			if ( currentBatch >= totalBatches ) {
				completed = true;
				$fill.css( 'width', '100%' );
				$text.text( 'Import complete!' );
				updateTimeInfo();
				appendLog( $progress, '✓ All batches imported successfully!' );

				if ( failedPosts.length > 0 ) {
					var failedCount = failedPosts.length;
					appendLog( $progress, '⚠ ' + failedCount + ' post(s) failed.', true );
					var $retryBtn = $( '<button type="button" class="button peiwm-retry-failed-btn" style="margin-top:0.75rem;background:#f97316;color:#fff;border-color:#f97316;">🔄 Retry ' + failedCount + ' failed post(s)</button>' );
					$log.after( $retryBtn );
					$retryBtn.on( 'click', function () {
						$retryBtn.remove();
						var retryData = failedPosts.splice( 0 );
						cptBatchImportPosts( retryData, fileLabel, fileIndex, totalFiles, checkMedia, downloadMedia, onComplete );
					} );
					showSuccess( 'Batch import done! ' + totalPosts + ' processed. ' + failedCount + ' need retry.' );
					if ( typeof onComplete === 'function' ) { onComplete( failedCount ); }
				} else {
					showSuccess( 'Batch import completed! ' + totalPosts + ' posts processed.' );
					if ( typeof onComplete === 'function' ) { onComplete( 0 ); }
				}
				return;
			}

			var startIdx   = currentBatch * batchSize;
			var endIdx     = Math.min( startIdx + batchSize, totalPosts );
			var batchPosts = posts.slice( startIdx, endIdx );
			var batchNum   = currentBatch + 1;

			appendLog( $progress, '📝 Processing batch ' + batchNum + '/' + totalBatches + ' (' + batchPosts.length + ' posts)...' );

			var batchProcessed = 0;
			var batchImported  = 0;
			var batchSkipped   = 0;
			var batchFailed    = 0;
			var batchDone      = false;
			var activeRequests = 0;
			var currentIndex   = 0;

			function processNextPost() {
				while ( activeRequests < concurrentRequests && currentIndex < batchPosts.length ) {
					var post = batchPosts[ currentIndex ];
					currentIndex++;
					activeRequests++;

					var requestFailed = false;

					$.ajax( {
						url:     cfg.ajax_url,
						type:    'POST',
						timeout: 60000,
						data: {
							action:                  'peim_import_cpt_post',
							nonce:                   cfg.nonce,
							post_data:               JSON.stringify( post ),
							check_media_library:     checkMedia,
							download_missing_images: downloadMedia,
							force_status:            post._force_status || 'original',
						},
						success: function ( res ) {
							var title = post.post_title || '(no title)';
							if ( res.success ) {
								if ( res.data.status === 'skipped' ) {
									batchSkipped++;
									appendLog( $progress, '  ⚠ Skipped: ' + title );
								} else if ( res.data.status === 'updated' ) {
									batchImported++;
									appendLog( $progress, '  🔄 Updated: ' + title );
								} else {
									batchImported++;
									appendLog( $progress, '  ✓ Imported: ' + title );
								}
							} else {
								requestFailed = true;
								batchFailed++;
								failedPosts.push( post );
								appendLog( $progress, '  ✗ Failed: ' + title, true );
							}
						},
						error: function ( xhr, status ) {
							requestFailed = true;
							batchFailed++;
							failedPosts.push( post );
							var errMsg = status === 'timeout' ? 'timeout (server busy)' : ( xhr.status === 502 ? '502 Bad Gateway' : status );
							appendLog( $progress, '  ✗ Error: ' + ( post.post_title || '(no title)' ) + ' — ' + errMsg, true );
						},
						complete: function () {
							if ( window._peiwmCptBatchGen !== myGeneration ) { return; }
							activeRequests--;
							batchProcessed++;

							var totalSoFar  = Math.min( processedCount + batchProcessed, totalPosts );
							var pct         = Math.round( ( totalSoFar / totalPosts ) * 100 );
							$fill.css( 'width', pct + '%' );
							$text.text( 'Processing: ' + totalSoFar + ' of ' + totalPosts + ' posts (' + pct + '%) — Batch ' + batchNum + '/' + totalBatches );
							updateTimeInfo();

							if ( batchProcessed >= batchPosts.length && ! batchDone ) {
								batchDone = true;
								appendLog( $progress, '✓ Batch ' + batchNum + ' complete: ' + batchImported + ' imported, ' + batchSkipped + ' skipped, ' + batchFailed + ' failed' );
								currentBatch++;
								processedCount += batchPosts.length;
								var delay = batchFailed > 0 ? Math.max( batchDelay, 1500 ) : batchDelay;
								setTimeout( processNextBatch, delay );
							} else if ( batchProcessed < batchPosts.length ) {
								processNextPost();
							}
						},
					} );
				}
			}

			processNextPost();
		}

		processNextBatch();
	}

} )( jQuery );
