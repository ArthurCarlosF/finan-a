# Financas do Casal

Aplicacao web simples para organizar financas do casal, pensada para GitHub Pages, Google Sheets e Google Apps Script.

## Estrutura

- `site/`: frontend estatico para publicar no GitHub Pages.
- `apps-script/`: codigo inicial do Google Apps Script ligado a planilha.
- `docs/`: guias de configuracao.
- `PREMISSAS_DO_PROJETO.txt`: regras de produto definidas ate agora.

## Primeira versao

O frontend atual roda localmente usando `localStorage`, sem backend obrigatorio. Isso permite validar fluxo, telas e regras antes de conectar a planilha.

Funcionalidades ja iniciadas:

- Painel com saldo geral, saldo restante, salarios e compromissos.
- Cadastro de salarios.
- Cadastro, edicao, pausa e exclusao de centros de custo.
- Centro especial `Investimentos` calculado pelas caixinhas.
- Cadastro, edicao e exclusao de caixinhas.
- Novo lancamento com tipos `Gasto`, `Investimento` e `Ganho extra`.
- Historico simples de lancamentos.
- Compra parcelada com impacto por parcela no mes atual e meses futuros.

## Proximos passos

1. Validar a experiencia do site.
2. Criar a planilha no Google Sheets.
3. Colar o conteudo de `apps-script/Code.gs` no Apps Script da planilha.
4. Executar `setupSpreadsheet`.
5. Publicar o Apps Script como Web App.
6. Conectar o frontend ao endpoint publicado.
