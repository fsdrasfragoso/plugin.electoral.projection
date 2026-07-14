<?php

/**
 * Plugin Name:       Projeção Eleitoral
 * Plugin URI:        https://fragososoftware.com
 * Description:       Calculadora de simulações e projeções eleitorais integrada ao seu tema. Basta informar o client_id e o client_secret da sua aplicação. Consome a API de Projeções da Fragoso Software.
 * Version:           1.5.1
 * Requires at least: 5.6
 * Requires PHP:      7.0
 * Author:            Fragoso Software
 * Author URI:        https://fragososoftware.com
 * License:           Proprietary
 * Text Domain:       projecao-eleitoral
 *
 * @package Fragososoftware\ProjecaoWp
 */

if (!defined('ABSPATH')) {
    exit; // acesso direto bloqueado
}

define('PROJECAO_WP_VERSION', '1.5.1');
define('PROJECAO_WP_FILE', __FILE__);
define('PROJECAO_WP_DIR', plugin_dir_path(__FILE__));
define('PROJECAO_WP_URL', plugin_dir_url(__FILE__));
define('PROJECAO_WP_SETTINGS_KEY', 'projecao_eleitoral_settings');

// SDK vendorizado (cópia de fragososoftware/projecao-sdk).
require_once PROJECAO_WP_DIR . 'lib/projecao-sdk/autoload.php';

// Classes do plugin (autoloader simples por namespace).
spl_autoload_register(function ($class) {
    $prefix = 'Fragososoftware\\ProjecaoWp\\';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    $relative = substr($class, $len);
    $file = PROJECAO_WP_DIR . 'includes/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

/**
 * Inicializa o plugin.
 */
function projecao_wp_boot()
{
    $plugin = new \Fragososoftware\ProjecaoWp\Plugin();
    $plugin->register();
}
add_action('plugins_loaded', 'projecao_wp_boot');
