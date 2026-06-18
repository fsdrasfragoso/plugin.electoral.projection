<?php

namespace Fragososoftware\ProjecaoSdk\Domain\Enum;

/**
 * Tipo de votação do cargo.
 */
final class VotingType
{
    const MAJORITARIA = 'majoritaria';
    const PROPORCIONAL = 'proporcional';

    private function __construct()
    {
    }

    /**
     * @return string[]
     */
    public static function all()
    {
        return array(self::MAJORITARIA, self::PROPORCIONAL);
    }

    /**
     * @param string $type
     * @return bool
     */
    public static function isValid($type)
    {
        return in_array($type, self::all(), true);
    }
}
