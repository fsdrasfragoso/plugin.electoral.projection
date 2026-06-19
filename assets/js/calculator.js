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
        current: 0         // índice da unidade atual
    };

    var el = {
        error: q('[data-pc-error]'),
        loading: q('[data-pc-loading]'),
        office: q('[data-pc-office]'),
        stateWrap: q('[data-pc-state-wrap]'),
        state: q('[data-pc-state]'),
        scope: q('[data-pc-scope]'),
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
        save: q('[data-pc-save]')
    };

    function q(sel) { return root.querySelector(sel); }
    function show(node, on) { if (node) { node.hidden = !on; } }
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

    // ---- Etapa 1: cargos ----
    function loadOffices() {
        loading(true); setError('');
        api('/offices').then(function (offices) {
            state.offices = offices;
            el.office.innerHTML = '';
            offices.forEach(function (o) { el.office.appendChild(option(o.id, o.name)); });
            onOfficeChange();
        }).catch(function (e) { setError(e.message); }).then(function () { loading(false); });
    }

    function currentOffice() {
        var id = parseInt(el.office.value, 10);
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
            states.forEach(function (s) {
                if (s.uf === 'EX') { return; } // governador não usa Exterior
                el.state.appendChild(option(s.id, s.name + ' (' + s.uf + ')'));
            });
        }).catch(function (e) { setError(e.message); }).then(function () { loading(false); });
    }

    // ---- Etapa 2: resolve eleição, escopos e candidatos ----
    function goToStep2() {
        var office = currentOffice();
        if (!office) { return; }
        state.stateId = office.requires_state ? parseInt(el.state.value, 10) : null;

        loading(true); setError('');

        api('/elections', { query: { political_office_id: office.id, state_id: state.stateId || '' } }).then(function (elections) {
            if (!elections.length) { throw new Error('Nenhuma eleição disponível para este cargo.'); }
            state.electionId = elections[0].id;
            return api('/elections/' + state.electionId);
        }).then(function (election) {
            state.scopes = (election.rules && election.rules.scopes) ? election.rules.scopes : ['estado'];
            el.scope.innerHTML = '';
            state.scopes.forEach(function (sc) { el.scope.appendChild(option(sc, SCOPE_LABELS[sc] || sc)); });
            return api('/candidates', { query: { election_id: state.electionId } });
        }).then(function (candidates) {
            state.candidates = candidates;
            renderCandidates();
            step(2);
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
    }

    // Impede selecionar dois candidatos do mesmo partido: ao marcar um, desabilita os demais do partido.
    function onCandidateToggle(e) {
        var cb = e.target;
        if (!cb || cb.type !== 'checkbox') { return; }
        var party = cb.getAttribute('data-party');
        if (!party) { return; }
        var others = el.candidates.querySelectorAll('input[type=checkbox][data-party="' + party + '"]');
        for (var i = 0; i < others.length; i++) {
            if (others[i] === cb) { continue; }
            var row = others[i].parentNode;
            if (cb.checked) {
                others[i].checked = false;
                others[i].disabled = true;
                if (row) { row.classList.add('is-disabled'); }
            } else {
                others[i].disabled = false;
                if (row) { row.classList.remove('is-disabled'); }
            }
        }
    }

    // ---- Etapa 3: projeção unidade por unidade (mesma estrutura do front Laravel) ----
    function goToStep3() {
        var checked = el.candidates.querySelectorAll('input[type=checkbox]:checked');
        state.selected = [];
        for (var i = 0; i < checked.length; i++) { state.selected.push(parseInt(checked[i].value, 10)); }
        if (state.selected.length < 2) { setError('Selecione ao menos 2 candidatos.'); return; }

        state.scope = el.scope.value;
        loading(true); setError('');
        var query = { scope: state.scope };
        if (state.stateId && (state.scope === 'regiao_estado' || state.scope === 'municipio')) {
            query.state_id = state.stateId;
        }
        api('/units', { query: query }).then(function (units) {
            state.units = units;
            if (!units.length) { throw new Error('Nenhuma unidade encontrada para este escopo.'); }
            buildMatrix();
            renderRows();
            state.current = 0;
            show(el.result, false);
            renderUnit();
            step(3);
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

    function renderUnit() {
        var u = currentUnit();
        var last = state.current === state.units.length - 1;
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
        var ranking = data.ranking || [];
        var total = data.total != null ? data.total : (data.total_votes != null ? data.total_votes : 0);
        var max = 0;
        ranking.forEach(function (r) { if (r.percentage > max) { max = r.percentage; } });

        var byId = {};
        state.candidates.forEach(function (c) { byId[c.id] = c; });

        var html = '<ul class="projecao-calc__ranking">';
        ranking.forEach(function (r) {
            var w = max > 0 ? Math.round((r.percentage / max) * 100) : 0;
            var av = avatarHtml(byId[r.candidate_id], 'projecao-calc__avatar--sm');
            html += '<li>'
                + '<div class="projecao-calc__rk-head"><strong>' + av + esc(r.name) + '</strong>'
                + '<span>' + (Math.round(r.percentage * 10) / 10) + '% · ' + formatInt(r.votes) + ' votos</span></div>'
                + '<div class="projecao-calc__bar"><span style="width:' + w + '%"></span></div>'
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

    // ---- Eventos ----
    el.office.addEventListener('change', onOfficeChange);
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
            if (n === '2') { goToStep2(); }
            else if (n === '3') { goToStep3(); }
        } else if (t.hasAttribute('data-pc-back')) {
            step(t.getAttribute('data-pc-back'));
        } else if (t.hasAttribute('data-pc-unit-prev')) {
            if (state.current > 0) { state.current--; setError(''); renderUnit(); }
        } else if (t.hasAttribute('data-pc-unit-next')) {
            if (!validUnit()) {
                setError('A soma desta unidade deve ser 100% (atual: ' + (Math.round(unitTotal() * 10) / 10) + '%).');
                return;
            }
            if (state.current < state.units.length - 1) { state.current++; setError(''); renderUnit(); }
        } else if (t.hasAttribute('data-pc-preview')) {
            submit('/preview');
        } else if (t.hasAttribute('data-pc-save')) {
            submit('/projections');
        }
    });

    loadOffices();
})();
