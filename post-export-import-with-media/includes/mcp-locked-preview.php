<?php
/**
 * MCP & Remote Sync - Preview & Locked Template (Free Base & Old Pro Fallback).
 *
 * Implements the exact native PEIWM design pattern matching FlexTable reference:
 * - 4-step Migration Journey flow
 * - Connector URL with copy and reachability hints
 * - 7 AI Client tabs: Claude Code, Claude Desktop, Claude.ai, Codex, Cursor, VS Code, Others
 * - Eye show/hide password toggle, credential expiry, and consent check
 * - Credentials and policies: Strict mode, default expiry, publishing, allow delete, allow read, media & acf
 * - Connected clients with Revoke and Revoke All
 * - Connection self-test with checklist
 * - Available tools catalog with badges and schemas
 * - Site-to-Site live sync (Push & Pull)
 * - Pro upgrade modal (#peiwm-premium-modal) with click handlers
 * - Old Pro update notice banner
 *
 * @since 1.3.0
 * @package Post_Export_Import_With_Media
 */

defined( 'ABSPATH' ) || exit;

$is_pro       = PEIWM_Main::get_instance()->is_pro_active();
$is_old_pro   = ! empty( $peiwm_mcp_old_pro_notice );
$is_locked    = ! $is_pro || $is_old_pro;
$current_user = wp_get_current_user();
$username     = $current_user && ! empty( $current_user->user_login ) ? $current_user->user_login : 'admin';
$connector_url = rest_url( 'peiwm-mcp/v1/mcp' );
$is_https      = is_ssl();
$is_local      = in_array( wp_get_environment_type(), [ 'local', 'development' ], true ) || in_array( $_SERVER['REMOTE_ADDR'] ?? '', [ '127.0.0.1', '::1' ], true );

/**
 * MCP tools catalog preview (Pro). Format: slug => [ title, benefit line, tier, type ]
 * tier: free | pro. type: read | write | danger
 */
$peiwm_mcp_tools = array(
	// Status and discovery.
	// 'peiwm-get-status'           => array( __( 'Get Site Status & MCP Capabilities', 'post-export-import-with-media' ), __( 'Start here. See version, license, safety policies and connected sites at a glance.', 'post-export-import-with-media' ), 'free', 'read' ),
	'peiwm-get-status'           => array( __( 'Get Site Status & MCP Capabilities', 'post-export-import-with-media' ), __( 'Start here. See version, license, safety policies and connected sites at a glance.', 'post-export-import-with-media' ), 'pro', 'read' ),
	'peiwm-describe-settings'    => array( __( 'Describe MCP Settings & Policies', 'post-export-import-with-media' ), __( 'Let your AI agent read every policy and limit before it touches your site.', 'post-export-import-with-media' ), 'pro', 'read' ),
	'peiwm-list-post-types'      => array( __( 'List Supported Post Types', 'post-export-import-with-media' ), __( 'Know exactly what content you can move, with item counts by status.', 'post-export-import-with-media' ), 'pro', 'read' ),
	'peiwm-list-acf-groups'      => array( __( 'List ACF Field Groups', 'post-export-import-with-media' ), __( 'Discover every ACF group and its post types so custom fields never get lost.', 'post-export-import-with-media' ), 'pro', 'read' ),

	// Content.
	'peiwm-find-content'         => array( __( 'Find Posts, Pages & Media by Filter Criteria', 'post-export-import-with-media' ), __( 'Search any post type by status, author, date or keyword in seconds.', 'post-export-import-with-media' ), 'pro', 'read' ),
	'peiwm-get-content'          => array( __( 'Retrieve Full Post Details with Meta & ACF', 'post-export-import-with-media' ), __( 'Get taxonomies, custom fields and media references for any single item.', 'post-export-import-with-media' ), 'pro', 'read' ),
	'peiwm-create-content'       => array( __( 'Create Posts & Pages from AI Written Content', 'post-export-import-with-media' ), __( 'Turn a brief into a ready draft with categories, tags and SEO fields filled in.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-update-content'       => array( __( 'Edit Content with Safe Find & Replace', 'post-export-import-with-media' ), __( 'Make targeted edits with a preview first. Every change is saved as a revision.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-set-content-status'   => array( __( 'Change Post Status with Confirmation', 'post-export-import-with-media' ), __( 'Move content between draft, private and publish behind a confirmation step.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-trash-content'        => array( __( 'Move Content to Trash Safely', 'post-export-import-with-media' ), __( 'Clean up in bulk with a preview and a single use confirmation token.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-untrash-content'      => array( __( 'Restore Content from Trash', 'post-export-import-with-media' ), __( 'Bring trashed posts and pages back in one call.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-delete-content'       => array( __( 'Permanently Delete Content', 'post-export-import-with-media' ), __( 'Full control for admins. Locked behind a site policy, preview and confirmation.', 'post-export-import-with-media' ), 'pro', 'danger' ),

	// SEO.
	'peiwm-audit-seo'            => array( __( 'Audit SEO Scores Across Your Site', 'post-export-import-with-media' ), __( 'Score every post from 0 to 100 and see exactly which issues to fix first.', 'post-export-import-with-media' ), 'pro', 'read' ),
	'peiwm-update-seo'           => array( __( 'Fix Focus Keyword, Title, Meta & ALT Text', 'post-export-import-with-media' ), __( 'Works with Yoast, Rank Math, AIOSEO and SEOPress, with before and after scores.', 'post-export-import-with-media' ), 'pro', 'write' ),

	// Media.
	'peiwm-list-media'           => array( __( 'List Media Library Items', 'post-export-import-with-media' ), __( 'Filter by type, date or unattached status with file sizes and hashes.', 'post-export-import-with-media' ), 'pro', 'read' ),
	'peiwm-get-media-info'       => array( __( 'Get Media File Metadata', 'post-export-import-with-media' ), __( 'Dimensions, SHA 256 hash, ALT text and generated sizes for any attachment.', 'post-export-import-with-media' ), 'pro', 'read' ),
	'peiwm-media-editor'         => array( __( 'Bulk Media Title & ALT Editor', 'post-export-import-with-media' ), __( 'Find images with missing ALT text and fix hundreds of them at once.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-media-health'         => array( __( 'Media Health & Audit', 'post-export-import-with-media' ), __( 'Detect missing files, duplicates, large and unused media, then repair them.', 'post-export-import-with-media' ), 'pro', 'write' ),

	// Migration and maintenance suite.
	'peiwm-post-tools'           => array( __( 'Post Tools & Migration Suite', 'post-export-import-with-media' ), __( 'Export, import, find and replace, fix duplicates, broken images and internal links.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-users'                => array( __( 'Users Export & Import', 'post-export-import-with-media' ), __( 'Move users with meta, WooCommerce and ACF data. Password hashes are never exported.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-wp-settings'          => array( __( 'WordPress Settings, Widgets & Menus Export Import', 'post-export-import-with-media' ), __( 'Clone site settings, widgets and navigation menus to a new site.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-themes-plugins'       => array( __( 'Themes & Plugins Export', 'post-export-import-with-media' ), __( 'List and package your active themes and plugins as ZIP files.', 'post-export-import-with-media' ), 'pro', 'read' ),

	// Automation and settings.
	'peiwm-scheduled-exports'    => array( __( 'Scheduled Exports & Backups', 'post-export-import-with-media' ), __( 'Automate daily, weekly or monthly backups to local storage or Google Drive.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-batch-settings'       => array( __( 'Batch Processing Settings', 'post-export-import-with-media' ), __( 'Tune batch sizes and speed presets so large sites export without timeouts.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-email-templates'      => array( __( 'Email Template Settings', 'post-export-import-with-media' ), __( 'Brand your notification emails with your colors and footer, and send a test.', 'post-export-import-with-media' ), 'pro', 'write' ),

	// Site to site transfer.
	'peiwm-list-connections'     => array( __( 'List Remote Site Connections', 'post-export-import-with-media' ), __( 'See every linked site with its role, endpoint and limits.', 'post-export-import-with-media' ), 'pro', 'read' ),
	'peiwm-compare-with-remote'  => array( __( 'Compare Content with a Remote Site', 'post-export-import-with-media' ), __( 'Spot new, modified and missing items before you sync anything.', 'post-export-import-with-media' ), 'pro', 'read' ),
	'peiwm-transfer-preview'     => array( __( 'Dry run Diff & Preview Site to Site Transfer', 'post-export-import-with-media' ), __( 'See conflicts and item counts first, then approve with a one time token.', 'post-export-import-with-media' ), 'pro', 'read' ),
	'peiwm-transfer-push'        => array( __( 'Push Content and Media to Remote WordPress Site', 'post-export-import-with-media' ), __( 'Send posts, pages, CPTs and media to staging or production in one flow.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-transfer-pull'        => array( __( 'Pull Content and Media from Remote WordPress Site', 'post-export-import-with-media' ), __( 'Fetch content from another site with your choice of conflict policy.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-transfer-status'      => array( __( 'Track Transfer Progress', 'post-export-import-with-media' ), __( 'Live state, counts and per item results for any transfer job.', 'post-export-import-with-media' ), 'pro', 'read' ),
	'peiwm-transfer-continue'    => array( __( 'Resume Large Transfers', 'post-export-import-with-media' ), __( 'Process big jobs in safe time windows so servers never time out.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-transfer-cancel'      => array( __( 'Cancel a Running Transfer', 'post-export-import-with-media' ), __( 'Stop any job instantly. Items already moved stay safely in place.', 'post-export-import-with-media' ), 'pro', 'write' ),
	'peiwm-transfer-rollback'    => array( __( 'Full Rollback of Any Previous Sync Job', 'post-export-import-with-media' ), __( 'Restore updated posts to their before state and trash newly created ones.', 'post-export-import-with-media' ), 'pro', 'write' ),

	// Safety net.
	'peiwm-list-recent-operations' => array( __( 'List Recent Operations', 'post-export-import-with-media' ), __( 'A clear audit trail of what your AI agent changed and what can be reverted.', 'post-export-import-with-media' ), 'pro', 'read' ),
	'peiwm-undo-operation'       => array( __( 'Undo Any AI Operation', 'post-export-import-with-media' ), __( 'Revert title, content, status, slug or featured image with one confirmed step.', 'post-export-import-with-media' ), 'pro', 'write' ),
);

$peiwm_type_labels = array(
	'read'   => array( 'badge-read', __( 'Read only', 'post-export-import-with-media' ) ),
	'write'  => array( 'badge-write', __( 'Changes Data', 'post-export-import-with-media' ) ),
	'danger' => array( 'badge-write', __( 'Destructive', 'post-export-import-with-media' ) ),
);

?>

<style>
/* Embedded Journey and Button styles ensuring 100% consistent styling */
.journey {
    background: linear-gradient(120deg, #12213F 0%, #1A2E52 60%, #23345A 100%);
    border-radius: 20px;
    padding: 26px 28px 22px;
    margin-bottom: 26px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 20px 48px rgba(18, 33, 63, 0.14);
}
.journey::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(600px 260px at 85% -10%, rgba(255, 106, 61, 0.35), transparent 60%), radial-gradient(500px 240px at 10% 120%, rgba(15, 182, 168, 0.28), transparent 60%);
    pointer-events: none;
}
.journey-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    margin-bottom: 22px;
    flex-wrap: wrap;
    gap: 10px;
}
.journey-head h2 {
    color: #fff !important;
    font-size: 18px !important;
    margin: 0 !important;
    border: none !important;
}
.journey-head p {
    color: #AEB8D4 !important;
    font-size: 12.5px !important;
    margin-top: 4px !important;
    margin-bottom: 0 !important;
}
.journey-badge {
    font-size: 11.5px;
    font-weight: 600;
    color: #FFD9C6;
    background: rgba(255, 106, 61, 0.18);
    border: 1px solid rgba(255, 106, 61, 0.4);
    padding: 5px 11px;
    border-radius: 20px;
}
.steps {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    position: relative;
}
.step {
    position: relative;
    padding: 0 14px 0 0;
    cursor: pointer;
    border: none;
    background: transparent;
    text-align: left;
    margin: 0;
}
.step-connector {
    position: absolute;
    top: 18px;
    left: calc(38% + 80px);
    right: 0%;
    height: 2px;
    background: rgba(255, 255, 255, 0.15);
    z-index: 0;
}
.step:last-child .step-connector {
    display: none;
}
.step-top {
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
    z-index: 1;
    margin-bottom: 10px;
}
.step-num {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.08);
    color: #8B96B8;
    font-weight: 700;
    font-size: 13px;
    border: 1.5px solid rgba(255, 255, 255, 0.18);
    transition: all .2s ease;
}
.step.active .step-num {
    background: #FF6A3D;
    color: #fff;
    border-color: #FF6A3D;
    box-shadow: 0 0 0 5px rgba(255, 106, 61, 0.22);
}
.step-title {
    color: #fff;
    font-size: 13.5px;
    font-weight: 600;
}
.step-desc {
    color: #9FA9C7;
    font-size: 12px;
    line-height: 1.5;
    padding-right: 6px;
    margin: 0;
}

/* Button Styles matching PEIWM standard */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid transparent;
    transition: all .18s ease;
    white-space: nowrap;
    cursor: pointer;
    text-decoration: none;
}
.btn svg {
    width: 14px;
    height: 14px;
}
.btn-primary {
    background: #FF6A3D !important;
    color: #fff !important;
    box-shadow: 0 4px 14px rgba(255, 106, 61, 0.28);
}
.btn-primary:hover {
    background: #E24E1F !important;
    color: #fff !important;
}
.btn-ghost {
    background: #FFFFFF !important;
    color: #181C28 !important;
    border-color: #E8E9F1 !important;
}
.btn-ghost:hover {
    background: #F1F2F7 !important;
    color: #181C28 !important;
}
.btn-danger {
    background: #FFF1F2 !important;
    color: #E11D48 !important;
    border-color: #FFE4E6 !important;
}
.btn-danger:hover {
    background: #FFE4E6 !important;
    color: #BE123C !important;
}
.btn-sm {
    padding: 6px 12px;
    font-size: 12px;
    border-radius: 8px;
}

/* Clean, crisp locked preview - NO heavy blur so user can clearly inspect features */
.peiwm-preview-card {
    background: #fff;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 22px;
    position: relative;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}
.peiwm-preview-card h3 {
    margin: 0 0 6px 0;
    font-size: 16px;
    font-weight: 700;
    color: #1E293B;
}
.peiwm-preview-card p.description {
    margin: 0 0 18px 0;
    font-size: 13px;
    color: #64748B;
    line-height: 1.5;
}

/* Header master switch */
.peiwm-mcp-switch-wrap {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: #fff;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 8px 14px;
}
.peiwm-mcp-status-pill {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
}
.peiwm-mcp-status-pill.active {
    background: #ECFDF5;
    color: #059669;
    border: 1px solid #A7F3D0;
}
.peiwm-mcp-status-pill.pro {
    background: #EFF6FF;
    color: #2563EB;
    border: 1px solid #BFDBFE;
}

/* Tabs */
.peiwm-subtabs-nav {
    display: flex;
    gap: 6px;
    border-bottom: 1px solid #E2E8F0;
    margin-bottom: 18px;
    overflow-x: auto;
}
.peiwm-subtab-btn {
    padding: 9px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: 13px;
    font-weight: 600;
    color: #64748B;
    cursor: pointer;
    transition: all .15s ease;
    white-space: nowrap;
}
.peiwm-subtab-btn:hover {
    color: #1E293B;
}
.peiwm-subtab-btn.active {
    color: #FF6A3D;
    border-bottom-color: #FF6A3D;
}

/* Code & Pre boxes */
.peiwm-code-box {
    background: #1E293B;
    color: #E2E8F0;
    padding: 14px 18px;
    border-radius: 8px;
    font-family: Consolas, Monaco, "Courier New", monospace;
    font-size: 12.5px;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre-wrap;
    margin: 12px 0;
}

/* Tool Accordion */
.peiwm-tool-item {
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    margin-bottom: 8px;
    overflow: hidden;
}
.peiwm-tool-head {
    background: #F8FAFC;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    font-weight: 600;
}
.peiwm-tool-badges {
    display: flex;
    gap: 6px;
}
.badge-tag {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 6px;
    font-weight: 700;
}
.badge-pro { background: #FEF3C7; color: #92400E; }
.badge-free { background: #E0E7FF; color: #3730A3; }
.badge-read { background: #ECFDF5; color: #065F46; }
.badge-write { background: #FEE2E2; color: #991B1B; }

.peiwm-tool-desc {
	margin: 4px 0 0;
	padding: 0 20px 10px;
	font-size: 12.5px;
	line-height: 1.5;
	color: #64748b;
}

/* Modern PEIWM Form Controls - harmonized with .btn.btn-ghost design language */
.peiwm-admin input[type="text"],
.peiwm-admin input[type="password"],
.peiwm-admin input[type="url"],
.peiwm-admin input[type="number"],
.peiwm-admin input.regular-text,
.peiwm-preview-card input[type="text"],
.peiwm-preview-card input[type="password"],
.peiwm-preview-card input[type="url"],
.peiwm-preview-card input[type="number"],
.peiwm-preview-card input.regular-text {
    width: 100%;
    min-height: 42px !important;
    height: 42px !important;
    padding: 0 16px !important;
    border: 1px solid #E8E9F1 !important;
    border-radius: 10px !important;
    font-size: 13.5px !important;
    font-weight: 500 !important;
    color: #181C28 !important;
    background: #FFFFFF !important;
    box-shadow: 0 1px 3px rgba(18, 33, 63, 0.04) !important;
    transition: all .18s ease !important;
    box-sizing: border-box !important;
    line-height: 40px !important;
}

.peiwm-admin input[type="text"]:hover,
.peiwm-admin input[type="password"]:hover,
.peiwm-admin input[type="url"]:hover,
.peiwm-admin input.regular-text:hover,
.peiwm-preview-card input[type="text"]:hover,
.peiwm-preview-card input[type="password"]:hover,
.peiwm-preview-card input[type="url"]:hover,
.peiwm-preview-card input.regular-text:hover {
    border-color: #CBD5E1 !important;
}

.peiwm-admin input[type="text"]:focus,
.peiwm-admin input[type="password"]:focus,
.peiwm-admin input[type="url"]:focus,
.peiwm-admin input.regular-text:focus,
.peiwm-preview-card input[type="text"]:focus,
.peiwm-preview-card input[type="password"]:focus,
.peiwm-preview-card input[type="url"]:focus,
.peiwm-preview-card input.regular-text:focus {
    border-color: #FF6A3D !important;
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(255, 106, 61, 0.16) !important;
    background: #FFFFFF !important;
}

/* Readonly fields stay crisp and readable like .btn-ghost, not greyed out */
.peiwm-admin input[readonly],
.peiwm-preview-card input[readonly] {
    background: #FFFFFF !important;
    color: #181C28 !important;
    border-color: #E8E9F1 !important;
    cursor: text !important;
}

.peiwm-admin input:disabled,
.peiwm-preview-card input:disabled {
    background: #F8FAFC !important;
    color: #64748B !important;
    border-color: #E8E9F1 !important;
    cursor: not-allowed !important;
}

.peiwm-input-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
    font-size: 13px !important;
    letter-spacing: 0.2px !important;
}

/* Hero Connector URL & Copy Box layout */
.peiwm-url-copy-box {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    max-width: 820px !important;
    margin-bottom: 14px !important;
}

.peiwm-url-copy-box .peiwm-url-input-wrap {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
}

.peiwm-url-copy-box .peiwm-input-icon {
    position: absolute;
    left: 14px;
    color: #94A3B8;
    font-size: 17px;
    width: 17px;
    height: 17px;
    pointer-events: none;
    z-index: 2;
}

.peiwm-url-copy-box input.peiwm-input-with-icon {
    padding-left: 38px !important;
}

.peiwm-url-copy-box .btn {
    height: 42px !important;
    min-height: 42px !important;
    padding: 0 18px !important;
    display: inline-flex !important;
    align-items: center !important;
}

/* Modern Select Dropdown */
.peiwm-admin select,
.peiwm-admin select.regular-text,
.peiwm-preview-card select,
.peiwm-preview-card select.regular-text {
    width: 100%;
    min-height: 42px !important;
    height: 42px !important;
    padding: 0 40px 0 16px !important;
    border: 1px solid #E8E9F1 !important;
    border-radius: 10px !important;
    font-size: 13.5px !important;
    font-weight: 500 !important;
    color: #181C28 !important;
    background: #FFFFFF url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%227%22%20viewBox%3D%220%200%2012%207%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201L6%206L11%201%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%221.75%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E") no-repeat right 16px center !important;
    background-size: 12px 7px !important;
    appearance: none !important;
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    box-shadow: 0 1px 3px rgba(18, 33, 63, 0.04) !important;
    transition: all .18s ease !important;
    cursor: pointer !important;
    box-sizing: border-box !important;
    line-height: 40px !important;
}

.peiwm-admin select:hover,
.peiwm-preview-card select:hover {
    border-color: #CBD5E1 !important;
}

.peiwm-admin select:focus,
.peiwm-preview-card select:focus {
    border-color: #FF6A3D !important;
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(255, 106, 61, 0.16) !important;
}

.peiwm-admin select:disabled,
.peiwm-preview-card select:disabled {
    background-color: #FAFBFD !important;
    color: #475569 !important;
    border-color: #E8E9F1 !important;
    cursor: not-allowed !important;
    opacity: 1 !important;
}

/* Modern Checkbox - WP Admin Reset and Custom Checkmark */
.peiwm-admin input[type="checkbox"]::before,
.peiwm-admin input[type="checkbox"]::after,
.peiwm-preview-card input[type="checkbox"]::before,
.peiwm-preview-card input[type="checkbox"]::after {
    content: none !important;
    display: none !important;
}

.peiwm-admin input[type="checkbox"],
.peiwm-preview-card input[type="checkbox"] {
    appearance: none !important;
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    width: 20px !important;
    min-width: 20px !important;
    max-width: 20px !important;
    height: 20px !important;
    min-height: 20px !important;
    max-height: 20px !important;
    border: 1.5px solid #CBD5E1 !important;
    border-radius: 6px !important;
    background-color: #FFFFFF !important;
    cursor: pointer !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    vertical-align: middle !important;
    margin: 2px 0 0 0 !important;
    padding: 0 !important;
    flex-shrink: 0 !important;
    transition: all .15s ease !important;
    box-shadow: 0 1px 2px rgba(18, 33, 63, 0.04) !important;
    box-sizing: border-box !important;
}

.peiwm-admin input[type="checkbox"]:hover,
.peiwm-preview-card input[type="checkbox"]:hover {
    border-color: #FF6A3D !important;
}

.peiwm-admin input[type="checkbox"]:focus,
.peiwm-preview-card input[type="checkbox"]:focus {
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(255, 106, 61, 0.2) !important;
    border-color: #FF6A3D !important;
}

.peiwm-admin input[type="checkbox"]:checked,
.peiwm-preview-card input[type="checkbox"]:checked {
    background-color: #FF6A3D !important;
    border-color: #FF6A3D !important;
    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%229%22%20viewBox%3D%220%200%2012%209%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1.5%204.5L4.5%207.5L10.5%201.5%22%20stroke%3D%22white%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E") !important;
    background-repeat: no-repeat !important;
    background-position: center !important;
    background-size: 11px 9px !important;
}

.peiwm-admin input[type="checkbox"]:disabled,
.peiwm-preview-card input[type="checkbox"]:disabled {
    cursor: not-allowed !important;
}

.peiwm-admin input[type="checkbox"]:disabled:checked,
.peiwm-preview-card input[type="checkbox"]:disabled:checked {
    background-color: #FF6A3D !important;
    border-color: #FF6A3D !important;
    opacity: 0.85 !important;
}

.peiwm-admin input[type="checkbox"]:disabled:not(:checked),
.peiwm-preview-card input[type="checkbox"]:disabled:not(:checked) {
    background-color: #F8FAFC !important;
    border-color: #E2E8F0 !important;
}

/* Modern PEIWM Table Styling - Clean Card Wrapper */
.peiwm-table-wrap {
    border: 1px solid #E8E9F1 !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    background: #FFFFFF !important;
    box-shadow: 0 1px 4px rgba(18, 33, 63, 0.03) !important;
    margin: 16px 0 !important;
}

.peiwm-table-wrap table,
.peiwm-table-wrap table.wp-list-table,
.peiwm-table-wrap table.widefat {
    width: 100% !important;
    border-collapse: separate !important;
    border-spacing: 0 !important;
    border: none !important;
    background: #FFFFFF !important;
    box-shadow: none !important;
    margin: 0 !important;
}

.peiwm-table-wrap table thead th,
.peiwm-table-wrap table.wp-list-table thead th {
    background: #FAFBFD !important;
    border-top: none !important;
    border-left: none !important;
    border-right: none !important;
    border-bottom: 1px solid #E8E9F1 !important;
    color: #64748B !important;
    font-size: 11.5px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.6px !important;
    padding: 13px 18px !important;
    text-align: left !important;
}

.peiwm-table-wrap table tbody td,
.peiwm-table-wrap table.wp-list-table tbody td {
    padding: 14px 18px !important;
    border-top: none !important;
    border-left: none !important;
    border-right: none !important;
    border-bottom: 1px solid #F1F2F7 !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    color: #181C28 !important;
    vertical-align: middle !important;
    background: transparent !important;
    line-height: 1.5 !important;
}

.peiwm-table-wrap table.striped>tbody>:nth-child(odd),
.peiwm-table-wrap table.striped>tbody>:nth-child(odd)>td {
    background-color: #FAFAFC !important;
}

.peiwm-table-wrap table.striped>tbody>:nth-child(even),
.peiwm-table-wrap table.striped>tbody>:nth-child(even)>td {
    background-color: #FFFFFF !important;
}

.peiwm-table-wrap table tbody tr:hover td,
.peiwm-table-wrap table.wp-list-table tbody tr:hover td {
    background-color: #F5F7FA !important;
}

.peiwm-table-wrap table tbody tr:last-child td,
.peiwm-table-wrap table.wp-list-table tbody tr:last-child td {
    border-bottom: none !important;
}

.peiwm-table-wrap table code {
    background: #F1F2F7 !important;
    padding: 4px 8px !important;
    border-radius: 6px !important;
    font-size: 12px !important;
    color: #181C28 !important;
    border: 1px solid #E8E9F1 !important;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
}

/* Subtle non-blur pro lock badge in top corner */
.peiwm-pro-corner-badge {
    position: absolute;
    top: 14px;
    right: 16px;
    background: linear-gradient(135deg, #12213F 0%, #1A2E52 100%);
    color: #FFD9C6;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11.5px;
    font-weight: 700;
    border: 1px solid rgba(255, 106, 61, 0.35);
    display: inline-flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    transition: transform .15s ease;
}
.peiwm-pro-corner-badge:hover {
    transform: scale(1.04);
}
</style>

<div class="wrap peiwm-admin">
	<!-- Page Header -->
	<div class="page-header" style="display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 14px;">
		<div>
			<div class="crumb" style="font-size: 12.5px; color: #6c7385; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
				</svg>Export/Import <span style="margin:0 2px;">/</span> MCP & Remote Sync
			</div>
			<h1 class="heading-admin" style="margin-bottom:0; font-size: 27px; font-weight: 700;">
				<?php echo esc_html__( 'Model Context Protocol (MCP) & Remote Sync', 'post-export-import-with-media' ); ?>
			</h1>
			<!-- <p class="sub" style="font-size: 13.5px; color: #6c7385; margin-top: 6px; max-width: 680px;">
				<?php echo esc_html__( 'Connect AI assistants (Claude, Cursor, Codex, ChatGPT) to inspect, manage, and transfer content, or sync posts and media directly between WordPress sites.', 'post-export-import-with-media' ); ?>
			</p> -->
			<p class="sub" style="font-size: 13.5px; color: #6c7385; margin-top: 6px; max-width: 680px;">
				<?php echo esc_html__( 'Let Claude, Cursor, Codex or ChatGPT push and pull posts, pages and media between your staging and live sites, with conflict control and full rollback. They can also create new posts from a brief and update any content in place. Every change is previewed, confirmed and reversible.', 'post-export-import-with-media' ); ?>
			</p>

		</div>

		<div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
			<div class="peiwm-mcp-switch-wrap">
				<span style="font-size: 13px; font-weight: 600; color: #334155;"><?php echo esc_html__( 'MCP Server:', 'post-export-import-with-media' ); ?></span>
				<span class="peiwm-mcp-status-pill active"><?php echo esc_html__( 'Active', 'post-export-import-with-media' ); ?></span>
			</div>

			<?php if ( $is_old_pro ) : ?>
				<a href="<?php echo esc_url( admin_url( 'plugins.php' ) ); ?>" class="btn btn-primary">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
						<polyline points="7 10 12 15 17 10"></polyline>
						<line x1="12" y1="15" x2="12" y2="3"></line>
					</svg>
					<?php echo esc_html__( 'Update Pro Plugin', 'post-export-import-with-media' ); ?>
				</a>
			<?php else : ?>
				<button type="button" class="btn btn-primary peiwm-open-premium-modal">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
					</svg>
					<?php echo esc_html__( 'Upgrade to PRO', 'post-export-import-with-media' ); ?>
				</button>
			<?php endif; ?>
		</div>
	</div>

	<?php if ( $is_old_pro ) : ?>
		<!-- Old Pro Update Notice Banner -->
		<div style="background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
			<div style="display: flex; align-items: center; gap: 12px;">
				<div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(245, 158, 11, 0.15); color: #D97706; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
						<line x1="12" y1="9" x2="12" y2="13"></line>
						<line x1="12" y1="17" x2="12.01" y2="17"></line>
					</svg>
				</div>
				<div>
					<h4 style="margin: 0 0 3px 0; font-size: 14.5px; font-weight: 700; color: #92400E;">
						<?php echo esc_html__( 'Pro Version Update Required for MCP & Remote Sync', 'post-export-import-with-media' ); ?>
					</h4>
					<p style="margin: 0; font-size: 13px; color: #B45309;">
						<?php echo esc_html__( 'Your installed version of Post Export Import with Media Pro is active, but needs an update to enable the Model Context Protocol (MCP) engine and live site linking features.', 'post-export-import-with-media' ); ?>
					</p>
				</div>
			</div>
			<a href="<?php echo esc_url( admin_url( 'plugins.php' ) ); ?>" class="btn btn-primary" style="font-size: 13px;">
				<?php echo esc_html__( 'Go to Plugins to Update', 'post-export-import-with-media' ); ?>
			</a>
		</div>
	<?php endif; ?>

	<!-- JOURNEY SECTION -->
	<section class="journey" id="journey">
		<div class="journey-head">
			<div>
				<h2><?php echo esc_html__( 'Your MCP & sync journey', 'post-export-import-with-media' ); ?></h2>
				<p><?php echo esc_html__( 'Follow this flow to connect AI assistants or sync content directly between sites.', 'post-export-import-with-media' ); ?></p>
			</div>
			<span class="journey-badge"><?php echo esc_html__( 'Recommended flow', 'post-export-import-with-media' ); ?></span>
		</div>
		<div class="steps">
			<button type="button" class="step active peiwm-open-premium-modal">
				<div class="step-connector"></div>
				<div class="step-top">
					<div class="step-num">1</div>
					<span class="step-title"><?php echo esc_html__( '1. Configure Site Role', 'post-export-import-with-media' ); ?></span>
				</div>
				<p class="step-desc"><?php echo esc_html__( 'Choose Source (Export), Destination (Import), or Bidirectional.', 'post-export-import-with-media' ); ?></p>
			</button>
			<button type="button" class="step peiwm-open-premium-modal">
				<div class="step-connector"></div>
				<div class="step-top">
					<div class="step-num">2</div>
					<span class="step-title"><?php echo esc_html__( '2. Issue Connection Keys', 'post-export-import-with-media' ); ?></span>
				</div>
				<p class="step-desc"><?php echo esc_html__( 'Generate PEIWM1 encrypted tokens or AI credentials.', 'post-export-import-with-media' ); ?></p>
			</button>
			<button type="button" class="step peiwm-open-premium-modal">
				<div class="step-connector"></div>
				<div class="step-top">
					<div class="step-num">3</div>
					<span class="step-title"><?php echo esc_html__( '3. Connect Remote Sites', 'post-export-import-with-media' ); ?></span>
				</div>
				<p class="step-desc"><?php echo esc_html__( 'Paste peer keys to establish verified site-to-site sync links.', 'post-export-import-with-media' ); ?></p>
			</button>
			<button type="button" class="step peiwm-open-premium-modal">
				<div class="step-connector"></div>
				<div class="step-top">
					<div class="step-num">4</div>
					<span class="step-title"><?php echo esc_html__( '4. Sync & Track History', 'post-export-import-with-media' ); ?></span>
				</div>
				<p class="step-desc"><?php echo esc_html__( 'Push or pull posts, pages, and media with rollback safety.', 'post-export-import-with-media' ); ?></p>
			</button>
		</div>
	</section>

	<!-- SECTION 1: CONNECTOR URL -->
	<div class="peiwm-preview-card">
		<button type="button" class="peiwm-pro-corner-badge peiwm-open-premium-modal">🔒 <?php echo esc_html__( 'PRO ', 'post-export-import-with-media' ); ?></button>
		<h3><?php echo esc_html__( 'MCP Connector URL', 'post-export-import-with-media' ); ?></h3>
		<p class="description"><?php echo esc_html__( 'Paste this exact URL into your AI client (Claude, Cursor, Codex). Do not add a trailing slash.', 'post-export-import-with-media' ); ?></p>
		
		<div class="peiwm-url-copy-box">
			<div class="peiwm-url-input-wrap">
				<span class="dashicons dashicons-admin-links peiwm-input-icon"></span>
				<input type="text" class="regular-text peiwm-input-mono peiwm-input-with-icon" readonly value="<?php echo esc_url( $connector_url ); ?>">
			</div>
			<button type="button" class="btn btn-ghost peiwm-copy-static-btn" data-copy="<?php echo esc_url( $connector_url ); ?>">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
				</svg>
				<?php echo esc_html__( 'Copy URL', 'post-export-import-with-media' ); ?>
			</button>
		</div>

		<div style="background: #F1F5F9; border-radius: 8px; padding: 12px 16px; font-size: 12.5px; color: #475569; display: flex; align-items: center; gap: 8px;">
			<span class="dashicons dashicons-info" style="color: #0284C7;"></span>
			<?php if ( $is_local ) : ?>
				<span><?php echo esc_html__( 'Local or private environment detected. Desktop and CLI assistants on this computer can connect directly. For cloud connectors (Claude.ai, ChatGPT web), use a public HTTPS site or secure tunnel.', 'post-export-import-with-media' ); ?></span>
			<?php else : ?>
				<span><?php echo esc_html__( 'Ready for connections. AI clients and Application Passwords communicate over Streamable HTTP (JSON-RPC 2.0).', 'post-export-import-with-media' ); ?></span>
			<?php endif; ?>
		</div>
	</div>

	<!-- SECTION 2: CONNECT AN AI CLIENT (7 CLIENT TABS) -->
	<div class="peiwm-preview-card">
		<button type="button" class="peiwm-pro-corner-badge peiwm-open-premium-modal">🔒 <?php echo esc_html__( 'PRO ', 'post-export-import-with-media' ); ?></button>
		<h3><?php echo esc_html__( 'Connect an AI Client', 'post-export-import-with-media' ); ?></h3>
		<p class="description"><?php echo esc_html__( 'Pick your client, then Generate prompt. You get a ready to paste prompt (or command) with a credential that works only on this MCP endpoint. Paste it into your AI assistant and it sets everything up. Now you have AI power, so just ask what to do: "Push my latest posts to staging", "Write a new post about our sale" or "Fix the SEO on my top pages".', 'post-export-import-with-media' ); ?></p>

		<!-- 7 CLIENT TABS -->
		<div class="peiwm-subtabs-nav" id="peiwm-preview-client-tabs">
			<button type="button" class="peiwm-subtab-btn active" data-target="pane-claude-code">Claude Code</button>
			<button type="button" class="peiwm-subtab-btn" data-target="pane-claude-desktop">Claude Desktop</button>
			<button type="button" class="peiwm-subtab-btn" data-target="pane-claude-ai">Claude.ai connector</button>
			<button type="button" class="peiwm-subtab-btn" data-target="pane-codex">Codex (ChatGPT)</button>
			<button type="button" class="peiwm-subtab-btn" data-target="pane-cursor">Cursor</button>
			<button type="button" class="peiwm-subtab-btn" data-target="pane-vscode">VS Code</button>
			<button type="button" class="peiwm-subtab-btn" data-target="pane-others">Others</button>
		</div>

		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
			<div>
				<div style="margin-bottom: 14px;">
					<label for="peiwm-preview-expiry" style="display:block; font-size:13px; font-weight:600; margin-bottom:6px; color:#334155;">
						<?php echo esc_html__( 'Credential expires after:', 'post-export-import-with-media' ); ?>
					</label>
					<select id="peiwm-preview-expiry" style="width: 100%; max-width: 320px;" class="regular-text">
						<option value="30">30 <?php echo esc_html__( 'days', 'post-export-import-with-media' ); ?></option>
						<option value="90" selected>90 <?php echo esc_html__( 'days (Recommended)', 'post-export-import-with-media' ); ?></option>
						<option value="365">365 <?php echo esc_html__( 'days', 'post-export-import-with-media' ); ?></option>
						<option value="0"><?php echo esc_html__( 'Never', 'post-export-import-with-media' ); ?></option>
					</select>
				</div>

				<div style="margin-bottom: 14px;">
					<label style="display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #475569;">
						<input type="checkbox" id="peiwm-preview-consent" checked>
						<span>
							<?php echo sprintf(
								esc_html__( 'I understand that Generate prompt creates an Application Password for %s that lets the selected AI client use Post Export Import tools as me.', 'post-export-import-with-media' ),
								'<strong>' . esc_html( $username ) . '</strong>'
							); ?>
						</span>
					</label>
				</div>

				<div style="margin-bottom: 18px;">
					<label style="display:block; font-size:13px; font-weight:600; margin-bottom:6px; color:#334155;">
						<?php echo esc_html__( 'Application Secret / Password:', 'post-export-import-with-media' ); ?>
					</label>
					<div style="display: flex; gap: 8px; max-width: 380px;">
						<div style="position: relative; flex: 1;">
							<input type="password" id="peiwm-secret-preview-input" class="regular-text" style="width: 100%; font-family: monospace;" readonly value="peiwm_mcp_sec_9941a82f3d1b">
							<button type="button" id="peiwm-toggle-eye-btn" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748B;" title="<?php echo esc_attr__( 'Show/Hide Secret', 'post-export-import-with-media' ); ?>">
								<span class="dashicons dashicons-visibility" id="peiwm-eye-icon"></span>
							</button>
						</div>
					</div>
				</div>

				<div style="display: flex; gap: 10px; flex-wrap: wrap;">
					<button type="button" class="btn btn-primary peiwm-open-premium-modal">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
						</svg>
						<?php echo esc_html__( 'Generate Prompt', 'post-export-import-with-media' ); ?>
					</button>
					<button type="button" class="btn btn-ghost peiwm-open-premium-modal">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
							<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
						</svg>
						<?php echo esc_html__( 'Copy Prompt', 'post-export-import-with-media' ); ?>
					</button>
					<button type="button" class="btn btn-ghost peiwm-open-premium-modal">
						<?php echo esc_html__( 'Copy Header Value', 'post-export-import-with-media' ); ?>
					</button>
				</div>
			</div>

			<!-- CLIENT PROMPT BOX PREVIEWS -->
			<div>
				<div class="peiwm-preview-pane" id="pane-claude-code">
					<span style="font-size: 12.5px; font-weight: 600; color: #475569;"><?php echo esc_html__( 'Terminal command for Claude Code (CLI and IDE extensions):', 'post-export-import-with-media' ); ?></span>
					<div class="peiwm-code-box">claude mcp add --scope user --transport http peiwm "<?php echo esc_url( $connector_url ); ?>" --header "Authorization: Basic [SECRET_AUTH_KEY]"</div>
					<small style="color: #64748B;"><?php echo esc_html__( 'Then run `claude mcp list` — peiwm should show "✓ Connected". Start a new session and type /mcp.', 'post-export-import-with-media' ); ?></small>
				</div>

				<div class="peiwm-preview-pane" id="pane-claude-desktop" style="display: none;">
					<span style="font-size: 12.5px; font-weight: 600; color: #475569;"><?php echo esc_html__( 'Claude Desktop (claude_desktop_config.json):', 'post-export-import-with-media' ); ?></span>
					<div class="peiwm-code-box">{
  "mcpServers": {
    "peiwm": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "<?php echo esc_url( $connector_url ); ?>", "--header", "Authorization:${PEIWM_AUTH}", "--transport", "http-only"<?php echo 0 === strpos( $connector_url, 'http://' ) ? ', "--allow-http"' : ''; ?>],
      "env": { "PEIWM_AUTH": "Basic [SECRET_AUTH_KEY]" }
    }
  }
}</div>
				</div>

				<div class="peiwm-preview-pane" id="pane-claude-ai" style="display: none;">
					<span style="font-size: 12.5px; font-weight: 600; color: #475569;"><?php echo esc_html__( 'Claude.ai Custom Connector (Web App):', 'post-export-import-with-media' ); ?></span>
					<div class="peiwm-code-box">1. Open claude.ai → Settings → Connectors → Add custom connector.
2. Name: PEIWM
3. Remote MCP server URL: <?php echo esc_url( $connector_url ); ?> 
4. Request headers: Authorization: Basic [SECRET_AUTH_KEY]</div>
				</div>

				<div class="peiwm-preview-pane" id="pane-codex" style="display: none;">
					<span style="font-size: 12.5px; font-weight: 600; color: #475569;"><?php echo esc_html__( 'Codex / ChatGPT Desktop (~/.codex/config.toml):', 'post-export-import-with-media' ); ?></span>
					<div class="peiwm-code-box">[mcp_servers.peiwm]
url = "<?php echo esc_url( $connector_url ); ?>"
env_http_headers = { "Authorization" = "PEIWM_AUTH" }</div>
				</div>

				<div class="peiwm-preview-pane" id="pane-cursor" style="display: none;">
					<span style="font-size: 12.5px; font-weight: 600; color: #475569;"><?php echo esc_html__( 'Cursor (.cursor/mcp.json):', 'post-export-import-with-media' ); ?></span>
					<div class="peiwm-code-box">{
  "mcpServers": {
    "peiwm": {
      "url": "<?php echo esc_url( $connector_url ); ?>",
      "headers": {
        "Authorization": "Basic [SECRET_AUTH_KEY]"
      }
    }
  }
}</div>
				</div>

				<div class="peiwm-preview-pane" id="pane-vscode" style="display: none;">
					<span style="font-size: 12.5px; font-weight: 600; color: #475569;"><?php echo esc_html__( 'VS Code GitHub Copilot (mcp.json):', 'post-export-import-with-media' ); ?></span>
					<div class="peiwm-code-box">{
  "servers": {
    "peiwm": {
      "type": "http",
      "url": "<?php echo esc_url( $connector_url ); ?>",
      "headers": { "Authorization": "${input:peiwm-auth}" }
    }
  }
}</div>
				</div>

				<div class="peiwm-preview-pane" id="pane-others" style="display: none;">
					<span style="font-size: 12.5px; font-weight: 600; color: #475569;"><?php echo esc_html__( 'Other Clients (Windsurf, Antigravity, Kiro, MCP Inspector):', 'post-export-import-with-media' ); ?></span>
					<div class="peiwm-code-box">Server URL: <?php echo esc_url( $connector_url ); ?> 
Authorization: Basic [SECRET_AUTH_KEY]
Transport: Streamable HTTP (JSON-RPC 2.0)</div>
				</div>
			</div>
		</div>
	</div>

	<!-- SECTION 3: CREDENTIALS AND POLICIES -->
	<div class="peiwm-preview-card">
		<button type="button" class="peiwm-pro-corner-badge peiwm-open-premium-modal">🔒 <?php echo esc_html__( 'PRO ', 'post-export-import-with-media' ); ?></button>
		<h3><?php echo esc_html__( 'Credentials and Policies', 'post-export-import-with-media' ); ?></h3>
		<p class="description"><?php echo esc_html__( 'Configure guardrails and default safety boundaries. These rules are strictly enforced on the server for all AI and remote link operations.', 'post-export-import-with-media' ); ?></p>

		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
			<div>
				<div style="margin-bottom: 16px;">
					<label style="display: flex; align-items: flex-start; gap: 8px;">
						<input type="checkbox" checked disabled>
						<span>
							<strong style="color: #1E293B;"><?php echo esc_html__( 'Only accept credentials generated here (recommended)', 'post-export-import-with-media' ); ?></strong><br>
							<small style="color: #64748B;"><?php echo esc_html__( 'Credentials generated in "Connect an AI client" work only on the MCP endpoint and expire. Other Application Passwords open the whole WordPress REST API, so they are refused while this is on.', 'post-export-import-with-media' ); ?></small>
						</span>
					</label>
				</div>

				<div style="margin-bottom: 16px;">
					<label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; color: #334155;">
						<?php echo esc_html__( 'Default credential expiry:', 'post-export-import-with-media' ); ?>
					</label>
					<select class="regular-text" style="width: 100%; max-width: 320px;" disabled>
						<option>90 <?php echo esc_html__( 'days', 'post-export-import-with-media' ); ?></option>
					</select>
				</div>

				<div style="margin-bottom: 16px;">
					<label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; color: #334155;">
						<?php echo esc_html__( 'Pages and posts publishing:', 'post-export-import-with-media' ); ?>
					</label>
					<select class="regular-text" style="width: 100%; max-width: 320px;" disabled>
						<option><?php echo esc_html__( 'Drafts only (recommended)', 'post-export-import-with-media' ); ?></option>
					</select>
					<small style="display:block; margin-top:4px; color:#64748B;"><?php echo esc_html__( 'With "Drafts only", AI clients can create draft posts/pages and edit drafts, but never publish or change live content.', 'post-export-import-with-media' ); ?></small>
				</div>
			</div>

			<div>
				<div style="margin-bottom: 14px;">
					<label style="display: flex; align-items: flex-start; gap: 8px;">
						<input type="checkbox" disabled>
						<span>
							<strong style="color: #1E293B;"><?php echo esc_html__( 'Allow deleting posts and pages', 'post-export-import-with-media' ); ?></strong><br>
							<small style="color: #64748B;"><?php echo esc_html__( 'Deletes always require a preview and explicit confirmation token.', 'post-export-import-with-media' ); ?></small>
						</span>
					</label>
				</div>

				<div style="margin-bottom: 14px;">
					<label style="display: flex; align-items: flex-start; gap: 8px;">
						<input type="checkbox" checked disabled>
						<span>
							<strong style="color: #1E293B;"><?php echo esc_html__( 'Allow reading post data', 'post-export-import-with-media' ); ?></strong><br>
							<small style="color: #64748B;"><?php echo esc_html__( 'Lets AI clients read posts and pages to answer questions, export items, or summarize content.', 'post-export-import-with-media' ); ?></small>
						</span>
					</label>
				</div>

				<div style="margin-bottom: 14px;">
					<label style="display: flex; align-items: flex-start; gap: 8px;">
						<input type="checkbox" checked disabled>
						<span>
							<strong style="color: #1E293B;"><?php echo esc_html__( 'Allow Media File Sync and Uploads', 'post-export-import-with-media' ); ?></strong><br>
							<small style="color: #64748B;"><?php echo esc_html__( 'Automatically transfer and sideload featured images and embedded gallery files.', 'post-export-import-with-media' ); ?></small>
						</span>
					</label>
				</div>

				<div style="margin-bottom: 18px;">
					<label style="display: flex; align-items: flex-start; gap: 8px;">
						<input type="checkbox" checked disabled>
						<span>
							<strong style="color: #1E293B;"><?php echo esc_html__( 'Allow Advanced Custom Fields (ACF) Values Sync', 'post-export-import-with-media' ); ?></strong><br>
							<small style="color: #64748B;"><?php echo esc_html__( 'Preserve complex ACF field group schemas and custom meta.', 'post-export-import-with-media' ); ?></small>
						</span>
					</label>
				</div>

				<button type="button" class="btn btn-primary peiwm-open-premium-modal">
					<?php echo esc_html__( 'Save Policies', 'post-export-import-with-media' ); ?>
				</button>
			</div>
		</div>
	</div>

	<!-- SECTION 4: CONNECTED CLIENTS -->
	<div class="peiwm-preview-card">
		<button type="button" class="peiwm-pro-corner-badge peiwm-open-premium-modal">🔒 <?php echo esc_html__( 'PRO ', 'post-export-import-with-media' ); ?></button>
		<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
			<div>
				<h3><?php echo esc_html__( 'Connected Clients', 'post-export-import-with-media' ); ?></h3>
				<p class="description" style="margin-bottom: 0;"><?php echo esc_html__( 'Credentials generated here. Revoking one disconnects that client on its next request. Deactivating PEIWM revokes all of them.', 'post-export-import-with-media' ); ?></p>
			</div>
			<button type="button" class="btn btn-danger btn-sm peiwm-open-premium-modal">
				<?php echo esc_html__( 'Revoke All', 'post-export-import-with-media' ); ?>
			</button>
		</div>

		<div class="peiwm-table-wrap">
			<table class="wp-list-table widefat fixed striped">
				<thead>
					<tr>
						<th><?php echo esc_html__( 'Client', 'post-export-import-with-media' ); ?></th>
						<th><?php echo esc_html__( 'Created', 'post-export-import-with-media' ); ?></th>
						<th><?php echo esc_html__( 'Expires', 'post-export-import-with-media' ); ?></th>
						<th><?php echo esc_html__( 'Last Used', 'post-export-import-with-media' ); ?></th>
						<th><?php echo esc_html__( 'Last IP', 'post-export-import-with-media' ); ?></th>
						<th><?php echo esc_html__( 'Actions', 'post-export-import-with-media' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><strong>Claude Desktop</strong><br><small style="color: #64748B;">peiwm_mcp_claude_desktop</small></td>
						<td><?php echo esc_html( date( 'Y-m-d' ) ); ?></td>
						<td><?php echo esc_html( date( 'Y-m-d', strtotime( '+90 days' ) ) ); ?></td>
						<td><?php echo esc_html( date( 'Y-m-d H:i' ) ); ?></td>
						<td><code>127.0.0.1</code></td>
						<td><button type="button" class="btn btn-danger btn-sm peiwm-open-premium-modal"><?php echo esc_html__( 'Revoke', 'post-export-import-with-media' ); ?></button></td>
					</tr>
					<tr>
						<td><strong>Cursor IDE</strong><br><small style="color: #64748B;">peiwm_mcp_cursor_workstation</small></td>
						<td><?php echo esc_html( date( 'Y-m-d', strtotime( '-2 days' ) ) ); ?></td>
						<td><?php echo esc_html( date( 'Y-m-d', strtotime( '+88 days' ) ) ); ?></td>
						<td><?php echo esc_html( date( 'Y-m-d H:i', strtotime( '-1 hour' ) ) ); ?></td>
						<td><code>127.0.0.1</code></td>
						<td><button type="button" class="btn btn-danger btn-sm peiwm-open-premium-modal"><?php echo esc_html__( 'Revoke', 'post-export-import-with-media' ); ?></button></td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<!-- SECTION 5: CONNECTION TEST -->
	<div class="peiwm-preview-card">
		<button type="button" class="peiwm-pro-corner-badge peiwm-open-premium-modal">🔒 <?php echo esc_html__( 'PRO ', 'post-export-import-with-media' ); ?></button>
		<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
			<div>
				<h3><?php echo esc_html__( 'Connection Test', 'post-export-import-with-media' ); ?></h3>
				<p class="description" style="margin-bottom: 0;"><?php echo esc_html__( 'Checks the MCP endpoint from this server: HTTPS, JSON-RPC 2.0 handshake, tool discovery, and that unauthorized requests are refused.', 'post-export-import-with-media' ); ?></p>
			</div>
			<button type="button" class="btn btn-primary peiwm-open-premium-modal">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
					<polyline points="22 4 12 14.01 9 11.01"></polyline>
				</svg>
				<?php echo esc_html__( 'Run Connection Test', 'post-export-import-with-media' ); ?>
			</button>
		</div>

		<div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 12px 16px; color: #065F46; font-size: 13px; font-weight: 600; margin-bottom: 14px;">
			✓ <?php echo esc_html__( 'All 4 required connection and security checks passed.', 'post-export-import-with-media' ); ?>
		</div>

		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
			<div style="padding: 10px 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; display: flex; align-items: center; gap: 10px;">
				<span style="color: #059669; font-weight: bold; font-size: 16px;">✓</span>
				<div>
					<strong style="font-size: 13px;"><?php echo esc_html__( 'Loopback HTTP & SSL Verification', 'post-export-import-with-media' ); ?></strong>
					<small style="display: block; color: #64748B;"><?php echo esc_html__( 'Server can reach its own REST endpoint via loopback.', 'post-export-import-with-media' ); ?></small>
				</div>
			</div>
			<div style="padding: 10px 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; display: flex; align-items: center; gap: 10px;">
				<span style="color: #059669; font-weight: bold; font-size: 16px;">✓</span>
				<div>
					<strong style="font-size: 13px;"><?php echo esc_html__( 'MCP JSON-RPC 2.0 Handshake', 'post-export-import-with-media' ); ?></strong>
					<small style="display: block; color: #64748B;"><?php echo esc_html__( 'Proper response to initialize and tools/list requests.', 'post-export-import-with-media' ); ?></small>
				</div>
			</div>
			<div style="padding: 10px 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; display: flex; align-items: center; gap: 10px;">
				<span style="color: #059669; font-weight: bold; font-size: 16px;">✓</span>
				<div>
					<strong style="font-size: 13px;"><?php echo esc_html__( 'Tool Discovery & Registration', 'post-export-import-with-media' ); ?></strong>
					<small style="display: block; color: #64748B;"><?php echo esc_html__( '8 tools successfully registered with schemas.', 'post-export-import-with-media' ); ?></small>
				</div>
			</div>
			<div style="padding: 10px 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; display: flex; align-items: center; gap: 10px;">
				<span style="color: #059669; font-weight: bold; font-size: 16px;">✓</span>
				<div>
					<strong style="font-size: 13px;"><?php echo esc_html__( 'Strict Credential Guard Enforcement', 'post-export-import-with-media' ); ?></strong>
					<small style="display: block; color: #64748B;"><?php echo esc_html__( 'Unauthenticated requests correctly rejected with 401/403.', 'post-export-import-with-media' ); ?></small>
				</div>
			</div>
		</div>
	</div>

	<!-- SECTION 6: AVAILABLE TOOLS (CATALOG) -->
	<div class="peiwm-preview-card">
		<button type="button" class="peiwm-pro-corner-badge peiwm-open-premium-modal">🔒 <?php echo esc_html__( 'PRO ', 'post-export-import-with-media' ); ?></button>
		<h3>
			<?php
			/* translators: %d: number of registered MCP tools. */
			echo esc_html( sprintf( __( 'Available Tools (%d Registered)', 'post-export-import-with-media' ), count( $peiwm_mcp_tools ) ) );
			?>
		</h3>
		<p class="description"><?php echo esc_html__( 'Complete catalog of JSON RPC 2.0 tools exposed by this server according to credential kinds and security policies.', 'post-export-import-with-media' ); ?></p>

		<?php foreach ( $peiwm_mcp_tools as $peiwm_slug => $peiwm_tool ) : ?>
			<?php
			list( $peiwm_title, $peiwm_desc, $peiwm_tier, $peiwm_type ) = $peiwm_tool;
			$peiwm_badge = $peiwm_type_labels[ $peiwm_type ];
			?>
			<div class="peiwm-tool-item">
				<div class="peiwm-tool-head peiwm-open-premium-modal">
					<span><code><?php echo esc_html( $peiwm_slug ); ?></code>: <?php echo esc_html( $peiwm_title ); ?></span>
					<div class="peiwm-tool-badges">
						<span class="badge-tag <?php echo 'free' === $peiwm_tier ? 'badge-free' : 'badge-pro'; ?>"><?php echo 'free' === $peiwm_tier ? 'Free' : 'Pro'; ?></span>
						<span class="badge-tag <?php echo esc_attr( $peiwm_badge[0] ); ?>"><?php echo esc_html( $peiwm_badge[1] ); ?></span>
					</div>
				</div>
				<p class="peiwm-tool-desc"><?php echo esc_html( $peiwm_desc ); ?></p>
			</div>
		<?php endforeach; ?>
	</div>

	<!-- SECTION 7: SITE-TO-SITE LIVE SYNC -->
	<div class="peiwm-preview-card">
		<button type="button" class="peiwm-pro-corner-badge peiwm-open-premium-modal">🔒 <?php echo esc_html__( 'PRO ', 'post-export-import-with-media' ); ?></button>
		<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
			<div>
				<h3><?php echo esc_html__( 'Site-to-Site Live Sync (Push & Pull)', 'post-export-import-with-media' ); ?></h3>
				<p class="description" style="margin-bottom: 0;"><?php echo esc_html__( 'Establish peer-to-peer cryptographic sync links between two WordPress sites to migrate posts, pages, and media seamlessly.', 'post-export-import-with-media' ); ?></p>
			</div>
			<div style="display: flex; gap: 8px;">
				<button type="button" class="btn btn-primary peiwm-open-premium-modal">
					<span class="dashicons dashicons-plus"></span> <?php echo esc_html__( 'Create Destination Key', 'post-export-import-with-media' ); ?>
				</button>
				<button type="button" class="btn btn-ghost peiwm-open-premium-modal">
					<span class="dashicons dashicons-admin-links"></span> <?php echo esc_html__( 'Add Remote Site', 'post-export-import-with-media' ); ?>
				</button>
			</div>
		</div>

		<div class="peiwm-table-wrap">
			<table class="wp-list-table widefat fixed striped">
				<thead>
					<tr>
						<th><?php echo esc_html__( 'Site Name', 'post-export-import-with-media' ); ?></th>
						<th><?php echo esc_html__( 'Endpoint', 'post-export-import-with-media' ); ?></th>
						<th><?php echo esc_html__( 'Grants', 'post-export-import-with-media' ); ?></th>
						<th><?php echo esc_html__( 'Status', 'post-export-import-with-media' ); ?></th>
						<th><?php echo esc_html__( 'Actions', 'post-export-import-with-media' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><strong>Staging Environment</strong></td>
						<td><code>https://staging.example.com/wp-json/peiwm-mcp/v1/mcp</code></td>
						<td><span class="badge-tag badge-pro">Destination</span></td>
						<td><span style="color: #059669; font-weight: 600;">● Connected</span></td>
						<td>
							<button type="button" class="btn btn-ghost btn-sm peiwm-open-premium-modal"><?php echo esc_html__( 'Test Link', 'post-export-import-with-media' ); ?></button>
							<button type="button" class="btn btn-danger btn-sm peiwm-open-premium-modal"><?php echo esc_html__( 'Remove', 'post-export-import-with-media' ); ?></button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Premium Upgrade Modal with complete features list -->
<div id="peiwm-premium-modal" class="peiwm-modal-overlay" style="display: none;">
	<div class="peiwm-modal peiwm-premium-modal">
		<button type="button" class="peiwm-modal-close peiwm-premium-close">&times;</button>
		<div class="peiwm-premium-modal-body">
			<div class="peiwm-premium-badge-wrap">
				<span class="peiwm-premium-fire">🔥</span>
				<span class="peiwm-premium-offer-tag"><?php echo esc_html__( 'LIMITED TIME OFFER', 'post-export-import-with-media' ); ?></span>
			</div>
			<div class="peiwm-premium-icon">🚀</div>
			<h2 class="peiwm-premium-title"><?php echo esc_html__( 'Unlock PRO s', 'post-export-import-with-media' ); ?></h2>
			<p class="peiwm-premium-subtitle"><?php echo esc_html__( 'Unlock Model Context Protocol (MCP) AI integration and Site-to-Site Live Sync with PRO!', 'post-export-import-with-media' ); ?></p>

			<div class="peiwm-premium-features">
				<div class="peiwm-premium-feature">✓ <?php echo esc_html__( 'MCP AI Integration (Claude Code, Desktop, Cursor, Codex)', 'post-export-import-with-media' ); ?></div>
				<div class="peiwm-premium-feature">✓ <?php echo esc_html__( 'Site-to-Site Direct Live Sync (Push & Pull)', 'post-export-import-with-media' ); ?></div>
				<div class="peiwm-premium-feature">✓ <?php echo esc_html__( 'One-Click Full Revert & Rollback Snapshots', 'post-export-import-with-media' ); ?></div>
				<div class="peiwm-premium-feature">✓ <?php echo esc_html__( 'Selective Post, Page & Media Export with Custom Fields', 'post-export-import-with-media' ); ?></div>
				<div class="peiwm-premium-feature">✓ <?php echo esc_html__( 'Scheduled Automatic Sync & Exports', 'post-export-import-with-media' ); ?></div>
				<div class="peiwm-premium-feature">✓ <?php echo esc_html__( 'High-Performance Batch Engine (100K+ items)', 'post-export-import-with-media' ); ?></div>
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

<script>
jQuery(document).ready(function($) {
	'use strict';

	// 1. Client tabs switching
	$('#peiwm-preview-client-tabs .peiwm-subtab-btn').on('click', function(e) {
		e.preventDefault();
		$('#peiwm-preview-client-tabs .peiwm-subtab-btn').removeClass('active');
		$(this).addClass('active');
		var target = $(this).data('target');
		$('.peiwm-preview-pane').hide();
		$('#' + target).show();
	});

	// 2. Eye toggle for password
	$('#peiwm-toggle-eye-btn').on('click', function(e) {
		e.preventDefault();
		var $input = $('#peiwm-secret-preview-input');
		var $icon = $('#peiwm-eye-icon');
		if ($input.attr('type') === 'password') {
			$input.attr('type', 'text');
			$icon.removeClass('dashicons-visibility').addClass('dashicons-hidden');
		} else {
			$input.attr('type', 'password');
			$icon.removeClass('dashicons-hidden').addClass('dashicons-visibility');
		}
	});

	// 3. Static copy buttons
	$('.peiwm-copy-static-btn').on('click', function(e) {
		e.preventDefault();
		var text = $(this).data('copy');
		if (navigator.clipboard) {
			navigator.clipboard.writeText(text);
			var $btn = $(this);
			var orig = $btn.html();
			$btn.text('<?php echo esc_js( __( 'Copied!', 'post-export-import-with-media' ) ); ?>');
			setTimeout(function() { $btn.html(orig); }, 1800);
		}
	});

	// 4. Modal handler: Clicking anywhere designated opens #peiwm-premium-modal
	$(document).on('click', '.peiwm-open-premium-modal, .peiwm-pro-corner-badge', function(e) {
		e.preventDefault();
		e.stopPropagation();
		var $modal = $('#peiwm-premium-modal');
		$modal.show().addClass('peiwm-show');
	});

	$('#peiwm-premium-modal').find('.peiwm-premium-close, .peiwm-modal-close').on('click', function(e) {
		e.preventDefault();
		$('#peiwm-premium-modal').removeClass('peiwm-show').hide();
	});

	$('#peiwm-premium-modal').on('click', function(e) {
		if (e.target === this) {
			$(this).removeClass('peiwm-show').hide();
		}
	});

	$(document).on('keydown.peiwm-modal', function(e) {
		if (e.key === 'Escape') {
			$('#peiwm-premium-modal').removeClass('peiwm-show').hide();
		}
	});
});
</script>
