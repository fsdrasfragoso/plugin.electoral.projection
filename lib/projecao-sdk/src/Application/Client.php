<?php

namespace Fragososoftware\ProjecaoSdk\Application;

use Fragososoftware\ProjecaoSdk\Domain\Enum\Scope;
use Fragososoftware\ProjecaoSdk\Domain\Exception\ApiException;
use Fragososoftware\ProjecaoSdk\Domain\Exception\AuthenticationException;
use Fragososoftware\ProjecaoSdk\Domain\Exception\ValidationException;
use Fragososoftware\ProjecaoSdk\Domain\Model\ProjectionRequest;
use Fragososoftware\ProjecaoSdk\Port\HttpClientInterface;
use Fragososoftware\ProjecaoSdk\Port\HttpResponse;

/**
 * Cliente da API de Projeções (fachada do SDK).
 *
 * Métodos de leitura devolvem o conteúdo de "data" da resposta. Em caso de erro
 * lançam ValidationException (422), AuthenticationException (401/403) ou
 * ApiException (demais).
 */
final class Client
{
    /** @var Configuration */
    private $config;

    /** @var HttpClientInterface */
    private $http;

    /** @var TokenManager */
    private $tokens;

    public function __construct(Configuration $config, HttpClientInterface $http, TokenManager $tokens)
    {
        $this->config = $config;
        $this->http = $http;
        $this->tokens = $tokens;
    }

    // ---------------------------------------------------------------------
    // Identidade
    // ---------------------------------------------------------------------

    /**
     * Dados da aplicação autenticada (whoami).
     *
     * @return array
     */
    public function me()
    {
        return $this->dataOf($this->get('/api/v1/me'));
    }

    // ---------------------------------------------------------------------
    // Referência (para montar a projeção)
    // ---------------------------------------------------------------------

    /**
     * @return array
     */
    public function offices()
    {
        return $this->dataOf($this->get('/api/v1/offices'));
    }

    /**
     * @param array $filters  political_office_id, state_id, year
     * @return array
     */
    public function elections(array $filters = array())
    {
        return $this->dataOf($this->get('/api/v1/elections', $filters));
    }

    /**
     * Eleição + regras do cenário (escopos, turnos, candidatos por turno).
     *
     * @param int $id
     * @return array
     */
    public function election($id)
    {
        return $this->dataOf($this->get('/api/v1/elections/' . (int) $id));
    }

    /**
     * @param array $filters  region_id
     * @return array
     */
    public function states(array $filters = array())
    {
        return $this->dataOf($this->get('/api/v1/states', $filters));
    }

    /**
     * Unidades da projeção para um escopo (a "grade" a preencher).
     *
     * @param string $scope  use as constantes de Scope
     * @param int|null $stateId  obrigatório para regiao_estado e municipio
     * @return array
     */
    public function units($scope, $stateId = null)
    {
        $query = array('scope' => $scope);
        if ($stateId !== null) {
            $query['state_id'] = (int) $stateId;
        }
        return $this->dataOf($this->get('/api/v1/units', $query));
    }

    /**
     * @param array $filters  political_spectrum_id
     * @return array
     */
    public function parties(array $filters = array())
    {
        return $this->dataOf($this->get('/api/v1/parties', $filters));
    }

    /**
     * @return array
     */
    public function spectrums()
    {
        return $this->dataOf($this->get('/api/v1/spectrums'));
    }

    /**
     * Analistas vinculados à aplicação.
     *
     * @return array
     */
    public function analysts()
    {
        return $this->dataOf($this->get('/api/v1/analysts'));
    }

    /**
     * SVG de um mapa: 'br' (país) ou a UF (ex.: 'ce' = mapa municipal do estado).
     *
     * @param string $key
     * @return string  conteúdo do SVG
     */
    public function map($key)
    {
        return $this->dataOf($this->get('/api/v1/maps/' . rawurlencode($key)));
    }

    /**
     * Candidatos por eleição e/ou cargo (state_id obrigatório p/ cargo estadual).
     *
     * @param array $filters  election_id, political_office_id, state_id, municipality_id, year
     * @return array
     */
    public function candidates(array $filters = array())
    {
        return $this->dataOf($this->get('/api/v1/candidates', $filters));
    }

    /**
     * Hierarquia geográfica: regiões -> estados -> macrorregiões -> municípios.
     *
     * @param array $filters  region_id, include_municipalities
     * @return array
     */
    public function regions(array $filters = array())
    {
        return $this->dataOf($this->get('/api/v1/regions', $filters));
    }

    /**
     * Média consolidada por candidato nas projeções salvas de uma eleição.
     *
     * @param int $electionId
     * @return array
     */
    public function averages($electionId)
    {
        return $this->dataOf($this->get('/api/v1/averages', array('election_id' => (int) $electionId)));
    }

    // ---------------------------------------------------------------------
    // Minha Colinha
    // ---------------------------------------------------------------------

    /**
     * Textos, estados atendidos e contagem regressiva da colinha.
     *
     * @return array
     */
    public function colinha()
    {
        return $this->dataOf($this->get('/api/v1/colinha'));
    }

    /**
     * Cargos que a colinha oferece na UF (só os que já têm candidato).
     *
     * @param string $uf
     * @return array
     */
    public function colinhaOffices($uf)
    {
        return $this->dataOf($this->get('/api/v1/colinha/cargos', array('uf' => $uf)));
    }

    /**
     * Candidato pelo número da urna.
     *
     * @param string $uf
     * @param string $slot    cargo da colinha (ex.: governador, senador_1)
     * @param string $number
     * @return array|null
     */
    public function colinhaLookup($uf, $slot, $number)
    {
        return $this->dataOf($this->get('/api/v1/colinha/candidato', array(
            'uf' => $uf, 'slot' => $slot, 'number' => $number,
        )));
    }

    /**
     * Busca de candidato pelo nome.
     *
     * @param string $uf
     * @param string $slot
     * @param string $term
     * @return array
     */
    public function colinhaSearch($uf, $slot, $term)
    {
        return $this->dataOf($this->get('/api/v1/colinha/buscar', array(
            'uf' => $uf, 'slot' => $slot, 'q' => $term,
        )));
    }

    /**
     * Registra o voto anônimo da colinha montada no site do cliente.
     *
     * @param string $token   identificador do aparelho (não identifica pessoa)
     * @param string $uf
     * @param array  $choices cargo => id do candidato
     * @return array
     */
    public function colinhaVote($token, $uf, array $choices)
    {
        return $this->dataOf($this->post('/api/v1/colinha/urna', array(
            'token' => $token, 'uf' => $uf, 'choices' => $choices,
        )));
    }

    // ---------------------------------------------------------------------
    // Projeções
    // ---------------------------------------------------------------------

    /**
     * Calcula a projeção sem salvar (preview ao vivo).
     *
     * @param ProjectionRequest $request
     * @return array
     */
    public function previewProjection(ProjectionRequest $request)
    {
        $request->validate();
        return $this->dataOf($this->post('/api/v1/projections/preview', $request->toArray()));
    }

    /**
     * Envia (persiste) a projeção. Reenvio com o mesmo external_code atualiza.
     *
     * @param ProjectionRequest $request
     * @return array
     */
    public function sendProjection(ProjectionRequest $request)
    {
        $request->validate();
        return $this->dataOf($this->post('/api/v1/projections', $request->toArray()));
    }

    /**
     * Lista as projeções da aplicação (resposta completa: data + meta).
     *
     * @param array $filters  election_id, scope, external_code, per_page
     * @return array
     */
    public function projections(array $filters = array())
    {
        return $this->get('/api/v1/projections', $filters);
    }

    /**
     * Detalha uma projeção da aplicação (cabeçalho + ranking + detalhe).
     *
     * @param int $id
     * @return array
     */
    public function projection($id)
    {
        return $this->dataOf($this->get('/api/v1/projections/' . (int) $id));
    }

    // ---------------------------------------------------------------------
    // Infraestrutura interna
    // ---------------------------------------------------------------------

    /**
     * @param string $path
     * @param array $query
     * @return array
     */
    private function get($path, array $query = array())
    {
        if (count($query) > 0) {
            $path .= '?' . http_build_query($query);
        }
        return $this->request('GET', $path, null);
    }

    /**
     * @param string $path
     * @param array $body
     * @return array
     */
    private function post($path, array $body)
    {
        return $this->request('POST', $path, $body);
    }

    /**
     * Executa a requisição autenticada e trata a resposta. Em 401, renova o
     * token uma vez e tenta de novo (token pode ter expirado).
     *
     * @param string $method
     * @param string $path
     * @param array|null $body
     * @return array
     */
    private function request($method, $path, $body)
    {
        $response = $this->dispatch($method, $path, $body, $this->tokens->getToken());

        if ($response->getStatusCode() === 401) {
            $this->tokens->reset();
            $response = $this->dispatch($method, $path, $body, $this->tokens->getToken());
        }

        return $this->handle($response);
    }

    /**
     * @param string $method
     * @param string $path
     * @param array|null $body
     * @param string $token
     * @return HttpResponse
     */
    private function dispatch($method, $path, $body, $token)
    {
        $headers = array(
            'Accept' => 'application/json',
            'Authorization' => 'Bearer ' . $token,
        );

        $rawBody = null;
        if ($body !== null) {
            $headers['Content-Type'] = 'application/json';
            $rawBody = json_encode($body);
        }

        return $this->http->send($method, $this->config->url($path), $headers, $rawBody);
    }

    /**
     * @param HttpResponse $response
     * @return array
     */
    private function handle(HttpResponse $response)
    {
        $status = $response->getStatusCode();
        $data = $response->json();

        if ($status >= 200 && $status < 300) {
            return $data;
        }

        $message = isset($data['message']) ? $data['message'] : ('Erro HTTP ' . $status . '.');

        if ($status === 422) {
            $errors = isset($data['errors']) && is_array($data['errors']) ? $data['errors'] : array();
            throw new ValidationException($message, $errors, $status);
        }

        if ($status === 401 || $status === 403) {
            throw new AuthenticationException($message, $status);
        }

        throw new ApiException($message, $status, $data);
    }

    /**
     * Extrai "data" da resposta (ou a resposta inteira se não houver).
     *
     * @param array $body
     * @return array
     */
    private function dataOf(array $body)
    {
        return array_key_exists('data', $body) ? $body['data'] : $body;
    }
}
