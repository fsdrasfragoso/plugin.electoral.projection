<?php

namespace Fragososoftware\ProjecaoSdk\Domain\Model;

/**
 * Analista responsável pela projeção (opcional).
 *
 * Regra do servidor: sem e-mail, a projeção é atribuída ao analista "dono" da
 * aplicação; com e-mail, reaproveita um analista existente ou cria um novo.
 */
final class Analyst
{
    /** @var string|null */
    private $name;

    /** @var string|null */
    private $email;

    /**
     * @param string|null $name
     * @param string|null $email
     */
    public function __construct($name = null, $email = null)
    {
        $this->name = $name;
        $this->email = $email;
    }

    /**
     * @param string $name
     * @return self
     */
    public function setName($name)
    {
        $this->name = $name;
        return $this;
    }

    /**
     * @param string $email
     * @return self
     */
    public function setEmail($email)
    {
        $this->email = $email;
        return $this;
    }

    /**
     * @return array
     */
    public function toArray()
    {
        $data = array();
        if ($this->name !== null && $this->name !== '') {
            $data['name'] = $this->name;
        }
        if ($this->email !== null && $this->email !== '') {
            $data['email'] = $this->email;
        }
        return $data;
    }

    /**
     * @return bool
     */
    public function isEmpty()
    {
        return count($this->toArray()) === 0;
    }
}
