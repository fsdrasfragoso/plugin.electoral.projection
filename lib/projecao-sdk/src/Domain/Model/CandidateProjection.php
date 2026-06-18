<?php

namespace Fragososoftware\ProjecaoSdk\Domain\Model;

use Fragososoftware\ProjecaoSdk\Domain\Exception\ValidationException;

/**
 * Proporção (%) de um candidato em cada unidade (estado, região, macrorregião
 * ou município, conforme o escopo da projeção).
 */
final class CandidateProjection
{
    /** @var int */
    private $candidateId;

    /** @var float[]  unit_id => percentual */
    private $units = array();

    /**
     * @param int $candidateId
     */
    public function __construct($candidateId)
    {
        $this->candidateId = (int) $candidateId;
    }

    /**
     * Atalho de construção: CandidateProjection::make(3)->setUnit(...).
     *
     * @param int $candidateId
     * @return self
     */
    public static function make($candidateId)
    {
        return new self($candidateId);
    }

    /**
     * Define o percentual do candidato numa unidade.
     *
     * @param int $unitId
     * @param float $percentage
     * @return self
     */
    public function setUnit($unitId, $percentage)
    {
        $this->units[(int) $unitId] = (float) $percentage;
        return $this;
    }

    /**
     * Define vários percentuais de uma vez: [unit_id => pct].
     *
     * @param array $units
     * @return self
     */
    public function setUnits(array $units)
    {
        foreach ($units as $unitId => $pct) {
            $this->setUnit($unitId, $pct);
        }
        return $this;
    }

    /**
     * @return int
     */
    public function getCandidateId()
    {
        return $this->candidateId;
    }

    /**
     * @return float[]
     */
    public function getUnits()
    {
        return $this->units;
    }

    /**
     * Valida o conteúdo deste candidato (lança ValidationException).
     *
     * @return void
     */
    public function validate()
    {
        $errors = array();

        if ($this->candidateId <= 0) {
            $errors['candidate_id'] = array('candidate_id é obrigatório e deve ser positivo.');
        }

        if (count($this->units) === 0) {
            $errors['units'] = array('Informe ao menos uma unidade com percentual.');
        }

        foreach ($this->units as $unitId => $pct) {
            if (!is_numeric($pct) || $pct < 0 || $pct > 100) {
                $errors['units.' . $unitId] = array('Percentual deve ser numérico entre 0 e 100.');
            }
        }

        if (count($errors) > 0) {
            throw new ValidationException('Candidato inválido (id ' . $this->candidateId . ').', $errors);
        }
    }

    /**
     * @return array
     */
    public function toArray()
    {
        // (object) garante que "units" seja um objeto JSON ({"12":60}), mesmo
        // com uma única chave numérica.
        return array(
            'candidate_id' => $this->candidateId,
            'units' => (object) $this->units,
        );
    }
}
