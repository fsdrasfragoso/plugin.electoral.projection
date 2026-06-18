<?php

namespace Fragososoftware\ProjecaoSdk\Domain\Enum;

/**
 * Esfera político-administrativa do cargo.
 */
final class Sphere
{
    const FEDERAL = 'federal';     // ex.: Presidente
    const ESTADUAL = 'estadual';   // ex.: Governador
    const MUNICIPAL = 'municipal'; // ex.: Prefeito

    private function __construct()
    {
    }

    /**
     * @return string[]
     */
    public static function all()
    {
        return array(self::FEDERAL, self::ESTADUAL, self::MUNICIPAL);
    }

    /**
     * @param string $sphere
     * @return bool
     */
    public static function isValid($sphere)
    {
        return in_array($sphere, self::all(), true);
    }

    /**
     * Escopos válidos para a esfera informada (espelha a regra do servidor).
     *
     * @param string $sphere
     * @return string[]
     */
    public static function scopesFor($sphere)
    {
        switch ($sphere) {
            case self::FEDERAL:
                return array(Scope::REGIAO, Scope::ESTADO);
            case self::ESTADUAL:
                return array(Scope::ESTADO, Scope::REGIAO_ESTADO, Scope::MUNICIPIO);
            case self::MUNICIPAL:
                return array(Scope::MUNICIPIO);
            default:
                return array();
        }
    }
}
