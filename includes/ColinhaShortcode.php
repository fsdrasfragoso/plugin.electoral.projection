<?php

namespace Fragososoftware\ProjecaoWp;

/**
 * Shortcode [projecao_meus_candidatos] — a lista de candidatos do leitor dentro
 * do site do cliente: ele anota o número de cada candidato, salva a imagem e
 * compartilha. Os dados vêm da API da Fragoso Software pelo proxy REST do
 * próprio WordPress, então o client_secret nunca vai ao navegador.
 *
 * [projecao_colinha] continua valendo como nome antigo.
 */
class ColinhaShortcode
{
    const TAG = 'projecao_meus_candidatos';

    /** Nome anterior, mantido para não quebrar páginas já publicadas. */
    const TAG_LEGADO = 'projecao_colinha';

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
        add_shortcode(self::TAG_LEGADO, array($this, 'render'));
        add_action('wp_enqueue_scripts', array($this, 'registerAssets'));
    }

    /**
     * Registra os assets; o enqueue só acontece quando o shortcode é usado.
     *
     * @return void
     */
    public function registerAssets()
    {
        wp_register_style(
            'projecao-colinha',
            PROJECAO_WP_URL . 'assets/css/colinha.css',
            array(),
            PROJECAO_WP_VERSION
        );

        wp_register_script(
            'projecao-colinha',
            PROJECAO_WP_URL . 'assets/js/colinha.js',
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
            'title' => '',
            'uf' => '',
        ), $atts, self::TAG);

        if (!$this->settings->isConfigured()) {
            if (current_user_can('manage_options')) {
                return '<div class="projecao-colinha projecao-colinha--notice">'
                    . esc_html__('Plugin Projeção Eleitoral: informe o client_id e o client_secret em Configurações → Projeção Eleitoral.', 'projecao-eleitoral')
                    . '</div>';
            }
            return '';
        }

        wp_enqueue_style('projecao-colinha');
        wp_enqueue_script('projecao-colinha');

        $pageUrl = get_permalink();
        if (! $pageUrl) {
            $pageUrl = home_url('/');
        }

        wp_localize_script('projecao-colinha', 'PROJECAO_COLINHA', array(
            'restBase' => esc_url_raw(rest_url(Rest::NS)),
            'nonce' => wp_create_nonce('wp_rest'),
            'baseUrl' => esc_url_raw(rtrim((string) $this->settings->getBaseUrl(), '/')),
            'pageUrl' => esc_url_raw($pageUrl),
            'siteName' => get_bloginfo('name'),
            'headerBg' => $this->settings->getHeaderBg(),
            'headerText' => $this->settings->getHeaderText(),
            'uf' => strtoupper((string) $atts['uf']),
            'title' => (string) $atts['title'],
        ));

        ob_start();
        $title = $atts['title'];
        $showCredit = $this->settings->getShowCredit();
        include PROJECAO_WP_DIR . 'templates/colinha.php';
        return ob_get_clean();
    }
}
