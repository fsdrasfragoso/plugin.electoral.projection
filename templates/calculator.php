<?php
/**
 * Shell da calculadora (renderizado pelo shortcode). O JS preenche as etapas.
 *
 * @var string $title
 */
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="projecao-calc" id="projecao-calc">
    <h2 class="projecao-calc__title"><?php echo esc_html($title); ?></h2>

    <div class="projecao-calc__error" data-pc-error hidden></div>

    <!-- Etapa 1: cargo / estado -->
    <section class="projecao-calc__step" data-pc-step="1">
        <h3 class="projecao-calc__step-title"><?php esc_html_e('1. Cargo', 'projecao-eleitoral'); ?></h3>
        <div class="projecao-calc__row">
            <label>
                <?php esc_html_e('Cargo', 'projecao-eleitoral'); ?>
                <select data-pc-office></select>
            </label>
            <label data-pc-state-wrap hidden>
                <?php esc_html_e('Estado', 'projecao-eleitoral'); ?>
                <select data-pc-state></select>
            </label>
        </div>
        <button type="button" class="projecao-calc__btn" data-pc-next="2"><?php esc_html_e('Continuar', 'projecao-eleitoral'); ?></button>
    </section>

    <!-- Etapa 2: escopo + candidatos -->
    <section class="projecao-calc__step" data-pc-step="2" hidden>
        <h3 class="projecao-calc__step-title"><?php esc_html_e('2. Escopo e candidatos', 'projecao-eleitoral'); ?></h3>
        <div class="projecao-calc__row">
            <label>
                <?php esc_html_e('Escopo', 'projecao-eleitoral'); ?>
                <select data-pc-scope></select>
            </label>
        </div>
        <div class="projecao-calc__candidates" data-pc-candidates></div>
        <div class="projecao-calc__actions">
            <button type="button" class="projecao-calc__btn projecao-calc__btn--ghost" data-pc-back="1"><?php esc_html_e('Voltar', 'projecao-eleitoral'); ?></button>
            <button type="button" class="projecao-calc__btn" data-pc-next="3"><?php esc_html_e('Montar grade', 'projecao-eleitoral'); ?></button>
        </div>
    </section>

    <!-- Etapa 3: grade de percentuais -->
    <section class="projecao-calc__step" data-pc-step="3" hidden>
        <h3 class="projecao-calc__step-title"><?php esc_html_e('3. Projeção por unidade', 'projecao-eleitoral'); ?></h3>
        <p class="projecao-calc__hint"><?php esc_html_e('Informe o percentual (%) de cada candidato em cada unidade.', 'projecao-eleitoral'); ?></p>
        <div class="projecao-calc__grid-wrap">
            <table class="projecao-calc__grid" data-pc-grid></table>
        </div>
        <div class="projecao-calc__actions">
            <button type="button" class="projecao-calc__btn projecao-calc__btn--ghost" data-pc-back="2"><?php esc_html_e('Voltar', 'projecao-eleitoral'); ?></button>
            <button type="button" class="projecao-calc__btn projecao-calc__btn--ghost" data-pc-preview><?php esc_html_e('Pré-visualizar', 'projecao-eleitoral'); ?></button>
            <button type="button" class="projecao-calc__btn" data-pc-save><?php esc_html_e('Salvar projeção', 'projecao-eleitoral'); ?></button>
        </div>
    </section>

    <!-- Resultado -->
    <section class="projecao-calc__result" data-pc-result hidden>
        <h3 class="projecao-calc__step-title"><?php esc_html_e('Resultado', 'projecao-eleitoral'); ?></h3>
        <div data-pc-ranking></div>
    </section>

    <div class="projecao-calc__loading" data-pc-loading hidden><?php esc_html_e('Carregando…', 'projecao-eleitoral'); ?></div>
    <p class="projecao-calc__credit"><?php esc_html_e('Powered by Fragoso Software', 'projecao-eleitoral'); ?></p>
</div>
