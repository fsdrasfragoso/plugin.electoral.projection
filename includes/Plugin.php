<?php

namespace Fragososoftware\ProjecaoWp;

/**
 * Composition root do plugin: instancia e registra os componentes.
 */
class Plugin
{
    /**
     * Liga os hooks do WordPress.
     *
     * @return void
     */
    public function register()
    {
        $settings = new Settings();
        $settings->register();

        $rest = new Rest($settings);
        $rest->register();

        $shortcode = new Shortcode($settings);
        $shortcode->register();
    }
}
