<?php
/**
 * Shell de "Meus Candidatos" (renderizado pelo shortcode). O JS monta os
 * cartões de cada cargo a partir da API.
 *
 * @var string $title
 * @var bool   $showCredit
 */
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="projecao-colinha" id="projecao-colinha">
    <header class="projecao-colinha__topo">
        <div>
            <h2 class="projecao-colinha__titulo" data-pcol-titulo><?php echo esc_html($title); ?></h2>
            <p class="projecao-colinha__sub" data-pcol-sub></p>
        </div>

        <div class="projecao-colinha__topo-lado">
            <div class="projecao-colinha__contador" data-pcol-contador hidden>
                <strong data-pcol-dias></strong>
                <span data-pcol-dias-rotulo></span>
            </div>

            <label class="projecao-colinha__uf">
                <span><?php esc_html_e('Seu estado', 'projecao-eleitoral'); ?></span>
                <select data-pcol-uf>
                    <option value=""><?php esc_html_e('Escolha a UF', 'projecao-eleitoral'); ?></option>
                </select>
            </label>
        </div>
    </header>

    <div class="projecao-colinha__erro" data-pcol-erro hidden></div>

    <div class="projecao-colinha__vazio" data-pcol-vazio>
        <?php esc_html_e('Escolha o seu estado para montar a sua lista.', 'projecao-eleitoral'); ?>
    </div>

    <div class="projecao-colinha__cartoes" data-pcol-cartoes></div>

    <div class="projecao-colinha__acoes" data-pcol-acoes hidden>
        <button type="button" class="projecao-colinha__btn projecao-colinha__btn--claro" data-pcol-som aria-pressed="true">
            <?php esc_html_e('Som da urna', 'projecao-eleitoral'); ?>
        </button>
        <button type="button" class="projecao-colinha__btn projecao-colinha__btn--claro" data-pcol-zerar>
            <?php esc_html_e('Limpar tudo', 'projecao-eleitoral'); ?>
        </button>
        <button type="button" class="projecao-colinha__btn" data-pcol-imagem>
            <?php esc_html_e('Salvar imagem', 'projecao-eleitoral'); ?>
        </button>
        <button type="button" class="projecao-colinha__btn projecao-colinha__btn--destaque" data-pcol-compartilhar>
            <?php esc_html_e('Compartilhar', 'projecao-eleitoral'); ?>
        </button>
    </div>

    <p class="projecao-colinha__aviso" data-pcol-aviso></p>

    <?php if ($showCredit) : ?>
        <p class="projecao-colinha__credito">
            <?php esc_html_e('Powered by', 'projecao-eleitoral'); ?>
            <a href="https://fragososoftware.com" target="_blank" rel="noopener">Fragoso Software</a>
        </p>
    <?php endif; ?>

    <div class="projecao-colinha__modal" data-pcol-modal hidden>
        <div class="projecao-colinha__modal-caixa">
            <h3><?php esc_html_e('Copie a sua lista', 'projecao-eleitoral'); ?></h3>
            <p><?php esc_html_e('Selecione o texto abaixo e copie para compartilhar:', 'projecao-eleitoral'); ?></p>
            <textarea rows="9" readonly data-pcol-modal-texto></textarea>
            <button type="button" class="projecao-colinha__btn" data-pcol-modal-fechar>
                <?php esc_html_e('Fechar', 'projecao-eleitoral'); ?>
            </button>
        </div>
    </div>
</div>
