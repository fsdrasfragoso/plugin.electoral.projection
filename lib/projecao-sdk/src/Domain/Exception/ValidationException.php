<?php

namespace Fragososoftware\ProjecaoSdk\Domain\Exception;

/**
 * Erro de validação — tanto local (antes de enviar) quanto do servidor (422).
 * Carrega o mapa campo => mensagens.
 */
class ValidationException extends ProjecaoException
{
    /** @var array */
    private $errors;

    /**
     * @param string $message
     * @param array $errors  campo => string[] de mensagens
     * @param int $code
     */
    public function __construct($message = 'Dados inválidos.', array $errors = array(), $code = 0)
    {
        parent::__construct($message, $code);
        $this->errors = $errors;
    }

    /**
     * @return array
     */
    public function getErrors()
    {
        return $this->errors;
    }
}
