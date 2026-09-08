<?php
/**
 * Post Compare Handler (Free)
 *
 * Provides side-by-side post comparison across core WordPress metadata,
 * taxonomies, and basic content stats.
 *
 * @package Post_Export_Import_With_Media
 * @since 1.16.1
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class PEIWM_Post_Compare_Handler
 */
class PEIWM_Post_Compare_Handler {

	/**
	 * Instance
	 *
	 * @var PEIWM_Post_Compare_Handler|null
	 */
	private static $instance = null;

	/**
	 * Get singleton instance
	 *
	 * @return PEIWM_Post_Compare_Handler
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
		add_action( 'wp_ajax_peiwm_compare_posts', array( $this, 'ajax_compare_posts' ) );
		add_action( 'wp_ajax_peiwm_search_posts_compare', array( $this, 'ajax_search_posts' ) );
	}

	/**
	 * AJAX: Search posts for autocomplete picker.
	 */
	public function ajax_search_posts() {
		check_ajax_referer( 'peiwm_secure_nonce', 'nonce' );

		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Unauthorized.', 'post-export-import-with-media' ) ) );
		}

		$query = isset( $_POST['query'] ) ? sanitize_text_field( wp_unslash( $_POST['query'] ) ) : '';
		$query = trim( $query );

		global $wpdb;

		if ( is_numeric( $query ) ) {
			$posts = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT ID, post_title, post_type, post_status FROM {$wpdb->posts}
					 WHERE ID = %d AND post_type IN ('post', 'page') LIMIT 10",
					(int) $query
				)
			);
		} else {
			$like = '%' . $wpdb->esc_like( $query ) . '%';
			$posts = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT ID, post_title, post_type, post_status FROM {$wpdb->posts}
					 WHERE post_type IN ('post', 'page')
					   AND post_status NOT IN ('trash', 'auto-draft', 'inherit')
					   AND (post_title LIKE %s OR post_name LIKE %s)
					 ORDER BY ID DESC LIMIT 15",
					$like,
					$like
				)
			);
		}

		$results = array();
		if ( ! empty( $posts ) ) {
			foreach ( $posts as $p ) {
				$results[] = array(
					'id'    => (int) $p->ID,
					'title' => ! empty( $p->post_title ) ? $p->post_title : sprintf( __( '(no title #%d)', 'post-export-import-with-media' ), $p->ID ),
					'type'  => $p->post_type,
					'status'=> $p->post_status,
				);
			}
		}

		wp_send_json_success( $results );
	}

	/**
	 * AJAX: Compare two posts.
	 */
	public function ajax_compare_posts() {
		check_ajax_referer( 'peiwm_secure_nonce', 'nonce' );

		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Unauthorized.', 'post-export-import-with-media' ) ) );
		}

		$post_a_id = isset( $_POST['post_a'] ) ? absint( $_POST['post_a'] ) : 0;
		$post_b_id = isset( $_POST['post_b'] ) ? absint( $_POST['post_b'] ) : 0;

		if ( empty( $post_a_id ) || empty( $post_b_id ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Please select two posts to compare.', 'post-export-import-with-media' ) ) );
		}

		$post_a = get_post( $post_a_id );
		$post_b = get_post( $post_b_id );

		if ( ! $post_a || ! $post_b ) {
			wp_send_json_error( array( 'message' => esc_html__( 'One or both posts could not be found.', 'post-export-import-with-media' ) ) );
		}

		$data_a = $this->get_post_compare_profile( $post_a );
		$data_b = $this->get_post_compare_profile( $post_b );

		$comparison = array(
			'post_a'     => $data_a,
			'post_b'     => $data_b,
			'differences'=> $this->detect_differences( $data_a, $data_b ),
		);

		$comparison = apply_filters( 'peiwm_post_compare_data', $comparison, $post_a, $post_b );

		wp_send_json_success( $comparison );
	}

	/**
	 * Build standardized post profile for comparison.
	 *
	 * @param WP_Post $post Post object.
	 * @return array
	 */
	public function get_post_compare_profile( WP_Post $post ) {
		$author = get_userdata( $post->post_author );
		$author_name = $author ? $author->display_name : sprintf( __( 'User #%d', 'post-export-import-with-media' ), $post->post_author );

		// Categories & Tags
		$categories = wp_get_post_categories( $post->ID, array( 'fields' => 'names' ) );
		$tags       = wp_get_post_tags( $post->ID, array( 'fields' => 'names' ) );

		// Featured Image
		$thumb_id  = get_post_thumbnail_id( $post->ID );
		$thumb_url = $thumb_id ? wp_get_attachment_image_url( $thumb_id, 'thumbnail' ) : '';

		// Content length
		$content_clean = wp_strip_all_tags( $post->post_content );
		$word_count    = str_word_count( $content_clean );
		$char_count    = strlen( $content_clean );

		return array(
			'id'             => (int) $post->ID,
			'title'          => $post->post_title,
			'slug'           => $post->post_name,
			'status'         => $post->post_status,
			'type'           => $post->post_type,
			'author'         => $author_name,
			'date'           => $post->post_date,
			'modified'       => $post->post_modified,
			'categories'     => ! empty( $categories ) && ! is_wp_error( $categories ) ? implode( ', ', $categories ) : '—',
			'tags'           => ! empty( $tags ) && ! is_wp_error( $tags ) ? implode( ', ', $tags ) : '—',
			'featured_image' => $thumb_url,
			'word_count'     => $word_count,
			'char_count'     => $char_count,
			'excerpt'        => wp_trim_words( $post->post_excerpt, 25 ),
			'edit_url'       => get_edit_post_link( $post->ID, 'raw' ),
			'view_url'       => get_permalink( $post->ID ),
		);
	}

	/**
	 * Detect key differences between two profiles.
	 *
	 * @param array $a Profile A.
	 * @param array $b Profile B.
	 * @return array List of differing field keys.
	 */
	private function detect_differences( array $a, array $b ) {
		$diffs = array();
		$keys = array( 'title', 'slug', 'status', 'type', 'author', 'categories', 'tags', 'featured_image', 'word_count' );

		foreach ( $keys as $k ) {
			if ( (string) ( $a[ $k ] ?? '' ) !== (string) ( $b[ $k ] ?? '' ) ) {
				$diffs[] = $k;
			}
		}

		return $diffs;
	}
}
