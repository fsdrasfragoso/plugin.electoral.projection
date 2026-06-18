<?php

/**
 * Limpeza ao desinstalar o plugin: remove as configurações salvas.
 */
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

delete_option('projecao_eleitoral_settings');
