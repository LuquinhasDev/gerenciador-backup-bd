const API_URL = "http://localhost:3000";

let currentJobId = null;
let statusTimer = null;
let connected = false;
let confirmationData = null;

const $ = id => document.getElementById(id);
const $$ = selector => [...document.querySelectorAll(selector)];

const sections = {
  configuracao: ["Configuração", "Configure a conexão e os parâmetros do processo."],
  processo: ["Processo de backup", "Acompanhe cada etapa e o estado da execução."],
  historico: ["Histórico", "Consulte as execuções realizadas pela plataforma."]
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function showMessage(text, type = "success") {
  const el = $("globalMessage");
  el.textContent = text;
  el.className = `message ${type}`;
}

function clearMessage() {
  $("globalMessage").className = "message hidden";
}

function navigate(section) {
  $$(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.section === section));
  $$(".section").forEach(el => el.classList.toggle("active-section", el.id === section));
  $("pageTitle").textContent = sections[section][0];
  $("pageDescription").textContent = sections[section][1];
  if (section === "historico") carregarHistorico();
}

function setConnectionState(ok, text = "") {
  connected = ok;
  const dotClass = ok ? "online" : "offline";
  $("sideDot").className = `dot ${dotClass}`;
  $("topDot").className = `dot ${dotClass}`;
  $("sideConnection").textContent = ok ? "Banco conectado" : "Não conectado";
  $("topConnection").textContent = ok ? (text || "Banco conectado") : "Banco desconectado";
  $("connectionStatus").textContent = ok ? "Conexão validada" : "Aguardando teste";
}

function getDbConfig() {
  return {
    host: $("dbHost").value.trim(),
    port: Number($("dbPort").value),
    database: $("database").value.trim(),
    user: $("dbUser").value.trim(),
    password: $("dbPassword").value
  };
}

function getBackupConfig() {
  const db = getDbConfig();
  return {
    ...db,
    mainPath: $("mainPath").value.trim(),
    secondaryPath: $("secondaryPath").value.trim() || null,
    encrypt: $("encrypt").checked,
    compress: $("compress").checked,
    retention: Number($("retention").value),
    forceMaintenance: $("forceMaintenance").checked
  };
}

function validateDb(db) {
  if (!db.host || !Number.isInteger(db.port) || db.port < 1 || db.port > 65535 ||
      !db.database || !db.user || !db.password) {
    throw new Error("Preencha host, porta, banco, usuário e senha.");
  }
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.mensagem || data.message || `Erro HTTP ${response.status}`);
  return data;
}

$$(".nav-item").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.section)));

$("togglePassword").addEventListener("click", () => {
  const input = $("dbPassword");
  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  $("togglePassword").textContent = visible ? "Mostrar" : "Ocultar";
});

$("testConnection").addEventListener("click", async () => {
  clearMessage();
  const btn = $("testConnection");
  btn.disabled = true;
  $("connectionStatus").textContent = "Testando...";
  $("sideDot").className = "dot loading";
  $("topDot").className = "dot loading";

  try {
    const db = getDbConfig();
    validateDb(db);
    const response = await fetch(`${API_URL}/api/conexao/testar`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(db)
    });
    const data = await readJson(response);
    setConnectionState(true, `${db.database} conectado`);
    showMessage(`Conexão realizada com sucesso. ${data.total ?? 0} registro(s) encontrado(s) em veiculos.`, "success");
  } catch (err) {
    setConnectionState(false);
    showMessage(`Não foi possível conectar: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
  }
});

function openModal(id) { $(id).classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }

$$("[data-close]").forEach(btn => btn.addEventListener("click", () => closeModal(btn.dataset.close)));
$$(".modal-overlay").forEach(overlay => overlay.addEventListener("click", e => {
  if (e.target === overlay) closeModal(overlay.id);
}));

$("startBackup").addEventListener("click", () => {
  clearMessage();
  try {
    const data = getBackupConfig();
    validateDb(data);
    if (!data.mainPath) throw new Error("Informe o diretório principal do backup.");
    if (!Number.isInteger(data.retention) || data.retention < 1) throw new Error("A retenção deve ser um inteiro maior que zero.");

    confirmationData = data;
    $("confirmationDetails").innerHTML = `
      <div><span>Banco</span><strong>${escapeHtml(data.database)}</strong></div>
      <div><span>Destino</span><strong>${escapeHtml(data.mainPath)}</strong></div>
      <div><span>Retenção</span><strong>${data.retention} backup(s)</strong></div>
      <div><span>Proteção</span><strong>${data.encrypt ? "AES" : "Sem AES"}${data.compress ? " + ZIP" : ""}</strong></div>
    `;
    openModal("confirmationModal");
  } catch (err) {
    showMessage(err.message, "error");
  }
});

$("confirmBackup").addEventListener("click", iniciarBackup);

async function iniciarBackup() {
  if (!confirmationData) return;
  const btn = $("confirmBackup");
  btn.disabled = true;
  closeModal("confirmationModal");
  navigate("processo");
  resetProcess();
  showMessage("Enviando solicitação de backup para o servidor...", "warning");

  try {
    const data = confirmationData;
    const response = await fetch(`${API_URL}/api/backup`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        host: data.host, port: data.port, database: data.database, user: data.user,
        password: data.password, diretorioPrincipal: data.mainPath,
        diretorioSecundario: data.secondaryPath, criptografar: data.encrypt,
        compactar: data.compress, quantidade: data.retention,
        forcarManutencao: data.forceMaintenance
      })
    });
    const result = await readJson(response);
    currentJobId = result.jobId;
    $("jobIdLabel").textContent = `ID do processo: ${currentJobId}`;
    appendLiveLog(`Processo iniciado. ID: ${currentJobId}`);
    startPolling(currentJobId);
  } catch (err) {
    setProcessBadge("error", "Falha");
    appendLiveLog(`ERRO: ${err.message}`);
    showMessage(err.message, "error");
  } finally {
    btn.disabled = false;
    confirmationData = null;
  }
}

function resetProcess() {
  $("progressBar").style.width = "0%";
  $("progressPercent").textContent = "0%";
  $("progressText").textContent = "Preparando execução";
  $("jobIdLabel").textContent = "Iniciando novo processo...";
  $("liveLog").innerHTML = "";
  setProcessBadge("idle", "Aguardando");
  $$(".process-step").forEach(step => {
    step.classList.remove("active","done","error");
    step.querySelector("small").textContent = "Aguardando";
  });
}

function appendLiveLog(text) {
  const el = $("liveLog");
  const time = new Date().toLocaleTimeString("pt-BR");
  const line = document.createElement("div");
  line.textContent = `[${time}] ${text}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function setProcessBadge(type, text) {
  $("processStatusBadge").className = `status-badge ${type}`;
  $("processStatusBadge").textContent = text;
}

function normalizeStep(etapa) {
  const e = String(etapa || "").toUpperCase();
  if (e.includes("VALID")) return "connection";
  if (e.includes("MANUT")) return "maintenance";
  if (e.includes("BACKUP")) return "backup";
  if (e.includes("CRIP") || e.includes("COMPACT")) return "security";
  if (e.includes("COPIA")) return "copy";
  if (e.includes("RETEN") || e.includes("FINAL")) return "retention";
  return null;
}

function updateSteps(job) {
  const order = ["connection","maintenance","backup","security","copy","retention"];
  const current = normalizeStep(job.etapa);
  const currentIndex = order.indexOf(current);

  $$(".process-step").forEach(step => {
    const key = step.dataset.step;
    const idx = order.indexOf(key);
    const small = step.querySelector("small");
    step.classList.remove("active","done","error");

    if (job.status === "FALHA" && key === current) {
      step.classList.add("error");
      small.textContent = "Falhou";
    } else if (job.status === "CONCLUIDO" || (currentIndex >= 0 && idx < currentIndex)) {
      step.classList.add("done");
      small.textContent = "Concluído";
    } else if (key === current) {
      step.classList.add("active");
      small.textContent = job.mensagem || "Executando";
    } else {
      small.textContent = "Aguardando";
    }
  });
}

function renderJobLogs(logs) {
  if (!Array.isArray(logs)) return;
  $("liveLog").innerHTML = "";
  if (!logs.length) {
    appendLiveLog("Nenhum evento registrado ainda.");
    return;
  }
  logs.forEach(log => {
    const time = log.data_hora ? new Date(log.data_hora).toLocaleTimeString("pt-BR") : new Date().toLocaleTimeString("pt-BR");
    const line = document.createElement("div");
    line.textContent = `[${time}] [${log.etapa || "SISTEMA"}] ${log.mensagem || ""}`;
    $("liveLog").appendChild(line);
  });
  $("liveLog").scrollTop = $("liveLog").scrollHeight;
}

function updateJob(job) {
  const pct = Math.max(0, Math.min(100, Number(job.progresso || 0)));
  $("progressBar").style.width = `${pct}%`;
  $("progressPercent").textContent = `${pct}%`;
  $("progressText").textContent = job.mensagem || "Executando...";
  updateSteps(job);
  if (job.logs) renderJobLogs(job.logs);

  if (job.status === "CONCLUIDO") {
    setProcessBadge("success", "Concluído");
    showMessage("Processo concluído com sucesso.", "success");
    stopPolling();
  } else if (job.status === "FALHA") {
    setProcessBadge("error", "Falha");
    showMessage(job.erro || job.mensagem || "O processo de backup falhou.", "error");
    stopPolling();
  } else {
    setProcessBadge("running", "Executando");
  }
}

function startPolling(jobId) {
  stopPolling();
  pollStatus(jobId);
  statusTimer = setInterval(() => pollStatus(jobId), 700);
}

function stopPolling() {
  if (statusTimer) clearInterval(statusTimer);
  statusTimer = null;
}

async function pollStatus(jobId) {
  try {
    const response = await fetch(`${API_URL}/api/backup/status/${encodeURIComponent(jobId)}`);
    const data = await readJson(response);
    if (data.job) updateJob(data.job);
  } catch (err) {
    console.error("Erro ao consultar status:", err);
  }
}

$("refreshHistory").addEventListener("click", carregarHistorico);

async function carregarHistorico() {
  $("historyTable").innerHTML = `<tr><td colspan="7" class="empty">Carregando histórico...</td></tr>`;
  try {
    const response = await fetch(`${API_URL}/api/historico`);
    const data = await readJson(response);
    const history = Array.isArray(data.historico) ? data.historico : (Array.isArray(data) ? data : []);

    $("statTotal").textContent = history.length;
    $("statSuccess").textContent = history.filter(x => x.status === "SUCESSO").length;
    $("statFail").textContent = history.filter(x => x.status === "FALHA").length;

    if (!history.length) {
      $("historyTable").innerHTML = `<tr><td colspan="7" class="empty">Nenhuma execução registrada.</td></tr>`;
      return;
    }

    $("historyTable").innerHTML = history.map(exec => {
      const status = String(exec.status || "").toUpperCase();
      const statusClass = status === "SUCESSO" ? "success" : status === "FALHA" ? "error" : "running";
      const statusText = status === "SUCESSO" ? "Sucesso" : status === "FALHA" ? "Falha" : status;
      const maintenance = exec.regra_manutencao || exec.manutencao_status || "-";
      const canRestore = status === "SUCESSO" && exec.arquivo_backup;
      return `<tr>
        <td>${formatDate(exec.data_inicio)}</td>
        <td>${escapeHtml(exec.banco_dados || "-")}</td>
        <td>${escapeHtml(exec.operacao || "BACKUP")}</td>
        <td>${escapeHtml(maintenance)}</td>
        <td>${formatDuration(exec.duracao)}</td>
        <td><span class="result ${statusClass}">${escapeHtml(statusText)}</span></td>
        <td><div class="table-actions">
          <button class="table-btn" data-log="${escapeHtml(exec.id)}">Log</button>
          ${canRestore ? `<button class="table-btn" data-restore="${escapeHtml(exec.id)}">Restaurar</button>` : ""}
        </div></td>
      </tr>`;
    }).join("");

    $$("[data-log]").forEach(btn => btn.addEventListener("click", () => abrirLog(btn.dataset.log)));
    $$("[data-restore]").forEach(btn => btn.addEventListener("click", () => abrirRestauracao(btn.dataset.restore)));
  } catch (err) {
    $("historyTable").innerHTML = `<tr><td colspan="7" class="empty">Erro ao carregar histórico.</td></tr>`;
    $("statTotal").textContent = $("statSuccess").textContent = $("statFail").textContent = "—";
    console.error(err);
  }
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("pt-BR");
}

function formatDuration(value) {
  if (value == null) return "-";
  if (typeof value === "object") {
    const days = Number(value.days || 0), hours = Number(value.hours || 0);
    const minutes = Number(value.minutes || 0), seconds = Number(value.seconds || 0);
    const totalHours = days * 24 + hours;
    if (totalHours) return `${totalHours}h ${minutes}min`;
    if (minutes) return `${minutes}min ${seconds.toFixed(1)}s`;
    return `${seconds.toFixed(1)}s`;
  }
  const text = String(value);
  const m = text.match(/(\d+):(\d+):([\d.]+)/);
  if (!m) return text;
  const h = Number(m[1]), min = Number(m[2]), sec = Number(m[3]);
  if (h) return `${h}h ${min}min`;
  if (min) return `${min}min ${sec.toFixed(1)}s`;
  return `${sec.toFixed(1)}s`;
}

async function abrirLog(executionId) {
  $("logDetails").innerHTML = "Carregando...";
  openModal("logModal");
  try {
    const response = await fetch(`${API_URL}/api/historico/${encodeURIComponent(executionId)}/logs`);
    const data = await readJson(response);
    const logs = Array.isArray(data.logs) ? data.logs : [];
    if (!logs.length) {
      $("logDetails").textContent = "Nenhum log registrado.";
      return;
    }
    $("logDetails").innerHTML = logs.map(log => {
      const time = log.data_hora ? new Date(log.data_hora).toLocaleTimeString("pt-BR") : "--:--:--";
      const level = String(log.nivel || "INFO").toLowerCase();
      return `<div class="log-entry">
        <span>${escapeHtml(time)}</span>
        <span>[${escapeHtml(log.etapa || "SISTEMA")}]</span>
        <span class="level ${level}">${escapeHtml(log.mensagem || "")}</span>
      </div>`;
    }).join("");
  } catch (err) {
    $("logDetails").textContent = `Não foi possível carregar o log: ${err.message}`;
  }
}

async function abrirRestauracao(executionId) {
  $("restoreExecutionId").textContent = executionId;
  $("restoreStatus").className = "message hidden";
  $("restoreStatus").textContent = "";

  $("restoreHost").value = $("dbHost").value.trim();
  $("restorePort").value = $("dbPort").value;
  $("restoreDatabase").value = $("database").value.trim();
  $("restoreUser").value = $("dbUser").value.trim();
  $("restorePassword").value = $("dbPassword").value;

  try {
    const response = await fetch(`${API_URL}/api/historico`);
    const data = await readJson(response);
    const history = Array.isArray(data.historico) ? data.historico : [];
    const exec = history.find(x => String(x.id) === String(executionId));
    $("restoreBackupFile").textContent = exec?.arquivo_backup || "-";
    const protection = [];
    if (exec?.criptografado) protection.push("AES");
    if (exec?.compactado) protection.push("ZIP");
    $("restoreBackupProtection").textContent = protection.length ? protection.join(" + ") : "Nenhuma";
  } catch {
    $("restoreBackupFile").textContent = "-";
    $("restoreBackupProtection").textContent = "-";
  }

  openModal("restoreModal");
}

$("confirmRestore").addEventListener("click", async () => {
  const id = $("restoreExecutionId").textContent;
  const payload = {
    execucaoId: id,
    host: $("restoreHost").value.trim(),
    port: Number($("restorePort").value),
    database: $("restoreDatabase").value.trim(),
    user: $("restoreUser").value.trim(),
    password: $("restorePassword").value
  };

  if (!payload.host || !Number.isInteger(payload.port) || !payload.database || !payload.user || !payload.password) {
    $("restoreStatus").className = "message error";
    $("restoreStatus").textContent = "Preencha corretamente host, porta, banco, usuário e senha.";
    return;
  }

  if (!confirm(`Confirma a restauração da execução ${id} no banco "${payload.database}"?\n\nOs objetos existentes podem ser substituídos.`)) return;

  const btn = $("confirmRestore");
  btn.disabled = true;
  $("restoreStatus").className = "message warning";
  $("restoreStatus").textContent = "Restaurando backup. Aguarde...";

  try {
    const response = await fetch(`${API_URL}/api/backup/restaurar`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const data = await readJson(response);
    if (data.sucesso === false) throw new Error(data.mensagem || "Falha na restauração.");
    $("restoreStatus").className = "message success";
    $("restoreStatus").textContent = data.mensagem || "Backup restaurado com sucesso.";
  } catch (err) {
    $("restoreStatus").className = "message error";
    $("restoreStatus").textContent = `Falha: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});

window.addEventListener("keydown", e => {
  if (e.key === "Escape") $$(".modal-overlay:not(.hidden)").forEach(m => closeModal(m.id));
});

navigate("configuracao");
