<?php

namespace Fragososoftware\ProjecaoSdk;

use Fragososoftware\ProjecaoSdk\Application\Client;
use Fragososoftware\ProjecaoSdk\Application\Configuration;
use Fragososoftware\ProjecaoSdk\Application\TokenManager;
use Fragososoftware\ProjecaoSdk\Infrastructure\Http\CurlHttpClient;
use Fragososoftware\ProjecaoSdk\Port\HttpClientInterface;

/**
 * Ponto de entrada do SDK: monta (wiring) configuração, transporte, gestão de
 * token e o cliente.
 *
 * Uso típico:
 *   $client = ProjecaoSdk::create(
 *       'https://projecao.fragososoftware.com',
 *       'SEU_CLIENT_ID',
 *       'SEU_CLIENT_SECRET'
 *   );
 *   $resultado = $client->sendProjection($projecao);
 *
 * Opções: ['timeout' => 20, 'origin' => 'https://meuportal.com', 'http_client' => $meuAdaptador]
 */
final class ProjecaoSdk
{
    /**
     * @param string $baseUrl
     * @param string $clientId
     * @param string $clientSecret
     * @param array $options
     * @return Client
     */
    public static function create($baseUrl, $clientId, $clientSecret, array $options = array())
    {
        $config = new Configuration($baseUrl, $clientId, $clientSecret);

        if (isset($options['timeout'])) {
            $config->setTimeout($options['timeout']);
        }
        if (isset($options['origin'])) {
            $config->setOrigin($options['origin']);
        }

        if (isset($options['http_client']) && $options['http_client'] instanceof HttpClientInterface) {
            $http = $options['http_client'];
        } else {
            $verifySsl = isset($options['verify_ssl']) ? (bool) $options['verify_ssl'] : true;
            $http = new CurlHttpClient($config->getTimeout(), $verifySsl);
        }

        $store = (isset($options['token_cache']) && is_array($options['token_cache'])) ? $options['token_cache'] : null;
        $tokens = new TokenManager($config, $http, $store);

        return new Client($config, $http, $tokens);
    }
}
