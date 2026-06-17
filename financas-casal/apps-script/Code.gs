const SHEETS = {
  CONFIG: "Config",
  SALARIES: "Salarios",
  COST_CENTERS: "CentrosDeCusto",
  BOXES: "Caixinhas",
  LAUNCHES: "Lancamentos",
  INSTALLMENTS: "Parcelas",
  MONTHLY_CLOSINGS: "FechamentosMensais",
  ROUTINES: "RotinasExecutadas"
};

const HEADERS = {
  [SHEETS.CONFIG]: ["Chave", "Valor"],
  [SHEETS.SALARIES]: ["Pessoa", "Valor", "AtualizadoEm"],
  [SHEETS.COST_CENTERS]: ["Id", "Nome", "ValorMensal", "Tipo", "Status", "CriadoEm", "AtualizadoEm"],
  [SHEETS.BOXES]: ["Id", "Nome", "TipoInvestimento", "SaldoAtual", "AporteMinimoMensal", "ObjetivoFinal", "Status", "CriadoEm", "AtualizadoEm"],
  [SHEETS.LAUNCHES]: ["Id", "Data", "MesCompetencia", "Tipo", "Pessoa", "Descricao", "ValorTotal", "FormaPagamento", "QuantidadeParcelas", "CentroCustoId", "CaixinhaId", "CriadoEm", "AtualizadoEm"],
  [SHEETS.INSTALLMENTS]: ["Id", "LancamentoId", "NumeroParcela", "TotalParcelas", "MesCompetencia", "ValorParcela", "CentroCustoId", "Status"],
  [SHEETS.MONTHLY_CLOSINGS]: ["Id", "MesCompetencia", "SalarioTotal", "SaldoGeral", "SaldoRestante", "TotalGastos", "TotalInvestimentos", "TotalGanhosExtras", "DadosJson", "AplicadoEm"],
  [SHEETS.ROUTINES]: ["MesCompetencia", "NomeRotina", "ExecutadaEm", "Status"]
};

function doGet(event) {
  const action = event && event.parameter && event.parameter.action;
  const state = getWorkbookState();

  return jsonResponse({
    ok: true,
    data: action === "getRawState" ? state : toAppState_(state)
  });
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents || "{}");
    const action = body.action;
    const payload = body.payload || {};

    if (action === "saveState") {
      saveWorkbookState(payload);
      return jsonResponse({ ok: true });
    }

    if (action === "runMonthlyRoutine") {
      const result = runMonthlyRoutine(new Date(), true);
      return jsonResponse({ ok: true, data: result });
    }

    return jsonResponse({ ok: false, error: "Acao desconhecida." });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function setupSpreadsheet() {
  const spreadsheet = SpreadsheetApp.getActive();

  Object.keys(HEADERS).forEach((sheetName) => {
    const sheet = getOrCreateSheet_(spreadsheet, sheetName);
    ensureHeaders_(sheet, HEADERS[sheetName]);
  });

  seedSalaries_();
  createDailyTrigger_();
}

function rotinaDiaria() {
  runMonthlyRoutine(new Date(), false);
}

function runMonthlyRoutine(date, force) {
  const targetDate = date || new Date();
  const month = monthKey_(targetDate);

  if (!force && !isFifthBusinessDay_(targetDate)) {
    return { applied: false, reason: "Nao e quinto dia util." };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!force && routineWasExecuted_(month, "rotinaMensal")) {
      return { applied: false, reason: "Rotina ja aplicada neste mes." };
    }

    const snapshot = calculateMonthlySnapshot_(month);
    appendObject_(SHEETS.MONTHLY_CLOSINGS, {
      Id: Utilities.getUuid(),
      MesCompetencia: month,
      SalarioTotal: snapshot.salaryTotal,
      SaldoGeral: snapshot.generalBalance,
      SaldoRestante: snapshot.remainingBalance,
      TotalGastos: snapshot.totalExpenses,
      TotalInvestimentos: snapshot.totalInvestments,
      TotalGanhosExtras: snapshot.totalExtraIncome,
      DadosJson: JSON.stringify(snapshot),
      AplicadoEm: new Date()
    });

    appendObject_(SHEETS.ROUTINES, {
      MesCompetencia: month,
      NomeRotina: "rotinaMensal",
      ExecutadaEm: new Date(),
      Status: force ? "manual" : "automatico"
    });

    return { applied: true, month, snapshot };
  } finally {
    lock.releaseLock();
  }
}

function getWorkbookState() {
  setupMissingSheets_();
  return {
    salaries: rowsAsObjects_(SHEETS.SALARIES),
    centers: rowsAsObjects_(SHEETS.COST_CENTERS),
    boxes: rowsAsObjects_(SHEETS.BOXES),
    launches: rowsAsObjects_(SHEETS.LAUNCHES),
    installments: rowsAsObjects_(SHEETS.INSTALLMENTS),
    monthlyClosings: rowsAsObjects_(SHEETS.MONTHLY_CLOSINGS)
  };
}

function saveWorkbookState(state) {
  setupMissingSheets_();
  const now = new Date();
  const rows = toSheetState_(state, now);
  replaceSheetData_(SHEETS.SALARIES, rows.salaries);
  replaceSheetData_(SHEETS.COST_CENTERS, rows.centers);
  replaceSheetData_(SHEETS.BOXES, rows.boxes);
  replaceSheetData_(SHEETS.LAUNCHES, rows.launches);
  replaceSheetData_(SHEETS.INSTALLMENTS, rows.installments);
}

function toAppState_(raw) {
  return {
    salaries: raw.salaries.reduce((result, row) => {
      result[row.Pessoa] = number_(row.Valor);
      return result;
    }, { Arthur: 0, Carol: 0 }),
    centers: raw.centers
      .filter((row) => row.Tipo !== "investments")
      .map((row) => ({
        id: row.Id,
        name: row.Nome,
        monthlyValue: number_(row.ValorMensal),
        type: row.Tipo || "manual",
        status: row.Status || "active"
      })),
    boxes: raw.boxes.map((row) => ({
      id: row.Id,
      name: row.Nome,
      investmentType: row.TipoInvestimento,
      currentBalance: number_(row.SaldoAtual),
      monthlyMinimum: number_(row.AporteMinimoMensal),
      goal: number_(row.ObjetivoFinal),
      status: row.Status || "active"
    })),
    launches: raw.launches.map((row) => ({
      id: row.Id,
      date: dateInput_(row.Data),
      month: row.MesCompetencia,
      type: row.Tipo,
      person: row.Pessoa,
      description: row.Descricao,
      amount: number_(row.ValorTotal),
      paymentMethod: row.FormaPagamento,
      installments: Number(row.QuantidadeParcelas || 1),
      centerId: row.CentroCustoId,
      boxId: row.CaixinhaId
    }))
  };
}

function toSheetState_(state, now) {
  const salaries = [
    { Pessoa: "Arthur", Valor: number_(state.salaries && state.salaries.Arthur), AtualizadoEm: now },
    { Pessoa: "Carol", Valor: number_(state.salaries && state.salaries.Carol), AtualizadoEm: now }
  ];

  const centers = (state.centers || []).map((center) => ({
    Id: center.id,
    Nome: center.name,
    ValorMensal: number_(center.monthlyValue),
    Tipo: center.type || "manual",
    Status: center.status || "active",
    CriadoEm: center.createdAt || now,
    AtualizadoEm: now
  }));

  const boxes = (state.boxes || []).map((box) => ({
    Id: box.id,
    Nome: box.name,
    TipoInvestimento: box.investmentType,
    SaldoAtual: number_(box.currentBalance),
    AporteMinimoMensal: number_(box.monthlyMinimum),
    ObjetivoFinal: number_(box.goal),
    Status: box.status || "active",
    CriadoEm: box.createdAt || now,
    AtualizadoEm: now
  }));

  const launches = (state.launches || []).map((launch) => ({
    Id: launch.id,
    Data: launch.date,
    MesCompetencia: launch.month,
    Tipo: launch.type,
    Pessoa: launch.person,
    Descricao: launch.description,
    ValorTotal: number_(launch.amount),
    FormaPagamento: launch.paymentMethod,
    QuantidadeParcelas: Number(launch.installments || 1),
    CentroCustoId: launch.centerId,
    CaixinhaId: launch.boxId,
    CriadoEm: launch.createdAt || now,
    AtualizadoEm: now
  }));

  const installments = (state.installments || []).map((installment) => ({
    Id: installment.id,
    LancamentoId: installment.launchId,
    NumeroParcela: installment.number,
    TotalParcelas: installment.total,
    MesCompetencia: installment.month,
    ValorParcela: number_(installment.amount),
    CentroCustoId: installment.centerId,
    Status: installment.status || "active"
  }));

  return { salaries, centers, boxes, launches, installments };
}

function calculateMonthlySnapshot_(month) {
  const salaries = rowsAsObjects_(SHEETS.SALARIES);
  const centers = rowsAsObjects_(SHEETS.COST_CENTERS);
  const boxes = rowsAsObjects_(SHEETS.BOXES);
  const launches = rowsAsObjects_(SHEETS.LAUNCHES);
  const installments = rowsAsObjects_(SHEETS.INSTALLMENTS);

  const salaryTotal = salaries.reduce((sum, row) => sum + number_(row.Valor), 0);
  const activeCenters = centers.filter((row) => row.Status === "active" && row.Tipo !== "investments");
  const investmentBudget = boxes
    .filter((box) => box.Status === "active" && number_(box.SaldoAtual) < number_(box.ObjetivoFinal))
    .reduce((sum, box) => sum + number_(box.AporteMinimoMensal), 0);
  const committedTotal = activeCenters.reduce((sum, row) => sum + number_(row.ValorMensal), 0) + investmentBudget;

  const totalExtraIncome = launches
    .filter((row) => row.Tipo === "extraIncome" && row.MesCompetencia === month)
    .reduce((sum, row) => sum + number_(row.ValorTotal), 0);
  const totalInvestments = launches
    .filter((row) => row.Tipo === "investment" && row.MesCompetencia === month)
    .reduce((sum, row) => sum + number_(row.ValorTotal), 0);
  const totalExpenses = installments
    .filter((row) => row.MesCompetencia === month && row.Status !== "deleted")
    .reduce((sum, row) => sum + number_(row.ValorParcela), 0);

  const centerBalances = activeCenters.map((center) => {
    const spent = installments
      .filter((row) => row.MesCompetencia === month && row.CentroCustoId === center.Id && row.Status !== "deleted")
      .reduce((sum, row) => sum + number_(row.ValorParcela), 0);

    return {
      id: center.Id,
      name: center.Nome,
      budget: number_(center.ValorMensal),
      spent,
      balance: round_(number_(center.ValorMensal) - spent)
    };
  });

  centerBalances.push({
    id: "investments",
    name: "Investimentos",
    budget: investmentBudget,
    spent: totalInvestments,
    balance: round_(investmentBudget - totalInvestments)
  });

  const remainingBalance = round_(salaryTotal + totalExtraIncome - committedTotal);
  const generalBalance = round_(remainingBalance + centerBalances.reduce((sum, row) => sum + row.balance, 0));

  return {
    month,
    salaryTotal,
    committedTotal,
    remainingBalance,
    generalBalance,
    totalExpenses,
    totalInvestments,
    totalExtraIncome,
    centerBalances,
    boxes
  };
}

function createDailyTrigger_() {
  const exists = ScriptApp.getProjectTriggers().some((trigger) => trigger.getHandlerFunction() === "rotinaDiaria");
  if (exists) return;

  ScriptApp.newTrigger("rotinaDiaria")
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
}

function isFifthBusinessDay_(date) {
  let count = 0;
  const cursor = new Date(date.getFullYear(), date.getMonth(), 1);

  while (cursor.getMonth() === date.getMonth()) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    if (sameDate_(cursor, date)) return count === 5 && day !== 0 && day !== 6;
    cursor.setDate(cursor.getDate() + 1);
  }

  return false;
}

function routineWasExecuted_(month, routineName) {
  return rowsAsObjects_(SHEETS.ROUTINES).some((row) => {
    return row.MesCompetencia === month && row.NomeRotina === routineName;
  });
}

function setupMissingSheets_() {
  const spreadsheet = SpreadsheetApp.getActive();
  Object.keys(HEADERS).forEach((sheetName) => {
    const sheet = getOrCreateSheet_(spreadsheet, sheetName);
    ensureHeaders_(sheet, HEADERS[sheetName]);
  });
}

function seedSalaries_() {
  const rows = rowsAsObjects_(SHEETS.SALARIES);
  if (rows.length) return;

  appendObject_(SHEETS.SALARIES, { Pessoa: "Arthur", Valor: 0, AtualizadoEm: new Date() });
  appendObject_(SHEETS.SALARIES, { Pessoa: "Carol", Valor: 0, AtualizadoEm: new Date() });
}

function rowsAsObjects_(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const headers = values.shift();

  return values
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => {
      const object = {};
      headers.forEach((header, index) => {
        object[header] = row[index];
      });
      return object;
    });
}

function appendObject_(sheetName, object) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const headers = HEADERS[sheetName];
  sheet.appendRow(headers.map((header) => object[header] !== undefined ? object[header] : ""));
}

function replaceSheetData_(sheetName, rows) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const headers = HEADERS[sheetName];
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (!rows.length) return;

  const values = rows.map((row) => headers.map((header) => row[header] !== undefined ? row[header] : ""));
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function getOrCreateSheet_(spreadsheet, sheetName) {
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function ensureHeaders_(sheet, headers) {
  const hasHeaders = sheet.getLastRow() >= 1 && sheet.getRange(1, 1, 1, headers.length).getValues()[0].some(Boolean);
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function monthKey_(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sameDate_(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function number_(value) {
  return Number(String(value || "0").replace(",", "."));
}

function round_(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function dateInput_(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
