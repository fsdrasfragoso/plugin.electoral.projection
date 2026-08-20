=== Projeção Eleitoral ===
Contributors: fragososoftware
Tags: eleições, projeções, calculadora, simulação
Requires at least: 5.6
Tested up to: 6.6
Requires PHP: 7.0
Stable tag: 1.9.0
License: Proprietary

Calculadora de simulações e projeções eleitorais integrada ao seu tema. Basta informar o client_id e o client_secret da sua aplicação.

== Description ==

Plugin que adiciona ao seu site WordPress a calculadora de projeções eleitorais da Fragoso Software, integrada ao seu tema.

* Instale o plugin e informe o **client_id** e o **client_secret** em Configurações → Projeção Eleitoral.
* Publique a calculadora em qualquer página com o shortcode `[projecao_calculadora]`.
* Os leitores/analistas escolhem cargo, candidatos e informam os percentuais por unidade; o resultado é calculado pela API.

O **client_secret nunca vai ao navegador**: o plugin funciona como um proxy no servidor (consome o SDK PHP oficial) e o front fala apenas com o próprio WordPress.

== Installation ==

1. Envie a pasta `projecao-eleitoral` para `wp-content/plugins/` (ou instale o .zip por Plugins → Adicionar novo → Enviar plugin).
2. Ative o plugin.
3. Em **Configurações → Projeção Eleitoral**, informe o client_id e o client_secret e clique em **Testar conexão**.
4. Adicione `[projecao_calculadora]` na página desejada.

== Frequently Asked Questions ==

= Onde consigo o client_id e o client_secret? =
No painel da plataforma, em API → Aplicações. Cadastre os domínios do seu site, se desejar restringir o uso.

= Preciso de Composer? =
Não. O SDK já vem embutido no plugin.

== Changelog ==

= 1.9.0 =
* Novo item: Minha Colinha. Use o shortcode [projecao_colinha] para o leitor montar a cola com o numero de cada candidato, salvar a imagem e compartilhar.
* A colinha fica salva no aparelho do leitor e funciona com o numero da urna ou busca pelo nome.

= 1.8.0 =
* O credito "Powered by Fragoso Software" no site publico passa a ser opcional e vem DESATIVADO por padrao. Para exibi-lo, autorize em Configuracoes > Projecao Eleitoral.

= 1.7.0 =
* Seletor de turno (1o/2o) na etapa de candidatos, oculto quando a eleicao nao tem 2o turno.

= 1.1.0 =
* Mapa do Brasil proprio (br.svg) pintando a regiao/estado igual aos mapas estaduais; removida a dependencia brmap.js.

= 1.0.9 =
* Mapas municipais de todos os 27 estados (gerados da malha oficial do IBGE) para a projecao de Governador.

= 1.0.8 =
* Cargo e escopo agora sao cards com radio (como na calculadora); escopo virou uma etapa propria antes dos candidatos.

= 1.0.7 =
* Correcao: Governador agora projeta dentro do estado da eleicao (escopo estado = 1 unidade).
* Regiao: mapa nacional com os estados da regiao iluminados + tags com os nomes dos estados (e municipios na macrorregiao).
* Performance: cache do token OAuth e das respostas de leitura (transients) para reduzir requisicoes ao servidor.

= 1.0.6 =
* Governador: mapa municipal do estado (Ceará) com os municípios da macrorregião ou o município da projeção iluminados.

= 1.0.5 =
* Mapa do Brasil no painel da unidade (região ou estado iluminado).
* Botão "Montar grade" renomeado para "Avançar".

= 1.0.4 =
* Botões "Selecionar todos" (um por partido) e "Limpar" na seleção de candidatos.

= 1.0.3 =
* Etapa de projeção agora é unidade por unidade (mesma estrutura do app Laravel): painel da unidade + progresso, linhas de candidato com input e barra, soma 100% por unidade, navegação Anterior/Próximo e início com divisão igual.

= 1.0.2 =
* Foto do candidato ao lado do nome (na seleção, na grade e no resultado); avatar de fallback quando não há foto.
* Impede selecionar dois candidatos do mesmo partido.

= 1.0.1 =
* Correção: o seletor de Estado agora sempre some para cargos federais (ex.: Presidente).
* Correção: front compatível com permalink plano (monta a query corretamente quando a REST usa ?rest_route=).

= 1.0.0 =
* Versão inicial: configurações, shortcode, proxy REST e calculadora (cargo → candidatos → grade → resultado).
