<?php

namespace Fragososoftware\ProjecaoSdk\Domain\Model;

use Fragososoftware\ProjecaoSdk\Domain\Enum\Scope;
use Fragososoftware\ProjecaoSdk\Domain\Exception\ValidationException;

/**
 * Builder fluente do payload de projeção enviado à API.
 *
 * Exemplo:
 *   $req = ProjectionRequest::make()
 *       ->setElectionId(5)
 *       ->setScope(Scope::ESTADO)
 *       ->setExternalCode('ABC-123')
 *       ->setAnalyst('João', 'joao@portal.com')
 *       ->addCandidate(CandidateProjection::make(3)->setUnit(12, 60)->setUnit(13, 40))
 *       ->addCandidate(CandidateProjection::make(4)->setUnit(12, 40)->setUnit(13, 60));
 */
final class ProjectionRequest
{
    /** @var int|null */
    private $electionId;

    /** @var string|null */
    private $scope;

    /** @var string|null */
    private $externalCode;

    /** @var string|null */
    private $title;

    /** @var string|null */
    private $description;

    /** @var string|null  Y-m-d */
    private $analyzedAt;

    /** @var Analyst|null */
    private $analyst;

    /** @var CandidateProjection[] */
    private $candidates = array();

    /**
     * @return self
     */
    public static function make()
    {
        return new self();
    }

    /**
     * @param int $electionId
     * @return self
     */
    public function setElectionId($electionId)
    {
        $this->electionId = (int) $electionId;
        return $this;
    }

    /**
     * @param string $scope  use as constantes de Scope
     * @return self
     */
    public function setScope($scope)
    {
        $this->scope = $scope;
        return $this;
    }

    /**
     * @param string $externalCode
     * @return self
     */
    public function setExternalCode($externalCode)
    {
        $this->externalCode = $externalCode;
        return $this;
    }

    /**
     * @param string $title
     * @return self
     */
    public function setTitle($title)
    {
        $this->title = $title;
        return $this;
    }

    /**
     * @param string $description
     * @return self
     */
    public function setDescription($description)
    {
        $this->description = $description;
        return $this;
    }

    /**
     * @param string $date  formato Y-m-d
     * @return self
     */
    public function setAnalyzedAt($date)
    {
        $this->analyzedAt = $date;
        return $this;
    }

    /**
     * Define o analista. Aceite um objeto Analyst ou (nome, email).
     *
     * @param Analyst|string|null $nameOrAnalyst
     * @param string|null $email
     * @return self
     */
    public function setAnalyst($nameOrAnalyst = null, $email = null)
    {
        if ($nameOrAnalyst instanceof Analyst) {
            $this->analyst = $nameOrAnalyst;
        } else {
            $this->analyst = new Analyst($nameOrAnalyst, $email);
        }
        return $this;
    }

    /**
     * @param CandidateProjection $candidate
     * @return self
     */
    public function addCandidate(CandidateProjection $candidate)
    {
        $this->candidates[] = $candidate;
        return $this;
    }

    /**
     * @return CandidateProjection[]
     */
    public function getCandidates()
    {
        return $this->candidates;
    }

    /**
     * Valida o payload localmente, antes de enviar (lança ValidationException).
     *
     * @return void
     */
    public function validate()
    {
        $errors = array();

        if (!$this->electionId || $this->electionId <= 0) {
            $errors['election_id'] = array('election_id é obrigatório.');
        }

        if ($this->scope === null || !Scope::isValid($this->scope)) {
            $errors['scope'] = array('scope é obrigatório e deve ser um de: ' . implode(', ', Scope::all()) . '.');
        }

        if (count($this->candidates) === 0) {
            $errors['candidates'] = array('Informe ao menos um candidato.');
        }

        if (count($errors) > 0) {
            throw new ValidationException('Projeção inválida.', $errors);
        }

        // Valida cada candidato (propaga a ValidationException do candidato).
        foreach ($this->candidates as $candidate) {
            $candidate->validate();
        }
    }

    /**
     * Monta o array do payload (já no formato esperado pela API).
     *
     * @return array
     */
    public function toArray()
    {
        $data = array(
            'election_id' => $this->electionId,
            'scope' => $this->scope,
            'candidates' => array(),
        );

        foreach ($this->candidates as $candidate) {
            $data['candidates'][] = $candidate->toArray();
        }

        if ($this->externalCode !== null && $this->externalCode !== '') {
            $data['external_code'] = $this->externalCode;
        }
        if ($this->title !== null && $this->title !== '') {
            $data['title'] = $this->title;
        }
        if ($this->description !== null && $this->description !== '') {
            $data['description'] = $this->description;
        }
        if ($this->analyzedAt !== null && $this->analyzedAt !== '') {
            $data['analyzed_at'] = $this->analyzedAt;
        }
        if ($this->analyst !== null && !$this->analyst->isEmpty()) {
            $data['analyst'] = $this->analyst->toArray();
        }

        return $data;
    }
}
