<?php

namespace Fragososoftware\ProjecaoSdk\Port;

use Fragososoftware\ProjecaoSdk\Domain\Exception\TransportException;

/**
 * Porta de saída (driven port) do hexágono: abstrai o transporte HTTP.
 *
 * O núcleo (Application/Domain) depende apenas desta interface. O SDK traz um
 * adaptador cURL (Infrastructure\Http\CurlHttpClient), mas o cliente pode
 * injetar a sua própria implementação (Guzzle, PSR-18, etc.).
 */
interface HttpClientInterface
{
    /**
     * Executa uma requisição HTTP.
     *
     * @param string $method  GET, POST, ...
     * @param string $url      URL absoluta
     * @param array $headers   ['Nome' => 'valor']
     * @param string|null $body  corpo cru já serializado (JSON ou form-urlencoded)
     * @return HttpResponse
     *
     * @throws TransportException quando não há resposta HTTP (rede/SSL/timeout)
     */
    public function send($method, $url, array $headers = array(), $body = null);
}
