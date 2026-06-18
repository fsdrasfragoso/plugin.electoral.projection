<?php

namespace Fragososoftware\ProjecaoSdk\Domain\Exception;

/**
 * Falha de transporte (rede/cURL): host inacessível, timeout, SSL etc.
 * Nenhuma resposta HTTP foi obtida.
 */
class TransportException extends ProjecaoException
{
}
