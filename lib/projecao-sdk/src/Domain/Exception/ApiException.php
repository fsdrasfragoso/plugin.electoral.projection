<?php

namespace Fragososoftware\ProjecaoSdk\Domain\Exception;

/**
 * Erro retornado pela API (status >= 400) que não se encaixa em validação ou
 * autenticação. Carrega o status HTTP e o corpo decodificado da resposta.
 */
class ApiException extends ProjecaoException
{
    /** @var int */
    private $statusCode;

    /** @var array */
    private $responseData;

    /**
     * @param string $message
     * @param int $statusCode
     * @param array $responseData
     */
    public function __construct($message = 'Erro na API.', $statusCode = 0, array $responseData = array())
    {
        parent::__construct($message, $statusCode);
        $this->statusCode = $statusCode;
        $this->responseData = $responseData;
    }

    /**
     * @return int
     */
    public function getStatusCode()
    {
        return $this->statusCode;
    }

    /**
     * @return array
     */
    public function getResponseData()
    {
        return $this->responseData;
    }
}
