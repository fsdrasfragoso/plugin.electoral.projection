<?php

namespace Fragososoftware\ProjecaoSdk\Domain\Enum;

/**
 * Escopo (tipo de unidade) de uma projeção. Deve ser compatível com a esfera
 * do cargo da eleição (ver Sphere::scopesFor()).
 */
final class Scope
{
    const REGIAO = 'regiao';                 // regiões do país (Norte, Nordeste, ...)
    const ESTADO = 'estado';                 // estados (UFs)
    const REGIAO_ESTADO = 'regiao_estado';   // macrorregiões internas de um estado
    const MUNICIPIO = 'municipio';           // municípios de um estado

    private function __construct()
    {
    }

    /**
     * @return string[]
     */
    public static function all()
    {
        return array(self::REGIAO, self::ESTADO, self::REGIAO_ESTADO, self::MUNICIPIO);
    }

    /**
     * @param string $scope
     * @return bool
     */
    public static function isValid($scope)
    {
        return in_array($scope, self::all(), true);
    }

    /**
     * Escopos que exigem o estado (state_id) ao montar as unidades.
     *
     * @param string $scope
     * @return bool
     */
    public static function requiresState($scope)
    {
        return $scope === self::REGIAO_ESTADO || $scope === self::MUNICIPIO;
    }
}
