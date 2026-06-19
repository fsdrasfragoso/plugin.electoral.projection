<?php

namespace Fragososoftware\ProjecaoWp;

use Fragososoftware\ProjecaoSdk\ProjecaoSdk;
use Fragososoftware\ProjecaoSdk\Application\Client;
use Fragososoftware\ProjecaoSdk\Domain\Exception\ConfigurationException;

/**
 * Monta o cliente do SDK (lado servidor) a partir das configurações do plugin.
 * É aqui que o client_secret é usado — sempre no back-end, nunca no navegador.
 */
class SdkClient
{
    /** @var Settings */
    private $settings;

    public function __construct(Settings $settings)
    {
        $this->settings = $settings;
    }

    /**
     * @return Client
     * @throws ConfigurationException quando as credenciais não foram informadas
     */
    public function make()
    {
        if (!$this->settings->isConfigured()) {
            throw new ConfigurationException(
                __('Configure o client_id e o client_secret em Configurações → Projeção Eleitoral.', 'projecao-eleitoral')
            );
        }

        return ProjecaoSdk::create(
            $this->settings->getBaseUrl(),
            $this->settings->getClientId(),
            $this->settings->getClientSecret(),
            array(
                'timeout' => $this->settings->getTimeout(),
                'origin' => $this->settings->getOrigin(),
                // Reaproveita o token OAuth entre requisições (transient), evitando
                // um POST /oauth/token a cada chamada do proxy.
                'token_cache' => array(
                    'load' => function () {
                        $t = get_transient('projecao_oauth_token');
                        return is_array($t) ? $t : null;
                    },
                    'save' => function ($data) {
                        $ttl = isset($data['expires_at']) ? ((int) $data['expires_at'] - time() - 60) : 3000;
                        set_transient('projecao_oauth_token', $data, max(60, $ttl));
                    },
                ),
            )
        );
    }
}
