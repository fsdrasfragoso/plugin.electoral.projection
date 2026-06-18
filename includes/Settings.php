<?php

namespace Fragososoftware\ProjecaoWp;

/**
 * Configurações do plugin (Settings API): credenciais da aplicação e endpoint.
 * O client_secret fica salvo no servidor (wp_options) e nunca vai ao navegador.
 */
class Settings
{
    const OPTION = PROJECAO_WP_SETTINGS_KEY;
    const PAGE = 'projecao-eleitoral';
    const GROUP = 'projecao_eleitoral_group';

    /**
     * @return void
     */
    public function register()
    {
        add_action('admin_menu', array($this, 'addMenu'));
        add_action('admin_init', array($this, 'registerSettings'));
    }

    /**
     * @return void
     */
    public function addMenu()
    {
        add_options_page(
            __('Projeção Eleitoral', 'projecao-eleitoral'),
            __('Projeção Eleitoral', 'projecao-eleitoral'),
            'manage_options',
            self::PAGE,
            array($this, 'renderPage')
        );
    }

    /**
     * @return void
     */
    public function registerSettings()
    {
        register_setting(self::GROUP, self::OPTION, array(
            'type' => 'array',
            'sanitize_callback' => array($this, 'sanitize'),
            'default' => $this->defaults(),
        ));
    }

    /**
     * @param mixed $input
     * @return array
     */
    public function sanitize($input)
    {
        $input = is_array($input) ? $input : array();
        $current = $this->all();

        $baseUrl = isset($input['base_url']) ? esc_url_raw(trim($input['base_url'])) : $current['base_url'];
        $clientId = isset($input['client_id']) ? sanitize_text_field(trim($input['client_id'])) : $current['client_id'];
        $origin = isset($input['origin']) ? esc_url_raw(trim($input['origin'])) : $current['origin'];
        $timeout = isset($input['timeout']) ? (int) $input['timeout'] : $current['timeout'];

        // Secret: campo em branco mantém o atual (não sobrescreve com vazio).
        $clientSecret = $current['client_secret'];
        if (isset($input['client_secret']) && trim($input['client_secret']) !== '') {
            $clientSecret = trim($input['client_secret']);
        }

        return array(
            'base_url' => $baseUrl !== '' ? $baseUrl : $this->defaults()['base_url'],
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'origin' => $origin,
            'timeout' => $timeout > 0 ? $timeout : 15,
        );
    }

    /**
     * @return array
     */
    public function defaults()
    {
        return array(
            'base_url' => 'https://projecao.fragososoftware.com',
            'client_id' => '',
            'client_secret' => '',
            'origin' => '',
            'timeout' => 15,
        );
    }

    /**
     * @return array
     */
    public function all()
    {
        $saved = get_option(self::OPTION, array());
        return array_merge($this->defaults(), is_array($saved) ? $saved : array());
    }

    public function getBaseUrl()
    {
        $all = $this->all();
        return $all['base_url'];
    }

    public function getClientId()
    {
        $all = $this->all();
        return $all['client_id'];
    }

    public function getClientSecret()
    {
        $all = $this->all();
        return $all['client_secret'];
    }

    public function getTimeout()
    {
        $all = $this->all();
        return (int) $all['timeout'];
    }

    /**
     * Origin enviado ao pedir o token. Se não configurado, usa o domínio do site.
     *
     * @return string
     */
    public function getOrigin()
    {
        $all = $this->all();
        if (!empty($all['origin'])) {
            return $all['origin'];
        }
        return home_url();
    }

    /**
     * @return bool
     */
    public function isConfigured()
    {
        return $this->getClientId() !== '' && $this->getClientSecret() !== '';
    }

    /**
     * @return void
     */
    public function renderPage()
    {
        if (!current_user_can('manage_options')) {
            return;
        }
        $values = $this->all();
        $restBase = esc_url_raw(rest_url('projecao/v1'));
        $nonce = wp_create_nonce('wp_rest');
        include PROJECAO_WP_DIR . 'templates/settings.php';
    }
}
