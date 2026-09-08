<?php
/**
 * Internal Links Handler (Free)
 *
 * Scans WordPress posts and pages for internal link occurrences and old domain references.
 * Complies fully with WordPress.org guidelines with zero artificial backend restrictions.
 *
 * @package Post_Export_Import_With_Media
 * @since 1.16.1
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class PEIWM_Internal_Links_Handler
 */
class PEIWM_Internal_Links_Handler {

	/**
	 * Instance
	 *
	 * @var PEIWM_Internal_Links_Handler|null
	 */
	private static $instance = null;

	/**
	 * Get singleton instance
	 *
	 * @return PEIWM_Internal_Links_Handler
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
		add_action( 'wp_ajax_peiwm_scan_internal_links', array( $this, 'ajax_scan_internal_links' ) );
	}

	/**
	 * AJAX Handler: Scan posts and pages for old URL / domain references.
	 */
	public function ajax_scan_internal_links() {
		check_ajax_referer( 'peiwm_secure_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Unauthorized access.', 'post-export-import-with-media' ) ) );
		}

		$old_url = isset( $_POST['old_url'] ) ? sanitize_text_field( wp_unslash( $_POST['old_url'] ) ) : '';
		$old_url = trim( $old_url );

		if ( empty( $old_url ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Please provide a valid URL or domain to search for.', 'post-export-import-with-media' ) ) );
		}

		$include_pages = isset( $_POST['include_pages'] ) && '1' === sanitize_text_field( wp_unslash( $_POST['include_pages'] ) );
		$post_types    = $include_pages ? array( 'post', 'page' ) : array( 'post' );
		$post_types    = apply_filters( 'peiwm_internal_links_post_types', $post_types );

		$results = $this->scan_posts_for_url( $old_url, $post_types );

		wp_send_json_success( $results );
	}

	/**
	 * Scan database for occurrences of a given URL across post content and excerpts.
	 *
	 * @param string $search_url URL or domain string to search.
	 * @param array  $post_types Post types to scan.
	 * @return array Scan results containing summary stats and list of affected posts.
	 */
	public function scan_posts_for_url( $search_url, array $post_types ) {
		global $wpdb;

		if ( empty( $post_types ) ) {
			$post_types = array( 'post' );
		}

		$placeholders = implode( ', ', array_fill( 0, count( $post_types ), '%s' ) );
		$like_query   = '%' . $wpdb->esc_like( $search_url ) . '%';

		$sql_params = array_merge( $post_types, array( $like_query, $like_query, $like_query ) );

		// Query posts matching in title, content, or excerpt
		$query = $wpdb->prepare(
			"SELECT ID, post_title, post_type, post_status, post_date, post_content, post_excerpt
			 FROM {$wpdb->posts}
			 WHERE post_type IN ($placeholders)
			   AND post_status NOT IN ('trash', 'auto-draft', 'inherit')
			   AND (post_content LIKE %s OR post_excerpt LIKE %s OR post_title LIKE %s)
			 ORDER BY ID DESC
			 LIMIT 500",
			$sql_params
		);

		$posts = $wpdb->get_results( $query );

		$matched_items = array();
		$total_links   = 0;

		if ( ! empty( $posts ) ) {
			foreach ( $posts as $post ) {
				$content_matches = substr_count( $post->post_content, $search_url );
				$excerpt_matches = substr_count( $post->post_excerpt, $search_url );
				$title_matches   = substr_count( $post->post_title, $search_url );
				$post_count      = $content_matches + $excerpt_matches + $title_matches;

				if ( $post_count === 0 ) {
					continue;
				}

				$total_links += $post_count;

				// Extract match context snippets
				$snippets = $this->extract_snippets( $post->post_content, $search_url, 3 );

				$matched_items[] = array(
					'id'          => (int) $post->ID,
					'title'       => ! empty( $post->post_title ) ? $post->post_title : sprintf( __( '(no title #%d)', 'post-export-import-with-media' ), $post->ID ),
					'post_type'   => $post->post_type,
					'status'      => $post->post_status,
					'date'        => substr( $post->post_date, 0, 10 ),
					'link_count'  => $post_count,
					'snippets'    => $snippets,
					'edit_url'    => get_edit_post_link( $post->ID, 'raw' ),
					'view_url'    => get_permalink( $post->ID ),
				);
			}
		}

		$result = array(
			'search_url'   => $search_url,
			'total_posts'  => count( $matched_items ),
			'total_links'  => $total_links,
			'items'        => $matched_items,
		);

		return apply_filters( 'peiwm_internal_links_scan_results', $result, $search_url );
	}

	/**
	 * Extract small text snippets surrounding occurrences of the search term.
	 *
	 * @param string $text Full post content.
	 * @param string $search Search URL.
	 * @param int    $max_snippets Max snippets to return.
	 * @return array List of string snippets.
	 */
	private function extract_snippets( $text, $search, $max_snippets = 3 ) {
		$snippets = array();
		$offset   = 0;
		$length   = strlen( $search );
		$count    = 0;

		while ( false !== ( $pos = stripos( $text, $search, $offset ) ) && $count < $max_snippets ) {
			$start = max( 0, $pos - 35 );
			$end   = min( strlen( $text ), $pos + $length + 35 );
			$len   = $end - $start;

			$snippet = substr( $text, $start, $len );
			$snippet = wp_strip_all_tags( $snippet );
			$snippet = trim( preg_replace( '/\s+/', ' ', $snippet ) );

			if ( $start > 0 ) {
				$snippet = '…' . $snippet;
			}
			if ( $end < strlen( $text ) ) {
				$snippet .= '…';
			}

			$snippets[] = $snippet;
			$offset     = $pos + $length;
			$count++;
		}

		return $snippets;
	}
}
