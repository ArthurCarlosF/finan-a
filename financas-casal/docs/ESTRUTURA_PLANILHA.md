# Estrutura da planilha

## Config

| Coluna | Uso |
| --- | --- |
| Chave | Nome da configuracao |
| Valor | Valor da configuracao |

## Salarios

| Coluna | Uso |
| --- | --- |
| Pessoa | Arthur ou Carol |
| Valor | Salario configurado |
| AtualizadoEm | Data da ultima edicao |

## CentrosDeCusto

| Coluna | Uso |
| --- | --- |
| Id | Identificador unico |
| Nome | Nome do centro |
| ValorMensal | Orcamento mensal |
| Tipo | `manual` ou `investments` |
| Status | `active` ou `paused` |
| CriadoEm | Data de criacao |
| AtualizadoEm | Data de atualizacao |

## Caixinhas

| Coluna | Uso |
| --- | --- |
| Id | Identificador unico |
| Nome | Nome da caixinha |
| TipoInvestimento | Tesouro, Inter, Bolsa, etc. |
| SaldoAtual | Saldo ajustado manualmente |
| AporteMinimoMensal | Aporte minimo esperado |
| ObjetivoFinal | Valor alvo |
| Status | `active` ou `paused` |
| CriadoEm | Data de criacao |
| AtualizadoEm | Data de atualizacao |

## Lancamentos

| Coluna | Uso |
| --- | --- |
| Id | Identificador unico |
| Data | Data do lancamento |
| MesCompetencia | Mes no formato `AAAA-MM` |
| Tipo | `expense`, `investment` ou `extraIncome` |
| Pessoa | Arthur, Carol ou Ambos |
| Descricao | Texto curto |
| ValorTotal | Valor total |
| FormaPagamento | `debit`, `credit_cash` ou `credit_installments` |
| QuantidadeParcelas | Numero de parcelas |
| CentroCustoId | Centro de custo afetado |
| CaixinhaId | Caixinha afetada |
| CriadoEm | Data de criacao |
| AtualizadoEm | Data de atualizacao |

## Parcelas

| Coluna | Uso |
| --- | --- |
| Id | Identificador unico |
| LancamentoId | Lancamento original |
| NumeroParcela | Parcela atual |
| TotalParcelas | Total de parcelas |
| MesCompetencia | Mes no formato `AAAA-MM` |
| ValorParcela | Valor da parcela |
| CentroCustoId | Centro afetado |
| Status | `active` ou `deleted` |

## FechamentosMensais

| Coluna | Uso |
| --- | --- |
| Id | Identificador unico |
| MesCompetencia | Mes fechado |
| SalarioTotal | Salario total considerado |
| SaldoGeral | Saldo geral calculado |
| SaldoRestante | Saldo restante calculado |
| TotalGastos | Gastos do mes |
| TotalInvestimentos | Investimentos do mes |
| TotalGanhosExtras | Ganhos extras do mes |
| DadosJson | Snapshot completo |
| AplicadoEm | Data de aplicacao |

## RotinasExecutadas

| Coluna | Uso |
| --- | --- |
| MesCompetencia | Mes da rotina |
| NomeRotina | Nome da rotina |
| ExecutadaEm | Data de execucao |
| Status | `automatico` ou `manual` |
