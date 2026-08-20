<?php

namespace Fragososoftware\ProjecaoWp;

use Fragososoftware\ProjecaoSdk\Domain\Model\ProjectionRequest;
use Fragososoftware\ProjecaoSdk\Domain\Model\CandidateProjection;
use Fragososoftware\ProjecaoSdk\Domain\Exception\ValidationException;
use Fragososoftware\ProjecaoSdk\Domain\Exception\AuthenticationException;
use Fragososoftware\ProjecaoSdk\Domain\Exception\ApiException;
use Fragososoftware\ProjecaoSdk\Domain\Exception\ConfigurationException;
use Fragososoftware\ProjecaoSdk\Domain\Exception\ProjecaoException;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Proxy REST do WordPress: o navegador chama estes endpoints (mesma origem, com
 * nonce) e o servidor repassa ao SDK usando o client_secret salvo. O segredo
 * nunca trafega para o cliente.
 */
class Rest
{
    const NS = 'projecao/v1';

    /** TTL do cache de respostas de leitura (1 hora). */
    const CACHE_TTL = 3600;

    /** @var Settings */
    private $settings;

    public function __construct(Settings $settings)
    {
        $this->settings = $settings;
    }

    /**
     * @return void
     */
    public function register()
    {
        add_action('rest_api_init', array($this, 'routes'));
    }

    /**
     * @return void
     */
    public function routes()
    {
        $public = array($this, 'publicPermission');
        $write = array($this, 'writePermission');

        register_rest_route(self::NS, '/test', array(
            'methods' => 'GET',
            'permission_callback' => array($this, 'adminPermission'),
            'callback' => array($this, 'test'),
        ));

        register_rest_route(self::NS, '/offices', array(
            'methods' => 'GET', 'permission_callback' => $public,
            'callback' => function (WP_REST_Request $r) {
                return $this->cachedRun($r, 'offices', function ($sdk) { return $sdk->offices(); });
            },
        ));

        register_rest_route(self::NS, '/states', array(
            'methods' => 'GET', 'permission_callback' => $public,
            'callback' => function (WP_REST_Request $r) {
                return $this->cachedRun($r, 'states', function ($sdk) use ($r) { return $sdk->states($this->filters($r, array('region_id'))); });
            },
        ));

        register_rest_route(self::NS, '/elections', array(
            'methods' => 'GET', 'permission_callback' => $public,
            'callback' => function (WP_REST_Request $r) {
                return $this->cachedRun($r, 'elections', function ($sdk) use ($r) { return $sdk->elections($this->filters($r, array('political_office_id', 'state_id', 'year'))); });
            },
        ));

        register_rest_route(self::NS, '/elections/(?P<id>\d+)', array(
            'methods' => 'GET', 'permission_callback' => $public,
            'callback' => function (WP_REST_Request $r) {
                return $this->cachedRun($r, 'election', function ($sdk) use ($r) { return $sdk->election((int) $r['id']); });
            },
        ));

        register_rest_route(self::NS, '/candidates', array(
            'methods' => 'GET', 'permission_callback' => $public,
            'callback' => function (WP_REST_Request $r) {
                return $this->cachedRun($r, 'candidates', function ($sdk) use ($r) {
                    return $sdk->candidates($this->filters($r, array('election_id', 'political_office_id', 'state_id', 'municipality_id', 'year')));
                });
            },
        ));

        // Média (consenso) das projeções salvas de uma eleição.
        register_rest_route(self::NS, '/averages', array(
            'methods' => 'GET', 'permission_callback' => $public,
            'callback' => function (WP_REST_Request $r) {
                return $this->cachedRun($r, 'averages', function ($sdk) use ($r) {
                    return $sdk->averages((int) $r->get_param('election_id'));
                });
            },
        ));

        register_rest_route(self::NS, '/units', array(
            'methods' => 'GET', 'permission_callback' => $public,
            'callback' => function (WP_REST_Request $r) {
                return $this->cachedRun($r, 'units', function ($sdk) use ($r) {
                    $stateId = $r->get_param('state_id');
                    return $sdk->units((string) $r->get_param('scope'), $stateId !== null && $stateId !== '' ? (int) $stateId : null);
                });
            },
        ));

        register_rest_route(self::NS, '/preview', array(
            'methods' => 'POST', 'permission_callback' => $write,
            'callback' => function (WP_REST_Request $r) {
                return $this->run(function ($sdk) use ($r) { return $sdk->previewProjection($this->buildProjection($r->get_json_params())); });
            },
        ));

        register_rest_route(self::NS, '/projections', array(
            'methods' => 'POST', 'permission_callback' => $write,
            'callback' => function (WP_REST_Request $r) {
                return $this->run(function ($sdk) use ($r) { return $sdk->sendProjection($this->buildProjection($r->get_json_params())); });
            },
        ));

        // Detalhe de uma projeção salva (para exibir a projeção pública via QR).
        register_rest_route(self::NS, '/projections/(?P<id>\d+)', array(
            'methods' => 'GET', 'permission_callback' => $public,
            'callback' => function (WP_REST_Request $r) {
                return $this->cachedRun($r, 'projection', function ($sdk) use ($r) { return $sdk->projection((int) $r['id']); });
            },
        ));

        // ---------------- Minha Colinha ----------------

        register_rest_route(self::NS, '/colinha', array(
            'methods' => 'GET', 'permission_callback' => $public,
            'callback' => function (WP_REST_Request $r) {
                return $this->cachedRun($r, 'colinha', function ($sdk) { return $sdk->colinha(); });
            },
        ));

        register_rest_route(self::NS, '/colinha/cargos', array(
            'methods' => 'GET', 'permission_callback' => $public,
            'callback' => function (WP_REST_Request $r) {
                return $this->cachedRun($r, 'colinha-cargos', function ($sdk) use ($r) {
                    return $sdk->colinhaOffices((string) $r->get_param('uf'));
                });
            },
        ));

        register_rest_route(self::NS, '/colinha/candidato', array(
            'methods' => 'GET', 'permission_callback' => $public,
            'callback' => function (WP_REST_Request $r) {
                return $this->cachedRun($r, 'colinha-candidato', function ($sdk) use ($r) {
                    return $sdk->colinhaLookup(
                        (string) $r->get_param('uf'),
                        (string) $r->get_param('slot'),
                        (string) $r->get_param('numero')
                    );
                });
            },
        ));

        register_rest_route(self::NS, '/colinha/buscar', array(
            'methods' => 'GET', 'permission_callback' => $public,
            'callback' => function (WP_REST_Request $r) {
                // Busca não entra em cache: o termo muda a cada tecla.
                return $this->run(function ($sdk) use ($r) {
                    return $sdk->colinhaSearch(
                        (string) $r->get_param('uf'),
                        (string) $r->get_param('slot'),
                        (string) $r->get_param('q')
                    );
                });
            },
        ));

        // O voto é anônimo e público de propósito: exigir nonce quebraria em
        // portal com cache de página (o HTML cacheado serve um nonce velho e o
        // voto seria recusado em silêncio). A escrita não expõe nada: a API só
        // conta escolha de candidato, sem identificar quem escolheu.
        register_rest_route(self::NS, '/colinha/urna', array(
            'methods' => 'POST', 'permission_callback' => $public,
            'callback' => function (WP_REST_Request $r) {
                return $this->run(function ($sdk) use ($r) {
                    $corpo = (array) $r->get_json_params();
                    $escolhas = isset($corpo['escolhas']) && is_array($corpo['escolhas']) ? $corpo['escolhas'] : array();

                    return $sdk->colinhaVote(
                        isset($corpo['token']) ? (string) $corpo['token'] : '',
                        isset($corpo['uf']) ? (string) $corpo['uf'] : '',
                        array_map('intval', $escolhas)
                    );
                });
            },
        ));

        // Proxy de imagem (mesma origem): permite a foto do candidato entrar no
        // canvas da imagem de compartilhamento sem problema de CORS.
        register_rest_route(self::NS, '/asset', array(
            'methods' => 'GET', 'permission_callback' => $public,
            'callback' => array($this, 'proxyAsset'),
        ));

        // Mapa SVG (país/UF) servido pela API via SDK, na mesma origem do blog.
        register_rest_route(self::NS, '/maps/(?P<key>[A-Za-z]{2})', array(
            'methods' => 'GET', 'permission_callback' => $public,
            'callback' => array($this, 'mapSvg'),
        ));
    }

    // ------------------------------------------------------------------
    // Permissões
    // ------------------------------------------------------------------

    public function publicPermission()
    {
        return true; // leitura pública (a calculadora é pública)
    }

    /**
     * Repassa (stream) uma imagem do domínio da API configurada, na mesma origem
     * do blog, para que o canvas de compartilhamento não fique "tainted" (CORS).
     * Restrito ao base_url (anti-SSRF) e a content-type de imagem.
     *
     * @param WP_REST_Request $request
     * @return WP_Error|void
     */
    public function proxyAsset(WP_REST_Request $request)
    {
        $url = (string) $request->get_param('u');
        $base = rtrim((string) $this->settings->getBaseUrl(), '/');

        if ($url === '' || $base === '' || strpos($url, $base . '/') !== 0) {
            return new WP_Error('rest_forbidden', __('URL não permitida.', 'projecao-eleitoral'), array('status' => 403));
        }

        $resp = wp_remote_get($url, array('timeout' => 10));
        if (is_wp_error($resp) || (int) wp_remote_retrieve_response_code($resp) !== 200) {
            return new WP_Error('rest_not_found', __('Imagem indisponível.', 'projecao-eleitoral'), array('status' => 404));
        }

        $ctype = wp_remote_retrieve_header($resp, 'content-type');
        if (! is_string($ctype) || strpos($ctype, 'image/') !== 0) {
            return new WP_Error('rest_forbidden', __('Conteúdo inválido.', 'projecao-eleitoral'), array('status' => 415));
        }

        $body = wp_remote_retrieve_body($resp);
        if (! headers_sent()) {
            header('Content-Type: ' . $ctype);
            header('Content-Length: ' . strlen($body));
            header('Cache-Control: public, max-age=86400');
        }
        echo $body; // phpcs:ignore WordPress.Security.EscapeOutput
        exit;
    }

    /**
     * Devolve o SVG de um mapa ('br' ou UF) na mesma origem do blog. Busca via
     * SDK (API) e cacheia; se a API não tiver o mapa, usa o SVG empacotado no
     * plugin como fallback. Sempre serve SVG cru (o front faz fetch().text()).
     *
     * @param WP_REST_Request $request
     * @return WP_Error|void
     */
    public function mapSvg(WP_REST_Request $request)
    {
        $key = strtolower((string) $request['key']);
        if (! preg_match('/^[a-z]{2}$/', $key)) {
            return new WP_Error('rest_not_found', __('Mapa inválido.', 'projecao-eleitoral'), array('status' => 404));
        }

        $tname = 'pc_map_' . $key;
        $svg = get_transient($tname);

        if (! is_string($svg) || strpos($svg, '<svg') === false) {
            // 1) API via SDK (fonte oficial).
            try {
                $svg = (new SdkClient($this->settings))->make()->map($key);
            } catch (\Exception $e) {
                $svg = null;
            }
            // 2) Fallback: SVG empacotado no plugin.
            if (! is_string($svg) || strpos($svg, '<svg') === false) {
                $local = PROJECAO_WP_DIR . 'assets/maps/' . $key . '.svg';
                $svg = is_file($local) ? file_get_contents($local) : null;
            }
            if (is_string($svg) && strpos($svg, '<svg') !== false) {
                set_transient($tname, $svg, DAY_IN_SECONDS);
            }
        }

        if (! is_string($svg) || strpos($svg, '<svg') === false) {
            return new WP_Error('rest_not_found', __('Mapa indisponível.', 'projecao-eleitoral'), array('status' => 404));
        }

        if (! headers_sent()) {
            header('Content-Type: image/svg+xml; charset=utf-8');
            header('Cache-Control: public, max-age=86400');
        }
        echo $svg; // phpcs:ignore WordPress.Security.EscapeOutput
        exit;
    }

    /**
     * Escrita exige nonce válido (proteção CSRF) — o front sempre o envia.
     *
     * @param WP_REST_Request $request
     * @return bool|WP_Error
     */
    public function writePermission(WP_REST_Request $request)
    {
        if (!wp_verify_nonce($request->get_header('X-WP-Nonce'), 'wp_rest')) {
            return new WP_Error('rest_forbidden', __('Sessão inválida. Recarregue a página.', 'projecao-eleitoral'), array('status' => 403));
        }
        return true;
    }

    public function adminPermission()
    {
        return current_user_can('manage_options');
    }

    // ------------------------------------------------------------------
    // Execução
    // ------------------------------------------------------------------

    /**
     * Testa a conexão (admin): retorna o nome da aplicação autenticada.
     *
     * @return WP_REST_Response
     */
    public function test()
    {
        return $this->run(function ($sdk) {
            return array('ok' => true, 'application' => $sdk->me());
        });
    }

    /**
     * Como run(), mas cacheia a resposta de sucesso por CACHE_TTL (transient),
     * evitando novas chamadas ao servidor para os mesmos parâmetros. Use apenas
     * em leituras (GET).
     *
     * @param WP_REST_Request $request
     * @param string $name  nome lógico do endpoint (compõe a chave de cache)
     * @param callable $fn
     * @return WP_REST_Response
     */
    private function cachedRun(WP_REST_Request $request, $name, $fn)
    {
        $params = array_merge(
            (array) $request->get_url_params(),
            (array) $request->get_query_params()
        );
        ksort($params);
        $tname = 'pc_cache_'.md5($name.'|'.wp_json_encode($params));

        $cached = get_transient($tname);
        if ($cached !== false) {
            return $cached;
        }

        $res = $this->run($fn);
        if ($res instanceof WP_REST_Response && $res->get_status() === 200) {
            set_transient($tname, $res, self::CACHE_TTL);
        }

        return $res;
    }

    /**
     * Executa uma operação do SDK e traduz exceções em respostas REST.
     *
     * @param callable $fn  recebe o Client do SDK e devolve um array
     * @return WP_REST_Response
     */
    private function run($fn)
    {
        try {
            $sdk = (new SdkClient($this->settings))->make();
            $data = call_user_func($fn, $sdk);
            return new WP_REST_Response(array('data' => $data), 200);
        } catch (ValidationException $e) {
            return new WP_REST_Response(array('message' => $e->getMessage(), 'errors' => $e->getErrors()), 422);
        } catch (AuthenticationException $e) {
            return new WP_REST_Response(array('message' => $e->getMessage()), 401);
        } catch (ConfigurationException $e) {
            return new WP_REST_Response(array('message' => $e->getMessage()), 503);
        } catch (ApiException $e) {
            $status = $e->getStatusCode() >= 400 ? $e->getStatusCode() : 502;
            return new WP_REST_Response(array('message' => $e->getMessage()), $status);
        } catch (ProjecaoException $e) {
            return new WP_REST_Response(array('message' => $e->getMessage()), 502);
        }
    }

    /**
     * Lê apenas as chaves informadas da query string.
     *
     * @param WP_REST_Request $request
     * @param string[] $keys
     * @return array
     */
    private function filters(WP_REST_Request $request, array $keys)
    {
        $filters = array();
        foreach ($keys as $key) {
            $value = $request->get_param($key);
            if ($value !== null && $value !== '') {
                $filters[$key] = $value;
            }
        }
        return $filters;
    }

    /**
     * Monta um ProjectionRequest do SDK a partir do payload recebido do front.
     *
     * @param array|null $params
     * @return ProjectionRequest
     */
    private function buildProjection($params)
    {
        $params = is_array($params) ? $params : array();

        $req = ProjectionRequest::make()
            ->setElectionId(isset($params['election_id']) ? (int) $params['election_id'] : 0)
            ->setScope(isset($params['scope']) ? (string) $params['scope'] : '');

        if (!empty($params['external_code'])) {
            $req->setExternalCode((string) $params['external_code']);
        }
        if (!empty($params['title'])) {
            $req->setTitle((string) $params['title']);
        }
        if (!empty($params['description'])) {
            $req->setDescription((string) $params['description']);
        }
        if (!empty($params['analyzed_at'])) {
            $req->setAnalyzedAt((string) $params['analyzed_at']);
        }
        // Analista = usuário logado do blog (se houver). É o nome real de quem
        // fez a projeção; sem login, fica a cargo da API (sem analista nomeado).
        $user = function_exists('wp_get_current_user') ? wp_get_current_user() : null;
        if ($user && $user->exists()) {
            $name = $user->display_name ? $user->display_name : $user->user_login;
            $req->setAnalyst($name, $user->user_email ? $user->user_email : null);
        } elseif (!empty($params['analyst']) && is_array($params['analyst'])) {
            $req->setAnalyst(
                isset($params['analyst']['name']) ? $params['analyst']['name'] : null,
                isset($params['analyst']['email']) ? $params['analyst']['email'] : null
            );
        }

        $candidates = isset($params['candidates']) && is_array($params['candidates']) ? $params['candidates'] : array();
        foreach ($candidates as $entry) {
            if (!isset($entry['candidate_id'])) {
                continue;
            }
            $candidate = CandidateProjection::make((int) $entry['candidate_id']);
            $units = isset($entry['units']) && is_array($entry['units']) ? $entry['units'] : array();
            foreach ($units as $unitId => $pct) {
                $candidate->setUnit((int) $unitId, (float) $pct);
            }
            $req->addCandidate($candidate);
        }

        return $req;
    }
}
