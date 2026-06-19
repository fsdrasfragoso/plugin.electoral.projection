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
        units: []
    };

    var el = {
        error: q('[data-pc-error]'),
        loading: q('[data-pc-loading]'),
        office: q('[data-pc-office]'),
        stateWrap: q('[data-pc-state-wrap]'),
        state: q('[data-pc-state]'),
        scope: q('[data-pc-scope]'),
        candidates: q('[data-pc-candidates]'),
        grid: q('[data-pc-grid]'),
        result: q('[data-pc-result]'),
        ranking: q('[data-pc-ranking]')
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

    // ---- Etapa 3: grade ----
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
            renderGrid();
            step(3);
        }).catch(function (e) { setError(e.message); }).then(function () { loading(false); });
    }

    function selectedCandidates() {
        return state.candidates.filter(function (c) { return state.selected.indexOf(c.id) !== -1; });
    }

    function renderGrid() {
        var cands = selectedCandidates();
        var thead = '<thead><tr><th>Unidade</th>';
        cands.forEach(function (c) { thead += '<th>' + avatarHtml(c, 'projecao-calc__avatar--sm') + '<br>' + esc(c.nickname || c.name) + '</th>'; });
        thead += '</tr></thead>';

        var tbody = '<tbody>';
        state.units.forEach(function (u) {
            tbody += '<tr><td class="projecao-calc__unit">' + esc(u.label) + (u.sub ? ' <small>' + esc(u.sub) + '</small>' : '') + '</td>';
            cands.forEach(function (c) {
                tbody += '<td><input type="number" min="0" max="100" step="0.1" '
                    + 'data-unit="' + u.id + '" data-cand="' + c.id + '" value=""></td>';
            });
            tbody += '</tr>';
        });
        tbody += '</tbody>';
        el.grid.innerHTML = thead + tbody;
    }

    function buildPayload() {
        var cands = selectedCandidates();
        var byCand = {};
        cands.forEach(function (c) { byCand[c.id] = { candidate_id: c.id, units: {} }; });

        var inputs = el.grid.querySelectorAll('input[data-unit]');
        for (var i = 0; i < inputs.length; i++) {
            var inp = inputs[i];
            var cand = parseInt(inp.getAttribute('data-cand'), 10);
            var unit = parseInt(inp.getAttribute('data-unit'), 10);
            var val = parseFloat(inp.value);
            if (isNaN(val)) { val = 0; }
            if (byCand[cand]) { byCand[cand].units[unit] = val; }
        }

        var candidates = [];
        cands.forEach(function (c) { candidates.push(byCand[c.id]); });

        return { election_id: state.electionId, scope: state.scope, candidates: candidates };
    }

    function submit(path) {
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

    root.addEventListener('click', function (e) {
        var t = e.target;
        if (t.hasAttribute('data-pc-next')) {
            var n = t.getAttribute('data-pc-next');
            if (n === '2') { goToStep2(); }
            else if (n === '3') { goToStep3(); }
        } else if (t.hasAttribute('data-pc-back')) {
            step(t.getAttribute('data-pc-back'));
        } else if (t.hasAttribute('data-pc-preview')) {
            submit('/preview');
        } else if (t.hasAttribute('data-pc-save')) {
            submit('/projections');
        }
    });

    loadOffices();
})();
