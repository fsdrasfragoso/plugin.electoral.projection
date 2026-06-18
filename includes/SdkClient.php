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
            )
        );
    }
}
