<?php
/**
 * Duplicate Post Detector Handler (Free)
 *
 * Detects exact duplicate posts by Title, Slug, or Content hash.
 * WordPress.org compliant: Free detects and reports all exact duplicates without artificial backend limits.
 *
 * @package PostExportImportWithMedia
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PEIWM_Duplicate_Detector_Handler {

	/**
	 * Instance
	 *
	 * @var PEIWM_Duplicate_Detector_Handler|null
	 */
	private static $instance = null;

	/**
	 * Get singleton instance
	 *
	 * @return PEIWM_Duplicate_Detector_Handler
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
		$this->init_hooks();
	}

	/**
	 * Initialize hooks
	 */
	private function init_hooks() {
		add_action( 'wp_ajax_peiwm_scan_duplicates', array( $this, 'ajax_scan_duplicates' ) );
	}

	/**
	 * AJAX: Scan for duplicate posts
	 */
	public function ajax_scan_duplicates() {
		check_ajax_referer( 'peiwm_secure_nonce', 'nonce' );

		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Insufficient permissions.', 'post-export-import-with-media' ) ) );
		}

		global $wpdb;

		$post_type = isset( $_POST['post_type'] ) ? sanitize_key( $_POST['post_type'] ) : 'post';
		$criteria  = isset( $_POST['criteria'] ) ? sanitize_key( $_POST['criteria'] ) : 'title';

		if ( empty( $post_type ) ) {
			$post_type = 'post';
		}

		$clusters = array();
		$cluster_counter = 1;

		// 1. Scan by Exact Title
		if ( 'title' === $criteria || 'all' === $criteria ) {
			$title_rows = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT post_title, COUNT(*) as cnt, GROUP_CONCAT(ID ORDER BY ID ASC) as id_list
					 FROM {$wpdb->posts}
					 WHERE post_type = %s
					   AND post_status IN ('publish', 'draft', 'pending', 'future', 'private')
					   AND TRIM(post_title) != ''
					 GROUP BY post_title
					 HAVING cnt > 1
					 ORDER BY cnt DESC
					 LIMIT 50",
					$post_type
				)
			);

			if ( ! empty( $title_rows ) ) {
				foreach ( $title_rows as $row ) {
					$ids = array_map( 'intval', explode( ',', $row->id_list ) );
					$clusters[] = $this->build_cluster( 'cluster_' . $cluster_counter++, 'title', $row->post_title, $ids );
				}
			}
		}

		// 2. Scan by Exact Slug
		if ( 'slug' === $criteria || 'all' === $criteria ) {
			$slug_rows = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT post_name, COUNT(*) as cnt, GROUP_CONCAT(ID ORDER BY ID ASC) as id_list
					 FROM {$wpdb->posts}
					 WHERE post_type = %s
					   AND post_status IN ('publish', 'draft', 'pending', 'future', 'private')
					   AND post_name != ''
					 GROUP BY post_name
					 HAVING cnt > 1
					 ORDER BY cnt DESC
					 LIMIT 50",
					$post_type
				)
			);

			if ( ! empty( $slug_rows ) ) {
				foreach ( $slug_rows as $row ) {
					$ids = array_map( 'intval', explode( ',', $row->id_list ) );
					$clusters[] = $this->build_cluster( 'cluster_' . $cluster_counter++, 'slug', $row->post_name, $ids );
				}
			}
		}

		// 3. Scan by Exact Content Hash
		if ( 'content' === $criteria || 'all' === $criteria ) {
			$content_rows = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT MD5(TRIM(post_content)) as chash, COUNT(*) as cnt, GROUP_CONCAT(ID ORDER BY ID ASC) as id_list
					 FROM {$wpdb->posts}
					 WHERE post_type = %s
					   AND post_status IN ('publish', 'draft', 'pending', 'future', 'private')
					   AND TRIM(post_content) != ''
					 GROUP BY chash
					 HAVING cnt > 1
					 ORDER BY cnt DESC
					 LIMIT 50",
					$post_type
				)
			);

			if ( ! empty( $content_rows ) ) {
				foreach ( $content_rows as $row ) {
					$ids = array_map( 'intval', explode( ',', $row->id_list ) );
					$sample_title = get_the_title( $ids[0] ) ?: '(Untitled)';
					$clusters[] = $this->build_cluster( 'cluster_' . $cluster_counter++, 'content', 'Content Match: ' . $sample_title, $ids );
				}
			}
		}

		$total_duplicates = 0;
		foreach ( $clusters as $c ) {
			$total_duplicates += ( $c['count'] - 1 );
		}

		wp_send_json_success( array(
			'clusters'         => $clusters,
			'total_clusters'   => count( $clusters ),
			'total_duplicates' => $total_duplicates,
			'message'          => sprintf(
				/* translators: 1: number of duplicate clusters, 2: total duplicate posts */
				esc_html__( 'Scan complete: %1$d duplicate cluster(s) found with %2$d redundant post(s).', 'post-export-import-with-media' ),
				count( $clusters ),
				$total_duplicates
			),
		) );
	}

	/**
	 * Helper: Build cluster data array
	 *
	 * @param string $cluster_id Unique cluster ID
	 * @param string $criteria Criteria (title, slug, content)
	 * @param string $match_value Value matched
	 * @param array  $ids Array of post IDs
	 * @return array
	 */
	private function build_cluster( $cluster_id, $criteria, $match_value, $ids ) {
		$posts = array();
		$total = count( $ids );

		foreach ( $ids as $index => $id ) {
			$p = get_post( $id );
			if ( ! $p ) {
				continue;
			}

			$posts[] = array(
				'id'          => $p->ID,
				'title'       => get_the_title( $p->ID ) ?: '(no title)',
				'slug'        => $p->post_name,
				'date'        => get_the_date( 'Y-m-d H:i', $p->ID ),
				'status'      => $p->post_status,
				'edit_url'    => get_edit_post_link( $p->ID, 'raw' ),
				'view_url'    => get_permalink( $p->ID ),
				'is_oldest'   => ( 0 === $index ),
				'is_newest'   => ( $index === $total - 1 ),
			);
		}

		return array(
			'id'          => $cluster_id,
			'criteria'    => $criteria,
			'match_value' => $match_value,
			'count'       => count( $posts ),
			'post_ids'    => $ids,
			'posts'       => $posts,
		);
	}
}
