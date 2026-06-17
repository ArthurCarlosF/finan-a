(function () {
  const STORAGE_KEY = "financas-casal-state-v1";

  const paymentLabels = {
    debit: "Debito / PIX / dinheiro",
    credit_cash: "Credito a vista",
    credit_installments: "Credito parcelado"
  };

  const typeLabels = {
    expense: "Gasto",
    investment: "Investimento",
    extraIncome: "Ganho extra"
  };

  const state = loadState();

  document.addEventListener("DOMContentLoaded", () => {
    setDefaultDates();
    bindNavigation();
    bindForms();
    render();
  });

  function defaultState() {
    return {
      salaries: {
        Arthur: 0,
        Carol: 0
      },
      centers: [],
      boxes: [],
      launches: []
    };
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn("Falha ao carregar dados locais.", error);
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function bindNavigation() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => showView(tab.dataset.view));
    });

    document.getElementById("openLaunchpad").addEventListener("click", () => {
      showView("launches");
      document.querySelector("#launchForm [name='amount']").focus();
    });
  }

  function showView(viewId) {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.view === viewId);
    });
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("active", view.id === viewId);
    });
  }

  function bindForms() {
    const launchForm = document.getElementById("launchForm");
    const centerForm = document.getElementById("centerForm");
    const boxForm = document.getElementById("boxForm");
    const salaryForm = document.getElementById("salaryForm");

    document.getElementById("launchType").addEventListener("change", updateLaunchFields);
    document.getElementById("paymentMethod").addEventListener("change", updateLaunchFields);

    launchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveLaunch(new FormData(launchForm));
      launchForm.reset();
      setDefaultDates();
      updateLaunchFields();
      render();
    });

    centerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveCenter(new FormData(centerForm));
    });

    boxForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveBox(new FormData(boxForm));
    });

    salaryForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(salaryForm);
      state.salaries.Arthur = toMoney(data.get("arthur"));
      state.salaries.Carol = toMoney(data.get("carol"));
      saveState();
      render();
    });
  }

  function saveLaunch(data) {
    const type = data.get("type");
    const launch = {
      id: createId(),
      date: data.get("date"),
      month: monthKey(data.get("date")),
      type,
      person: type === "expense" ? data.get("person") : "",
      description: data.get("description") || "",
      amount: toMoney(data.get("amount")),
      centerId: type === "expense" ? data.get("centerId") : "",
      boxId: type === "investment" ? data.get("boxId") : "",
      paymentMethod: type === "expense" ? data.get("paymentMethod") : "",
      installments: type === "expense" && data.get("paymentMethod") === "credit_installments"
        ? Math.max(1, Number(data.get("installments") || 1))
        : 1
    };

    if (type === "investment") {
      launch.centerId = "investments";
      const box = state.boxes.find((item) => item.id === launch.boxId);
      if (box) box.currentBalance = roundMoney(box.currentBalance + launch.amount);
    }

    state.launches.push(launch);
    saveState();
  }

  function saveCenter(data) {
    const previous = state.centers.find((item) => item.id === data.get("id"));
    const center = {
      id: data.get("id") || createId(),
      name: String(data.get("name")).trim(),
      monthlyValue: toMoney(data.get("monthlyValue")),
      status: data.get("status"),
      type: "manual"
    };

    const nextCenters = state.centers.filter((item) => item.id !== center.id);
    nextCenters.push(center);
    state.centers = nextCenters;

    if (!isBudgetValid()) {
      alert("A soma dos centros de custo e investimentos nao pode ser maior que os salarios.");
      state.centers = state.centers.filter((item) => item.id !== center.id);
      if (previous) state.centers.push(previous);
      return;
    }

    saveState();
    document.getElementById("centerForm").reset();
    render();
  }

  function saveBox(data) {
    const box = {
      id: data.get("id") || createId(),
      name: String(data.get("name")).trim(),
      investmentType: String(data.get("investmentType")).trim(),
      currentBalance: toMoney(data.get("currentBalance")),
      monthlyMinimum: toMoney(data.get("monthlyMinimum")),
      goal: toMoney(data.get("goal")),
      status: data.get("status")
    };

    const previous = state.boxes.find((item) => item.id === box.id);
    state.boxes = state.boxes.filter((item) => item.id !== box.id);
    state.boxes.push(box);

    if (!isBudgetValid()) {
      alert("A soma dos centros de custo e investimentos nao pode ser maior que os salarios.");
      state.boxes = state.boxes.filter((item) => item.id !== box.id);
      if (previous) state.boxes.push(previous);
      return;
    }

    saveState();
    document.getElementById("boxForm").reset();
    render();
  }

  function render() {
    const totals = calculateTotals();
    const today = new Date();
    document.getElementById("currentMonthLabel").textContent = monthLabel(today);
    document.getElementById("generalBalance").textContent = currency(totals.generalBalance);
    document.getElementById("remainingBalance").textContent = currency(totals.remainingBalance);
    document.getElementById("salaryTotal").textContent = currency(totals.salaryTotal);
    document.getElementById("committedTotal").textContent = currency(totals.committedTotal);

    renderBudgetNotice(totals);
    renderCenterOptions();
    renderBoxOptions();
    renderCenterBalances(totals);
    renderBoxes();
    renderCenterTable();
    renderBoxTable();
    renderLaunchTable();
    renderSalaryForm();
    updateLaunchFields();
  }

  function calculateTotals() {
    const month = monthKey(new Date());
    const activeCenters = state.centers.filter((center) => center.status === "active");
    const investmentBudget = getInvestmentBudget();
    const salaryTotal = roundMoney(state.salaries.Arthur + state.salaries.Carol);
    const manualBudget = activeCenters.reduce((sum, center) => sum + center.monthlyValue, 0);
    const committedTotal = roundMoney(manualBudget + investmentBudget);
    const extraIncome = state.launches
      .filter((launch) => launch.type === "extraIncome" && launch.month === month)
      .reduce((sum, launch) => sum + launch.amount, 0);

    const centerBalances = activeCenters.map((center) => {
      const spent = getCenterConsumption(center.id, month);
      return {
        id: center.id,
        name: center.name,
        budget: center.monthlyValue,
        spent,
        balance: roundMoney(center.monthlyValue - spent)
      };
    });

    const investmentSpent = getCenterConsumption("investments", month);
    centerBalances.push({
      id: "investments",
      name: "Investimentos",
      budget: investmentBudget,
      spent: investmentSpent,
      balance: roundMoney(investmentBudget - investmentSpent)
    });

    const remainingBalance = roundMoney(salaryTotal + extraIncome - committedTotal);
    const generalBalance = roundMoney(remainingBalance + centerBalances.reduce((sum, item) => sum + item.balance, 0));

    return {
      salaryTotal,
      committedTotal,
      remainingBalance,
      generalBalance,
      centerBalances
    };
  }

  function getCenterConsumption(centerId, month) {
    return state.launches.reduce((sum, launch) => {
      if (launch.type === "investment" && centerId === "investments" && launch.month === month) {
        return sum + launch.amount;
      }

      if (launch.type !== "expense" || launch.centerId !== centerId) return sum;

      const installments = buildInstallments(launch);
      const monthTotal = installments
        .filter((item) => item.month === month)
        .reduce((installmentSum, item) => installmentSum + item.amount, 0);

      return sum + monthTotal;
    }, 0);
  }

  function buildInstallments(launch) {
    const installments = Math.max(1, launch.installments || 1);
    const value = roundMoney(launch.amount / installments);
    const items = [];

    for (let index = 0; index < installments; index += 1) {
      items.push({
        month: addMonths(launch.month, index),
        amount: index === installments - 1
          ? roundMoney(launch.amount - value * (installments - 1))
          : value
      });
    }

    return items;
  }

  function renderCenterBalances(totals) {
    const target = document.getElementById("centerBalances");
    target.innerHTML = "";

    totals.centerBalances.forEach((item) => {
      const row = document.createElement("div");
      row.className = "balance-row";
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>Orcamento ${currency(item.budget)} - usado ${currency(item.spent)}</small>
        </div>
        <strong class="${item.balance < 0 ? "negative" : "positive"}">${currency(item.balance)}</strong>
      `;
      target.appendChild(row);
    });
  }

  function renderBoxes() {
    const target = document.getElementById("boxProgress");
    target.innerHTML = "";

    state.boxes.forEach((box) => {
      const reached = hasReachedGoal(box);
      const percent = box.goal > 0 ? Math.min(100, Math.round((box.currentBalance / box.goal) * 100)) : 0;
      const row = document.createElement("div");
      row.className = "box-row";
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(box.name)}</strong>
          <small>${escapeHtml(box.investmentType)} - ${percent}% do objetivo</small>
        </div>
        <strong class="${reached ? "positive" : ""}">${currency(box.currentBalance)} / ${currency(box.goal)}</strong>
      `;
      target.appendChild(row);
    });
  }

  function renderCenterOptions() {
    const select = document.getElementById("launchCenter");
    select.innerHTML = "";
    state.centers
      .filter((center) => center.status === "active")
      .forEach((center) => select.add(new Option(center.name, center.id)));
  }

  function renderBoxOptions() {
    const select = document.getElementById("launchBox");
    select.innerHTML = "";
    state.boxes
      .filter((box) => box.status === "active")
      .forEach((box) => select.add(new Option(box.name, box.id)));
  }

  function renderCenterTable() {
    const target = document.getElementById("centerTable");
    target.innerHTML = "";

    state.centers.forEach((center) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(center.name)}</td>
        <td>${currency(center.monthlyValue)}</td>
        <td>${center.status === "active" ? "Ativo" : "Pausado"}</td>
        <td></td>
      `;
      addActions(row.lastElementChild, () => editCenter(center), () => deleteCenter(center.id));
      target.appendChild(row);
    });
  }

  function renderBoxTable() {
    const target = document.getElementById("boxTable");
    target.innerHTML = "";

    state.boxes.forEach((box) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(box.name)}</td>
        <td>${escapeHtml(box.investmentType)}</td>
        <td>${currency(box.currentBalance)}</td>
        <td>${hasReachedGoal(box) ? "Concluida" : currency(box.monthlyMinimum)}</td>
        <td>${currency(box.goal)}</td>
        <td>${box.status === "active" ? "Ativa" : "Pausada"}</td>
        <td></td>
      `;
      addActions(row.lastElementChild, () => editBox(box), () => deleteBox(box.id));
      target.appendChild(row);
    });
  }

  function renderLaunchTable() {
    const target = document.getElementById("launchTable");
    target.innerHTML = "";

    state.launches
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((launch) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${formatDate(launch.date)}</td>
          <td>${typeLabels[launch.type]}</td>
          <td>${escapeHtml(launch.person || "-")}</td>
          <td>${escapeHtml(launch.description || "-")}</td>
          <td>${currency(launch.amount)}</td>
          <td>${escapeHtml(resolveLaunchTarget(launch))}</td>
          <td></td>
        `;
        addActions(row.lastElementChild, () => editLaunch(launch), () => deleteLaunch(launch.id));
        target.appendChild(row);
      });
  }

  function renderSalaryForm() {
    const form = document.getElementById("salaryForm");
    form.elements.arthur.value = state.salaries.Arthur;
    form.elements.carol.value = state.salaries.Carol;
  }

  function renderBudgetNotice(totals) {
    const notice = document.getElementById("budgetNotice");
    const valid = totals.committedTotal <= totals.salaryTotal;
    notice.classList.toggle("error", !valid);
    notice.textContent = valid
      ? `Compromissos configurados: ${currency(totals.committedTotal)}. Saldo restante previsto: ${currency(totals.remainingBalance)}.`
      : `Compromissos configurados acima dos salarios em ${currency(totals.committedTotal - totals.salaryTotal)}. Ajuste salarios, centros ou caixinhas.`;
  }

  function updateLaunchFields() {
    const type = document.getElementById("launchType").value;
    const payment = document.getElementById("paymentMethod").value;
    document.querySelectorAll(".expense-field").forEach((item) => item.classList.toggle("hidden", type !== "expense"));
    document.querySelectorAll(".investment-field").forEach((item) => item.classList.toggle("hidden", type !== "investment"));
    document.querySelector(".installments-field").classList.toggle("hidden", type !== "expense" || payment !== "credit_installments");
  }

  function addActions(cell, onEdit, onDelete) {
    const template = document.getElementById("actionButtonsTemplate");
    const actions = template.content.cloneNode(true);
    actions.querySelector(".edit-button").addEventListener("click", onEdit);
    actions.querySelector(".delete-button").addEventListener("click", onDelete);
    cell.appendChild(actions);
  }

  function editCenter(center) {
    const form = document.getElementById("centerForm");
    form.elements.id.value = center.id;
    form.elements.name.value = center.name;
    form.elements.monthlyValue.value = center.monthlyValue;
    form.elements.status.value = center.status;
    showView("centers");
  }

  function editBox(box) {
    const form = document.getElementById("boxForm");
    form.elements.id.value = box.id;
    form.elements.name.value = box.name;
    form.elements.investmentType.value = box.investmentType;
    form.elements.currentBalance.value = box.currentBalance;
    form.elements.monthlyMinimum.value = box.monthlyMinimum;
    form.elements.goal.value = box.goal;
    form.elements.status.value = box.status;
    showView("boxes");
  }

  function editLaunch(launch) {
    const description = prompt("Descricao do lancamento:", launch.description || "");
    if (description === null) return;
    const amount = prompt("Valor do lancamento:", String(launch.amount));
    if (amount === null) return;
    const previousAmount = launch.amount;
    launch.description = description;
    launch.amount = toMoney(amount);
    if (launch.type === "investment") {
      updateBoxBalance(launch.boxId, launch.amount - previousAmount);
    }
    saveState();
    render();
  }

  function deleteCenter(id) {
    if (!confirm("Excluir este centro de custo?")) return;
    state.centers = state.centers.filter((center) => center.id !== id);
    saveState();
    render();
  }

  function deleteBox(id) {
    if (!confirm("Excluir esta caixinha?")) return;
    state.boxes = state.boxes.filter((box) => box.id !== id);
    saveState();
    render();
  }

  function deleteLaunch(id) {
    if (!confirm("Excluir este lancamento?")) return;
    const launch = state.launches.find((item) => item.id === id);
    if (launch && launch.type === "investment") {
      updateBoxBalance(launch.boxId, -launch.amount);
    }
    state.launches = state.launches.filter((launch) => launch.id !== id);
    saveState();
    render();
  }

  function updateBoxBalance(boxId, delta) {
    const box = state.boxes.find((item) => item.id === boxId);
    if (box) box.currentBalance = Math.max(0, roundMoney(box.currentBalance + delta));
  }

  function resolveLaunchTarget(launch) {
    if (launch.type === "extraIncome") return "Saldo restante";
    if (launch.type === "investment") {
      const box = state.boxes.find((item) => item.id === launch.boxId);
      return box ? box.name : "Caixinha removida";
    }
    const center = state.centers.find((item) => item.id === launch.centerId);
    const payment = launch.paymentMethod ? ` - ${paymentLabels[launch.paymentMethod]}` : "";
    const installments = launch.installments > 1 ? ` (${launch.installments}x)` : "";
    return `${center ? center.name : "Centro removido"}${payment}${installments}`;
  }

  function isBudgetValid() {
    const salaryTotal = state.salaries.Arthur + state.salaries.Carol;
    const manualBudget = state.centers
      .filter((center) => center.status === "active")
      .reduce((sum, center) => sum + center.monthlyValue, 0);
    return manualBudget + getInvestmentBudget() <= salaryTotal;
  }

  function getInvestmentBudget() {
    return state.boxes
      .filter((box) => box.status === "active" && !hasReachedGoal(box))
      .reduce((sum, box) => sum + box.monthlyMinimum, 0);
  }

  function hasReachedGoal(box) {
    return box.goal > 0 && box.currentBalance >= box.goal;
  }

  function setDefaultDates() {
    const input = document.querySelector("#launchForm [name='date']");
    if (input && !input.value) input.valueAsDate = new Date();
  }

  function createId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function toMoney(value) {
    return roundMoney(Number(String(value || "0").replace(",", ".")));
  }

  function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function currency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value || 0);
  }

  function monthKey(dateInput) {
    const date = dateInput instanceof Date ? dateInput : new Date(`${dateInput}T12:00:00`);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function addMonths(month, amount) {
    const [year, monthNumber] = month.split("-").map(Number);
    const date = new Date(year, monthNumber - 1 + amount, 1);
    return monthKey(date);
  }

  function monthLabel(date) {
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
