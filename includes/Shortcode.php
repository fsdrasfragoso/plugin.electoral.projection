<?php

namespace Fragososoftware\ProjecaoWp;

/**
 * Shortcode [projecao_calculadora] — renderiza a calculadora de projeções no
 * conteúdo do tema do cliente.
 */
class Shortcode
{
    const TAG = 'projecao_calculadora';

    /** Rodapé legal (barra inferior da imagem de compartilhamento e da calculadora). */
    const FOOTER_LEGAL = 'Fragoso Software · CNPJ 33.037.487/0001-36 · Rua Paulo Vidigal Vicente de Azevedo, 163 G1 T2, Vila Siqueira, Bairro do Limão, Zona Norte, São Paulo - SP · (11) 96789-7221';

    /** @var Settings */
    private $settings;

    public function __construct(Settings $settings)
    {
        $this->settings = $settings;
    }

    /**
     * @return void
     */
    public function register()
    {
        add_shortcode(self::TAG, array($this, 'render'));
        add_action('wp_enqueue_scripts', array($this, 'registerAssets'));
    }

    /**
     * Registra (sem enfileirar) os assets; o enqueue ocorre só quando o
     * shortcode é usado, evitando carregar em páginas que não precisam.
     *
     * @return void
     */
    public function registerAssets()
    {
        wp_register_style(
            'projecao-calculadora',
            PROJECAO_WP_URL . 'assets/css/calculator.css',
            array(),
            PROJECAO_WP_VERSION
        );

        wp_register_script(
            'projecao-qrcode',
            PROJECAO_WP_URL . 'assets/js/qrcode.js',
            array(),
            '1.4.4',
            true
        );

        wp_register_script(
            'projecao-calculadora',
            PROJECAO_WP_URL . 'assets/js/calculator.js',
            array('projecao-qrcode'),
            PROJECAO_WP_VERSION,
            true
        );
    }

    /**
     * @param array $atts
     * @return string
     */
    public function render($atts)
    {
        $atts = shortcode_atts(array(
            'title' => __('Calculadora de Projeções', 'projecao-eleitoral'),
        ), $atts, self::TAG);

        if (!$this->settings->isConfigured()) {
            if (current_user_can('manage_options')) {
                return '<div class="projecao-calc projecao-calc--notice">'
                    . esc_html__('Plugin Projeção Eleitoral: informe o client_id e o client_secret em Configurações → Projeção Eleitoral.', 'projecao-eleitoral')
                    . '</div>';
            }
            return '';
        }

        wp_enqueue_style('projecao-calculadora');
        wp_enqueue_script('projecao-calculadora');

        $pageUrl = get_permalink();
        if (! $pageUrl) {
            $pageUrl = home_url('/');
        }

        // ?projecao=ID na URL → o front exibe a projeção salva (somente leitura),
        // em vez do assistente. É o destino do QR Code da imagem.
        $viewId = isset($_GET['projecao']) ? absint(wp_unslash($_GET['projecao'])) : 0; // phpcs:ignore WordPress.Security.NonceVerification

        wp_localize_script('projecao-calculadora', 'PROJECAO_WP', array(
            'restBase' => esc_url_raw(rest_url(Rest::NS)),
            'nonce' => wp_create_nonce('wp_rest'),
            'isLoggedIn' => is_user_logged_in(),
            'userName' => is_user_logged_in() ? wp_get_current_user()->display_name : '',
            'assetsUrl' => esc_url_raw(PROJECAO_WP_URL . 'assets/'),
            'headerBg' => $this->settings->getHeaderBg(),
            'headerText' => $this->settings->getHeaderText(),
            'footerColor' => $this->settings->getFooterColor(),
            'footerText' => $this->settings->getFooterText(),
            'pageUrl' => esc_url_raw($pageUrl),
            'siteName' => get_bloginfo('name'),
            'viewProjection' => $viewId,
            'shareText' => $this->settings->getShareText(),
            'footer' => self::FOOTER_LEGAL,
        ));

        ob_start();
        $title = $atts['title'];
        include PROJECAO_WP_DIR . 'templates/calculator.php';
        return ob_get_clean();
    }
}
