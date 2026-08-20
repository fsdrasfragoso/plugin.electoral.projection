/**
 * Meus Candidatos — versão do plugin WordPress.
 *
 * Fala apenas com o proxy REST do próprio WordPress (mesma origem, com nonce);
 * o client_secret fica no servidor. O voto vai para a urna da API de forma
 * anônima: o único identificador é um token aleatório do aparelho.
 */
(function () {
    'use strict';

    var cfg = window.PROJECAO_COLINHA || {};
    var raiz = document.getElementById('projecao-colinha');

    if (!raiz || !cfg.restBase) {
        return;
    }

    var CHAVE_TOKEN = 'projecao-colinha:token';
    var CHAVE_SOM = 'projecao-colinha:som';
    var CHAVE_UF = 'projecao-colinha:uf';

    var estado = { uf: '', cargos: [], escolhas: {}, textos: {} };

    var el = {
        titulo: raiz.querySelector('[data-pcol-titulo]'),
        sub: raiz.querySelector('[data-pcol-sub]'),
        uf: raiz.querySelector('[data-pcol-uf]'),
        contador: raiz.querySelector('[data-pcol-contador]'),
        dias: raiz.querySelector('[data-pcol-dias]'),
        diasRotulo: raiz.querySelector('[data-pcol-dias-rotulo]'),
        erro: raiz.querySelector('[data-pcol-erro]'),
        vazio: raiz.querySelector('[data-pcol-vazio]'),
        cartoes: raiz.querySelector('[data-pcol-cartoes]'),
        acoes: raiz.querySelector('[data-pcol-acoes]'),
        aviso: raiz.querySelector('[data-pcol-aviso]'),
        modal: raiz.querySelector('[data-pcol-modal]'),
        modalTexto: raiz.querySelector('[data-pcol-modal-texto]')
    };

    // ------------------------------------------------------------- utilidades

    function guardar() {
        try {
            localStorage.setItem('projecao-colinha:' + estado.uf, JSON.stringify(estado.escolhas));
            localStorage.setItem(CHAVE_UF, estado.uf);
        } catch (e) { /* sem armazenamento: vale só nesta visita */ }
    }

    function recuperar(uf) {
        try {
            return JSON.parse(localStorage.getItem('projecao-colinha:' + uf) || '{}') || {};
        } catch (e) {
            return {};
        }
    }

    function token() {
        var valor = null;

        try {
            valor = localStorage.getItem(CHAVE_TOKEN);
        } catch (e) { valor = null; }

        if (!valor) {
            valor = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 40);
            try { localStorage.setItem(CHAVE_TOKEN, valor); } catch (e) { /* segue */ }
        }

        return valor;
    }

    function somLigado() {
        try { return localStorage.getItem(CHAVE_SOM) !== '0'; } catch (e) { return true; }
    }

    function bipe(sucesso) {
        if (!somLigado()) return;

        try {
            var Contexto = window.AudioContext || window.webkitAudioContext;
            if (!Contexto) return;

            var ctx = new Contexto();
            var osc = ctx.createOscillator();
            var ganho = ctx.createGain();

            osc.type = 'square';
            osc.frequency.value = sucesso ? 1050 : 300;
            ganho.gain.setValueAtTime(0.06, ctx.currentTime);
            ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (sucesso ? 0.18 : 0.35));
            osc.connect(ganho);
            ganho.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + (sucesso ? 0.18 : 0.35));
            osc.onended = function () { ctx.close(); };
        } catch (e) { /* som é enfeite */ }
    }

    function api(caminho, parametros) {
        var url = cfg.restBase + caminho;
        var chaves = Object.keys(parametros || {});

        if (chaves.length) {
            url += '?' + chaves.map(function (k) {
                return encodeURIComponent(k) + '=' + encodeURIComponent(parametros[k]);
            }).join('&');
        }

        return fetch(url, { headers: { 'X-WP-Nonce': cfg.nonce } }).then(function (r) {
            if (!r.ok) throw new Error('http ' + r.status);
            return r.json();
        });
    }

    function mostrarErro(mensagem) {
        el.erro.textContent = mensagem;
        el.erro.hidden = !mensagem;
    }

    function base64url(texto) {
        return btoa(unescape(encodeURIComponent(texto))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function codigo() {
        var slots = {};

        Object.keys(estado.escolhas).forEach(function (slug) {
            if (estado.escolhas[slug]) slots[slug] = estado.escolhas[slug].id;
        });

        if (!Object.keys(slots).length) return '';

        return base64url(JSON.stringify({ uf: estado.uf, slots: slots }));
    }

    // ---------------------------------------------------------------- urna

    var pendente = null;

    function registrarVoto() {
        clearTimeout(pendente);

        pendente = setTimeout(function () {
            var escolhas = {};

            Object.keys(estado.escolhas).forEach(function (slug) {
                if (estado.escolhas[slug]) escolhas[slug] = estado.escolhas[slug].id;
            });

            fetch(cfg.restBase + '/colinha/urna', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': cfg.nonce },
                body: JSON.stringify({ token: token(), uf: estado.uf, escolhas: escolhas })
            }).catch(function () { /* a colinha vale mesmo se a urna falhar */ });
        }, 700);
    }

    // -------------------------------------------------------------- cartões

    function cartao(cargo) {
        var secao = document.createElement('section');
        secao.className = 'projecao-colinha__cartao';
        secao.setAttribute('data-slot', cargo.slug);

        var topo = document.createElement('div');
        topo.className = 'projecao-colinha__cartao-topo';

        var titulo = document.createElement('h3');
        titulo.textContent = cargo.label;

        var limpar = document.createElement('button');
        limpar.type = 'button';
        limpar.className = 'projecao-colinha__limpar';
        limpar.textContent = 'limpar ✕';
        limpar.hidden = true;

        topo.appendChild(titulo);
        topo.appendChild(limpar);

        var corpo = document.createElement('div');
        corpo.className = 'projecao-colinha__cartao-corpo';

        var boxes = document.createElement('div');
        boxes.className = 'projecao-colinha__boxes';

        var entrada = document.createElement('input');
        entrada.type = 'text';
        entrada.inputMode = 'numeric';
        entrada.autocomplete = 'off';
        entrada.maxLength = cargo.digits;
        entrada.className = 'projecao-colinha__boxes-input';
        entrada.setAttribute('aria-label', 'Número do candidato a ' + cargo.label);
        boxes.appendChild(entrada);

        var caixas = [];

        for (var i = 0; i < cargo.digits; i++) {
            var caixa = document.createElement('span');
            caixa.className = 'projecao-colinha__box';
            caixa.setAttribute('aria-hidden', 'true');
            boxes.appendChild(caixa);
            caixas.push(caixa);
        }

        var resultado = document.createElement('div');
        resultado.className = 'projecao-colinha__resultado';
        resultado.setAttribute('aria-live', 'polite');

        corpo.appendChild(boxes);
        corpo.appendChild(resultado);

        var rodape = document.createElement('div');
        rodape.className = 'projecao-colinha__cartao-rodape';

        var abrirBusca = document.createElement('button');
        abrirBusca.type = 'button';
        abrirBusca.className = 'projecao-colinha__busca-abrir';
        abrirBusca.textContent = 'Busque pelo nome';
        rodape.appendChild(abrirBusca);

        var busca = document.createElement('div');
        busca.className = 'projecao-colinha__busca';
        busca.hidden = true;

        var buscaEntrada = document.createElement('input');
        buscaEntrada.type = 'search';
        buscaEntrada.placeholder = 'Nome do candidato…';
        buscaEntrada.className = 'projecao-colinha__busca-input';

        var buscaLista = document.createElement('div');
        buscaLista.className = 'projecao-colinha__busca-lista';

        busca.appendChild(buscaEntrada);
        busca.appendChild(buscaLista);

        secao.appendChild(topo);
        secao.appendChild(corpo);
        secao.appendChild(rodape);
        secao.appendChild(busca);

        function desenharBoxes(valor) {
            caixas.forEach(function (caixa, i) {
                caixa.textContent = valor[i] || '';
                caixa.className = 'projecao-colinha__box' + (valor[i] ? ' cheio' : '');
            });
        }

        function desenharCandidato(candidato) {
            resultado.innerHTML = '';
            limpar.hidden = !candidato;
            secao.classList.toggle('preenchido', Boolean(candidato));

            if (!candidato) {
                secao.style.removeProperty('--cor-candidato');
                return;
            }

            secao.style.setProperty('--cor-candidato', candidato.color || '#149ddd');

            if (candidato.photo) {
                var foto = document.createElement('img');
                foto.className = 'projecao-colinha__foto';
                foto.alt = 'Foto de ' + candidato.name;
                foto.src = candidato.photo;
                resultado.appendChild(foto);
            }

            var texto = document.createElement('div');
            var nome = document.createElement('div');
            nome.className = 'projecao-colinha__nome';
            nome.textContent = candidato.name;

            var partido = document.createElement('div');
            partido.className = 'projecao-colinha__partido';
            partido.textContent = candidato.party || '';

            texto.appendChild(nome);
            texto.appendChild(partido);

            if (candidato.mates && candidato.mates.length) {
                var chapa = document.createElement('div');
                chapa.className = 'projecao-colinha__chapa';
                chapa.textContent = candidato.mates.map(function (m) { return m.role + ': ' + m.name; }).join(' · ');
                texto.appendChild(chapa);
            }

            resultado.appendChild(texto);
        }

        function escolher(candidato) {
            estado.escolhas[cargo.slug] = candidato;
            entrada.value = candidato.number || '';
            desenharBoxes(entrada.value);
            desenharCandidato(candidato);
            busca.hidden = true;
            buscaLista.innerHTML = '';
            buscaEntrada.value = '';
            guardar();
            registrarVoto();
            bipe(true);
        }

        entrada.addEventListener('input', function () {
            var valor = entrada.value.replace(/\D/g, '').slice(0, cargo.digits);
            entrada.value = valor;
            desenharBoxes(valor);

            if (valor.length !== cargo.digits) {
                delete estado.escolhas[cargo.slug];
                desenharCandidato(null);
                guardar();
                return;
            }

            api('/colinha/candidato', { uf: estado.uf, slot: cargo.slug, numero: valor })
                .then(function (resposta) {
                    var candidato = resposta && resposta.id ? resposta : null;

                    if (candidato) {
                        escolher(candidato);
                        return;
                    }

                    delete estado.escolhas[cargo.slug];
                    desenharCandidato(null);
                    resultado.innerHTML = '<span class="projecao-colinha__erro-linha">Nenhum candidato com esse número.</span>';
                    limpar.hidden = false;
                    guardar();
                    registrarVoto();
                    bipe(false);
                })
                .catch(function () {
                    resultado.innerHTML = '<span class="projecao-colinha__erro-linha">Não consegui consultar agora.</span>';
                });
        });

        limpar.addEventListener('click', function () {
            entrada.value = '';
            delete estado.escolhas[cargo.slug];
            desenharBoxes('');
            desenharCandidato(null);
            limpar.hidden = true;
            guardar();
            registrarVoto();
        });

        abrirBusca.addEventListener('click', function () {
            busca.hidden = !busca.hidden;
            if (!busca.hidden) buscaEntrada.focus();
        });

        var buscaPendente = null;

        buscaEntrada.addEventListener('input', function () {
            var termo = buscaEntrada.value.trim();
            clearTimeout(buscaPendente);

            if (termo.length < 2) {
                buscaLista.innerHTML = '';
                return;
            }

            buscaPendente = setTimeout(function () {
                api('/colinha/buscar', { uf: estado.uf, slot: cargo.slug, q: termo })
                    .then(function (lista) {
                        buscaLista.innerHTML = '';

                        if (!lista || !lista.length) {
                            buscaLista.textContent = 'Nenhum candidato encontrado.';
                            return;
                        }

                        lista.forEach(function (candidato) {
                            var opcao = document.createElement('button');
                            opcao.type = 'button';
                            opcao.className = 'projecao-colinha__opcao';
                            opcao.innerHTML = '<strong></strong><span></span>';
                            opcao.querySelector('strong').textContent = candidato.number || '';
                            opcao.querySelector('span').textContent = candidato.name + (candidato.party ? ' · ' + candidato.party : '');
                            opcao.addEventListener('click', function () { escolher(candidato); });
                            buscaLista.appendChild(opcao);
                        });
                    })
                    .catch(function () { buscaLista.innerHTML = ''; });
            }, 300);
        });

        // Estado salvo no aparelho.
        var salvo = recuperar(estado.uf)[cargo.slug];

        if (salvo && salvo.id) {
            estado.escolhas[cargo.slug] = salvo;
            entrada.value = salvo.number || '';
            desenharBoxes(entrada.value);
            desenharCandidato(salvo);
        } else {
            desenharBoxes('');
        }

        return secao;
    }

    function montarCargos(uf) {
        estado.uf = uf;
        estado.escolhas = {};
        el.cartoes.innerHTML = '';
        mostrarErro('');

        if (!uf) {
            el.vazio.hidden = false;
            el.acoes.hidden = true;
            return;
        }

        api('/colinha/cargos', { uf: uf })
            .then(function (cargos) {
                estado.cargos = cargos || [];
                el.vazio.hidden = true;
                el.acoes.hidden = false;

                estado.cargos.forEach(function (cargo) {
                    el.cartoes.appendChild(cartao(cargo));
                });

                guardar();
            })
            .catch(function () {
                mostrarErro('Não consegui carregar os cargos agora. Tente novamente em instantes.');
            });
    }

    // ---------------------------------------------------------------- ações

    function textoDaColinha() {
        var linhas = [];

        estado.cargos.forEach(function (cargo) {
            var escolha = estado.escolhas[cargo.slug];
            if (!escolha) return;
            linhas.push(cargo.label + ': ' + escolha.number + ' — ' + escolha.name + (escolha.party ? ' (' + escolha.party + ')' : ''));
        });

        var url = cfg.pageUrl + (cfg.pageUrl.indexOf('?') === -1 ? '?' : '&') + 'colinha=' + codigo();

        return (estado.textos.share_text ? estado.textos.share_text + '\n\n' : '') + linhas.join('\n') + '\n\n' + url;
    }

    raiz.querySelector('[data-pcol-som]').addEventListener('click', function () {
        var novo = !somLigado();
        try { localStorage.setItem(CHAVE_SOM, novo ? '1' : '0'); } catch (e) { /* segue */ }
        this.setAttribute('aria-pressed', novo ? 'true' : 'false');
        if (novo) bipe(true);
    });

    raiz.querySelector('[data-pcol-zerar]').addEventListener('click', function () {
        if (!window.confirm('Apagar toda a sua lista deste aparelho?')) return;
        estado.escolhas = {};
        guardar();
        registrarVoto();
        montarCargos(estado.uf);
    });

    raiz.querySelector('[data-pcol-imagem]').addEventListener('click', function () {
        var c = codigo();

        if (!c) {
            window.alert('Escolha ao menos um candidato para gerar a imagem.');
            return;
        }

        window.open(cfg.baseUrl + '/minha-colinha/imagem?c=' + c, '_blank', 'noopener');
    });

    raiz.querySelector('[data-pcol-compartilhar]').addEventListener('click', function () {
        if (!codigo()) {
            window.alert('Escolha ao menos um candidato para compartilhar.');
            return;
        }

        var texto = textoDaColinha();

        if (navigator.share) {
            navigator.share({ title: cfg.siteName, text: texto }).catch(function () { /* cancelou */ });
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texto).catch(function () { /* mostra o modal */ });
        }

        el.modalTexto.value = texto;
        el.modal.hidden = false;
        el.modalTexto.focus();
        el.modalTexto.select();
    });

    raiz.querySelector('[data-pcol-modal-fechar]').addEventListener('click', function () {
        el.modal.hidden = true;
    });

    el.uf.addEventListener('change', function () {
        montarCargos(el.uf.value);
    });

    // ------------------------------------------------------------- arranque

    api('/colinha', {})
        .then(function (dados) {
            estado.textos = dados || {};

            if (!el.titulo.textContent.trim()) {
                el.titulo.textContent = dados.title || 'Meus Candidatos';
            }

            el.sub.textContent = dados.subtitle || '';
            el.aviso.textContent = dados.disclaimer || '';

            if (typeof dados.days_to_election === 'number' && dados.days_to_election >= 0) {
                el.contador.hidden = false;
                el.dias.textContent = dados.days_to_election === 0 ? 'Hoje' : dados.days_to_election;
                el.diasRotulo.textContent = dados.days_to_election === 0
                    ? 'é dia de votar'
                    : (dados.days_to_election === 1 ? 'dia para a eleição' : 'dias para a eleição');
            }

            (dados.states || []).forEach(function (estadoItem) {
                var opcao = document.createElement('option');
                opcao.value = estadoItem.uf;
                opcao.textContent = estadoItem.uf + ' — ' + estadoItem.name;
                el.uf.appendChild(opcao);
            });

            var inicial = cfg.uf || '';

            if (!inicial) {
                try { inicial = localStorage.getItem(CHAVE_UF) || ''; } catch (e) { inicial = ''; }
            }

            if (inicial) {
                el.uf.value = inicial;
                montarCargos(inicial);
            }
        })
        .catch(function () {
            mostrarErro('Não consegui falar com a API de Projeções agora.');
        });
})();
