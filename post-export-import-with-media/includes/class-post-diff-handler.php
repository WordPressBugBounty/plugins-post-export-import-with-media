<?php
/**
 * Post Diff & Version Revert Handler
 *
 * Provides version history tracking (up to 3 versions), visual side-by-side
 * diff comparison, and safe version restoration for posts and pages.
 *
 * @package Post_Export_Import_With_Media
 * @since 1.3.1
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class PEIWM_Post_Diff_Handler
 */
class PEIWM_Post_Diff_Handler {

	/**
	 * Singleton instance
	 *
	 * @var PEIWM_Post_Diff_Handler|null
	 */
	private static $instance = null;

	/**
	 * Meta key for storing snapshots
	 */
	const SNAPSHOT_META_KEY = '_peiwm_post_versions';

	/**
	 * Max versions to keep
	 */
	const MAX_VERSIONS = 3;

	/**
	 * Get singleton instance
	 *
	 * @return PEIWM_Post_Diff_Handler
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor
	 */
	private function __construct() {
		// Hook into post updates to save automatic snapshots
		add_action( 'post_updated', array( $this, 'on_post_updated' ), 10, 3 );

		// AJAX Endpoints
		add_action( 'wp_ajax_peiwm_get_recent_posts_diff', array( $this, 'ajax_get_recent_posts' ) );
		add_action( 'wp_ajax_peiwm_get_post_versions', array( $this, 'ajax_get_post_versions' ) );
		add_action( 'wp_ajax_peiwm_compare_post_versions', array( $this, 'ajax_compare_post_versions' ) );
		add_action( 'wp_ajax_peiwm_restore_post_version', array( $this, 'ajax_restore_post_version' ) );
	}

	/**
	 * Verify nonce helper supporting both free and pro nonces
	 *
	 * @return bool
	 */
	private function verify_nonce() {
		if ( check_ajax_referer( 'peiwm_secure_nonce', 'nonce', false ) ) {
			return true;
		}
		if ( check_ajax_referer( 'peiwm_pro_secure_nonce', 'nonce', false ) ) {
			return true;
		}
		return false;
	}

	/**
	 * Automatically capture previous state on post update
	 *
	 * @param int     $post_id Post ID.
	 * @param WP_Post $post_after Post after update.
	 * @param WP_Post $post_before Post before update.
	 */
	public function on_post_updated( $post_id, $post_after, $post_before ) {
		// Avoid revisions, autosaves, and non-valid objects
		if ( ! $post_before || ! $post_after || wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}

		// Only track public post types
		$post_type = get_post_type( $post_id );
		if ( ! in_array( $post_type, array( 'post', 'page' ), true ) && ! is_post_type_viewable( $post_type ) ) {
			return;
		}

		// Check if title, content, or excerpt actually changed
		if ( $post_after->post_title === $post_before->post_title &&
		     $post_after->post_content === $post_before->post_content &&
		     $post_after->post_excerpt === $post_before->post_excerpt ) {
			return;
		}

		$this->save_post_snapshot( $post_before );
	}

	/**
	 * Save snapshot of a post object in post meta
	 *
	 * @param WP_Post $post Post object.
	 */
	public function save_post_snapshot( $post ) {
		if ( ! $post || ! isset( $post->ID ) ) {
			return;
		}

		$snapshots = get_post_meta( $post->ID, self::SNAPSHOT_META_KEY, true );
		if ( ! is_array( $snapshots ) ) {
			$snapshots = array();
		}

		$new_snapshot = array(
			'id'        => 'snap_' . time() . '_' . wp_generate_password( 4, false ),
			'title'     => $post->post_title,
			'content'   => $post->post_content,
			'excerpt'   => $post->post_excerpt,
			'status'    => $post->post_status,
			'date'      => $post->post_modified,
			'author_id' => $post->post_author,
			'timestamp' => ! empty( $post->post_modified_gmt ) ? strtotime( $post->post_modified_gmt ) : current_time( 'timestamp' ),
		);

		// Prepend and keep at most 3 snapshots
		array_unshift( $snapshots, $new_snapshot );
		$snapshots = array_slice( $snapshots, 0, self::MAX_VERSIONS );

		update_post_meta( $post->ID, self::SNAPSHOT_META_KEY, $snapshots );
	}

	/**
	 * AJAX: Get recent posts with their available version counts
	 */
	public function ajax_get_recent_posts() {
		if ( ! $this->verify_nonce() ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Security check failed. Please refresh the page.', 'post-export-import-with-media' ) ), 403 );
		}

		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Permission denied.', 'post-export-import-with-media' ) ), 403 );
		}

		$search    = isset( $_POST['search'] ) ? sanitize_text_field( wp_unslash( $_POST['search'] ) ) : '';
		$post_type = isset( $_POST['post_type'] ) ? sanitize_text_field( wp_unslash( $_POST['post_type'] ) ) : 'any';
		$paged     = isset( $_POST['paged'] ) ? max( 1, intval( $_POST['paged'] ) ) : 1;
		$per_page  = 20;

		$args = array(
			'post_status'    => array( 'publish', 'draft', 'future', 'pending', 'private' ),
			'posts_per_page' => $per_page,
			'paged'          => $paged,
			'orderby'        => 'modified',
			'order'          => 'DESC',
		);

		if ( 'any' === $post_type || empty( $post_type ) ) {
			$args['post_type'] = array( 'post', 'page' );
		} else {
			$args['post_type'] = $post_type;
		}

		if ( ! empty( $search ) ) {
			if ( is_numeric( $search ) ) {
				$args['p'] = intval( $search );
			} else {
				$args['s'] = $search;
			}
		}

		$query = new WP_Query( $args );
		$posts = array();

		if ( $query->have_posts() ) {
			while ( $query->have_posts() ) {
				$query->the_post();
				$pid = get_the_ID();

				// Get versions count
				$versions = $this->get_post_versions_list( $pid );

				$posts[] = array(
					'id'            => $pid,
					'title'         => get_the_title( $pid ) ? get_the_title( $pid ) : esc_html__( '(Untitled)', 'post-export-import-with-media' ),
					'post_type'     => get_post_type( $pid ),
					'post_status'   => get_post_status( $pid ),
					'modified'      => get_post_modified_time( 'M j, Y h:i A', false, $pid ),
					'modified_raw'  => get_post_field( 'post_modified', $pid ),
					'edit_url'      => get_edit_post_link( $pid, 'raw' ),
					'view_url'      => get_permalink( $pid ),
					'version_count' => count( $versions ),
				);
			}
			wp_reset_postdata();
		}

		wp_send_json_success( array(
			'posts'       => $posts,
			'total_posts' => $query->found_posts,
			'total_pages' => $query->max_num_pages,
			'current_page'=> $paged,
		) );
	}

	/**
	 * AJAX: Get list of up to 3 versions for a single post
	 */
	public function ajax_get_post_versions() {
		if ( ! $this->verify_nonce() ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Security check failed.', 'post-export-import-with-media' ) ), 403 );
		}

		$post_id = isset( $_POST['post_id'] ) ? intval( $_POST['post_id'] ) : 0;
		if ( ! $post_id || ! current_user_can( 'edit_post', $post_id ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Invalid post or permission denied.', 'post-export-import-with-media' ) ), 400 );
		}

		$versions = $this->get_post_versions_list( $post_id );

		wp_send_json_success( array(
			'post_id'  => $post_id,
			'title'    => get_the_title( $post_id ) ? get_the_title( $post_id ) : esc_html__( '(Untitled)', 'post-export-import-with-media' ),
			'edit_url' => get_edit_post_link( $post_id, 'raw' ),
			'versions' => $versions,
		) );
	}

	/**
	 * Retrieve up to 3 versions for a given post
	 *
	 * @param int $post_id Post ID.
	 * @return array List of versions.
	 */
	public function get_post_versions_list( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return array();
		}

		$author_name = get_the_author_meta( 'display_name', $post->post_author );
		if ( empty( $author_name ) ) {
			$author_name = esc_html__( 'Unknown', 'post-export-import-with-media' );
		}

		// 1. Current state is always the latest (top version)
		$current_version = array(
			'id'             => 'current',
			'source'         => 'current',
			'is_current'     => true,
			'label'          => esc_html__( 'Current', 'post-export-import-with-media' ),
			'title'          => $post->post_title,
			'date_formatted' => get_post_modified_time( 'M j, Y h:i A', false, $post_id ),
			'date_relative'  => human_time_diff( get_post_modified_time( 'U', false, $post_id ), current_time( 'timestamp' ) ) . ' ' . esc_html__( 'ago', 'post-export-import-with-media' ),
			'author'         => $author_name,
			'timestamp'      => get_post_modified_time( 'U', false, $post_id ),
		);

		$historical = array();

		// 2. Fetch WordPress native revisions
		$wp_revisions = wp_get_post_revisions( $post_id, array(
			'posts_per_page' => 4,
			'order'          => 'DESC',
		) );

		if ( ! empty( $wp_revisions ) && is_array( $wp_revisions ) ) {
			foreach ( $wp_revisions as $rev ) {
				// Skip if identical modified time to current post
				if ( $rev->post_modified === $post->post_modified ) {
					continue;
				}

				$rev_author = get_the_author_meta( 'display_name', $rev->post_author );
				if ( empty( $rev_author ) ) {
					$rev_author = esc_html__( 'Unknown', 'post-export-import-with-media' );
				}

				$ts = ! empty( $rev->post_modified ) ? strtotime( $rev->post_modified ) : 0;

				$historical[] = array(
					'id'             => 'rev_' . $rev->ID,
					'revision_id'    => $rev->ID,
					'source'         => 'revision',
					'is_current'     => false,
					'title'          => $rev->post_title,
					'date_formatted' => date_i18n( 'M j, Y h:i A', $ts ),
					'date_relative'  => human_time_diff( $ts, current_time( 'timestamp' ) ) . ' ' . esc_html__( 'ago', 'post-export-import-with-media' ),
					'author'         => $rev_author,
					'timestamp'      => $ts,
				);
			}
		}

		// 3. Fetch snapshots from post meta if revisions are few or disabled
		$snapshots = get_post_meta( $post_id, self::SNAPSHOT_META_KEY, true );
		if ( ! empty( $snapshots ) && is_array( $snapshots ) ) {
			foreach ( $snapshots as $snap ) {
				$ts = isset( $snap['timestamp'] ) ? intval( $snap['timestamp'] ) : ( ! empty( $snap['date'] ) ? strtotime( $snap['date'] ) : 0 );

				// Avoid adding if same timestamp as an existing item
				$already_exists = false;
				foreach ( $historical as $h ) {
					if ( abs( $h['timestamp'] - $ts ) < 3 ) {
						$already_exists = true;
						break;
					}
				}

				if ( ! $already_exists ) {
					$snap_author = isset( $snap['author_id'] ) ? get_the_author_meta( 'display_name', $snap['author_id'] ) : $author_name;
					if ( empty( $snap_author ) ) {
						$snap_author = esc_html__( 'Unknown', 'post-export-import-with-media' );
					}

					$historical[] = array(
						'id'             => $snap['id'],
						'source'         => 'snapshot',
						'is_current'     => false,
						'title'          => $snap['title'],
						'date_formatted' => date_i18n( 'M j, Y h:i A', $ts ),
						'date_relative'  => human_time_diff( $ts, current_time( 'timestamp' ) ) . ' ' . esc_html__( 'ago', 'post-export-import-with-media' ),
						'author'         => $snap_author,
						'timestamp'      => $ts,
					);
				}
			}
		}

		// Sort historical descending by timestamp
		usort( $historical, function ( $a, $b ) {
			return $b['timestamp'] - $a['timestamp'];
		} );

		// Cap historical to at most 2 items, so total versions <= 3
		$historical = array_slice( $historical, 0, 2 );

		// Assemble list: Current is Version N, followed by Version N-1, Version N-2
		$total_count = 1 + count( $historical );
		$versions    = array();

		// Current version
		$current_version['version_number'] = $total_count;
		$current_version['version_tag']    = sprintf( esc_html__( 'Version %d', 'post-export-import-with-media' ), $total_count );
		$versions[]                        = $current_version;

		// Historical versions
		$v_num = $total_count - 1;
		foreach ( $historical as $item ) {
			$item['version_number'] = $v_num;
			$item['version_tag']    = sprintf( esc_html__( 'Version %d', 'post-export-import-with-media' ), $v_num );
			$versions[]             = $item;
			$v_num--;
		}

		return $versions;
	}

	/**
	 * Retrieve full post data (content, title, excerpt) for a version ID
	 *
	 * @param int    $post_id Post ID.
	 * @param string $version_id Version ID ('current', 'rev_123', 'snap_...').
	 * @return array|null
	 */
	public function get_version_data( $post_id, $version_id ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return null;
		}

		// Current
		if ( 'current' === $version_id ) {
			return array(
				'title'     => $post->post_title,
				'content'   => $post->post_content,
				'excerpt'   => $post->post_excerpt,
				'status'    => $post->post_status,
				'date'      => get_post_modified_time( 'M j, Y h:i A', false, $post_id ),
				'timestamp' => get_post_modified_time( 'U', false, $post_id ),
				'author'    => get_the_author_meta( 'display_name', $post->post_author ),
			);
		}

		// Native WP Revision
		if ( strpos( $version_id, 'rev_' ) === 0 ) {
			$rev_id = intval( substr( $version_id, 4 ) );
			$rev    = wp_get_post_revision( $rev_id );
			if ( $rev ) {
				$ts = ! empty( $rev->post_modified ) ? strtotime( $rev->post_modified ) : 0;
				return array(
					'title'     => $rev->post_title,
					'content'   => $rev->post_content,
					'excerpt'   => $rev->post_excerpt,
					'status'    => $rev->post_status,
					'date'      => date_i18n( 'M j, Y h:i A', $ts ),
					'timestamp' => $ts,
					'author'    => get_the_author_meta( 'display_name', $rev->post_author ),
				);
			}
		}

		// Snapshot
		$snapshots = get_post_meta( $post_id, self::SNAPSHOT_META_KEY, true );
		if ( is_array( $snapshots ) ) {
			foreach ( $snapshots as $snap ) {
				if ( isset( $snap['id'] ) && $snap['id'] === $version_id ) {
					$ts = isset( $snap['timestamp'] ) ? intval( $snap['timestamp'] ) : 0;
					return array(
						'title'     => $snap['title'],
						'content'   => $snap['content'],
						'excerpt'   => $snap['excerpt'],
						'status'    => isset( $snap['status'] ) ? $snap['status'] : 'publish',
						'date'      => date_i18n( 'M j, Y h:i A', $ts ),
						'timestamp' => $ts,
						'author'    => isset( $snap['author_id'] ) ? get_the_author_meta( 'display_name', $snap['author_id'] ) : '',
					);
				}
			}
		}

		return null;
	}

	/**
	 * AJAX: Compare two versions of a post
	 */
	public function ajax_compare_post_versions() {
		if ( ! $this->verify_nonce() ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Security check failed.', 'post-export-import-with-media' ) ), 403 );
		}

		$post_id         = isset( $_POST['post_id'] ) ? intval( $_POST['post_id'] ) : 0;
		$version_from_id = isset( $_POST['version_from'] ) ? sanitize_text_field( wp_unslash( $_POST['version_from'] ) ) : '';
		$version_to_id   = isset( $_POST['version_to'] ) ? sanitize_text_field( wp_unslash( $_POST['version_to'] ) ) : 'current';

		if ( ! $post_id || empty( $version_from_id ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Missing required comparison parameters.', 'post-export-import-with-media' ) ), 400 );
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Permission denied.', 'post-export-import-with-media' ) ), 403 );
		}

		$data_from = $this->get_version_data( $post_id, $version_from_id );
		$data_to   = $this->get_version_data( $post_id, $version_to_id );

		if ( ! $data_from || ! $data_to ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Could not load version data for comparison.', 'post-export-import-with-media' ) ), 404 );
		}

		// Ensure WordPress diff functions are loaded
		if ( ! function_exists( 'wp_text_diff' ) ) {
			require_once ABSPATH . 'wp-includes/pluggable.php';
			require_once ABSPATH . 'wp-admin/includes/diff.php';
		}

		// Generate diffs
		$diff_title   = $this->render_text_diff( $data_from['title'], $data_to['title'] );
		$diff_content = $this->render_text_diff( $data_from['content'], $data_to['content'] );
		$diff_excerpt = $this->render_text_diff( $data_from['excerpt'], $data_to['excerpt'] );

		// Stats
		$content_len_diff = strlen( (string) $data_to['content'] ) - strlen( (string) $data_from['content'] );

		wp_send_json_success( array(
			'post_id'          => $post_id,
			'version_from'     => $data_from,
			'version_to'       => $data_to,
			'diff_title'       => $diff_title,
			'diff_content'     => $diff_content,
			'diff_excerpt'     => $diff_excerpt,
			'has_title_diff'   => ( $data_from['title'] !== $data_to['title'] ),
			'has_content_diff' => ( $data_from['content'] !== $data_to['content'] ),
			'has_excerpt_diff' => ( $data_from['excerpt'] !== $data_to['excerpt'] ),
			'char_diff'        => $content_len_diff,
		) );
	}

	/**
	 * Generate visual text diff using wp_text_diff
	 *
	 * @param string $left Left/old text.
	 * @param string $right Right/new text.
	 * @return string HTML diff table.
	 */
	private function render_text_diff( $left, $right ) {
		$left  = (string) $left;
		$right = (string) $right;

		if ( $left === $right ) {
			return '<div class="peiwm-diff-identical" style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; color: #64748b; font-style: italic; font-size: 13px;">' . esc_html__( '(No changes detected in this field)', 'post-export-import-with-media' ) . '</div>';
		}

		if ( function_exists( 'wp_text_diff' ) ) {
			$diff = wp_text_diff( $left, $right, array( 'show_split_view' => true ) );
			if ( ! empty( $diff ) ) {
				return $diff;
			}
		}

		// Fallback simple line diff
		return '<div class="peiwm-simple-diff" style="font-family: monospace; font-size: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">' .
			'<div style="background: #fee2e2; color: #991b1b; padding: 4px 8px; margin-bottom: 4px; border-radius: 4px;">&minus; ' . esc_html( $left ) . '</div>' .
			'<div style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px;">&plus; ' . esc_html( $right ) . '</div>' .
			'</div>';
	}

	/**
	 * AJAX: Restore a previous version of a post
	 */
	public function ajax_restore_post_version() {
		if ( ! $this->verify_nonce() ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Security check failed. Please refresh the page.', 'post-export-import-with-media' ) ), 403 );
		}

		$post_id    = isset( $_POST['post_id'] ) ? intval( $_POST['post_id'] ) : 0;
		$version_id = isset( $_POST['version_id'] ) ? sanitize_text_field( wp_unslash( $_POST['version_id'] ) ) : '';

		if ( ! $post_id || empty( $version_id ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Invalid post or version specified.', 'post-export-import-with-media' ) ), 400 );
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'You do not have permission to restore this post.', 'post-export-import-with-media' ) ), 403 );
		}

		$post = get_post( $post_id );
		if ( ! $post ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Post not found.', 'post-export-import-with-media' ) ), 404 );
		}

		// 1. Safety snapshot: archive current state before restoration so nothing is permanently lost
		$this->save_post_snapshot( $post );

		$restored = false;

		// 2. If it's a native WP revision
		if ( strpos( $version_id, 'rev_' ) === 0 ) {
			$rev_id = intval( substr( $version_id, 4 ) );
			$res    = wp_restore_post_revision( $rev_id );
			if ( $res && ! is_wp_error( $res ) ) {
				$restored = true;
			}
		}

		// 3. If it's a snapshot or revision restoration fallback
		if ( ! $restored ) {
			$target_data = $this->get_version_data( $post_id, $version_id );
			if ( $target_data ) {
				$update_args = array(
					'ID'           => $post_id,
					'post_title'   => $target_data['title'],
					'post_content' => $target_data['content'],
					'post_excerpt' => $target_data['excerpt'],
				);

				$updated_id = wp_update_post( $update_args );
				if ( $updated_id && ! is_wp_error( $updated_id ) ) {
					$restored = true;
				}
			}
		}

		if ( ! $restored ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Failed to restore the selected version.', 'post-export-import-with-media' ) ) );
		}

		clean_post_cache( $post_id );

		// Return fresh versions list
		$updated_versions = $this->get_post_versions_list( $post_id );

		wp_send_json_success( array(
			'message'  => sprintf( esc_html__( 'Post #%d successfully restored to previous version!', 'post-export-import-with-media' ), $post_id ),
			'post_id'  => $post_id,
			'title'    => get_the_title( $post_id ),
			'versions' => $updated_versions,
		) );
	}
}
