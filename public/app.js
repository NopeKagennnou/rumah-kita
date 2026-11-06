/**
 * Rumah Kita — Interactive Frontend Controller
 *
 * Connects to the local Rumah Kita API to manage household finances,
 * smart home energy devices, kitchen/logistics inventory, community tasks,
 * and on-demand privacy leak scanning.
 */

const formatIdr = (num) => {
  const val = Number(num) || 0;
  const prefix = val < 0 ? '-Rp ' : 'Rp ';
  return prefix + Math.abs(val).toLocaleString('id-ID');
};

let currentDashboardData = null;

async function fetchDashboard() {
  const res = await fetch('/api/dashboard');
  if (!res.ok) throw new Error('Gagal memuat data dashboard');
  currentDashboardData = await res.json();
  renderAll(currentDashboardData);
}

function renderAll({ summary, state }) {
  // Header Meta
  document.getElementById('householdName').textContent = summary.meta.householdName || 'Rumah Kita';
  document.getElementById('communityUnit').textContent =
    `${summary.meta.communityUnit} — Platform Rumah Tangga, Smart Home & Komunitas`;

  // KPI Finance
  document.getElementById('kpiBalance').textContent = formatIdr(summary.finance.balance);
  document.getElementById('kpiIncome').textContent = formatIdr(summary.finance.totalIncome);
  document.getElementById('kpiExpense').textContent = formatIdr(summary.finance.totalExpense);
  document.getElementById('savingsRateTag').textContent = `Rasio Kas ${summary.finance.savingsRatePercent}%`;

  // KPI Energy
  document.getElementById('kpiWatts').textContent = `${summary.energy.currentLoadWatts} W`;
  document.getElementById('activeDevicesTag').textContent =
    `${summary.energy.activeDevicesCount}/${summary.energy.totalDevices} Aktif`;
  document.getElementById('kpiMonthlyKwh').textContent = `${summary.energy.estimatedMonthlyKwh} kWh/bln`;
  document.getElementById('kpiElectricityCost').textContent =
    formatIdr(summary.energy.estimatedMonthlyElectricityCostIdr);

  // KPI Inventory
  document.getElementById('kpiInventoryCount').textContent = `${summary.inventory.totalSkus} Komoditas`;
  const lowStockTag = document.getElementById('lowStockTag');
  const lowStockList = document.getElementById('kpiLowStockList');
  if (summary.inventory.lowStockCount > 0) {
    lowStockTag.textContent = `${summary.inventory.lowStockCount} Perlu Restock`;
    lowStockList.textContent = `Stok menipis: ${summary.inventory.lowStockItems.join(', ')}`;
  } else {
    lowStockTag.textContent = 'Stok Aman';
    lowStockList.textContent = 'Semua kebutuhan pokok mencukupi';
  }

  // KPI Tasks
  document.getElementById('kpiPendingTasks').textContent = `${summary.tasks.pendingCount} Agenda Aktif`;
  document.getElementById('completedTasksTag').textContent = `${summary.tasks.completedCount} Selesai`;

  // Transactions Table
  const tbody = document.getElementById('transactionsTableBody');
  tbody.innerHTML = '';
  for (const trx of state.transactions) {
    const tr = document.createElement('tr');
    const isPositive = Number(trx.amount) >= 0;
    tr.innerHTML = `
      <td>${trx.date}</td>
      <td><strong>${escapeHtml(trx.title)}</strong></td>
      <td>${escapeHtml(trx.category)}</td>
      <td>${escapeHtml(trx.member)}</td>
      <td class="text-right ${isPositive ? 'amt-positive' : 'amt-negative'}">
        ${isPositive ? '+' : ''}${formatIdr(trx.amount)}
      </td>
    `;
    tbody.appendChild(tr);
  }

  // Smart Home Devices
  const devContainer = document.getElementById('devicesContainer');
  devContainer.innerHTML = '';
  for (const dev of state.devices) {
    const isOn = dev.status === 'ON';
    const card = document.createElement('div');
    card.className = `device-card ${isOn ? 'device-on' : ''}`;
    card.innerHTML = `
      <div class="device-top">
        <div>
          <div class="device-name">${escapeHtml(dev.name)}</div>
          <div class="device-room">${escapeHtml(dev.room)} &bull; ${escapeHtml(dev.type)}</div>
        </div>
        <button class="btn-mini" data-toggle-device="${dev.id}">
          ${isOn ? 'ON' : 'OFF'}
        </button>
      </div>
      <div class="device-meta">
        <span>Daya: <strong>${dev.watts} W</strong></span>
        <span> Rata-rata: ${dev.dailyHours} jam/hari</span>
      </div>
    `;
    devContainer.appendChild(card);
  }

  // Inventory List
  const invContainer = document.getElementById('inventoryContainer');
  invContainer.innerHTML = '';
  for (const item of state.inventory) {
    const isLow = item.quantity <= item.minThreshold;
    const row = document.createElement('div');
    row.className = 'inventory-item';
    row.innerHTML = `
      <div>
        <div><strong>${escapeHtml(item.item)}</strong> ${isLow ? '<span style="color:#fb7185;font-size:0.75rem;">(Restock)</span>' : ''}</div>
        <div style="font-size:0.78rem;color:#94a3b8;">Kategori: ${escapeHtml(item.category)} &bull; Min: ${item.minThreshold} ${escapeHtml(item.unit)}</div>
      </div>
      <div class="inv-controls">
        <button class="btn-mini" data-inv-id="${item.id}" data-inv-delta="-1">-</button>
        <span><strong>${item.quantity}</strong> ${escapeHtml(item.unit)}</span>
        <button class="btn-mini" data-inv-id="${item.id}" data-inv-delta="1">+</button>
      </div>
    `;
    invContainer.appendChild(row);
  }

  // Tasks List
  const tasksContainer = document.getElementById('tasksContainer');
  tasksContainer.innerHTML = '';
  for (const task of state.tasks) {
    const row = document.createElement('div');
    row.className = 'task-item';
    row.innerHTML = `
      <div class="${task.completed ? 'task-done' : ''}">
        <div><strong>${escapeHtml(task.title)}</strong></div>
        <div style="font-size:0.78rem;color:#94a3b8;">PIC: ${escapeHtml(task.assignee)} &bull; Prioritas: ${escapeHtml(task.priority)} &bull; Target: ${task.dueDate}</div>
      </div>
      <button class="btn-mini" data-toggle-task="${task.id}">
        ${task.completed ? 'Selesai ✓' : 'Tandai Selesai'}
      </button>
    `;
    tasksContainer.appendChild(row);
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Event Listeners
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('trxTitle').value.trim();
  const category = document.getElementById('trxCategory').value;
  const amount = Number(document.getElementById('trxAmount').value);
  const member = document.getElementById('trxMember').value.trim();

  if (!title || !amount) return;

  await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, category, amount, member })
  });

  document.getElementById('trxTitle').value = '';
  document.getElementById('trxAmount').value = '';
  await fetchDashboard();
});

document.getElementById('devicesContainer').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-toggle-device]');
  if (!btn) return;
  const deviceId = btn.getAttribute('data-toggle-device');
  await fetch(`/api/devices/${encodeURIComponent(deviceId)}/toggle`, { method: 'POST' });
  await fetchDashboard();
});

document.getElementById('inventoryContainer').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-inv-id]');
  if (!btn) return;
  const itemId = btn.getAttribute('data-inv-id');
  const delta = Number(btn.getAttribute('data-inv-delta'));
  await fetch(`/api/inventory/${encodeURIComponent(itemId)}/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta })
  });
  await fetchDashboard();
});

document.getElementById('taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('taskTitle').value.trim();
  const assignee = document.getElementById('taskAssignee').value.trim();
  const priority = document.getElementById('taskPriority').value;
  if (!title) return;

  await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, assignee, priority })
  });
  document.getElementById('taskTitle').value = '';
  await fetchDashboard();
});

document.getElementById('tasksContainer').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-toggle-task]');
  if (!btn) return;
  const taskId = btn.getAttribute('data-toggle-task');
  await fetch(`/api/tasks/${encodeURIComponent(taskId)}/toggle`, { method: 'POST' });
  await fetchDashboard();
});

document.getElementById('runPrivacyScanBtn').addEventListener('click', async () => {
  const text = document.getElementById('privacyTestInput').value;
  const statusEl = document.getElementById('privacyScanResult');
  const res = await fetch('/api/privacy/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  const data = await res.json();
  if (data.clean) {
    statusEl.textContent = '✓ Aman! Tidak ditemukan path device lokal atau kredensial rahasia.';
    statusEl.style.color = '#34d399';
  } else {
    const types = data.findings.map((f) => `${f.type} (${f.count}x)`).join(', ');
    statusEl.textContent = `⚠ Terdeteksi data sensitif yang otomatis disensor oleh Privacy Guard: ${types}`;
    statusEl.style.color = '#fb7185';
  }
});

document.getElementById('exportSanitizedBtn').addEventListener('click', () => {
  if (!currentDashboardData) return;
  const blob = new Blob([JSON.stringify(currentDashboardData.state, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rumah-kita-sanitized-export.json';
  a.click();
  URL.revokeObjectURL(url);
});

fetchDashboard();
