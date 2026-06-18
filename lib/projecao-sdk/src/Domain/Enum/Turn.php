<?php

namespace Fragososoftware\ProjecaoSdk\Domain\Enum;

/**
 * Turno da eleição. Regra da calculadora: 1º turno tem 3+ candidatos; 2º turno
 * tem exatamente 2.
 */
final class Turn
{
    const FIRST = 1;
    const SECOND = 2;

    private function __construct()
    {
    }

    /**
     * @return int[]
     */
    public static function all()
    {
        return array(self::FIRST, self::SECOND);
    }

    /**
     * @param int $turn
     * @return bool
     */
    public static function isValid($turn)
    {
        return in_array((int) $turn, self::all(), true);
    }
}
