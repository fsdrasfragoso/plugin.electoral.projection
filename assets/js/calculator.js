/* global PROJECAO_WP */
(function () {
    'use strict';

    if (typeof PROJECAO_WP === 'undefined') { return; }

    var root = document.getElementById('projecao-calc');
    if (!root) { return; }

    var SCOPE_LABELS = {
        regiao: 'Região (país)',
        estado: 'Estado',
        regiao_estado: 'Macrorregião do estado',
        municipio: 'Município'
    };

    // Títulos e descrições dos cards de escopo (etapa "como fazer a análise").
    var SCOPE_TITLES = {
        regiao: 'Por região do país',
        estado: 'Por estado',
        regiao_estado: 'Por região do estado',
        municipio: 'Por município'
    };
    var SCOPE_DESC = {
        regiao: 'Agrupa os estados nas 5 regiões — menos passos.',
        estado: 'Estado por estado.',
        regiao_estado: 'Agrupa os municípios em macrorregiões — bem menos passos.',
        municipio: 'Cidade por cidade: mais preciso, porém com mais passos.'
    };

    // UFs por região do país (IBGE) — para iluminar o mapa no escopo "região".
    var REGION_UFS = {
        'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
        'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
        'Centro-Oeste': ['DF', 'GO', 'MS', 'MT'],
        'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
        'Sul': ['PR', 'RS', 'SC']
    };

    var UF_NAMES = {
        AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
        DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
        MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará',
        PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
        RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
        SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
    };

    var state = {
        offices: [],
        office: null,
        stateId: null,
        electionId: null,
        scopes: [],
        scope: null,
        candidates: [],   // todos da eleição
        selected: [],      // ids selecionados
        units: [],
        matrix: {},        // matrix[unitId][candId] = %
        current: 0,        // índice da unidade atual
        statesById: {},    // id do estado -> UF
        stateUf: null,     // UF do estado selecionado (cargos estaduais)
        maxPerParty: 1,    // candidatos por partido (Senado = 2)
        elects: 1          // quantos são eleitos (Senado = 2)
    };

    var el = {
        error: q('[data-pc-error]'),
        loading: q('[data-pc-loading]'),
        offices: q('[data-pc-offices]'),
        stateWrap: q('[data-pc-state-wrap]'),
        state: q('[data-pc-state]'),
        scopes: q('[data-pc-scopes]'),
        candidates: q('[data-pc-candidates]'),
        result: q('[data-pc-result]'),
        ranking: q('[data-pc-ranking]'),
        // Etapa 3 (unidade por unidade)
        rows: q('[data-pc-rows]'),
        sum: q('[data-pc-sum]'),
        sumalert: q('[data-pc-sumalert]'),
        flag: q('[data-pc-flag]'),
        unitName: q('[data-pc-unit-name]'),
        unitSub: q('[data-pc-unit-sub]'),
        unitCounter: q('[data-pc-unit-counter]'),
        unitValid: q('[data-pc-unit-valid]'),
        progress: q('[data-pc-progress]'),
        unitPrev: q('[data-pc-unit-prev]'),
        unitNext: q('[data-pc-unit-next]'),
        preview: q('[data-pc-preview]'),
        save: q('[data-pc-save]'),
        map: q('[data-pc-map]'),
        tags: q('[data-pc-tags]')
    };

    function q(sel) { return root.querySelector(sel); }
    function show(node, on) { if (node) { node.hidden = !on; } }
    // Ao trocar de unidade, sobe para o topo do painel (mostra a nova região),
    // como num checkout: cada unidade recomeça do início.
    function scrollToUnit() {
        var panel = root.querySelector('.projecao-calc__unit-panel');
        if (panel && panel.scrollIntoView) { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
    function step(n) {
        var steps = root.querySelectorAll('[data-pc-step]');
        for (var i = 0; i < steps.length; i++) {
            steps[i].hidden = (steps[i].getAttribute('data-pc-step') !== String(n));
        }
    }
    function setError(msg) {
        if (!el.error) { return; }
        if (msg) { el.error.textContent = msg; el.error.hidden = false; }
        else { el.error.textContent = ''; el.error.hidden = true; }
    }
    function loading(on) { show(el.loading, on); }
    function esc(s) { var d = document.createElement('div'); d.textContent = (s == null ? '' : s); return d.innerHTML; }

    function serialize(obj) {
        var parts = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k) && obj[k] !== null && obj[k] !== undefined && obj[k] !== '') {
                parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]));
            }
        }
        return parts.join('&');
    }

    function api(path, opts) {
        opts = opts || {};
        var url = PROJECAO_WP.restBase + path;
        if (opts.query) {
            var qs = serialize(opts.query);
            // Permalink bonito → base termina em /wp-json/...; plano → contém ?rest_route=.
            if (qs) { url += (PROJECAO_WP.restBase.indexOf('?') === -1 ? '?' : '&') + qs; }
        }
        var headers = { 'X-WP-Nonce': PROJECAO_WP.nonce };
        if (opts.body) { headers['Content-Type'] = 'application/json'; }
        return fetch(url, {
            method: opts.method || 'GET',
            headers: headers,
            body: opts.body ? JSON.stringify(opts.body) : undefined
        }).then(function (r) {
            return r.json().then(function (body) {
                if (!r.ok) {
                    var msg = (body && body.message) ? body.message : ('Erro ' + r.status);
                    var err = new Error(msg);
                    err.status = r.status;
                    err.errors = body && body.errors;
                    throw err;
                }
                return body && body.data !== undefined ? body.data : body;
            });
        });
    }

    function option(value, label) {
        var o = document.createElement('option');
        o.value = value;
        o.textContent = label;
        return o;
    }

    // ---- Etapa 1: cargo (cards com radio) ----
    function loadOffices() {
        loading(true); setError('');
        api('/offices').then(function (offices) {
            state.offices = offices;
            renderOfficeCards();
            onOfficeChange();
        }).catch(function (e) { setError(e.message); }).then(function () { loading(false); });
    }

    function officeDesc(o) {
        if (o.sphere === 'estadual') { return 'Eleição estadual — escolha o estado.'; }
        if (o.sphere === 'municipal') { return 'Eleição municipal.'; }
        return 'Eleição nacional.';
    }

    function renderOfficeCards() {
        el.offices.innerHTML = '';
        state.offices.forEach(function (o, i) {
            var card = document.createElement('label');
            card.className = 'projecao-calc__card';
            card.innerHTML =
                '<input type="radio" name="pc-office" value="' + o.id + '"' + (i === 0 ? ' checked' : '') + '>' +
                '<span class="projecao-calc__card-body"><strong>' + esc(o.name) + '</strong>' +
                '<small>' + esc(officeDesc(o)) + '</small></span>';
            el.offices.appendChild(card);
        });
    }

    function currentOffice() {
        var r = el.offices.querySelector('input[name="pc-office"]:checked');
        if (!r) { return null; }
        var id = parseInt(r.value, 10);
        for (var i = 0; i < state.offices.length; i++) {
            if (state.offices[i].id === id) { return state.offices[i]; }
        }
        return null;
    }

    function onOfficeChange() {
        var office = currentOffice();
        state.office = office;
        var needsState = office && office.requires_state;
        show(el.stateWrap, !!needsState);
        if (needsState && el.state.options.length === 0) {
            loadStates();
        }
    }

    function loadStates() {
        loading(true);
        api('/states').then(function (states) {
            el.state.innerHTML = '';
            state.statesById = {};
            states.forEach(function (s) {
                state.statesById[s.id] = s.uf;
                if (s.uf === 'EX') { return; } // governador não usa Exterior
                el.state.appendChild(option(s.id, s.name + ' (' + s.uf + ')'));
            });
        }).catch(function (e) { setError(e.message); }).then(function () { loading(false); });
    }

    // ---- Etapa 2: escopo (cards) — resolve a eleição e mostra "como analisar" ----
    function goToScopeStep() {
        var office = currentOffice();
        if (!office) { setError('Selecione o cargo.'); return; }
        state.stateId = office.requires_state ? parseInt(el.state.value, 10) : null;
        state.stateUf = (state.stateId && state.statesById) ? state.statesById[state.stateId] : null;
        if (office.requires_state && !state.stateId) { setError('Selecione o estado.'); return; }

        loading(true); setError('');
        api('/elections', { query: { political_office_id: office.id, state_id: state.stateId || '' } }).then(function (elections) {
            if (!elections.length) { throw new Error('Nenhuma eleição disponível para este cargo.'); }
            state.electionId = elections[0].id;
            return api('/elections/' + state.electionId);
        }).then(function (election) {
            var rules = election.rules || {};
            state.scopes = rules.scopes ? rules.scopes : ['estado'];
            // Senado: até `seats` candidatos por partido e `seats` eleitos.
            state.maxPerParty = rules.max_candidates_per_party ? rules.max_candidates_per_party : 1;
            state.elects = rules.elects ? rules.elects : 1;
            state.electionYear = election.year || null;
            renderScopeCards();
            step(2);
        }).catch(function (e) { setError(e.message); }).then(function () { loading(false); });
    }

    function renderScopeCards() {
        el.scopes.innerHTML = '';
        state.scopes.forEach(function (sc, i) {
            var card = document.createElement('label');
            card.className = 'projecao-calc__card';
            card.innerHTML =
                '<input type="radio" name="pc-scope" value="' + sc + '"' + (i === 0 ? ' checked' : '') + '>' +
                '<span class="projecao-calc__card-body"><strong>' + esc(SCOPE_TITLES[sc] || sc) + '</strong>' +
                '<small>' + esc(SCOPE_DESC[sc] || '') + '</small></span>';
            el.scopes.appendChild(card);
        });
    }

    function currentScope() {
        var r = el.scopes.querySelector('input[name="pc-scope"]:checked');
        return r ? r.value : (state.scopes[0] || 'estado');
    }

    // ---- Etapa 3: candidatos ----
    function goToCandidatesStep() {
        loading(true); setError('');
        api('/candidates', { query: { election_id: state.electionId } }).then(function (candidates) {
            state.candidates = candidates;
            renderCandidates();
            step(3);
        }).catch(function (e) { setError(e.message); }).then(function () { loading(false); });
    }

    function avatarHtml(c, extraClass) {
        extraClass = extraClass || '';
        if (c && c.photo_url) {
            return '<img class="projecao-calc__avatar ' + extraClass + '" src="' + esc(c.photo_url) + '" alt="" loading="lazy">';
        }
        var initial = esc(((c && (c.nickname || c.name)) || '?').charAt(0).toUpperCase());
        var bg = (c && c.color) ? esc(c.color) : '#9aa3ad';
        return '<span class="projecao-calc__avatar projecao-calc__avatar--ph ' + extraClass + '" style="background:' + bg + '">' + initial + '</span>';
    }

    function renderCandidates() {
        el.candidates.innerHTML = '';
        state.candidates.forEach(function (c) {
            var partyId = (c.party && c.party.id) ? String(c.party.id) : '';
            var label = document.createElement('label');
            label.className = 'projecao-calc__cand';

            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = c.id;
            cb.checked = false;
            cb.setAttribute('data-party', partyId);

            var party = c.party && c.party.acronym ? ' <small>(' + esc(c.party.acronym) + ')</small>' : '';
            var span = document.createElement('span');
            span.className = 'projecao-calc__cand-info';
            span.innerHTML = avatarHtml(c) + '<span class="projecao-calc__cand-name">' + esc(c.nickname || c.name) + party + '</span>';

            label.appendChild(cb);
            label.appendChild(span);
            el.candidates.appendChild(label);
        });
        updatePartyHint();
        refreshPartyLocks();
    }

    // Texto do limite por partido (1 padrão; Senado = `maxPerParty`).
    function updatePartyHint() {
        var hint = root.querySelector('.projecao-calc__cand-hint');
        if (!hint) { return; }
        var max = state.maxPerParty || 1;
        hint.textContent = max > 1
            ? '(no máximo ' + max + ' candidatos por partido)'
            : '(no máximo um candidato por partido)';
    }

    // Trava candidatos quando o partido já atingiu o limite (maxPerParty).
    function refreshPartyLocks() {
        var max = state.maxPerParty || 1;
        var cbs = el.candidates.querySelectorAll('input[type=checkbox]');
        var counts = {}, i, cb, p, row;
        for (i = 0; i < cbs.length; i++) {
            cb = cbs[i]; p = cb.getAttribute('data-party');
            if (cb.checked && p) { counts[p] = (counts[p] || 0) + 1; }
        }
        for (i = 0; i < cbs.length; i++) {
            cb = cbs[i]; p = cb.getAttribute('data-party'); row = cb.parentNode;
            if (!p) { continue; }
            var block = !cb.checked && (counts[p] || 0) >= max;
            cb.disabled = block;
            if (row) { row.classList.toggle('is-disabled', block); }
        }
    }

    // Marca até `maxPerParty` candidatos por partido.
    function selectAllCandidates() {
        var cbs = el.candidates.querySelectorAll('input[type=checkbox]');
        var max = state.maxPerParty || 1, counts = {}, i, cb, p;
        for (i = 0; i < cbs.length; i++) { cbs[i].checked = false; }
        for (i = 0; i < cbs.length; i++) {
            cb = cbs[i]; p = cb.getAttribute('data-party');
            if (p && (counts[p] || 0) >= max) { continue; }
            cb.checked = true;
            if (p) { counts[p] = (counts[p] || 0) + 1; }
        }
        refreshPartyLocks();
    }

    function clearCandidates() {
        var cbs = el.candidates.querySelectorAll('input[type=checkbox]');
        for (var i = 0; i < cbs.length; i++) { cbs[i].checked = false; }
        refreshPartyLocks();
    }

    // Ao marcar/desmarcar, reavalia os limites por partido.
    function onCandidateToggle(e) {
        if (!e.target || e.target.type !== 'checkbox') { return; }
        refreshPartyLocks();
    }

    // ---- Etapa 4: projeção unidade por unidade (mesma estrutura do front Laravel) ----
    function goToProjectionStep() {
        var checked = el.candidates.querySelectorAll('input[type=checkbox]:checked');
        state.selected = [];
        for (var i = 0; i < checked.length; i++) { state.selected.push(parseInt(checked[i].value, 10)); }
        if (state.selected.length < 2) { setError('Selecione ao menos 2 candidatos.'); return; }

        state.scope = currentScope();
        loading(true); setError('');
        // Cargo estadual (Governador): sempre limita ao estado da eleição.
        var query = { scope: state.scope };
        if (state.stateId) { query.state_id = state.stateId; }
        api('/units', { query: query }).then(function (units) {
            state.units = units;
            if (!units.length) { throw new Error('Nenhuma unidade encontrada para este escopo.'); }
            buildMatrix();
            renderRows();
            state.current = 0;
            show(el.result, false);
            renderUnit();
            step(4);
        }).catch(function (e) { setError(e.message); }).then(function () { loading(false); });
    }

    function selectedCandidates() {
        return state.candidates.filter(function (c) { return state.selected.indexOf(c.id) !== -1; });
    }

    // Inicia cada unidade com divisão igual fechando 100% (resto no 1º candidato).
    function buildMatrix() {
        var cands = selectedCandidates();
        var base = Math.round((100 / cands.length) * 10) / 10;
        state.matrix = {};
        state.units.forEach(function (u) {
            state.matrix[u.id] = {};
            var sum = 0;
            cands.forEach(function (c) { state.matrix[u.id][c.id] = base; sum += base; });
            state.matrix[u.id][cands[0].id] = Math.round((state.matrix[u.id][cands[0].id] + (100 - sum)) * 10) / 10;
        });
    }

    // Linhas dos candidatos: criadas uma vez; os valores trocam conforme a unidade.
    function renderRows() {
        var cands = selectedCandidates();
        el.rows.innerHTML = '';
        cands.forEach(function (c, i) {
            var row = document.createElement('div');
            row.className = 'projecao-calc__cand-row';
            var party = c.party && c.party.acronym ? ' <small>(' + esc(c.party.acronym) + ')</small>' : '';
            row.innerHTML =
                '<div class="projecao-calc__cand-line">' +
                avatarHtml(c, 'projecao-calc__avatar--sm') +
                '<span class="projecao-calc__cand-name">' + esc(c.nickname || c.name) + party + '</span>' +
                '<input type="number" min="0" max="100" step="0.1" inputmode="decimal" data-index="' + i + '">' +
                '<span class="projecao-calc__pct">%</span>' +
                '</div>' +
                '<div class="projecao-calc__bar"><span data-bar="' + i + '" style="background:' + (c.color ? esc(c.color) : '#149ddd') + '"></span></div>';
            el.rows.appendChild(row);
        });
    }

    function currentUnit() { return state.units[state.current]; }
    function unitValues() { return state.matrix[currentUnit().id]; }
    function unitTotal() {
        var s = 0;
        selectedCandidates().forEach(function (c) { s += parseFloat(unitValues()[c.id]) || 0; });
        return s;
    }
    function validUnit() { return Math.abs(unitTotal() - 100) < 0.5; }

    // Entrada manual: define o valor, SEM redistribuir os demais.
    function setValue(index, value) {
        var cands = selectedCandidates();
        value = isNaN(value) ? 0 : Math.min(100, Math.max(0, value));
        unitValues()[cands[index].id] = value;
        syncControls();
    }

    function syncControls() {
        var cands = selectedCandidates();
        var vals = unitValues();
        var inputs = el.rows.querySelectorAll('input[data-index]');
        var bars = el.rows.querySelectorAll('[data-bar]');
        var sum = 0;
        cands.forEach(function (c, i) {
            var v = parseFloat(vals[c.id]) || 0;
            sum += v;
            if (document.activeElement !== inputs[i]) { inputs[i].value = String(Math.round(v * 10) / 10); }
            if (bars[i]) { bars[i].style.width = Math.min(100, v) + '%'; }
        });
        var ok = Math.abs(sum - 100) < 0.5;
        el.sum.textContent = (Math.round(sum * 10) / 10) + '%';
        el.sum.classList.toggle('is-bad', !ok);
        if (ok) {
            show(el.sumalert, false);
        } else {
            var diff = Math.round((100 - sum) * 10) / 10;
            el.sumalert.textContent = diff > 0
                ? ('Faltam ' + diff + '% para fechar 100%.')
                : ('Excede ' + Math.abs(diff) + '% dos 100%.');
            show(el.sumalert, true);
        }
    }

    // Estados com mapa municipal disponível (assets/maps/<uf>.svg) — todos os 27.
    var STATE_MAPS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
        'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
    var svgCache = {};

    function normName(s) {
        return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    }

    // URL do mapa (SVG) servido pelo plugin via SDK/API (mesma origem do blog).
    function mapsUrl(key) {
        return PROJECAO_WP.restBase + '/maps/' + key;
    }

    // URL do mapa municipal do estado, quando o escopo é por unidade interna do estado.
    function stateMapUrl() {
        if (state.scope !== 'regiao_estado' && state.scope !== 'municipio') { return null; }
        var uf = state.stateUf ? String(state.stateUf).toUpperCase() : null;
        if (!uf || STATE_MAPS.indexOf(uf) === -1) { return null; }
        return mapsUrl(uf.toLowerCase());
    }

    function loadSvg(url, cb) {
        if (svgCache[url]) { cb(svgCache[url]); return; }
        fetch(url).then(function (r) { return r.text(); }).then(function (txt) {
            var doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
            var svg = doc.querySelector('svg');
            if (svg) { svgCache[url] = svg; cb(svg); }
            else { el.map.style.display = 'none'; }
        }).catch(function () { el.map.style.display = 'none'; });
    }

    // Injeta o SVG (uma vez por url) e pinta (.is-on) os paths cuja chave está
    // em wantedList. getKey extrai a chave de cada path (UF ou nome normalizado).
    function paintMap(url, getKey, wantedList) {
        loadSvg(url, function (svg) {
            if (el.map.getAttribute('data-map') !== url) {
                el.map.innerHTML = '';
                el.map.appendChild(svg.cloneNode(true));
                el.map.setAttribute('data-map', url);
            }
            var wanted = {};
            wantedList.forEach(function (w) { wanted[w] = true; });

            var paths = el.map.querySelectorAll('.pc-mun');
            for (var i = 0; i < paths.length; i++) {
                paths[i].classList.toggle('is-on', !!wanted[getKey(paths[i])]);
            }
            el.map.style.display = '';
        });
    }

    // UFs a iluminar no mapa nacional conforme o escopo/unidade.
    function unitUfs(u) {
        if (state.scope === 'estado') { return u.sub ? [String(u.sub).toUpperCase()] : []; }
        if (state.scope === 'regiao') { return REGION_UFS[u.label] || []; }
        return state.stateUf ? [String(state.stateUf).toUpperCase()] : [];
    }

    function drawMap(u) {
        if (!el.map) { return; }
        var stateUrl = stateMapUrl();
        if (stateUrl) {
            // Mapa municipal do estado: ilumina por nome (município).
            var muns = state.scope === 'municipio' ? [u.label] : (u.municipalities || []);
            var wanted = muns.map(function (m) { return normName(m); });
            paintMap(stateUrl, function (p) { return normName(p.getAttribute('data-name')); }, wanted);
        } else {
            // Mapa nacional: ilumina por UF (região do país ou estado).
            paintMap(
                mapsUrl('br'),
                function (p) { return (p.getAttribute('data-uf') || '').toUpperCase(); },
                unitUfs(u)
            );
        }
    }

    // Tags abaixo do mapa: estados da região (escopo região) ou municípios da
    // macrorregião (escopo regiao_estado).
    function renderTags(u) {
        if (!el.tags) { return; }
        var names = [];
        if (state.scope === 'regiao') {
            names = (REGION_UFS[u.label] || []).map(function (uf) { return UF_NAMES[uf] || uf; });
        } else if (state.scope === 'regiao_estado') {
            names = u.municipalities || [];
        }
        if (!names.length) { el.tags.innerHTML = ''; show(el.tags, false); return; }
        el.tags.innerHTML = names.map(function (n) {
            return '<span class="projecao-calc__tag">' + esc(n) + '</span>';
        }).join('');
        show(el.tags, true);
    }

    function renderUnit() {
        var u = currentUnit();
        var last = state.current === state.units.length - 1;
        drawMap(u);
        renderTags(u);
        el.unitName.textContent = u.label;
        el.unitSub.textContent = u.sub || '';
        el.unitSub.style.display = u.sub ? '' : 'none';
        el.unitCounter.textContent = 'Unidade ' + (state.current + 1) + ' de ' + state.units.length;
        el.unitValid.textContent = 'Votos válidos: ' + formatInt(u.valid_votes);
        el.progress.style.width = ((state.current + 1) / state.units.length * 100) + '%';
        if (u.flag_url) { el.flag.src = u.flag_url; show(el.flag, true); } else { show(el.flag, false); }

        el.unitPrev.disabled = state.current === 0;
        show(el.unitNext, !last);
        show(el.preview, last);
        show(el.save, last);
        syncControls();
    }

    // Todas as unidades precisam fechar 100% antes de calcular/salvar.
    function validateAllUnits() {
        var cands = selectedCandidates();
        for (var k = 0; k < state.units.length; k++) {
            var vals = state.matrix[state.units[k].id];
            var s = 0;
            cands.forEach(function (c) { s += parseFloat(vals[c.id]) || 0; });
            if (Math.abs(s - 100) >= 0.5) {
                state.current = k;
                renderUnit();
                scrollToUnit();
                setError('A soma da unidade "' + state.units[k].label + '" deve ser 100% (atual: ' + (Math.round(s * 10) / 10) + '%).');
                return false;
            }
        }
        setError('');
        return true;
    }

    function buildPayload() {
        var candidates = [];
        selectedCandidates().forEach(function (c) {
            var units = {};
            state.units.forEach(function (u) { units[u.id] = parseFloat(state.matrix[u.id][c.id]) || 0; });
            candidates.push({ candidate_id: c.id, units: units });
        });
        return { election_id: state.electionId, scope: state.scope, candidates: candidates };
    }

    function submit(path) {
        if (!validateAllUnits()) { return; }
        loading(true); setError('');
        api(path, { method: 'POST', body: buildPayload() })
            .then(function (data) { renderResult(data); })
            .catch(function (e) {
                var msg = e.message;
                if (e.errors) {
                    var parts = [];
                    for (var k in e.errors) { if (e.errors.hasOwnProperty(k)) { parts.push(e.errors[k].join(' ')); } }
                    if (parts.length) { msg += ' — ' + parts.join(' '); }
                }
                setError(msg);
            })
            .then(function () { loading(false); });
    }

    function renderResult(data) {
        state.lastResult = data;
        var ranking = data.ranking || [];
        var total = data.total != null ? data.total : (data.total_votes != null ? data.total_votes : 0);
        var max = 0;
        ranking.forEach(function (r) { if (r.percentage > max) { max = r.percentage; } });

        var byId = {};
        state.candidates.forEach(function (c) { byId[c.id] = c; });

        var elects = state.elects || 1;
        var html = '';
        if (elects > 1) {
            html += '<p class="projecao-calc__elected-note">Os ' + elects + ' mais votados são eleitos.</p>';
        }
        html += '<ul class="projecao-calc__ranking">';
        ranking.forEach(function (r, idx) {
            var w = max > 0 ? Math.round((r.percentage / max) * 100) : 0;
            var c = byId[r.candidate_id];
            var av = avatarHtml(c, 'projecao-calc__avatar--sm');
            var color = (c && c.color) ? c.color : (brandColor() || '#149ddd');
            var elected = elects > 1 && idx < elects;
            var badge = elected ? ' <span class="projecao-calc__badge">Eleito</span>' : '';
            html += '<li' + (elected ? ' class="is-elected"' : '') + '>'
                + '<div class="projecao-calc__rk-head"><strong>' + av + esc(r.name) + badge + '</strong>'
                + '<span>' + (Math.round(r.percentage * 10) / 10) + '% · ' + formatInt(r.votes) + ' votos</span></div>'
                + '<div class="projecao-calc__bar"><span style="width:' + w + '%;background:' + color + '"></span></div>'
                + '</li>';
        });
        html += '</ul>';
        if (total) { html += '<p class="projecao-calc__total">Total: ' + formatInt(total) + ' votos</p>'; }
        if (data.id) { html += '<p class="projecao-calc__saved">Projeção salva (#' + data.id + ').</p>'; }

        el.ranking.innerHTML = html;
        show(el.result, true);
        el.result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function formatInt(n) {
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    // ---- Projeção pública (somente leitura) via ?projecao=ID ----
    // Busca a projeção salva na API (pelo SDK) e mostra o ranking + compartilhar.
    function viewSavedProjection(id) {
        loading(true); setError('');
        var steps = root.querySelectorAll('[data-pc-step]');
        for (var i = 0; i < steps.length; i++) { steps[i].hidden = true; }

        api('/projections/' + id).then(function (proj) {
            var electionId = proj.election ? proj.election.id : null;
            state.office = { name: (proj.election && proj.election.office) ? proj.election.office : 'Projeção' };
            state.electionYear = proj.election ? proj.election.year : null;
            state.stateUf = (proj.election && proj.election.state) ? proj.election.state.uf : null;

            var ranking = proj.ranking || [];
            var total = 0;
            ranking.forEach(function (r) { total += (r.votes || 0); });

            var jobs = [];
            if (electionId) {
                jobs.push(api('/candidates', { query: { election_id: electionId } })
                    .then(function (cs) { state.candidates = cs || []; })
                    .catch(function () { state.candidates = []; }));
                jobs.push(api('/elections/' + electionId)
                    .then(function (e) { state.elects = (e && (e.elects || e.seats)) ? (e.elects || e.seats) : 1; })
                    .catch(function () { state.elects = 1; }));
            }
            return Promise.all(jobs).then(function () {
                renderSharedHeader(proj);
                renderResult({ ranking: ranking, total: total, id: proj.id });
                renderDetail(proj);
            });
        }).catch(function (e) {
            var notFound = e && (e.status === 404 || /no query results|not found/i.test(e.message || ''));
            showSharedNotice(
                notFound ? 'Projeção não encontrada' : 'Não foi possível abrir a projeção',
                notFound
                    ? 'O link pode estar incorreto ou esta projeção não está mais disponível. Que tal fazer a sua?'
                    : 'Tivemos um problema ao carregar esta projeção. Tente novamente em instantes.'
            );
        }).then(function () { loading(false); });
    }

    // Aviso amigável (projeção inexistente/indisponível) com atalho para a calculadora.
    function showSharedNotice(title, msg) {
        var steps = root.querySelectorAll('[data-pc-step]');
        for (var i = 0; i < steps.length; i++) { steps[i].hidden = true; }
        show(el.result, false);
        setError('');

        var calcUrl = ((typeof PROJECAO_WP !== 'undefined' && PROJECAO_WP.pageUrl) ? PROJECAO_WP.pageUrl : window.location.href).split('?')[0];
        var box = root.querySelector('[data-pc-shared-notice]');
        if (!box) {
            box = document.createElement('div');
            box.setAttribute('data-pc-shared-notice', '');
            box.className = 'projecao-calc__shared-notice';
            root.appendChild(box);
        }
        box.innerHTML =
            '<div class="projecao-calc__notice-card">'
            + '<div class="projecao-calc__notice-icon" aria-hidden="true">🔍</div>'
            + '<h3 class="projecao-calc__notice-title">' + esc(title) + '</h3>'
            + '<p class="projecao-calc__notice-text">' + esc(msg) + '</p>'
            + '<a class="projecao-calc__notice-btn" href="' + calcUrl + '">Fazer a minha projeção</a>'
            + '</div>';
        box.hidden = false;
    }

    function renderSharedHeader(proj) {
        if (!el.ranking || !el.ranking.parentNode) { return; }
        var e = proj.election || {};
        var sub = (e.office || '') + (e.year ? (' ' + e.year) : '') + (e.state ? (' - ' + e.state.uf) : '');

        // Só exibe o analista se o nome for o do usuário logado do blog.
        var me = (typeof PROJECAO_WP !== 'undefined' && PROJECAO_WP.userName) ? String(PROJECAO_WP.userName).trim().toLowerCase() : '';
        var aName = (proj.analyst && proj.analyst.name) ? String(proj.analyst.name) : '';
        var showAnalyst = me !== '' && aName.trim().toLowerCase() === me;

        var head = document.createElement('div');
        head.className = 'projecao-calc__shared-head';
        head.innerHTML =
            '<p class="projecao-calc__shared-kicker">Projeção publicada</p>'
            + '<h3 class="projecao-calc__shared-title">' + esc(proj.title || 'Projeção') + '</h3>'
            + (showAnalyst ? '<p class="projecao-calc__shared-analyst">Análise de ' + esc(aName) + '</p>' : '')
            + (sub ? '<p class="projecao-calc__shared-sub">' + esc(sub) + '</p>' : '');
        var prev = el.ranking.parentNode.querySelector('.projecao-calc__shared-head');
        if (prev) { prev.parentNode.removeChild(prev); }
        el.ranking.parentNode.insertBefore(head, el.ranking);
    }

    // Rótulo do escopo para o botão "Compartilhar ...".
    function scopeShareLabel(scope) {
        return scope === 'regiao' ? 'região do país'
            : scope === 'regiao_estado' ? 'região do estado'
                : scope === 'estado' ? 'estado'
                    : scope === 'municipio' ? 'município' : 'unidade';
    }

    // Barras (cor do candidato) de uma unidade do detalhe.
    function unitBarsHtml(u, byId) {
        var cands = u.candidates || [];
        var max = 0;
        cands.forEach(function (c) { if (c.percentage > max) { max = c.percentage; } });
        var h = '<ul class="projecao-calc__ranking projecao-calc__ranking--unit">';
        cands.forEach(function (c) {
            var w = max > 0 ? Math.round((c.percentage / max) * 100) : 0;
            var cc = byId[c.candidate_id];
            var color = (cc && cc.color) ? cc.color : (brandColor() || '#149ddd');
            var party = (cc && cc.party && cc.party.acronym) ? cc.party.acronym : '';
            h += '<li>'
                + '<div class="projecao-calc__rk-head"><strong>' + esc(c.name)
                + (party ? ' <span class="projecao-calc__party">' + esc(party) + '</span>' : '') + '</strong>'
                + '<span>' + (Math.round((c.percentage || 0) * 10) / 10).toString().replace('.', ',') + '%</span></div>'
                + '<div class="projecao-calc__bar"><span style="width:' + w + '%;background:' + color + '"></span></div>'
                + '</li>';
        });
        h += '</ul>';
        return h;
    }

    // "Detalhamento por região/estado/município" (accordion) com compartilhar por unidade.
    function renderDetail(proj) {
        var detail = proj.detail || [];
        var box = root.querySelector('[data-pc-detail]');
        if (!detail.length) { if (box) { box.hidden = true; } return; }
        state.detailUnits = detail;
        state.detailScope = proj.scope;

        var byId = {};
        state.candidates.forEach(function (c) { byId[c.id] = c; });

        var titles = {
            regiao: ['Detalhamento por região do país', 'Como o analista projetou cada região do país.'],
            estado: ['Detalhamento por estado', 'Como o analista projetou cada estado.'],
            regiao_estado: ['Detalhamento por região do estado', 'Como o analista projetou cada região do estado.'],
            municipio: ['Detalhamento por município', 'Como o analista projetou cada município.']
        };
        var t = titles[proj.scope] || ['Detalhamento por unidade', 'Como o analista projetou cada unidade.'];
        var shareLabel = scopeShareLabel(proj.scope);

        var html = '<h3 class="projecao-calc__detail-title">' + esc(t[0]) + '</h3>'
            + '<p class="projecao-calc__detail-sub">' + esc(t[1]) + '</p>'
            + '<div class="projecao-calc__accordion">';
        detail.forEach(function (u, idx) {
            html += '<div class="projecao-calc__acc-item">'
                + '<button type="button" class="projecao-calc__acc-head" data-pc-acc="' + idx + '" aria-expanded="false">'
                + '<span class="projecao-calc__acc-name">' + esc(u.unit_name || ('Unidade ' + (idx + 1))) + '</span>'
                + '<span class="projecao-calc__acc-votes">' + formatInt(u.valid_votes_base || 0) + ' votos válidos</span>'
                + '<span class="projecao-calc__acc-chevron" aria-hidden="true"></span>'
                + '</button>'
                + '<div class="projecao-calc__acc-body" hidden>'
                + '<div class="projecao-calc__acc-actions">'
                + '<button type="button" class="projecao-calc__share-unit" data-pc-share-unit="' + idx + '">Compartilhar ' + esc(shareLabel) + '</button>'
                + '</div>'
                + unitBarsHtml(u, byId)
                + '</div>'
                + '</div>';
        });
        html += '</div>';

        if (!box) {
            box = document.createElement('div');
            box.setAttribute('data-pc-detail', '');
            box.className = 'projecao-calc__detail';
            el.result.appendChild(box);
        }
        box.innerHTML = html;
        box.hidden = false;
    }

    function toggleAccordion(btn) {
        var body = btn.nextElementSibling;
        if (!body) { return; }
        var willOpen = body.hidden;
        body.hidden = !willOpen;
        btn.classList.toggle('is-open', willOpen);
        btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    }

    // ---- Compartilhar projeção (imagem gerada no navegador via canvas) ----
    // Cor de marca definida pelo dono do blog; '' = usar a cor de cada candidato.
    function brandColor() {
        return (typeof PROJECAO_WP !== 'undefined' && PROJECAO_WP.barColor) ? PROJECAO_WP.barColor : '';
    }

    // URL (proxy mesma-origem) da foto do candidato, para entrar no canvas sem CORS.
    function photoProxyUrl(c) {
        if (!c || !c.photo_url || typeof PROJECAO_WP === 'undefined' || !PROJECAO_WP.restBase) { return ''; }
        var base = PROJECAO_WP.restBase;
        var sep = base.indexOf('?') === -1 ? '?' : '&';
        return base + '/asset' + sep + 'u=' + encodeURIComponent(c.photo_url);
    }

    // URL do blog onde está a calculadora (sem esquema), para a chamada da imagem.
    function blogUrlText() {
        var u = (typeof PROJECAO_WP !== 'undefined' && PROJECAO_WP.pageUrl) ? PROJECAO_WP.pageUrl : '';
        return u.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    // URL pública da projeção salva (?projecao=ID) — destino do QR Code/compartilhar.
    function projectionUrl(id) {
        var base = (typeof PROJECAO_WP !== 'undefined' && PROJECAO_WP.pageUrl) ? PROJECAO_WP.pageUrl : window.location.href;
        if (!id) { return base; }
        return base + (base.indexOf('?') === -1 ? '?' : '&') + 'projecao=' + id;
    }

    function currentShareUrl() {
        var id = (state.lastResult && state.lastResult.id) ? state.lastResult.id : 0;
        return projectionUrl(id);
    }

    // Gera os módulos do QR Code (lib qrcode-generator) ou null se indisponível.
    function makeQr(text) {
        if (typeof window.qrcode === 'undefined') { return null; }
        try {
            var qr = window.qrcode(0, 'M'); // tipo automático, correção média
            qr.addData(String(text));
            qr.make();
            return qr;
        } catch (e) { return null; }
    }

    function drawQr(g, qr, x, y, size) {
        var n = qr.getModuleCount();
        var cell = size / n;
        g.fillStyle = '#000000';
        for (var r = 0; r < n; r++) {
            for (var c = 0; c < n; c++) {
                if (qr.isDark(r, c)) {
                    g.fillRect(Math.floor(x + c * cell), Math.floor(y + r * cell), Math.ceil(cell), Math.ceil(cell));
                }
            }
        }
    }

    function roundRectPath(g, x, y, w, h, r) {
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
    }

    // Luminância (0..1) para decidir cor de texto sobre a faixa inferior.
    function isLightColor(hex) {
        hex = String(hex || '').replace('#', '');
        if (hex.length === 3) { hex = hex.replace(/(.)/g, '$1$1'); }
        if (hex.length < 6) { return true; }
        var r = parseInt(hex.substr(0, 2), 16) / 255;
        var gg = parseInt(hex.substr(2, 2), 16) / 255;
        var b = parseInt(hex.substr(4, 2), 16) / 255;
        return (0.2126 * r + 0.7152 * gg + 0.0722 * b) > 0.6;
    }

    function loadImg(url) {
        return new Promise(function (resolve) {
            if (!url) { resolve(null); return; }
            var im = new Image();
            im.onload = function () { resolve(im); };
            im.onerror = function () { resolve(null); };
            im.src = url;
        });
    }

    // Avatar circular: foto recortada se houver; senão círculo na cor + inicial.
    function drawAvatar(g, img, color, cx, cy, r, initial) {
        g.save();
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.closePath(); g.clip();
        if (img) {
            var s = Math.max((2 * r) / img.width, (2 * r) / img.height);
            var w = img.width * s, h = img.height * s;
            g.drawImage(img, cx - w / 2, cy - h / 2, w, h);
        } else {
            g.fillStyle = color; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
            g.fillStyle = '#ffffff'; g.font = '700 ' + Math.round(r) + 'px Arial, sans-serif';
            g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(initial, cx, cy + 1);
            g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        }
        g.restore();
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2);
        g.lineWidth = 2; g.strokeStyle = color; g.stroke();
    }

    function electionLabelText() {
        var name = state.office ? state.office.name : 'Eleição';
        var yr = state.electionYear ? ' ' + state.electionYear : '';
        var uf = state.stateUf ? ' - ' + state.stateUf : '';
        return name + yr + uf;
    }

    // Trunca uma linha (com reticências) para caber na largura.
    function fitLine(g, text, max) {
        if (g.measureText(text).width <= max) { return text; }
        while (text.length > 1 && g.measureText(text + '…').width > max) { text = text.slice(0, -1); }
        return text + '…';
    }

    // Quebra um texto em várias linhas conforme a largura.
    function wrapLines(g, text, max) {
        var words = String(text).split(' '), lines = [], line = '';
        for (var i = 0; i < words.length; i++) {
            var t = line ? (line + ' ' + words[i]) : words[i];
            if (g.measureText(t).width > max && line) { lines.push(line); line = words[i]; }
            else { line = t; }
        }
        if (line) { lines.push(line); }
        return lines;
    }

    function buildShareCanvas(imgs, rankingArg, opts) {
        opts = opts || {};
        var titleSuffix = opts.titleSuffix || ''; // nome da unidade, ao lado do título
        var subtitle = opts.subtitle || '';       // frase descritiva (fonte menor)
        var data = state.lastResult || {};
        var ranking = (rankingArg || data.ranking || []).slice(0, 10);
        var elects = state.elects || 1;
        var P = (typeof PROJECAO_WP !== 'undefined') ? PROJECAO_WP : {};
        var headerBg = P.headerBg || '#03172d';       // fundo da div do topo
        var headerText = P.headerText || '#ffffff';   // fonte da div do topo
        var footerBg = P.footerColor || '#f4f7fb';    // fundo da div de baixo
        var footerText = P.footerText || '#03172d';   // fonte da div de baixo
        var accent = '#149ddd';                       // acento do corpo (kicker)
        var legal = P.footer || '';
        var blog = blogUrlText();
        var byId = {};
        state.candidates.forEach(function (c) { byId[c.id] = c; });

        var W = 1080, pad = 56, headerH = 150, ctxH = subtitle ? 116 : 92, rowH = 96, footerH = 240;
        var H = headerH + ctxH + ranking.length * rowH + footerH;
        var cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        var g = cv.getContext('2d');

        g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
        g.fillStyle = headerBg; g.fillRect(0, 0, W, headerH);
        g.fillStyle = headerText; g.font = '700 42px Arial, sans-serif'; g.fillText('Projeção Eleitoral', pad, 72);
        g.globalAlpha = 0.8; g.fillStyle = headerText; g.font = '20px Arial, sans-serif';
        g.fillText(blog || 'Minha projeção', pad, 110); g.globalAlpha = 1;

        var y = headerH + 50;
        g.fillStyle = accent; g.font = '700 18px Arial, sans-serif'; g.fillText('MINHA PROJEÇÃO', pad, y);
        y += 32;
        g.fillStyle = '#28323c'; g.font = '600 28px Arial, sans-serif';
        var titleText = electionLabelText() + (titleSuffix ? ' · ' + titleSuffix : '');
        g.fillText(fitLine(g, titleText, W - 2 * pad), pad, y);
        var noteY = y + 22;
        if (subtitle) {
            g.fillStyle = '#28323c'; g.font = '600 17px Arial, sans-serif';
            g.fillText(fitLine(g, subtitle, W - 2 * pad), pad, noteY);
            noteY += 22;
        }
        if (elects > 1) {
            g.fillStyle = '#8a949e'; g.font = '15px Arial, sans-serif';
            g.fillText('Os ' + elects + ' mais votados são eleitos.', pad, noteY);
        }

        var top = headerH + ctxH, av = 54, cLeft = pad + av + 18, right = W - pad;
        ranking.forEach(function (r, i) {
            var ry = top + i * rowH + 36;
            var c = byId[r.candidate_id];
            var ccolor = (c && c.color) ? c.color : accent; // sempre a cor do candidato
            var initial = ((r.name || '?').charAt(0)).toUpperCase();
            drawAvatar(g, imgs ? imgs[i] : null, ccolor, pad + av / 2, ry - 16, av / 2, initial);

            var nm = (i + 1) + 'º ' + (r.name || '');
            g.fillStyle = '#28323c'; g.font = '600 22px Arial, sans-serif';
            var nmFit = fitLine(g, nm, right - cLeft - 200);
            g.fillText(nmFit, cLeft, ry);
            if (elects > 1 && i < elects) {
                var nw = g.measureText(nmFit).width;
                g.fillStyle = ccolor; g.font = '700 14px Arial, sans-serif'; g.fillText('ELEITO', cLeft + nw + 12, ry - 1);
            }

            var pct = (Math.round((r.percentage || 0) * 10) / 10).toString().replace('.', ',') + '%';
            g.fillStyle = '#28323c'; g.font = '700 22px Arial, sans-serif'; g.textAlign = 'right';
            g.fillText(pct, right, ry); g.textAlign = 'left';

            var by = ry + 16;
            g.fillStyle = '#eef1f5'; g.fillRect(cLeft, by, right - cLeft, 14);
            var w = Math.round((right - cLeft) * Math.min(100, Math.max(0, r.percentage || 0)) / 100);
            g.fillStyle = ccolor; g.fillRect(cLeft, by, w, 14);

            if (r.votes) {
                g.fillStyle = '#96a0aa'; g.font = '13px Arial, sans-serif'; g.textAlign = 'right';
                g.fillText('≈ ' + formatInt(r.votes) + ' votos', right, by + 32); g.textAlign = 'left';
            }
        });

        // Faixa inferior (fundo/fonte configuráveis) com QR Code à esquerda e CTA à direita.
        var ft = H - footerH;
        g.fillStyle = footerBg; g.fillRect(0, ft, W, footerH);

        var qr = makeQr(currentShareUrl());
        var qrSize = 130, qrPad = 12, cardSize = qrSize + 2 * qrPad;
        var cardX = pad, cardY = ft + 30, textX = pad;
        if (qr) {
            g.save();
            g.fillStyle = '#ffffff';
            roundRectPath(g, cardX, cardY, cardSize, cardSize, 12); g.fill();
            drawQr(g, qr, cardX + qrPad, cardY + qrPad, qrSize);
            g.restore();
            textX = cardX + cardSize + 26;
        }

        var ty = ft + 56;
        g.fillStyle = footerText; g.font = '700 30px Arial, sans-serif';
        g.fillText('Faça a sua', textX, ty);
        g.fillText('projeção também', textX, ty + 34);
        g.globalAlpha = 0.72; g.fillStyle = footerText; g.font = '15px Arial, sans-serif';
        if (qr) { g.fillText('Aponte a câmera para o QR Code', textX, ty + 62); }
        g.globalAlpha = 1;
        if (blog) {
            g.fillStyle = footerText; g.font = '600 17px Arial, sans-serif';
            g.fillText(blog, textX, ty + (qr ? 88 : 62));
        }

        g.globalAlpha = 0.72; g.fillStyle = footerText; g.font = '12px Arial, sans-serif';
        var lines = wrapLines(g, legal, W - 2 * pad);
        var ly = ft + footerH - 14 - (lines.length - 1) * 16;
        lines.forEach(function (ln) { g.fillText(ln, pad, ly); ly += 16; });
        g.globalAlpha = 1;

        return cv;
    }

    function shareProjection() {
        if (!state.lastResult) { setError('Calcule ou salve a projeção antes de compartilhar.'); return; }
        shareFlow((state.lastResult.ranking || []).slice(0, 10), null);
    }

    // Frase de escopo: "no município de X", "no estado de X", "na região X".
    function scopePhrase(scope, name) {
        if (scope === 'municipio') { return 'no município de ' + name; }
        if (scope === 'estado') { return 'no estado de ' + name; }
        return 'na região ' + name; // regiao (país) e regiao_estado (macrorregião)
    }

    // Compartilha uma unidade específica do detalhe (região/estado/município).
    function shareUnit(idx) {
        var u = state.detailUnits && state.detailUnits[idx];
        if (!u) { return; }
        var ranking = (u.candidates || []).map(function (c) {
            return { candidate_id: c.candidate_id, name: c.name, percentage: c.percentage, votes: c.votes };
        });
        var office = (state.office && state.office.name) ? state.office.name.toLowerCase() : 'esse cargo';
        var subtitle = 'Essa é a minha projeção de votação para ' + office + ' ' + scopePhrase(state.detailScope, u.unit_name) + '.';
        shareFlow(ranking.slice(0, 10), { titleSuffix: u.unit_name, subtitle: subtitle });
    }

    // Pré-carrega as fotos (proxy, mesma origem), desenha a imagem e dispara o compartilhar.
    function shareFlow(ranking, opts) {
        var byId = {};
        state.candidates.forEach(function (c) { byId[c.id] = c; });
        var urls = ranking.map(function (r) { return photoProxyUrl(byId[r.candidate_id]); });
        loading(true);
        Promise.all(urls.map(loadImg)).then(function (imgs) {
            loading(false);
            var cv = buildShareCanvas(imgs, ranking, opts);
            cv.toBlob(function (blob) { if (blob) { shareImage(blob); } }, 'image/png');
        });
    }

    // Abre a caixa de compartilhamento NATIVA com a imagem (celular e desktops
    // compatíveis). Onde o envio de arquivo não é suportado, abre uma caixa
    // própria com botões de rede social, copiar e baixar — nunca salva direto.
    function shareImage(blob) {
        var url = currentShareUrl();
        var text = (typeof PROJECAO_WP !== 'undefined' && PROJECAO_WP.shareText) ? PROJECAO_WP.shareText : 'Veja a minha projeção eleitoral e faça a sua.';
        try {
            var file = new File([blob], 'projecao-eleitoral.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: 'Minha projeção eleitoral', text: text })
                    .catch(function (err) { if (!err || err.name !== 'AbortError') { openShareModal(blob, url, text); } });
                return;
            }
        } catch (e) { /* abre a caixa própria abaixo */ }
        openShareModal(blob, url, text);
    }

    // Caixa de compartilhamento própria (fallback) com preview e ações.
    function openShareModal(blob, url, text) {
        var imgUrl = URL.createObjectURL(blob);
        var enc = encodeURIComponent;
        var sUrl = enc(url), sFull = enc(text + ' ' + url), sTxt = enc(text);

        var ov = document.createElement('div');
        ov.className = 'projecao-calc__share-modal';
        ov.innerHTML =
            '<div class="pc-sm__box" role="dialog" aria-modal="true">'
            + '<button type="button" class="pc-sm__close" aria-label="Fechar">&times;</button>'
            + '<h3 class="pc-sm__title">Compartilhar projeção</h3>'
            + '<img class="pc-sm__img" alt="Imagem da projeção" src="' + imgUrl + '">'
            + '<div class="pc-sm__btns">'
            + '<a class="pc-sm__btn pc-sm__wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + sFull + '">WhatsApp</a>'
            + '<a class="pc-sm__btn pc-sm__tg" target="_blank" rel="noopener" href="https://t.me/share/url?url=' + sUrl + '&text=' + sTxt + '">Telegram</a>'
            + '<a class="pc-sm__btn pc-sm__tw" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=' + sTxt + '&url=' + sUrl + '">X</a>'
            + '<a class="pc-sm__btn pc-sm__fb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + sUrl + '">Facebook</a>'
            + '<button type="button" class="pc-sm__btn pc-sm__copy">Copiar imagem</button>'
            + '<a class="pc-sm__btn pc-sm__dl" download="projecao-eleitoral.png" href="' + imgUrl + '">Baixar imagem</a>'
            + '</div>'
            + '<p class="pc-sm__hint">Os botões encaminham o link da projeção. Para postar junto com a imagem, use “Copiar imagem” e cole na sua publicação.</p>'
            + '</div>';
        document.body.appendChild(ov);

        function close() {
            if (ov.parentNode) { ov.parentNode.removeChild(ov); }
            setTimeout(function () { URL.revokeObjectURL(imgUrl); }, 500);
        }
        ov.addEventListener('click', function (e) { if (e.target === ov) { close(); } });
        ov.querySelector('.pc-sm__close').addEventListener('click', close);

        var copyBtn = ov.querySelector('.pc-sm__copy');
        copyBtn.addEventListener('click', function () {
            if (navigator.clipboard && window.ClipboardItem) {
                navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
                    .then(function () { copyBtn.textContent = 'Imagem copiada!'; })
                    .catch(function () { copyBtn.textContent = 'Não deu para copiar'; });
            } else {
                copyBtn.textContent = 'Sem suporte a copiar';
            }
        });
    }

    // ---- Eventos ----
    el.offices.addEventListener('change', onOfficeChange);
    el.candidates.addEventListener('change', onCandidateToggle);
    el.rows.addEventListener('input', function (e) {
        var t = e.target;
        if (t && t.hasAttribute('data-index')) {
            setValue(parseInt(t.getAttribute('data-index'), 10), parseFloat(t.value));
        }
    });

    root.addEventListener('click', function (e) {
        var t = e.target;
        if (t.hasAttribute('data-pc-next')) {
            var n = t.getAttribute('data-pc-next');
            if (n === '2') { goToScopeStep(); }
            else if (n === '3') { goToCandidatesStep(); }
            else if (n === '4') { goToProjectionStep(); }
        } else if (t.hasAttribute('data-pc-back')) {
            step(t.getAttribute('data-pc-back'));
        } else if (t.hasAttribute('data-pc-select-all')) {
            selectAllCandidates();
        } else if (t.hasAttribute('data-pc-clear')) {
            clearCandidates();
        } else if (t.hasAttribute('data-pc-unit-prev')) {
            if (state.current > 0) { state.current--; setError(''); renderUnit(); scrollToUnit(); }
        } else if (t.hasAttribute('data-pc-unit-next')) {
            if (!validUnit()) {
                setError('A soma desta unidade deve ser 100% (atual: ' + (Math.round(unitTotal() * 10) / 10) + '%).');
                return;
            }
            if (state.current < state.units.length - 1) { state.current++; setError(''); renderUnit(); scrollToUnit(); }
        } else if (t.hasAttribute('data-pc-preview')) {
            submit('/preview');
        } else if (t.hasAttribute('data-pc-save')) {
            submit('/projections');
        } else if (t.hasAttribute('data-pc-share')) {
            shareProjection();
        } else if (t.closest && t.closest('[data-pc-share-unit]')) {
            shareUnit(parseInt(t.closest('[data-pc-share-unit]').getAttribute('data-pc-share-unit'), 10));
        } else if (t.closest && t.closest('[data-pc-acc]')) {
            toggleAccordion(t.closest('[data-pc-acc]'));
        }
    });

    // ?projecao=ID → exibe a projeção salva (somente leitura); senão, o assistente.
    var viewId = (typeof PROJECAO_WP !== 'undefined' && PROJECAO_WP.viewProjection) ? parseInt(PROJECAO_WP.viewProjection, 10) : 0;
    if (viewId > 0) {
        viewSavedProjection(viewId);
    } else {
        loadOffices();
    }
})();
