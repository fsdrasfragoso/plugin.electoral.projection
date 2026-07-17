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

    <!-- Etapa 1: cargo (radio cards) + estado -->
    <section class="projecao-calc__step" data-pc-step="1">
        <h3 class="projecao-calc__step-title"><?php esc_html_e('1. Escolha o cargo', 'projecao-eleitoral'); ?></h3>
        <div class="projecao-calc__cards" data-pc-offices></div>
        <label class="projecao-calc__state" data-pc-state-wrap hidden>
            <?php esc_html_e('Estado', 'projecao-eleitoral'); ?>
            <select data-pc-state></select>
        </label>
        <div class="projecao-calc__actions">
            <button type="button" class="projecao-calc__btn" data-pc-next="2"><?php esc_html_e('Continuar', 'projecao-eleitoral'); ?></button>
        </div>
    </section>

    <!-- Etapa 2: escopo (radio cards) — como fazer a análise -->
    <section class="projecao-calc__step" data-pc-step="2" hidden>
        <h3 class="projecao-calc__step-title"><?php esc_html_e('2. Como você quer fazer a análise?', 'projecao-eleitoral'); ?></h3>
        <div class="projecao-calc__cards" data-pc-scopes></div>
        <div class="projecao-calc__actions">
            <button type="button" class="projecao-calc__btn projecao-calc__btn--ghost" data-pc-back="1"><?php esc_html_e('Voltar', 'projecao-eleitoral'); ?></button>
            <button type="button" class="projecao-calc__btn" data-pc-next="3"><?php esc_html_e('Continuar', 'projecao-eleitoral'); ?></button>
        </div>
    </section>

    <!-- Etapa 3: candidatos -->
    <section class="projecao-calc__step" data-pc-step="3" hidden>
        <h3 class="projecao-calc__step-title"><?php esc_html_e('3. Candidatos', 'projecao-eleitoral'); ?></h3>

        <!-- Turno: preenchido por JS; oculto quando a eleição não tem 2º turno (Senado). -->
        <div class="projecao-calc__turn" data-pc-turn-wrap hidden>
            <span class="projecao-calc__turn-label"><?php esc_html_e('Turno', 'projecao-eleitoral'); ?></span>
            <div class="projecao-calc__turn-options" data-pc-turns></div>
            <small class="projecao-calc__turn-hint" data-pc-turn-hint></small>
        </div>

        <div class="projecao-calc__cand-tools">
            <button type="button" class="projecao-calc__link" data-pc-select-all><?php esc_html_e('Selecionar todos', 'projecao-eleitoral'); ?></button>
            <span class="projecao-calc__sep">·</span>
            <button type="button" class="projecao-calc__link" data-pc-clear><?php esc_html_e('Limpar', 'projecao-eleitoral'); ?></button>
            <span class="projecao-calc__cand-hint"><?php esc_html_e('(no máximo um candidato por partido)', 'projecao-eleitoral'); ?></span>
        </div>
        <div class="projecao-calc__candidates" data-pc-candidates></div>
        <div class="projecao-calc__actions">
            <button type="button" class="projecao-calc__btn projecao-calc__btn--ghost" data-pc-back="2"><?php esc_html_e('Voltar', 'projecao-eleitoral'); ?></button>
            <button type="button" class="projecao-calc__btn" data-pc-next="4"><?php esc_html_e('Avançar', 'projecao-eleitoral'); ?></button>
        </div>
    </section>

    <!-- Etapa 4: projeção unidade por unidade -->
    <section class="projecao-calc__step" data-pc-step="4" hidden>
        <h3 class="projecao-calc__step-title"><?php esc_html_e('4. Projeção por unidade', 'projecao-eleitoral'); ?></h3>

        <div class="projecao-calc__progress"><span data-pc-progress></span></div>

        <div class="projecao-calc__proj">
            <div class="projecao-calc__unit-panel">
                <div class="projecao-calc__map" id="pc-br-map" data-pc-map></div>
                <img class="projecao-calc__flag" data-pc-flag src="" alt="" hidden>
                <span class="projecao-calc__unit-sub" data-pc-unit-sub></span>
                <h4 class="projecao-calc__unit-name" data-pc-unit-name></h4>
                <div class="projecao-calc__muted" data-pc-unit-counter></div>
                <div class="projecao-calc__muted projecao-calc__small" data-pc-unit-valid></div>
                <div class="projecao-calc__tags" data-pc-tags hidden></div>
                <p class="projecao-calc__muted projecao-calc__small projecao-calc__unit-tip">
                    <?php esc_html_e('A análise avança unidade por unidade até o resultado final.', 'projecao-eleitoral'); ?>
                </p>
            </div>
            <div class="projecao-calc__unit-form">
                <div class="projecao-calc__sumalert" data-pc-sumalert hidden></div>
                <p class="projecao-calc__hint"><?php esc_html_e('Informe o percentual (%) de cada candidato. A soma desta unidade deve ser 100%.', 'projecao-eleitoral'); ?></p>
                <div data-pc-rows></div>
                <div class="projecao-calc__total-row">
                    <span><?php esc_html_e('Total', 'projecao-eleitoral'); ?></span>
                    <strong data-pc-sum>100%</strong>
                </div>
            </div>
        </div>

        <div class="projecao-calc__actions">
            <button type="button" class="projecao-calc__btn projecao-calc__btn--ghost" data-pc-back="3"><?php esc_html_e('Voltar', 'projecao-eleitoral'); ?></button>
            <button type="button" class="projecao-calc__btn projecao-calc__btn--ghost" data-pc-unit-prev><?php esc_html_e('Anterior', 'projecao-eleitoral'); ?></button>
            <button type="button" class="projecao-calc__btn" data-pc-unit-next><?php esc_html_e('Próximo', 'projecao-eleitoral'); ?></button>
            <button type="button" class="projecao-calc__btn projecao-calc__btn--ghost" data-pc-preview hidden><?php esc_html_e('Pré-visualizar', 'projecao-eleitoral'); ?></button>
            <button type="button" class="projecao-calc__btn" data-pc-save hidden><?php esc_html_e('Salvar projeção', 'projecao-eleitoral'); ?></button>
        </div>
    </section>

    <!-- Resultado -->
    <section class="projecao-calc__result" data-pc-result hidden>
        <h3 class="projecao-calc__step-title"><?php esc_html_e('Resultado', 'projecao-eleitoral'); ?></h3>
        <div data-pc-ranking></div>
        <div class="projecao-calc__share-actions">
            <button type="button" class="projecao-calc__btn" data-pc-share>
                <?php esc_html_e('Compartilhar projeção', 'projecao-eleitoral'); ?>
            </button>
        </div>
        <div class="projecao-calc__average" data-pc-average hidden></div>
    </section>

    <div class="projecao-calc__loading" data-pc-loading hidden><?php esc_html_e('Carregando…', 'projecao-eleitoral'); ?></div>
    <p class="projecao-calc__credit"><?php esc_html_e('Powered by Fragoso Software', 'projecao-eleitoral'); ?></p>
    <p class="projecao-calc__legal"><?php echo esc_html(\Fragososoftware\ProjecaoWp\Shortcode::FOOTER_LEGAL); ?></p>
</div>
