<?php

namespace Fragososoftware\ProjecaoSdk\Port;

/**
 * Resposta HTTP crua devolvida por um adaptador de transporte. Objeto de
 * fronteira da porta HttpClientInterface (independente de cURL/Guzzle/etc.).
 */
final class HttpResponse
{
    /** @var int */
    private $statusCode;

    /** @var string */
    private $body;

    /** @var array */
    private $headers;

    /**
     * @param int $statusCode
     * @param string $body
     * @param array $headers
     */
    public function __construct($statusCode, $body, array $headers = array())
    {
        $this->statusCode = (int) $statusCode;
        $this->body = (string) $body;
        $this->headers = $headers;
    }

    /**
     * @return int
     */
    public function getStatusCode()
    {
        return $this->statusCode;
    }

    /**
     * @return string
     */
    public function getBody()
    {
        return $this->body;
    }

    /**
     * @return array
     */
    public function getHeaders()
    {
        return $this->headers;
    }

    /**
     * Decodifica o corpo JSON como array associativo (vazio se inválido).
     *
     * @return array
     */
    public function json()
    {
        $decoded = json_decode($this->body, true);
        return is_array($decoded) ? $decoded : array();
    }
}
