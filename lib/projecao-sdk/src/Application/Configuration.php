<?php

namespace Fragososoftware\ProjecaoSdk\Application;

use Fragososoftware\ProjecaoSdk\Domain\Exception\ConfigurationException;

/**
 * Configuração do SDK: endpoint base e credenciais OAuth2 da aplicação.
 */
final class Configuration
{
    /** @var string */
    private $baseUrl;

    /** @var string */
    private $clientId;

    /** @var string */
    private $clientSecret;

    /** @var int */
    private $timeout = 15;

    /** @var string|null */
    private $origin;

    /**
     * @param string $baseUrl  ex.: https://projecao.fragososoftware.com
     * @param string $clientId
     * @param string $clientSecret
     * @throws ConfigurationException
     */
    public function __construct($baseUrl, $clientId, $clientSecret)
    {
        if (!is_string($baseUrl) || trim($baseUrl) === '') {
            throw new ConfigurationException('base_url é obrigatório.');
        }
        if (!is_string($clientId) || trim($clientId) === '') {
            throw new ConfigurationException('client_id é obrigatório.');
        }
        if (!is_string($clientSecret) || trim($clientSecret) === '') {
            throw new ConfigurationException('client_secret é obrigatório.');
        }

        $this->baseUrl = rtrim(trim($baseUrl), '/');
        $this->clientId = $clientId;
        $this->clientSecret = $clientSecret;
    }

    /**
     * @return string
     */
    public function getBaseUrl()
    {
        return $this->baseUrl;
    }

    /**
     * Monta uma URL absoluta a partir de um caminho ("/api/v1/...").
     *
     * @param string $path
     * @return string
     */
    public function url($path)
    {
        return $this->baseUrl . '/' . ltrim($path, '/');
    }

    /**
     * @return string
     */
    public function getClientId()
    {
        return $this->clientId;
    }

    /**
     * @return string
     */
    public function getClientSecret()
    {
        return $this->clientSecret;
    }

    /**
     * @param int $seconds
     * @return self
     */
    public function setTimeout($seconds)
    {
        $this->timeout = (int) $seconds;
        return $this;
    }

    /**
     * @return int
     */
    public function getTimeout()
    {
        return $this->timeout;
    }

    /**
     * Domínio de origem enviado no header Origin ao pedir o token. Necessário
     * quando a aplicação tem domínios cadastrados (restrição de domínio).
     *
     * @param string $origin
     * @return self
     */
    public function setOrigin($origin)
    {
        $this->origin = $origin;
        return $this;
    }

    /**
     * @return string|null
     */
    public function getOrigin()
    {
        return $this->origin;
    }
}
