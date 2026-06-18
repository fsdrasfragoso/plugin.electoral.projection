<?php

namespace Fragososoftware\ProjecaoSdk\Infrastructure\Http;

use Fragososoftware\ProjecaoSdk\Domain\Exception\TransportException;
use Fragososoftware\ProjecaoSdk\Port\HttpClientInterface;
use Fragososoftware\ProjecaoSdk\Port\HttpResponse;

/**
 * Adaptador de transporte HTTP baseado em cURL (implementa a porta
 * HttpClientInterface). Único ponto que depende da extensão cURL.
 */
final class CurlHttpClient implements HttpClientInterface
{
    /** @var int */
    private $timeout;

    /** @var bool */
    private $verifySsl;

    /**
     * @param int $timeout  segundos
     * @param bool $verifySsl  verificação de certificado (mantenha true em produção)
     */
    public function __construct($timeout = 15, $verifySsl = true)
    {
        $this->timeout = (int) $timeout;
        $this->verifySsl = (bool) $verifySsl;
    }

    /**
     * {@inheritdoc}
     */
    public function send($method, $url, array $headers = array(), $body = null)
    {
        $ch = curl_init();

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $this->timeout);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, $this->verifySsl);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, $this->verifySsl ? 2 : 0);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $this->formatHeaders($headers));

        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }

        $raw = curl_exec($ch);

        if ($raw === false) {
            $error = curl_error($ch);
            $errno = curl_errno($ch);
            curl_close($ch);
            throw new TransportException('Falha de transporte (cURL ' . $errno . '): ' . $error, $errno);
        }

        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return new HttpResponse($status, (string) $raw);
    }

    /**
     * Converte ['Nome' => 'valor'] em ['Nome: valor', ...].
     *
     * @param array $headers
     * @return string[]
     */
    private function formatHeaders(array $headers)
    {
        $out = array();
        foreach ($headers as $name => $value) {
            $out[] = $name . ': ' . $value;
        }
        return $out;
    }
}
