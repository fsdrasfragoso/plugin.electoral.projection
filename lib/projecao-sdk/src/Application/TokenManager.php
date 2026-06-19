<?php

namespace Fragososoftware\ProjecaoSdk\Application;

use Fragososoftware\ProjecaoSdk\Domain\Enum\GrantType;
use Fragososoftware\ProjecaoSdk\Domain\Exception\AuthenticationException;
use Fragososoftware\ProjecaoSdk\Domain\Exception\ApiException;
use Fragososoftware\ProjecaoSdk\Port\HttpClientInterface;

/**
 * Obtém e mantém em cache o access_token OAuth2 (grant client_credentials).
 */
final class TokenManager
{
    /** @var Configuration */
    private $config;

    /** @var HttpClientInterface */
    private $http;

    /** @var string|null */
    private $token;

    /** @var int  epoch em que o token expira */
    private $expiresAt = 0;

    /**
     * Cache persistente opcional do token (entre processos): array com as
     * callables 'load' (=> ['access_token'=>, 'expires_at'=>]|null) e
     * 'save' (recebe esse array). Permite reaproveitar o token entre
     * requisições, evitando um POST /oauth/token a cada chamada.
     *
     * @var array|null
     */
    private $store;

    public function __construct(Configuration $config, HttpClientInterface $http, $store = null)
    {
        $this->config = $config;
        $this->http = $http;
        $this->store = (is_array($store) && isset($store['load'], $store['save'])) ? $store : null;
    }

    /**
     * Token válido (renova automaticamente quando expira).
     *
     * @return string
     */
    public function getToken()
    {
        // 30s de folga para evitar usar um token prestes a expirar.
        if ($this->token !== null && time() < ($this->expiresAt - 30)) {
            return $this->token;
        }

        // Cache persistente (ex.: transient do WordPress).
        if ($this->store !== null) {
            $cached = call_user_func($this->store['load']);
            if (is_array($cached) && !empty($cached['access_token'])
                && time() < (((int) (isset($cached['expires_at']) ? $cached['expires_at'] : 0)) - 30)) {
                $this->token = (string) $cached['access_token'];
                $this->expiresAt = (int) $cached['expires_at'];
                return $this->token;
            }
        }

        return $this->fetch();
    }

    /**
     * Descarta o token em cache (força renovação na próxima chamada).
     *
     * @return void
     */
    public function reset()
    {
        $this->token = null;
        $this->expiresAt = 0;
    }

    /**
     * @return string
     */
    private function fetch()
    {
        $body = http_build_query(array(
            'grant_type' => GrantType::CLIENT_CREDENTIALS,
            'client_id' => $this->config->getClientId(),
            'client_secret' => $this->config->getClientSecret(),
        ));

        $headers = array(
            'Content-Type' => 'application/x-www-form-urlencoded',
            'Accept' => 'application/json',
        );

        $origin = $this->config->getOrigin();
        if ($origin !== null && $origin !== '') {
            $headers['Origin'] = $origin;
        }

        $response = $this->http->send('POST', $this->config->url('/oauth/token'), $headers, $body);
        $status = $response->getStatusCode();
        $data = $response->json();

        if ($status === 200 && isset($data['access_token'])) {
            $this->token = (string) $data['access_token'];
            $expiresIn = isset($data['expires_in']) ? (int) $data['expires_in'] : 3600;
            $this->expiresAt = time() + $expiresIn;

            if ($this->store !== null) {
                call_user_func($this->store['save'], array(
                    'access_token' => $this->token,
                    'expires_at' => $this->expiresAt,
                ));
            }

            return $this->token;
        }

        if ($status === 401 || $status === 403) {
            $message = isset($data['message']) ? $data['message'] : 'Falha ao autenticar: credenciais inválidas ou domínio não autorizado.';
            throw new AuthenticationException($message, $status);
        }

        throw new ApiException('Falha ao obter token de acesso.', $status, $data);
    }
}
