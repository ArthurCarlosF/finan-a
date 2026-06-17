# Configuracao inicial

## GitHub Pages

1. Crie um repositorio no GitHub.
2. Envie a pasta do projeto para o repositorio.
3. No GitHub, acesse `Settings > Pages`.
4. Em `Build and deployment`, selecione a branch principal.
5. Configure a publicacao a partir da pasta `/site`, se disponivel. Se o GitHub nao permitir selecionar `/site`, moveremos os arquivos do site para a raiz ou usaremos uma branch separada.

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

## Rotina automatica

A funcao `setupSpreadsheet` cria um gatilho diario para `rotinaDiaria`.

Todo dia, o script verifica:

- Se hoje e o quinto dia util, considerando apenas segunda a sexta.
- Se a rotina mensal ainda nao foi aplicada no mes.

Se as duas condicoes forem verdadeiras, ele registra um fechamento mensal simples.
