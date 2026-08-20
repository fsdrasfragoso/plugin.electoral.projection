# Projeção Eleitoral — Plugin WordPress

Plugin que embute a **calculadora de projeções eleitorais** da Fragoso Software no site
WordPress do cliente, integrada ao tema. O cliente só informa o **client_id** e o
**client_secret**; o plugin consome o [SDK PHP](https://github.com/fsdrasfragoso/projecao-sdk-php)
no back-end.

## Como funciona (segurança)

```
Navegador (tema do cliente)
        │  fetch (mesma origem, X-WP-Nonce)
        ▼
WordPress REST  /wp-json/projecao/v1/*   ← proxy server-side (este plugin)
        │  SDK (client_secret fica aqui, no servidor)
        ▼
API de Projeções (projecao.fragososoftware.com)
```

O **client_secret nunca é exposto** ao navegador: fica em `wp_options` e só é usado no
servidor. O front conversa apenas com o próprio WordPress (mesma origem + nonce).

## Instalação

1. Copie a pasta para `wp-content/plugins/projecao-eleitoral/` (ou gere um `.zip` e instale pelo painel).
2. Ative o plugin.
3. **Configurações → Projeção Eleitoral**: informe `client_id` e `client_secret` e clique em **Testar conexão**.
4. Use o shortcode **`[projecao_calculadora]`** em qualquer página/post.
5. Para **Meus Candidatos**, use **`[projecao_meus_candidatos]`** (aceita `uf="CE"`; `[projecao_colinha]` segue valendo como nome antigo).

## Estrutura

```
projecao-eleitoral.php     Cabeçalho do plugin + bootstrap/autoload
includes/
  Plugin.php               Composition root
  Settings.php             Página admin (credenciais) — Settings API
  SdkClient.php            Monta o Client do SDK a partir das configurações
  Rest.php                 Proxy REST (projecao/v1) → SDK
  Shortcode.php            [projecao_calculadora] + enqueue de assets
  ColinhaShortcode.php     [projecao_meus_candidatos] + enqueue de assets
templates/
  settings.php             Tela de configurações
  calculator.php           Shell da calculadora
  colinha.php              Shell de Meus Candidatos
assets/
  js/calculator.js         Wizard (vanilla JS) — fala com o REST do WP
  js/colinha.js            Meus Candidatos (vanilla JS)
  css/calculator.css       Estilos escopados (integram com o tema)
  css/colinha.css          Estilos de Meus Candidatos
lib/projecao-sdk/          SDK PHP vendorizado (fragososoftware/projecao-sdk)
```

## Endpoints REST (proxy)

`/wp-json/projecao/v1/` → `offices`, `states`, `elections`, `elections/{id}`,
`candidates`, `units`, `preview` (POST), `projections` (POST), `test` (admin),
`colinha`, `colinha/cargos`, `colinha/candidato`, `colinha/buscar`, `colinha/urna` (POST).

Leitura é pública (a calculadora é pública); escrita (`preview`/`projections`) exige nonce.

## Atualizar o SDK embutido

O SDK fica em `lib/projecao-sdk/` (cópia de `fragososoftware/projecao-sdk`). Para atualizar,
substitua `src/` e `autoload.php` por uma nova versão do pacote.

## Licença

Proprietária — © Fragoso Software.
