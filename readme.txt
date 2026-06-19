=== Projeção Eleitoral ===
Contributors: fragososoftware
Tags: eleições, projeções, calculadora, simulação
Requires at least: 5.6
Tested up to: 6.6
Requires PHP: 7.0
Stable tag: 1.0.2
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

= 1.0.2 =
* Foto do candidato ao lado do nome (na seleção, na grade e no resultado); avatar de fallback quando não há foto.
* Impede selecionar dois candidatos do mesmo partido.

= 1.0.1 =
* Correção: o seletor de Estado agora sempre some para cargos federais (ex.: Presidente).
* Correção: front compatível com permalink plano (monta a query corretamente quando a REST usa ?rest_route=).

= 1.0.0 =
* Versão inicial: configurações, shortcode, proxy REST e calculadora (cargo → candidatos → grade → resultado).
