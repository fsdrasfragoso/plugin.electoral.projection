<?php
/**
 * Página de configurações do plugin.
 *
 * @var array $values
 * @var string $restBase
 * @var string $nonce
 */
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="wrap">
    <h1><?php esc_html_e('Projeção Eleitoral', 'projecao-eleitoral'); ?></h1>
    <p><?php esc_html_e('Informe as credenciais da sua aplicação (geradas no painel: API → Aplicações). O client_secret fica salvo apenas no servidor.', 'projecao-eleitoral'); ?></p>

    <form method="post" action="options.php">
        <?php settings_fields(\Fragososoftware\ProjecaoWp\Settings::GROUP); ?>
        <table class="form-table" role="presentation">
            <tr>
                <th scope="row"><label for="pc_base_url"><?php esc_html_e('URL da API', 'projecao-eleitoral'); ?></label></th>
                <td><input name="<?php echo esc_attr(\Fragososoftware\ProjecaoWp\Settings::OPTION); ?>[base_url]" id="pc_base_url" type="url" class="regular-text" value="<?php echo esc_attr($values['base_url']); ?>"></td>
            </tr>
            <tr>
                <th scope="row"><label for="pc_client_id"><?php esc_html_e('Client ID', 'projecao-eleitoral'); ?></label></th>
                <td><input name="<?php echo esc_attr(\Fragososoftware\ProjecaoWp\Settings::OPTION); ?>[client_id]" id="pc_client_id" type="text" class="regular-text" value="<?php echo esc_attr($values['client_id']); ?>" autocomplete="off"></td>
            </tr>
            <tr>
                <th scope="row"><label for="pc_client_secret"><?php esc_html_e('Client Secret', 'projecao-eleitoral'); ?></label></th>
                <td>
                    <input name="<?php echo esc_attr(\Fragososoftware\ProjecaoWp\Settings::OPTION); ?>[client_secret]" id="pc_client_secret" type="password" class="regular-text" value="" autocomplete="new-password" placeholder="<?php echo $values['client_secret'] !== '' ? esc_attr__('•••••••• (preencha para alterar)', 'projecao-eleitoral') : ''; ?>">
                    <p class="description"><?php esc_html_e('Deixe em branco para manter o segredo atual.', 'projecao-eleitoral'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row"><label for="pc_origin"><?php esc_html_e('Origin (opcional)', 'projecao-eleitoral'); ?></label></th>
                <td>
                    <input name="<?php echo esc_attr(\Fragososoftware\ProjecaoWp\Settings::OPTION); ?>[origin]" id="pc_origin" type="url" class="regular-text" value="<?php echo esc_attr($values['origin']); ?>" placeholder="<?php echo esc_attr(home_url()); ?>">
                    <p class="description"><?php esc_html_e('Domínio enviado à API ao autenticar. Use se sua aplicação tiver domínios cadastrados. Padrão: o domínio deste site.', 'projecao-eleitoral'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row"><label for="pc_timeout"><?php esc_html_e('Timeout (s)', 'projecao-eleitoral'); ?></label></th>
                <td><input name="<?php echo esc_attr(\Fragososoftware\ProjecaoWp\Settings::OPTION); ?>[timeout]" id="pc_timeout" type="number" min="1" value="<?php echo esc_attr($values['timeout']); ?>" class="small-text"></td>
            </tr>
        </table>
        <?php submit_button(); ?>
    </form>

    <hr>
    <h2><?php esc_html_e('Conexão', 'projecao-eleitoral'); ?></h2>
    <p>
        <button type="button" class="button" id="pc-test"><?php esc_html_e('Testar conexão', 'projecao-eleitoral'); ?></button>
        <span id="pc-test-result" style="margin-left:8px;"></span>
    </p>
    <p class="description"><?php esc_html_e('Use o shortcode', 'projecao-eleitoral'); ?> <code>[projecao_calculadora]</code> <?php esc_html_e('em qualquer página ou post.', 'projecao-eleitoral'); ?></p>

    <script>
    (function () {
        var btn = document.getElementById('pc-test');
        var out = document.getElementById('pc-test-result');
        if (!btn) { return; }
        btn.addEventListener('click', function () {
            out.textContent = '<?php echo esc_js(__('Testando…', 'projecao-eleitoral')); ?>';
            fetch('<?php echo esc_url_raw($restBase); ?>/test', {
                headers: { 'X-WP-Nonce': '<?php echo esc_js($nonce); ?>' }
            }).then(function (r) {
                return r.json().then(function (body) { return { ok: r.ok, body: body }; });
            }).then(function (res) {
                if (res.ok && res.body && res.body.data && res.body.data.ok) {
                    out.style.color = 'green';
                    out.textContent = '<?php echo esc_js(__('Conectado:', 'projecao-eleitoral')); ?> ' + (res.body.data.application.name || '');
                } else {
                    out.style.color = 'crimson';
                    out.textContent = (res.body && res.body.message) ? res.body.message : '<?php echo esc_js(__('Falha na conexão.', 'projecao-eleitoral')); ?>';
                }
            }).catch(function () {
                out.style.color = 'crimson';
                out.textContent = '<?php echo esc_js(__('Erro de rede.', 'projecao-eleitoral')); ?>';
            });
        });
    })();
    </script>
</div>
