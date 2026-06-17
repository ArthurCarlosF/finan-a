# Configuracao inicial

## GitHub Pages

1. Crie um repositorio no GitHub.
2. Envie a pasta do projeto para o repositorio.
3. No GitHub, acesse `Settings > Pages`.
4. Em `Build and deployment`, selecione a branch principal.
5. Configure a publicacao a partir da raiz da branch `main`.

Os arquivos do site tambem ficam copiados na raiz do repositorio (`index.html`, `app.js`, `config.js` e `styles.css`) para atender ao GitHub Pages em `https://arthurcarlosf.github.io/finan-a/`.

## Google Sheets

Crie uma planilha vazia. O Apps Script criara as abas:

- `Config`
- `Salarios`
- `CentrosDeCusto`
- `Caixinhas`
- `Lancamentos`
- `Parcelas`
- `FechamentosMensais`
- `RotinasExecutadas`

## Google Apps Script

1. Na planilha, acesse `Extensoes > Apps Script`.
2. Cole o conteudo de `apps-script/Code.gs`.
3. Salve o projeto.
4. Execute a funcao `setupSpreadsheet`.
5. Autorize as permissoes solicitadas.
6. Publique como Web App.

Configuracao sugerida do Web App:

- Executar como: voce.
- Quem tem acesso: qualquer pessoa com o link.

O projeto foi definido sem login e sem token. Por isso, a planilha nao deve armazenar informacoes sensiveis.

URL atual do Web App:

`https://script.google.com/macros/s/AKfycbxPtU3fb2OWCTGDalEqN0I3cbyE-24XU5dSGs9RtJbdfECq_7PimBWoD-_Q2bV6w19J/exec`

Sempre que o arquivo `apps-script/Code.gs` for alterado, cole a nova versao no Apps Script e crie uma nova implantacao ou atualize a implantacao existente para que a URL use o codigo mais recente.

## Rotina automatica

A funcao `setupSpreadsheet` cria um gatilho diario para `rotinaDiaria`.

Todo dia, o script verifica:

- Se hoje e o quinto dia util, considerando apenas segunda a sexta.
- Se a rotina mensal ainda nao foi aplicada no mes.

Se as duas condicoes forem verdadeiras, ele registra um fechamento mensal simples.
