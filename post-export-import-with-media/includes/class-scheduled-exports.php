<?php
/**
 * Scheduled Exports Handler (Free)
 *
 * Registers the admin submenu page, renders the UI (locked for free, unlocked
 * for PRO), and owns the AJAX action hooks. Actual AJAX logic delegates to
 * PEIWM_Scheduled_Exports_Pro via WordPress filters when PRO is active.
 *
 * @package Post_Export_Import_With_Media
 * @since 1.4.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PEIWM_Scheduled_Exports {

	/** @var PEIWM_Scheduled_Exports|null */
	private static $instance = null;

	/** @var array */
	private $default_settings = array(
		'enable_scheduled_exports'   => false,
		'schedule_frequency'         => 'daily',
		'enable_email_notifications' => false,
		'notification_emails'        => '',
		'enable_backup_rotation'     => false,
		'keep_backups_count'         => 5,
		'storage_mode'               => 'local',
		'gdrive_folder_name'         => 'PEIWM Backups',
		'export_types'               => array( 'posts', 'pages', 'media', 'settings' ),
	);

	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		// Always register the menu, because PRO relies on the Free version to render the UI
		add_action( 'admin_menu', array( $this, 'add_settings_page' ), 40 );
		add_action( 'wp_ajax_peiwm_get_scheduled_backups',     array( $this, 'ajax_get_scheduled_backups' ) );
		add_action( 'wp_ajax_peiwm_delete_scheduled_backup',   array( $this, 'ajax_delete_scheduled_backup' ) );
		add_action( 'wp_ajax_peiwm_download_scheduled_backup', array( $this, 'ajax_download_scheduled_backup' ) );
	}

	// -------------------------------------------------------------------------
	// Menu
	// -------------------------------------------------------------------------

	public function add_settings_page() {
		add_submenu_page(
			'peiwm-secure',
			__( 'Scheduled Exports', 'post-export-import-with-media' ),
			__( 'Scheduled Exports', 'post-export-import-with-media' ),
			'manage_options',
			'peiwm-scheduled-exports',
			array( $this, 'render_settings_page' )
		);
	}

	// -------------------------------------------------------------------------
	// Settings helper
	// -------------------------------------------------------------------------

	public function get_settings() {
		$saved = get_option( 'peiwm_scheduled_exports', array() );
		return wp_parse_args( $saved, $this->default_settings );
	}

	// -------------------------------------------------------------------------
	// AJAX — registered here, logic delegated to PRO via filters
	// -------------------------------------------------------------------------

	public function ajax_get_scheduled_backups() {
		if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ) ), 'peiwm_secure_nonce' ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Security check failed', 'post-export-import-with-media' ) ) );
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Permission denied', 'post-export-import-with-media' ) ) );
		}

		$data = apply_filters( 'peiwm_scheduled_exports_get_backups', array() );
		wp_send_json_success( $data );
	}

	public function ajax_delete_scheduled_backup() {
		if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ) ), 'peiwm_secure_nonce' ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Security check failed', 'post-export-import-with-media' ) ) );
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Permission denied', 'post-export-import-with-media' ) ) );
		}

		$filename = isset( $_POST['filename'] ) ? sanitize_file_name( wp_unslash( $_POST['filename'] ) ) : '';
		if ( empty( $filename ) ) {
			wp_send_json_error( array( 'message' => esc_html__( 'Filename required', 'post-export-import-with-media' ) ) );
		}

		$result = apply_filters( 'peiwm_scheduled_exports_delete_backup', false, $filename );
		if ( $result ) {
			wp_send_json_success( array( 'message' => esc_html__( 'Backup deleted', 'post-export-import-with-media' ) ) );
		} else {
			wp_send_json_error( array( 'message' => esc_html__( 'Failed to delete backup', 'post-export-import-with-media' ) ) );
		}
	}

	public function ajax_download_scheduled_backup() {
		if ( ! isset( $_GET['nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_GET['nonce'] ) ), 'peiwm_secure_nonce' ) ) {
			wp_die( esc_html__( 'Security check failed', 'post-export-import-with-media' ) );
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Permission denied', 'post-export-import-with-media' ) );
		}

		$filename = isset( $_GET['filename'] ) ? sanitize_file_name( wp_unslash( $_GET['filename'] ) ) : '';
		if ( empty( $filename ) ) {
			wp_die( esc_html__( 'Filename required', 'post-export-import-with-media' ) );
		}

		$handled = apply_filters( 'peiwm_scheduled_exports_download_backup', false, $filename );
		if ( ! $handled ) {
			wp_die( esc_html__( 'File not found', 'post-export-import-with-media' ) );
		}
	}

	// -------------------------------------------------------------------------
	// Page renderer
	// -------------------------------------------------------------------------

	public function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'post-export-import-with-media' ) );
		}

		$is_pro      = PEIWM_Main::get_instance()->is_pro_active(); // Just an UI lock, its not a functional lock. 
		$settings    = $this->get_settings();
		$admin_email = get_option( 'admin_email' );
		$next_run    = wp_next_scheduled( 'peiwm_scheduled_export_event' );
		$locked      = ! $is_pro ? ' peiwm-locked-section' : '';

		// Cloud Storage details (when PRO is active)
		$gdrive_connected = false;
		$account_info     = array();
		$client_id        = '';
		$client_secret    = '';
		$auth_url         = '';

		if ( $is_pro && class_exists( 'PEIWM_Cloud_Storage' ) && method_exists( 'PEIWM_Cloud_Storage', 'get_instance' ) ) {
			$cloud_storage = PEIWM_Cloud_Storage::get_instance();
			if ( is_object( $cloud_storage ) && method_exists( $cloud_storage, 'is_connected' ) ) {
				$gdrive_connected = (bool) $cloud_storage->is_connected();
				$account_info     = method_exists( $cloud_storage, 'get_account_info' ) ? (array) $cloud_storage->get_account_info() : array();
				$client_id        = method_exists( $cloud_storage, 'get_client_id' ) ? (string) $cloud_storage->get_client_id() : '';
				$client_secret    = method_exists( $cloud_storage, 'get_client_secret' ) ? (string) $cloud_storage->get_client_secret() : '';
				$auth_url         = method_exists( $cloud_storage, 'get_auth_url' ) ? (string) $cloud_storage->get_auth_url() : '';
			}
		}
		?>
		<div class="wrap peiwm-scheduled-exports-wrap">
			<h1><?php echo esc_html__( 'Scheduled Exports', 'post-export-import-with-media' ); ?></h1>
			<p class="description"><?php echo esc_html__( 'Automate your backups with scheduled exports. Set it and forget it!', 'post-export-import-with-media' ); ?></p>

			<?php if ( isset( $_GET['peiwm_gdrive_success'] ) ) : ?>
				<div class="notice notice-success is-dismissible peiwm-admin-notice">
					<p><?php esc_html_e( 'Successfully connected to Google Drive! Backups will be automatically saved to your Google Drive folder.', 'post-export-import-with-media' ); ?></p>
				</div>
			<?php endif; ?>

			<?php if ( isset( $_GET['peiwm_gdrive_error'] ) ) : ?>
				<div class="notice notice-error is-dismissible peiwm-admin-notice">
					<p><?php echo esc_html( sprintf( __( 'Google Drive connection error: %s', 'post-export-import-with-media' ), sanitize_text_field( wp_unslash( $_GET['peiwm_gdrive_error'] ) ) ) ); ?></p>
				</div>
			<?php endif; ?>

			<?php settings_errors( 'peiwm_scheduled_exports' ); ?>

			<form method="post" action="options.php" id="peiwm-scheduled-exports-form">
				<?php settings_fields( 'peiwm_scheduled_exports' ); ?>

				<!-- Enable -->
				<div class="peiwm-settings-section<?php echo esc_attr( $locked ); ?>">
					<?php if ( ! $is_pro ) : ?>
						<button type="button" class="peiwm-pro-upgrade-overlay peiwm-open-premium-modal">
							<span class="peiwm-pro-upgrade-badge">🔒 <?php echo esc_html__( 'PRO', 'post-export-import-with-media' ); ?></span>
						</button>
					<?php endif; ?>
					<h2><?php echo esc_html__( 'Enable Scheduled Exports', 'post-export-import-with-media' ); ?></h2>
					<label class="peiwm-toggle-switch">
						<input type="checkbox" id="enable_scheduled_exports" name="peiwm_scheduled_exports[enable_scheduled_exports]" value="1"
							<?php checked( $settings['enable_scheduled_exports'], true ); ?>
							<?php echo ! $is_pro ? 'disabled' : ''; ?> />
						<span class="peiwm-toggle-slider"></span>
					</label>
					<p class="description"><?php echo esc_html__( 'Enable automatic scheduled exports of your content.', 'post-export-import-with-media' ); ?></p>
					<?php if ( $is_pro && $next_run ) : ?>
						<p class="peiwm-next-run">
							<strong><?php echo esc_html__( 'Next scheduled run:', 'post-export-import-with-media' ); ?></strong>
							<?php echo esc_html( date_i18n( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), $next_run ) ); ?>
						</p>
					<?php endif; ?>
				</div>

				<!-- Configuration -->
				<div id="peiwm-scheduled-config" class="<?php echo esc_attr( $locked ); ?>">
					<?php if ( ! $is_pro ) : ?>
						<button type="button" class="peiwm-pro-upgrade-overlay peiwm-open-premium-modal">
							<span class="peiwm-pro-upgrade-badge">🔒 <?php echo esc_html__( 'PRO', 'post-export-import-with-media' ); ?></span>
						</button>
					<?php endif; ?>

					<!-- Frequency -->
					<div class="peiwm-settings-section">
						<h2><?php echo esc_html__( 'Schedule Frequency', 'post-export-import-with-media' ); ?></h2>
						<div class="peiwm-frequency-options">
							<?php foreach ( array(
								'daily'   => array( __( 'Daily', 'post-export-import-with-media' ),   __( 'Export once every day', 'post-export-import-with-media' ) ),
								'weekly'  => array( __( 'Weekly', 'post-export-import-with-media' ),  __( 'Export once every week', 'post-export-import-with-media' ) ),
								'monthly' => array( __( 'Monthly', 'post-export-import-with-media' ), __( 'Export once every month', 'post-export-import-with-media' ) ),
							) as $val => $labels ) : ?>
							<label class="peiwm-radio-label">
								<input type="radio" name="peiwm_scheduled_exports[schedule_frequency]" value="<?php echo esc_attr( $val ); ?>"
									<?php checked( $settings['schedule_frequency'], $val ); ?>
									<?php echo ! $is_pro ? 'disabled' : ''; ?>>
								<span class="peiwm-radio-text">
									<strong><?php echo esc_html( $labels[0] ); ?></strong>
									<small><?php echo esc_html( $labels[1] ); ?></small>
								</span>
							</label>
							<?php endforeach; ?>
						</div>
					</div>

					<!-- Export Types -->
					<div class="peiwm-settings-section">
						<h2><?php echo esc_html__( 'What to Export', 'post-export-import-with-media' ); ?></h2>
						<div class="peiwm-export-types">
							<?php foreach ( array(
								'posts'    => __( 'Posts', 'post-export-import-with-media' ),
								'pages'    => __( 'Pages', 'post-export-import-with-media' ),
								'media'    => __( 'Media', 'post-export-import-with-media' ),
								'settings' => __( 'Settings', 'post-export-import-with-media' ),
								'cpt'      => __( 'CPT &amp; ACF', 'post-export-import-with-media' ),
								'users'    => __( 'Users', 'post-export-import-with-media' ),
							) as $val => $label ) : ?>
							<label class="peiwm-checkbox-label">
								<input type="checkbox" name="peiwm_scheduled_exports[export_types][]" value="<?php echo esc_attr( $val ); ?>"
									<?php checked( in_array( $val, (array) $settings['export_types'], true ) ); ?>
									<?php echo ! $is_pro ? 'disabled' : ''; ?>>
								<span class="peiwm-checkbox-text"><?php echo esc_html( $label ); ?></span>
							</label>
							<?php endforeach; ?>
						</div>
					</div>

					<!-- Email Notifications -->
					<div class="peiwm-settings-section">
						<h2><?php echo esc_html__( 'Email Notifications', 'post-export-import-with-media' ); ?></h2>
						<label class="peiwm-toggle-switch">
							<input type="checkbox" id="enable_email_notifications" name="peiwm_scheduled_exports[enable_email_notifications]" value="1"
								<?php checked( $settings['enable_email_notifications'], true ); ?>
								<?php echo ! $is_pro ? 'disabled' : ''; ?> />
							<span class="peiwm-toggle-slider"></span>
						</label>
						<p class="description"><?php echo esc_html__( 'Send email notifications when exports complete.', 'post-export-import-with-media' ); ?></p>
						<div id="peiwm-email-config" class="peiwm-sub-config <?php echo $settings['enable_email_notifications'] ? '' : 'peiwm-hidden'; ?>">
							<label for="notification_emails"><strong><?php echo esc_html__( 'Email Addresses', 'post-export-import-with-media' ); ?></strong></label>
							<textarea id="notification_emails" name="peiwm_scheduled_exports[notification_emails]" rows="3" class="large-text"
								placeholder="<?php echo esc_attr( $admin_email ); ?>"
								<?php echo ! $is_pro ? 'readonly' : ''; ?>><?php echo esc_textarea( $settings['notification_emails'] ); ?></textarea>
							<p class="description">
								<?php echo esc_html__( 'Leave empty to use admin email:', 'post-export-import-with-media' ); ?>
								<strong><?php echo esc_html( $admin_email ); ?></strong>
							</p>
						</div>
					</div>

					<!-- Backup Rotation -->
					<div class="peiwm-settings-section">
						<h2><?php echo esc_html__( 'Backup Rotation', 'post-export-import-with-media' ); ?></h2>
						<label class="peiwm-toggle-switch">
							<input type="checkbox" id="enable_backup_rotation" name="peiwm_scheduled_exports[enable_backup_rotation]" value="1"
								<?php checked( $settings['enable_backup_rotation'], true ); ?>
								<?php echo ! $is_pro ? 'disabled' : ''; ?> />
							<span class="peiwm-toggle-slider"></span>
						</label>
						<p class="description"><?php echo esc_html__( 'Automatically delete old backups to save space.', 'post-export-import-with-media' ); ?></p>
						<div id="peiwm-rotation-config" class="peiwm-sub-config <?php echo $settings['enable_backup_rotation'] ? '' : 'peiwm-hidden'; ?>">
							<label for="keep_backups_count"><strong><?php echo esc_html__( 'Keep Last N Backups', 'post-export-import-with-media' ); ?></strong></label>
							<input type="number" id="keep_backups_count" name="peiwm_scheduled_exports[keep_backups_count]"
								value="<?php echo esc_attr( $settings['keep_backups_count'] ); ?>"
								min="1" max="100" class="small-text"
								<?php echo ! $is_pro ? 'readonly' : ''; ?> />
							<p class="description"><?php echo esc_html__( 'Number of recent backups to keep. (Range: 1-100)', 'post-export-import-with-media' ); ?></p>
						</div>
					</div>

					<!-- Storage Mode -->
					<div class="peiwm-settings-section">
						<h2><?php echo esc_html__( 'Storage Mode', 'post-export-import-with-media' ); ?></h2>
						<div class="peiwm-storage-modes">
							<label class="peiwm-storage-mode-card <?php echo 'local' === $settings['storage_mode'] ? 'active' : ''; ?>">
								<input type="radio" name="peiwm_scheduled_exports[storage_mode]" value="local"
									<?php checked( $settings['storage_mode'], 'local' ); ?>
									<?php echo ! $is_pro ? 'disabled' : ''; ?>>
								<div class="peiwm-storage-mode-content">
									<div class="peiwm-storage-mode-icon">💾</div>
									<h3><?php echo esc_html__( 'Local Storage', 'post-export-import-with-media' ); ?></h3>
									<p><?php echo esc_html__( 'Save backups to your server', 'post-export-import-with-media' ); ?></p>
									<div class="peiwm-storage-badges-wrap">
										<span class="peiwm-storage-mode-badge peiwm-storage-active-tag"><?php echo esc_html__( 'Active', 'post-export-import-with-media' ); ?></span>
									</div>
								</div>
							</label>

							<label class="peiwm-storage-mode-card <?php echo ( ! $is_pro ) ? 'disabled peiwm-open-premium-modal' : ( 'google_drive' === $settings['storage_mode'] ? 'active' : '' ); ?>" id="peiwm-card-google-drive">
								<input type="radio" name="peiwm_scheduled_exports[storage_mode]" value="google_drive"
									<?php checked( $settings['storage_mode'], 'google_drive' ); ?>
									<?php echo ! $is_pro ? 'disabled' : ''; ?>>
								<div class="peiwm-storage-mode-content">
									<div class="peiwm-storage-mode-icon">☁️</div>
									<h3><?php echo esc_html__( 'Google Drive', 'post-export-import-with-media' ); ?></h3>
									<p><?php echo esc_html__( 'Save backups to Google Drive', 'post-export-import-with-media' ); ?></p>
									<div class="peiwm-storage-badges-wrap">
										<?php if ( ! $is_pro ) : ?>
											<span class="peiwm-storage-mode-badge coming-soon">🔒 <?php echo esc_html__( 'PRO', 'post-export-import-with-media' ); ?></span>
										<?php else : ?>
											<span class="peiwm-storage-mode-badge peiwm-storage-active-tag"><?php echo esc_html__( 'Active', 'post-export-import-with-media' ); ?></span>
											<?php if ( $gdrive_connected ) : ?>
												<span class="peiwm-storage-mode-badge connected">✓ <?php echo esc_html__( 'Connected', 'post-export-import-with-media' ); ?></span>
											<?php else : ?>
												<span class="peiwm-storage-mode-badge setup-required">⚙️ <?php echo esc_html__( 'Setup Required', 'post-export-import-with-media' ); ?></span>
											<?php endif; ?>
										<?php endif; ?>
									</div>
								</div>
							</label>
						</div>

						<?php if ( $is_pro ) : ?>
							<!-- Google Drive Configuration Panel -->
							<div id="peiwm-google-drive-config" class="peiwm-google-drive-config <?php echo ( 'google_drive' === $settings['storage_mode'] ) ? '' : 'peiwm-hidden'; ?>">
								<h3>
									<span>☁️</span> <?php esc_html_e( 'Google Drive Configuration', 'post-export-import-with-media' ); ?>
								</h3>

								<!-- Connection Status & Connect/Disconnect Actions -->
								<div class="peiwm-gdrive-status-wrap">
									<div class="peiwm-gdrive-status-info">
										<div class="peiwm-gdrive-status-dot <?php echo $gdrive_connected ? 'connected' : ''; ?>"></div>
										<div>
											<strong><?php echo $gdrive_connected ? esc_html__( 'Google Drive is Connected', 'post-export-import-with-media' ) : esc_html__( 'Google Drive is Not Connected', 'post-export-import-with-media' ); ?></strong>
											<?php if ( $gdrive_connected && ! empty( $account_info['email'] ) ) : ?>
												<p class="description peiwm-gdrive-account-email"><?php echo esc_html( sprintf( __( 'Account: %s', 'post-export-import-with-media' ), $account_info['email'] ) ); ?></p>
											<?php endif; ?>
										</div>
									</div>
									<div class="peiwm-gdrive-status-actions">
										<?php if ( $gdrive_connected ) : ?>
											<button type="button" id="peiwm-gdrive-test-btn" class="button button-secondary">
												<?php esc_html_e( 'Test Connection', 'post-export-import-with-media' ); ?>
											</button>
											<button type="button" id="peiwm-gdrive-disconnect-btn" class="button button-link-delete peiwm-btn-disconnect">
												<?php esc_html_e( 'Disconnect', 'post-export-import-with-media' ); ?>
											</button>
										<?php else : ?>
											<?php if ( ! empty( $auth_url ) ) : ?>
												<a href="<?php echo esc_url( $auth_url ); ?>" class="button button-primary peiwm-btn-connect-gdrive">
													<span>🔑</span> <?php esc_html_e( 'Connect with Google Drive', 'post-export-import-with-media' ); ?>
												</a>
											<?php else : ?>
												<span class="description peiwm-gdrive-config-warning">
													⚠️ <?php esc_html_e( 'Configure Client ID & Secret below first to connect.', 'post-export-import-with-media' ); ?>
												</span>
											<?php endif; ?>
										<?php endif; ?>
									</div>
								</div>

								<!-- Folder Name -->
								<div class="peiwm-gdrive-folder-field">
									<label for="gdrive_folder_name"><strong><?php esc_html_e( 'Google Drive Folder Name', 'post-export-import-with-media' ); ?></strong></label>
									<p class="description"><?php esc_html_e( 'Backups will be automatically uploaded into this folder inside your Google Drive.', 'post-export-import-with-media' ); ?></p>
									<input type="text" id="gdrive_folder_name" name="peiwm_scheduled_exports[gdrive_folder_name]"
										value="<?php echo esc_attr( $settings['gdrive_folder_name'] ?? 'PEIWM Backups' ); ?>"
										class="regular-text peiwm-folder-name-input" />
								</div>

								<!-- Google API Credentials Drawer -->
								<details class="peiwm-gdrive-credentials-drawer">
									<summary class="peiwm-gdrive-drawer-summary">
										⚙️ <?php esc_html_e( 'Google Cloud API Credentials (1-Time Setup)', 'post-export-import-with-media' ); ?>
									</summary>
									<div class="peiwm-gdrive-drawer-body">
										<p class="description peiwm-gdrive-drawer-desc">
											<?php esc_html_e( 'To connect your Google Drive without sharing data with any third party, create a free OAuth Client in Google Cloud Console:', 'post-export-import-with-media' ); ?>
										</p>
										<?php
										$gdrive_site_url     = home_url( '/' );
										$gdrive_site_domain  = wp_parse_url( home_url(), PHP_URL_HOST );
										$gdrive_privacy_url  = get_privacy_policy_url() ? get_privacy_policy_url() : home_url( '/privacy-policy' );
										$gdrive_redirect_uri = admin_url( 'admin.php?page=peiwm-scheduled-exports&action=peiwm_gdrive_auth' );
										?>
										<!-- Option 1: Step-by-Step Guide Toggle -->
										<details class="peiwm-guide-toggle-step">
											<summary class="peiwm-guide-toggle-summary peiwm-guide-toggle-step-summary">
												<span>📖</span> <?php esc_html_e( 'Step-by-Step Setup Guide (Click to View / Hide)', 'post-export-import-with-media' ); ?>
											</summary>
											<div class="peiwm-guide-step-content">
												<ol class="peiwm-gdrive-steps">
													<li>
														<strong><?php esc_html_e( 'Open Google Cloud Console:', 'post-export-import-with-media' ); ?></strong>
														<?php echo wp_kses_post( __( 'Go to <a href="https://console.cloud.google.com/apis/dashboard" target="_blank" rel="noopener noreferrer">Google Cloud Console</a> (opens in a new tab).', 'post-export-import-with-media' ) ); ?>
													</li>
													<li>
														<strong><?php esc_html_e( 'Accept Terms of Service:', 'post-export-import-with-media' ); ?></strong>
														<?php esc_html_e( 'If prompted with Google Cloud "Terms of Service", check the agreement box and click Agree and continue.', 'post-export-import-with-media' ); ?>
													</li>
													<li>
														<strong><?php esc_html_e( 'Create a New Project:', 'post-export-import-with-media' ); ?></strong>
														<?php esc_html_e( 'In the top-left toolbar, click "Select a project" (or your current project dropdown). In the popup modal, click "NEW PROJECT" in the top-right corner. Enter a Project Name (e.g. PEIWM Backup), leave Parent resource / Location as "No organization", and click CREATE. Once created, select your new project (you can also click the notification bell icon to jump straight into it).', 'post-export-import-with-media' ); ?>
													</li>
													<li>
														<strong><?php esc_html_e( 'Configure & Publish OAuth Consent Screen:', 'post-export-import-with-media' ); ?></strong>
														<?php esc_html_e( 'Open the left sidebar menu (click the ☰ hamburger icon if collapsed) and navigate to APIs & Services > OAuth consent screen (or Branding):', 'post-export-import-with-media' ); ?>
														<ul class="peiwm-sub-steps-list">
															<li>
																<strong><?php esc_html_e( 'Branding / App Information:', 'post-export-import-with-media' ); ?></strong>
																<?php esc_html_e( 'Enter an App name (e.g. My Site Backup) and User support email.', 'post-export-import-with-media' ); ?>
															</li>
															<li>
																<strong><?php esc_html_e( 'App Domain:', 'post-export-import-with-media' ); ?></strong><br>
																• <?php esc_html_e( 'Application home page:', 'post-export-import-with-media' ); ?> <code class="peiwm-code-snippet"><?php echo esc_url( $gdrive_site_url ); ?></code><br>
																• <?php esc_html_e( 'Privacy Policy:', 'post-export-import-with-media' ); ?> <code class="peiwm-code-snippet"><?php echo esc_url( $gdrive_privacy_url ); ?></code><br>
																• <?php esc_html_e( 'Terms of Service:', 'post-export-import-with-media' ); ?> <code class="peiwm-code-snippet"><?php echo esc_url( $gdrive_site_url ); ?></code>
															</li>
															<li>
																<strong><?php esc_html_e( 'Authorized Domain:', 'post-export-import-with-media' ); ?></strong>
																<?php esc_html_e( 'Add your domain:', 'post-export-import-with-media' ); ?> <code class="peiwm-code-snippet"><?php echo esc_html( $gdrive_site_domain ); ?></code> <?php esc_html_e( '(if not already set) and click Save.', 'post-export-import-with-media' ); ?>
															</li>
															<li>
																<strong><?php esc_html_e( 'Publish Status (Crucial):', 'post-export-import-with-media' ); ?></strong>
																<?php esc_html_e( 'Go to Audience (or Publishing status). Click "Publish app", and in the confirmation modal click "Confirm".', 'post-export-import-with-media' ); ?>
																<div class="peiwm-guide-note">
																	⚠️ <strong><?php esc_html_e( 'Note:', 'post-export-import-with-media' ); ?></strong> <?php esc_html_e( 'Publishing the app is required so that your Google account is allowed to connect without showing "Access blocked".', 'post-export-import-with-media' ); ?>
																</div>
															</li>
														</ul>
													</li>
													<li>
														<strong><?php esc_html_e( 'Enable Google Drive API:', 'post-export-import-with-media' ); ?></strong>
														<?php esc_html_e( 'In the left sidebar menu (☰), click "Enabled APIs & services", then click "+ ENABLE APIS AND SERVICES" at the top. Search for "Google Drive API", click it, and click ENABLE.', 'post-export-import-with-media' ); ?>
													</li>
													<li>
														<strong><?php esc_html_e( 'Create OAuth Client ID:', 'post-export-import-with-media' ); ?></strong>
														<?php esc_html_e( 'In the left sidebar under APIs & Services, click "Credentials". Click "+ CREATE CREDENTIALS" at the top and select "OAuth client ID":', 'post-export-import-with-media' ); ?>
														<ul class="peiwm-sub-steps-list">
															<li><?php esc_html_e( 'Application type: Select', 'post-export-import-with-media' ); ?> <strong><?php esc_html_e( 'Web application', 'post-export-import-with-media' ); ?></strong>.</li>
															<li><?php esc_html_e( 'Name: e.g.', 'post-export-import-with-media' ); ?> <code>PEIWM Web Client</code>.</li>
															<li>
																<?php esc_html_e( 'Under "Authorized redirect URIs", click "+ ADD URI" and paste this exact URL:', 'post-export-import-with-media' ); ?>
																<div class="peiwm-gdrive-redirect-wrap">
																	<code id="peiwm-gdrive-redirect-uri"><?php echo esc_url( $gdrive_redirect_uri ); ?></code>
																	<button type="button" id="peiwm-copy-redirect-uri" class="button button-small"><?php esc_html_e( 'Copy', 'post-export-import-with-media' ); ?></button>
																</div>
															</li>
														</ul>
														<?php esc_html_e( 'Click CREATE.', 'post-export-import-with-media' ); ?>
													</li>
													<li>
														<strong><?php esc_html_e( 'Copy & Save Credentials:', 'post-export-import-with-media' ); ?></strong>
														<?php esc_html_e( 'A modal will appear displaying your Client ID and Client Secret. Copy and paste them into the input fields below, then click "Save Credentials".', 'post-export-import-with-media' ); ?>
													</li>
													<li>
														<strong><?php esc_html_e( 'Connect with Google Drive:', 'post-export-import-with-media' ); ?></strong>
														<?php esc_html_e( 'Click the "Connect with Google Drive" button above:', 'post-export-import-with-media' ); ?>
														<ul class="peiwm-sub-steps-list">
															<li><?php esc_html_e( 'Select the Gmail / Google account where your app was created (or any account you wish to store backups in).', 'post-export-import-with-media' ); ?></li>
															<li><?php esc_html_e( 'If you see "Google hasn\'t verified this app" with "Continue" and "Back to safety" buttons, click Continue (or Advanced > Continue).', 'post-export-import-with-media' ); ?></li>
															<li><?php esc_html_e( 'Check the checkbox to grant permission to "See, edit, create, and delete only the specific Google Drive files you use with this app", then click Continue.', 'post-export-import-with-media' ); ?></li>
															<li><?php esc_html_e( 'Once redirected back, you will see the "Successfully connected to Google Drive!" notice.', 'post-export-import-with-media' ); ?></li>
															<li><?php esc_html_e( 'You can click "Test Connection" anytime to verify your connection.', 'post-export-import-with-media' ); ?></li>
														</ul>
													</li>
												</ol>

												<div class="peiwm-guide-all-set">
													<span>🎉</span>
													<span><?php esc_html_e( 'All set! Backups will now automatically export and upload to your Google Drive folder based on your chosen Schedule Frequency.', 'post-export-import-with-media' ); ?></span>
												</div>
											</div>
										</details>

										<!-- Option 2: Video Tutorial Toggle -->
										<details class="peiwm-guide-toggle-video">
											<summary class="peiwm-guide-toggle-summary peiwm-guide-toggle-video-summary">
												<span>▶️</span> <?php esc_html_e( 'Follow Video Tutorial (Click to View / Hide)', 'post-export-import-with-media' ); ?>
											</summary>
											<div class="peiwm-guide-video-card">
												<div class="peiwm-guide-video-info">
													<h4 class="peiwm-guide-video-title">
														<span>🎬</span> <?php esc_html_e( 'Watch Step-by-Step Video Guide', 'post-export-import-with-media' ); ?>
													</h4>
													<p class="description peiwm-guide-video-desc">
														<?php esc_html_e( 'Prefer visual instructions? Watch our step-by-step video on YouTube to configure Google Cloud Console and link Google Drive in minutes.', 'post-export-import-with-media' ); ?>
													</p>
												</div>
												<div>
													<a href="https://www.youtube.com/@wpazleen" target="_blank" rel="noopener noreferrer" class="button peiwm-btn-youtube">
														<span class="dashicons dashicons-video-alt3"></span>
														<span class="peiwm-btn-text"><?php esc_html_e( 'Watch on YouTube', 'post-export-import-with-media' ); ?> ↗</span>
													</a>
												</div>
											</div>
										</details>

										<div class="peiwm-gdrive-credentials-grid">
											<div>
												<label for="peiwm_gdrive_client_id"><strong><?php esc_html_e( 'Client ID', 'post-export-import-with-media' ); ?></strong></label>
												<input type="text" id="peiwm_gdrive_client_id" value="<?php echo esc_attr( $client_id ); ?>" class="large-text peiwm-cred-input" placeholder="xxxx.apps.googleusercontent.com" />
											</div>
											<div>
												<label for="peiwm_gdrive_client_secret"><strong><?php esc_html_e( 'Client Secret', 'post-export-import-with-media' ); ?></strong></label>
												<input type="password" id="peiwm_gdrive_client_secret" value="<?php echo esc_attr( $client_secret ); ?>" class="large-text peiwm-cred-input" placeholder="GOCSPX-xxxx" />
											</div>
										</div>

										<div class="peiwm-gdrive-credentials-actions">
											<button type="button" id="peiwm-save-gdrive-credentials-btn" class="button button-secondary">
												<?php esc_html_e( 'Save Credentials', 'post-export-import-with-media' ); ?>
											</button>
											<span id="peiwm-gdrive-cred-feedback"></span>
										</div>
									</div>
								</details>
							</div>
						<?php endif; ?>
					</div>

				</div><!-- /#peiwm-scheduled-config -->

				<?php if ( $is_pro ) : ?>
					<?php submit_button( __( 'Save Settings', 'post-export-import-with-media' ), 'primary', 'submit', true ); ?>
				<?php endif; ?>
			</form>

			<?php if ( $is_pro ) : ?>
			<div class="peiwm-settings-section peiwm-backups-section">
				<h2><?php echo esc_html__( 'Existing Backups', 'post-export-import-with-media' ); ?></h2>
				<p class="description"><?php echo esc_html__( 'Manage your scheduled export backups.', 'post-export-import-with-media' ); ?></p>
				<button type="button" id="peiwm-refresh-backups" class="button button-secondary">
					<?php echo esc_html__( 'Refresh List', 'post-export-import-with-media' ); ?>
				</button>
				<div id="peiwm-backups-list" class="peiwm-backups-list">
					<div class="peiwm-loading">
						<div class="peiwm-loading-spinner"></div>
						<p><?php echo esc_html__( 'Loading backups...', 'post-export-import-with-media' ); ?></p>
					</div>
				</div>
			</div>

			<!-- Delete Confirmation Modal — must be in DOM for JS to find it -->
			<div id="peiwm-delete-modal" class="peiwm-modal-overlay">
				<div class="peiwm-modal peiwm-danger-modal">
					<div class="peiwm-modal-header">
						<h3><?php echo esc_html__( 'Delete Backup', 'post-export-import-with-media' ); ?></h3>
						<button type="button" class="peiwm-modal-close">&times;</button>
					</div>
					<div class="peiwm-modal-body">
						<div class="peiwm-danger-icon">⚠️</div>
						<p><?php echo esc_html__( 'Are you sure you want to delete this backup?', 'post-export-import-with-media' ); ?></p>
						<p class="peiwm-modal-filename"></p>
						<p class="peiwm-modal-subtext"><?php echo esc_html__( 'This action cannot be undone.', 'post-export-import-with-media' ); ?></p>
					</div>
					<div class="peiwm-modal-footer">
						<button type="button" id="peiwm-delete-cancel" class="button button-secondary">
							<?php echo esc_html__( 'Cancel', 'post-export-import-with-media' ); ?>
						</button>
						<button type="button" id="peiwm-delete-confirm" class="button button-danger">
							<?php echo esc_html__( 'Delete Backup', 'post-export-import-with-media' ); ?>
						</button>
					</div>
				</div>
			</div>
			<?php endif; ?>

		</div><!-- /.wrap -->

		<?php if ( ! $is_pro ) : ?>
		<div id="peiwm-premium-modal" class="peiwm-modal-overlay">
			<div class="peiwm-modal peiwm-premium-modal">
				<button type="button" class="peiwm-modal-close peiwm-premium-close">&times;</button>
				<div class="peiwm-premium-modal-body">
					<div class="peiwm-premium-badge-wrap">
						<span class="peiwm-premium-fire">🔥</span>
						<span class="peiwm-premium-offer-tag"><?php echo esc_html__( 'LIMITED TIME OFFER', 'post-export-import-with-media' ); ?></span>
					</div>
					<div class="peiwm-premium-icon">🚀</div>
					<h2 class="peiwm-premium-title"><?php echo esc_html__( 'Unlock PRO Features', 'post-export-import-with-media' ); ?></h2>
					<p class="peiwm-premium-subtitle"><?php echo esc_html__( 'You\'re one step away from powerful automation tools!', 'post-export-import-with-media' ); ?></p>
					<div class="peiwm-premium-features">
						<div class="peiwm-premium-feature">✓ <?php echo esc_html__( 'Scheduled Automatic Exports', 'post-export-import-with-media' ); ?></div>
						<div class="peiwm-premium-feature">✓ <?php echo esc_html__( 'Email Notifications', 'post-export-import-with-media' ); ?></div>
						<div class="peiwm-premium-feature">✓ <?php echo esc_html__( 'Backup Rotation', 'post-export-import-with-media' ); ?></div>
						<div class="peiwm-premium-feature">✓ <?php echo esc_html__( 'Cloud Storage (Coming Soon)', 'post-export-import-with-media' ); ?></div>
					</div>
					<div class="peiwm-premium-urgency">
						<span class="peiwm-urgency-dot"></span>
						<?php echo esc_html__( 'Special offer active — grab it before it\'s gone!', 'post-export-import-with-media' ); ?>
					</div>
					<a href="https://wpazleen.com/post-export-import-with-media/" target="_blank" class="peiwm-premium-cta-btn">
						<?php echo esc_html__( 'Get PRO Now →', 'post-export-import-with-media' ); ?>
					</a>
					<p class="peiwm-premium-note"><?php echo esc_html__( 'Instant access · 14-day money back guarantee', 'post-export-import-with-media' ); ?></p>
				</div>
			</div>
		</div>
		<?php endif; ?>
		<?php
	}
}
