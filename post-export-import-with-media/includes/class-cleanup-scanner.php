<?php
/**
 * Post Cleanup Scanner (Free)
 *
 * Scans WordPress posts and pages for post-migration content health issues:
 * missing categories, missing tags, broken images in content, and duplicate slugs.
 * Fully compliant with WordPress.org guidelines with zero artificial backend restrictions.
 *
 * @package Post_Export_Import_With_Media
 * @since 1.16.1
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class PEIWM_Cleanup_Scanner
 */
class PEIWM_Cleanup_Scanner {

	/**
	 * Instance
	 *
	 * @var PEIWM_Cleanup_Scanner|null
	 */
	private static $instance = null;

	/**
	 * Get singleton instance
	 *
	 * @return PEIWM_Cleanup_Scanner
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
		add_action( 'wp_ajax_peiwm_scan_post_cleanup', array( $this, 'ajax_scan_post_cleanup' ) );

		if ( ! has_action( 'wp_ajax_peiwm_get_categories' ) ) {
			add_action( 'wp_ajax_peiwm_get_categories', array( $this, 'ajax_get_categories' ) );
		}
		if ( ! has_action( 'wp_ajax_peiwm_fix_missing_categories' ) ) {
			add_action( 'wp_ajax_peiwm_fix_missing_categories', array( $this, 'ajax_fix_missing_categories' ) );
		}
		if ( ! has_action( 'wp_ajax_peiwm_get_tags' ) ) {
			add_action( 'wp_ajax_peiwm_get_tags', array( $this, 'ajax_get_tags' ) );
		}
		if ( ! has_action( 'wp_ajax_peiwm_fix_missing_tags' ) ) {
			add_action( 'wp_ajax_peiwm_fix_missing_tags', array( $this, 'ajax_fix_missing_tags' ) );
		}
		if ( ! has_action( 'wp_ajax_peiwm_fix_duplicate_slugs' ) ) {
			add_action( 'wp_ajax_peiwm_fix_duplicate_slugs', array( $this, 'ajax_fix_duplicate_slugs' ) );
		}
		if ( ! has_action( 'wp_ajax_peiwm_fix_broken_images' ) ) {
			add_action( 'wp_ajax_peiwm_fix_broken_images', array( $this, 'ajax_fix_broken_images' ) );
		}
		if ( ! has_action( 'wp_ajax_peiwm_replace_broken_image' ) ) {
			add_action( 'wp_ajax_peiwm_replace_broken_image', array( $this, 'ajax_replace_broken_image' ) );
		}
	}

	/**
	 * Verify nonce and administrator permissions
	 */
	private function verify_security() {
		if ( ! check_ajax_referer( 'peiwm_pro_secure_nonce', 'nonce', false ) && ! check_ajax_referer( 'peiwm_secure_nonce', 'nonce', false ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Security check failed. Please refresh the page and try again.', 'post-export-import-with-media' ) ), 403 );
		}

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Unauthorized access.', 'post-export-import-with-media' ) ), 403 );
		}
	}

	/**
	 * AJAX Handler: Scan posts for content health & cleanup issues
	 */
	public function ajax_scan_post_cleanup() {
		$this->verify_security();

		$post_types = isset( $_POST['post_types'] ) && is_array( $_POST['post_types'] )
			? array_map( 'sanitize_key', $_POST['post_types'] )
			: array( 'post', 'page' );

		$results = $this->run_health_scan( $post_types );

		wp_send_json_success( $results );
	}

	/**
	 * Run health scan across posts
	 *
	 * @param array $post_types Post types to scan.
	 * @return array
	 */
	public function run_health_scan( $post_types = array( 'post', 'page' ) ) {
		global $wpdb;

		$default_category_id = (int) get_option( 'default_category', 1 );

		// Fetch published, draft, and pending posts
		$post_types_placeholders = implode( "','", array_map( 'esc_sql', $post_types ) );
		$query = "SELECT ID, post_title, post_name, post_type, post_status, post_content, post_date 
				  FROM {$wpdb->posts} 
				  WHERE post_type IN ('{$post_types_placeholders}') 
				  AND post_status IN ('publish', 'draft', 'pending', 'future', 'private')
				  ORDER BY ID DESC LIMIT 500";

		$posts = $wpdb->get_results( $query );

		$items = array();
		$counts = array(
			'missing_categories' => 0,
			'missing_tags'       => 0,
			'broken_images'      => 0,
			'duplicate_slugs'    => 0,
			'total_posts'        => count( $posts ),
			'issues_found'       => 0,
		);

		// Pre-compute slug occurrences to detect duplicates
		$slug_counts = array();
		foreach ( $posts as $p ) {
			$slug = trim( $p->post_name );
			if ( ! empty( $slug ) ) {
				$slug_counts[ $slug ] = ( isset( $slug_counts[ $slug ] ) ? $slug_counts[ $slug ] : 0 ) + 1;
			}
		}

		foreach ( $posts as $p ) {
			$post_id    = (int) $p->ID;
			$title      = ! empty( $p->post_title ) ? $p->post_title : sprintf( esc_html__( '(No Title #%d)', 'post-export-import-with-media' ), $post_id );
			$post_type  = $p->post_type;
			$issues     = array();

			// 1. Check Missing Categories (for 'post' type)
			if ( 'post' === $post_type ) {
				$cats = wp_get_post_categories( $post_id );
				if ( empty( $cats ) || ( 1 === count( $cats ) && in_array( $default_category_id, $cats, true ) ) ) {
					$issues[] = array(
						'type'        => 'missing_category',
						'label'       => esc_html__( 'Missing Category', 'post-export-import-with-media' ),
						'description' => empty( $cats ) ? esc_html__( 'No category assigned', 'post-export-import-with-media' ) : esc_html__( 'Only default (Uncategorized) assigned', 'post-export-import-with-media' ),
					);
					$counts['missing_categories']++;
				}
			}

			// 2. Check Missing Tags (for 'post' type)
			if ( 'post' === $post_type ) {
				$tags = wp_get_post_tags( $post_id );
				if ( empty( $tags ) ) {
					$issues[] = array(
						'type'        => 'missing_tag',
						'label'       => esc_html__( 'Missing Tags', 'post-export-import-with-media' ),
						'description' => esc_html__( 'No tags assigned to this post', 'post-export-import-with-media' ),
					);
					$counts['missing_tags']++;
				}
			}

			// 3. Check Duplicate Slug or Suffixed Slug (e.g. 'post-slug-2')
			$slug = trim( $p->post_name );
			$is_duplicate = ( isset( $slug_counts[ $slug ] ) && $slug_counts[ $slug ] > 1 );
			$is_suffixed  = preg_match( '/-[0-9]+$/', $slug );

			if ( $is_duplicate || $is_suffixed ) {
				$desc = $is_duplicate
					? sprintf( esc_html__( 'Duplicate slug: "%s" shared with other post(s)', 'post-export-import-with-media' ), $slug )
					: sprintf( esc_html__( 'Suffixed slug: "%s" (likely duplicate on import)', 'post-export-import-with-media' ), $slug );

				$issues[] = array(
					'type'        => 'duplicate_slug',
					'label'       => esc_html__( 'Duplicate / Suffixed Slug', 'post-export-import-with-media' ),
					'description' => $desc,
					'slug'        => $slug,
				);
				$counts['duplicate_slugs']++;
			}

			// 4. Check Broken / Missing Image Tags in Content
			if ( ! empty( $p->post_content ) && false !== stripos( $p->post_content, '<img' ) ) {
				$broken_imgs = $this->find_broken_images_in_content( $p->post_content );
				if ( ! empty( $broken_imgs ) ) {
					$issues[] = array(
						'type'        => 'broken_image',
						'label'       => esc_html__( 'Broken / Empty Images', 'post-export-import-with-media' ),
						'description' => sprintf( esc_html__( '%d broken or invalid image URL(s) detected in content', 'post-export-import-with-media' ), count( $broken_imgs ) ),
						'images'      => array_slice( $broken_imgs, 0, 5 ),
					);
					$counts['broken_images'] += count( $broken_imgs );
				}
			}

			if ( ! empty( $issues ) ) {
				$counts['issues_found']++;
				$items[] = array(
					'id'          => $post_id,
					'title'       => $title,
					'slug'        => $p->post_name,
					'post_type'   => $post_type,
					'status'      => $p->post_status,
					'date'        => mysql2date( get_option( 'date_format' ), $p->post_date ),
					'edit_url'    => get_edit_post_link( $post_id, '' ),
					'view_url'    => get_permalink( $post_id ),
					'issues'      => $issues,
				);
			}
		}

		return array(
			'counts' => $counts,
			'items'  => $items,
		);
	}

	/**
	 * Find broken, empty, or invalid image tags in post content
	 *
	 * @param string $content Post content.
	 * @return array
	 */
	private function find_broken_images_in_content( $content ) {
		$broken = array();
		if ( preg_match_all( '/<img[^>]+src=["\']([^"\']*)["\']/i', $content, $matches ) ) {
			foreach ( $matches[1] as $src ) {
				$trimmed = trim( $src );
				// Check if empty, invalid, placeholder, or data URI error
				if ( empty( $trimmed ) || '#' === $trimmed || 'about:blank' === $trimmed ) {
					$broken[] = $src;
				} elseif ( ! filter_var( $trimmed, FILTER_VALIDATE_URL ) && 0 !== strpos( $trimmed, '/' ) ) {
					$broken[] = $src;
				}
			}
		}
		return $broken;
	}

	/**
	 * AJAX: Get all WordPress categories for assignment modal
	 */
	public function ajax_get_categories() {
		$this->verify_security();

		$default_cat_id = (int) get_option( 'default_category', 1 );
		$categories     = get_categories( array(
			'hide_empty' => false,
			'orderby'    => 'name',
			'order'      => 'ASC',
		) );

		$list = array();
		if ( ! empty( $categories ) && ! is_wp_error( $categories ) ) {
			foreach ( $categories as $cat ) {
				$list[] = array(
					'id'         => (int) $cat->term_id,
					'name'       => $cat->name,
					'count'      => (int) $cat->count,
					'slug'       => $cat->slug,
					'parent'     => (int) $cat->parent,
					'is_default' => ( (int) $cat->term_id === $default_cat_id ),
				);
			}
		}

		wp_send_json_success( array(
			'categories'          => $list,
			'default_category_id' => $default_cat_id,
		) );
	}

	/**
	 * AJAX: Bulk assign target category to posts lacking categories
	 */
	public function ajax_fix_missing_categories() {
		$this->verify_security();

		global $wpdb;
		ob_start();
		$prev_suppress = $wpdb->suppress_errors( true );

		$category_id = isset( $_POST['target_category'] ) ? (int) $_POST['target_category'] : (int) get_option( 'default_category', 1 );
		$append      = isset( $_POST['append'] ) && ( '1' === (string) $_POST['append'] || true === $_POST['append'] );
		$post_ids    = isset( $_POST['post_ids'] ) && is_array( $_POST['post_ids'] )
			? array_map( 'absint', $_POST['post_ids'] )
			: array();

		if ( empty( $post_ids ) ) {
			$wpdb->suppress_errors( $prev_suppress );
			ob_end_clean();
			wp_send_json_error( array( 'message' => esc_html__( 'No post IDs provided.', 'post-export-import-with-media' ) ) );
		}

		$updated = 0;
		foreach ( $post_ids as $pid ) {
			if ( 'post' !== get_post_type( $pid ) ) {
				continue;
			}
			$res = wp_set_post_categories( $pid, array( $category_id ), $append );
			if ( ! is_wp_error( $res ) && ! empty( $res ) ) {
				$updated++;
			}
		}

		$cat_obj  = get_term( $category_id, 'category' );
		$cat_name = ( $cat_obj && ! is_wp_error( $cat_obj ) ) ? $cat_obj->name : sprintf( '#%d', $category_id );

		$wpdb->suppress_errors( $prev_suppress );
		ob_end_clean();

		wp_send_json_success( array(
			'message' => sprintf( esc_html__( 'Successfully assigned category "%s" to %d post(s).', 'post-export-import-with-media' ), $cat_name, $updated ),
			'updated' => $updated,
		) );
	}

	/**
	 * AJAX: Get all WordPress tags for assignment modal
	 */
	public function ajax_get_tags() {
		$this->verify_security();

		$tags = get_tags( array(
			'hide_empty' => false,
			'orderby'    => 'name',
			'order'      => 'ASC',
		) );

		$list = array();
		if ( ! empty( $tags ) && ! is_wp_error( $tags ) ) {
			foreach ( $tags as $tag ) {
				$list[] = array(
					'id'    => (int) $tag->term_id,
					'name'  => $tag->name,
					'count' => (int) $tag->count,
					'slug'  => $tag->slug,
				);
			}
		}

		wp_send_json_success( array(
			'tags' => $list,
		) );
	}

	/**
	 * AJAX: Bulk assign target tag(s) to posts lacking tags
	 */
	public function ajax_fix_missing_tags() {
		$this->verify_security();

		global $wpdb;
		ob_start();
		$prev_suppress = $wpdb->suppress_errors( true );

		$append   = ! isset( $_POST['append'] ) || ( '1' === (string) $_POST['append'] || true === $_POST['append'] );
		$post_ids = isset( $_POST['post_ids'] ) && is_array( $_POST['post_ids'] )
			? array_map( 'absint', $_POST['post_ids'] )
			: array();
		$tag_ids  = isset( $_POST['tag_ids'] ) && is_array( $_POST['tag_ids'] )
			? array_map( 'absint', $_POST['tag_ids'] )
			: array();
		$new_tags = isset( $_POST['new_tags'] ) ? sanitize_text_field( wp_unslash( $_POST['new_tags'] ) ) : '';

		if ( empty( $post_ids ) ) {
			$wpdb->suppress_errors( $prev_suppress );
			ob_end_clean();
			wp_send_json_error( array( 'message' => esc_html__( 'No post IDs provided.', 'post-export-import-with-media' ) ) );
		}

		$all_tag_ids = $tag_ids;

		// Handle newly created tags if typed
		if ( ! empty( $new_tags ) ) {
			$raw_tags = array_map( 'trim', explode( ',', $new_tags ) );
			foreach ( $raw_tags as $t_name ) {
				if ( empty( $t_name ) ) {
					continue;
				}
				$existing = term_exists( $t_name, 'post_tag' );
				if ( $existing ) {
					$tid           = is_array( $existing ) ? (int) $existing['term_id'] : (int) $existing;
					$all_tag_ids[] = $tid;
				} else {
					$inserted = wp_insert_term( $t_name, 'post_tag' );
					if ( ! is_wp_error( $inserted ) && isset( $inserted['term_id'] ) ) {
						$all_tag_ids[] = (int) $inserted['term_id'];
					} elseif ( is_wp_error( $inserted ) && $inserted->get_error_data() ) {
						$all_tag_ids[] = (int) $inserted->get_error_data();
					}
				}
			}
		}

		$all_tag_ids = array_values( array_unique( array_map( 'intval', array_filter( $all_tag_ids ) ) ) );

		if ( empty( $all_tag_ids ) ) {
			$wpdb->suppress_errors( $prev_suppress );
			ob_end_clean();
			wp_send_json_error( array( 'message' => esc_html__( 'Please select or enter at least one tag to assign.', 'post-export-import-with-media' ) ) );
		}

		$updated = 0;
		foreach ( $post_ids as $pid ) {
			if ( 'post' !== get_post_type( $pid ) ) {
				continue;
			}

			// If append is true, fetch existing post tags to merge and deduplicate
			if ( $append ) {
				$existing_tag_ids = wp_get_object_terms( $pid, 'post_tag', array( 'fields' => 'ids' ) );
				if ( ! is_wp_error( $existing_tag_ids ) && ! empty( $existing_tag_ids ) ) {
					$final_tag_ids = array_unique( array_merge( array_map( 'intval', $existing_tag_ids ), $all_tag_ids ) );
				} else {
					$final_tag_ids = $all_tag_ids;
				}
			} else {
				$final_tag_ids = $all_tag_ids;
			}

			$final_tag_ids = array_values( array_unique( array_map( 'intval', $final_tag_ids ) ) );

			// Pass $append = false because $final_tag_ids already includes existing tags merged with new tags.
			// This tells WordPress core to diff existing vs final and insert ONLY non-existent relationships,
			// completely preventing any MySQL Duplicate entry errors on wp_term_relationships!
			$res = wp_set_object_terms( $pid, $final_tag_ids, 'post_tag', false );
			if ( ! is_wp_error( $res ) ) {
				$updated++;
			}
		}

		$tag_names = array();
		foreach ( $all_tag_ids as $tid ) {
			$term = get_term( $tid, 'post_tag' );
			if ( $term && ! is_wp_error( $term ) ) {
				$tag_names[] = $term->name;
			}
		}
		$tags_label = ! empty( $tag_names ) ? implode( ', ', $tag_names ) : sprintf( '%d tag(s)', count( $all_tag_ids ) );

		$wpdb->suppress_errors( $prev_suppress );
		ob_end_clean();

		wp_send_json_success( array(
			'message' => sprintf( __( 'Successfully assigned tag(s) "%s" to %d post(s).', 'post-export-import-with-media' ), wp_strip_all_tags( $tags_label ), $updated ),
			'updated' => $updated,
		) );
	}

	/**
	 * AJAX: Bulk clean and regenerate duplicate or suffixed slugs
	 */
	public function ajax_fix_duplicate_slugs() {
		$this->verify_security();

		$post_ids = isset( $_POST['post_ids'] ) && is_array( $_POST['post_ids'] )
			? array_map( 'absint', $_POST['post_ids'] )
			: array();

		if ( empty( $post_ids ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'No post IDs provided.', 'post-export-import-with-media' ) ) );
		}

		global $wpdb;
		$updated = 0;

		foreach ( $post_ids as $pid ) {
			$post = get_post( $pid );
			if ( ! $post ) {
				continue;
			}

			// Strip numeric duplicate suffixes (e.g. 'my-post-2' -> 'my-post')
			$base_slug = preg_replace( '/-[0-9]+$/', '', $post->post_name );
			if ( empty( $base_slug ) ) {
				$base_slug = sanitize_title( $post->post_title );
			}

			// Generate canonical unique slug
			$new_slug = wp_unique_post_slug( $base_slug, $pid, $post->post_status, $post->post_type, $post->post_parent );

			if ( $new_slug !== $post->post_name ) {
				$wpdb->update(
					$wpdb->posts,
					array( 'post_name' => $new_slug ),
					array( 'ID' => $pid ),
					array( '%s' ),
					array( '%d' )
				);
				clean_post_cache( $pid );
				$updated++;
			}
		}

		wp_send_json_success( array(
			'message' => sprintf( esc_html__( 'Successfully regenerated and cleaned slugs for %d post(s).', 'post-export-import-with-media' ), $updated ),
			'updated' => $updated,
		) );
	}

	/**
	 * AJAX: Bulk clean broken image tags from post content
	 */
	public function ajax_fix_broken_images() {
		$this->verify_security();

		$post_ids = isset( $_POST['post_ids'] ) && is_array( $_POST['post_ids'] )
			? array_map( 'absint', $_POST['post_ids'] )
			: array();

		if ( empty( $post_ids ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'No post IDs provided.', 'post-export-import-with-media' ) ) );
		}

		global $wpdb;
		$updated = 0;

		foreach ( $post_ids as $pid ) {
			$post = get_post( $pid );
			if ( ! $post || empty( $post->post_content ) ) {
				continue;
			}

			$content = $post->post_content;

			// Replace <img> tags that have empty, hash, about:blank, or invalid URLs
			$new_content = preg_replace_callback( '/<img[^>]*>/i', function( $match ) {
				$tag = $match[0];
				if ( preg_match( '/src=["\']([^"\']*)["\']/i', $tag, $src_match ) ) {
					$src = trim( $src_match[1] );
					if ( empty( $src ) || '#' === $src || 'about:blank' === $src || ( ! filter_var( $src, FILTER_VALIDATE_URL ) && 0 !== strpos( $src, '/' ) ) ) {
						return ''; // Remove broken image tag
					}
				} else {
					// <img> without src attribute
					return '';
				}
				return $tag;
			}, $content );

			// Also clean up any abandoned empty <figure></figure> or <p></p>
			$new_content = preg_replace( '/<figure[^>]*>\s*<\/figure>/i', '', $new_content );
			$new_content = preg_replace( '/<p[^>]*>\s*<\/p>/i', '', $new_content );

			if ( $new_content !== $post->post_content ) {
				$wpdb->update(
					$wpdb->posts,
					array( 'post_content' => $new_content ),
					array( 'ID' => $pid ),
					array( '%s' ),
					array( '%d' )
				);
				clean_post_cache( $pid );
				$updated++;
			}
		}

		wp_send_json_success( array(
			'message' => sprintf( esc_html__( 'Successfully cleaned broken image tags across %d post(s).', 'post-export-import-with-media' ), $updated ),
			'updated' => $updated,
		) );
	}

	/**
	 * AJAX: Replace a broken image in post content with an image from WordPress Media Library
	 */
	public function ajax_replace_broken_image() {
		$this->verify_security();

		$post_id       = isset( $_POST['post_id'] ) ? absint( $_POST['post_id'] ) : 0;
		$new_url       = isset( $_POST['new_url'] ) ? esc_url_raw( trim( $_POST['new_url'] ) ) : '';
		$old_src       = isset( $_POST['old_src'] ) ? sanitize_text_field( trim( wp_unslash( $_POST['old_src'] ) ) ) : '';
		$attachment_id = isset( $_POST['attachment_id'] ) ? absint( $_POST['attachment_id'] ) : 0;

		if ( ! $post_id || empty( $new_url ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Invalid post ID or replacement image URL.', 'post-export-import-with-media' ) ) );
		}

		$post = get_post( $post_id );
		if ( ! $post || empty( $post->post_content ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Post not found or has empty content.', 'post-export-import-with-media' ) ) );
		}

		global $wpdb;
		$content  = $post->post_content;
		$replaced = false;

		// 1. Direct replacement of old_src in <img> tags if old_src was supplied and not a trivial '#'
		if ( ! empty( $old_src ) && '#' !== $old_src && 'about:blank' !== $old_src && false !== strpos( $content, $old_src ) ) {
			$content  = str_replace( $old_src, $new_url, $content );
			$replaced = true;
		}

		// 2. Pattern replacement to update src, class, and clear obsolete responsive attributes (srcset/sizes)
		$content = preg_replace_callback( '/<img([^>]*)>/i', function( $matches ) use ( $old_src, $new_url, $attachment_id, &$replaced ) {
			$attrs = $matches[1];

			$src = '';
			if ( preg_match( '/src=["\']([^"\']*)["\']/i', $attrs, $sm ) ) {
				$src = trim( $sm[1] );
			}

			// Check if this tag matches the target broken image
			$is_match = false;
			if ( ! empty( $old_src ) && $src === $old_src ) {
				$is_match = true;
			} elseif ( ! $replaced && ( empty( $src ) || '#' === $src || 'about:blank' === $src || ( ! filter_var( $src, FILTER_VALIDATE_URL ) && 0 !== strpos( $src, '/' ) ) ) ) {
				// Fallback: replace first broken image if old_src was blank/not matched
				$is_match = true;
			}

			if ( ! $is_match ) {
				return $matches[0];
			}

			$replaced = true;

			// Replace or insert src attribute
			if ( preg_match( '/src=["\'][^"\']*["\']/i', $attrs ) ) {
				$attrs = preg_replace( '/src=["\'][^"\']*["\']/i', 'src="' . esc_url( $new_url ) . '"', $attrs );
			} else {
				$attrs = ' src="' . esc_url( $new_url ) . '" ' . $attrs;
			}

			// Remove obsolete responsive srcset / sizes pointing to broken images
			$attrs = preg_replace( '/\s*(?:srcset|sizes)=["\'][^"\']*["\']/i', '', $attrs );

			// Update wp-image-XXXX class if attachment ID is available
			if ( $attachment_id > 0 ) {
				if ( preg_match( '/class=["\']([^"\']*)["\']/i', $attrs, $cm ) ) {
					$classes = preg_replace( '/wp-image-\d+/', 'wp-image-' . $attachment_id, $cm[1] );
					if ( strpos( $classes, 'wp-image-' . $attachment_id ) === false ) {
						$classes = trim( $classes . ' wp-image-' . $attachment_id );
					}
					$attrs = preg_replace( '/class=["\'][^"\']*["\']/i', 'class="' . esc_attr( $classes ) . '"', $attrs );
				} else {
					$attrs .= ' class="wp-image-' . $attachment_id . '"';
				}
			}

			return '<img' . $attrs . '>';
		}, $content );

		if ( ! $replaced ) {
			// If still not matched, append new image tag to content
			$content .= "\n" . '<p><img src="' . esc_url( $new_url ) . '" alt="" ' . ( $attachment_id ? 'class="wp-image-' . $attachment_id . '"' : '' ) . ' /></p>';
		}

		$wpdb->update(
			$wpdb->posts,
			array( 'post_content' => $content ),
			array( 'ID' => $post_id ),
			array( '%s' ),
			array( '%d' )
		);
		clean_post_cache( $post_id );

		wp_send_json_success( array(
			'message' => sprintf( esc_html__( 'Image successfully replaced in post #%d.', 'post-export-import-with-media' ), $post_id ),
			'post_id' => $post_id,
			'new_url' => $new_url,
		) );
	}
}
