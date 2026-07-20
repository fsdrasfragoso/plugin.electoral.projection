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
        $headerBg = isset($input['header_bg']) ? sanitize_hex_color($input['header_bg']) : $current['header_bg'];
        $headerText = isset($input['header_text']) ? sanitize_hex_color($input['header_text']) : $current['header_text'];
        $footerColor = isset($input['footer_color']) ? sanitize_hex_color($input['footer_color']) : $current['footer_color'];
        $footerText = isset($input['footer_text']) ? sanitize_hex_color($input['footer_text']) : $current['footer_text'];
        $shareText = isset($input['share_text']) ? sanitize_textarea_field($input['share_text']) : $current['share_text'];

        $showCredit = ! empty($input['show_credit']);

        // Secret: campo em branco mantém o atual (não sobrescreve com vazio).
        $clientSecret = $current['client_secret'];
        if (isset($input['client_secret']) && trim($input['client_secret']) !== '') {
            $clientSecret = trim($input['client_secret']);
        }

        // Configuração mudou → limpa o cache (token + respostas) para refletir já.
        self::flushCache();

        return array(
            'base_url' => $baseUrl !== '' ? $baseUrl : $this->defaults()['base_url'],
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'origin' => $origin,
            'timeout' => $timeout > 0 ? $timeout : 15,
            'header_bg' => $headerBg ? $headerBg : $this->defaults()['header_bg'],
            'header_text' => $headerText ? $headerText : $this->defaults()['header_text'],
            'footer_color' => $footerColor ? $footerColor : $this->defaults()['footer_color'],
            'footer_text' => $footerText ? $footerText : $this->defaults()['footer_text'],
            'share_text' => $shareText !== '' ? $shareText : $this->defaults()['share_text'],
            'show_credit' => $showCredit,
        );
    }

    /**
     * Limpa o token e as respostas cacheadas (transients) do plugin.
     *
     * @return void
     */
    public static function flushCache()
    {
        global $wpdb;
        $wpdb->query(
            "DELETE FROM {$wpdb->options}
             WHERE option_name LIKE '\\_transient\\_pc\\_cache\\_%'
                OR option_name LIKE '\\_transient\\_timeout\\_pc\\_cache\\_%'"
        );
        delete_transient('projecao_oauth_token');
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
            'header_bg' => '#03172d',
            'header_text' => '#ffffff',
            'footer_color' => '#f4f7fb',
            'footer_text' => '#03172d',
            'share_text' => 'Veja a minha projeção eleitoral e faça a sua.',
            // Credito no site publico: opt-in. As diretrizes do WordPress.org
            // exigem permissao explicita para exibir creditos do autor no
            // front-end, entao o padrao e nao exibir.
            'show_credit' => false,
        );
    }

    /**
     * Texto (legenda) que acompanha a imagem ao compartilhar.
     *
     * @return string
     */
    public function getShareText()
    {
        $all = $this->all();
        return ! empty($all['share_text']) ? $all['share_text'] : $this->defaults()['share_text'];
    }

    /**
     * Cor de fundo da faixa superior (topo) da imagem de compartilhamento.
     *
     * @return string
     */
    public function getHeaderBg()
    {
        $all = $this->all();
        return ! empty($all['header_bg']) ? $all['header_bg'] : $this->defaults()['header_bg'];
    }

    /**
     * Cor da fonte da faixa superior (topo) da imagem de compartilhamento.
     *
     * @return string
     */
    public function getHeaderText()
    {
        $all = $this->all();
        return ! empty($all['header_text']) ? $all['header_text'] : $this->defaults()['header_text'];
    }

    /**
     * Cor de fundo da faixa inferior (rodapé) da imagem de compartilhamento.
     *
     * @return string
     */
    public function getFooterColor()
    {
        $all = $this->all();
        return ! empty($all['footer_color']) ? $all['footer_color'] : $this->defaults()['footer_color'];
    }

    /**
     * Cor da fonte da faixa inferior (rodapé) da imagem de compartilhamento.
     *
     * @return string
     */
    public function getFooterText()
    {
        $all = $this->all();
        return ! empty($all['footer_text']) ? $all['footer_text'] : $this->defaults()['footer_text'];
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
    /**
     * Exibir o crédito do autor no site público? Opt-in, conforme as
     * diretrizes do WordPress.org.
     *
     * @return bool
     */
    public function getShowCredit()
    {
        $all = $this->all();

        return ! empty($all['show_credit']);
    }

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
