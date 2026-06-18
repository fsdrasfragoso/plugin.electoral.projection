<?php

/**
 * Autoloader PSR-4 para uso SEM Composer.
 *
 *   require __DIR__ . '/caminho/projecao-sdk-php/autoload.php';
 *
 * Quem usa Composer NÃO precisa deste arquivo: basta `composer require
 * fragososoftware/projecao-sdk` e o autoload padrão cuida de tudo.
 */

spl_autoload_register(function ($class) {
    $prefix = 'Fragososoftware\\ProjecaoSdk\\';
    $baseDir = __DIR__ . '/src/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relative = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relative) . '.php';

    if (is_file($file)) {
        require $file;
    }
});
