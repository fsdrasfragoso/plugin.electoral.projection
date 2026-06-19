<?php

namespace Fragososoftware\ProjecaoWp;

/**
 * Shortcode [projecao_calculadora] — renderiza a calculadora de projeções no
 * conteúdo do tema do cliente.
 */
class Shortcode
{
    const TAG = 'projecao_calculadora';

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
            'projecao-calculadora',
            PROJECAO_WP_URL . 'assets/js/calculator.js',
            array(),
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

        wp_localize_script('projecao-calculadora', 'PROJECAO_WP', array(
            'restBase' => esc_url_raw(rest_url(Rest::NS)),
            'nonce' => wp_create_nonce('wp_rest'),
            'isLoggedIn' => is_user_logged_in(),
            'assetsUrl' => esc_url_raw(PROJECAO_WP_URL . 'assets/'),
        ));

        ob_start();
        $title = $atts['title'];
        include PROJECAO_WP_DIR . 'templates/calculator.php';
        return ob_get_clean();
    }
}
