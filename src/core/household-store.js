/**
 * Rumah Kita — Core Household, Smart Home & Community (RT/RW) Store Engine
 *
 * Provides deterministic, thread-safe in-memory and optional JSON file-backed
 * persistence for:
 *  1. Household Finance & Budget Tracking (Pemasukan, Pengeluaran, Kas Rumah/RT)
 *  2. Smart Home & IoT Device Energy Management (Lampu, AC, CCTV, Solar Panel, Meteran)
 *  3. Inventory & Pantry Tracking (Stok Kebutuhan Rumah Tangga)
 *  4. Community & Family Tasks / Announcements (Jadwal Piket, Kerja Bakti, Pengumuman)
 *
 * @module core/household-store
 * @license MIT
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { sanitizeObject, auditStringPrivacy } from './privacy-sanitizer.js';

export const DEFAULT_SEED_DATA = {
  meta: {
    appName: 'Rumah Kita',
    version: '1.2.0',
    householdName: 'Rumah Kita Bersama',
    communityUnit: 'RT 04 / RW 08 Nusantara',
    currency: 'IDR',
    privacyMode: 'STRICT_LOCAL_FIRST'
  },
  transactions: [
    {
      id: 'trx-001',
      title: 'Iuran Kas Bulanan Keluarga & RT',
      category: 'Income',
      amount: 5500000,
      date: '2026-11-01',
      member: 'Bendahara Rumah',
      notes: 'Alokasi anggaran operasional bulanan rumah tangga'
    },
    {
      id: 'trx-002',
      title: 'Tagihan Listrik PLN & Token Smart Meter',
      category: 'Utilities',
      amount: -650000,
      date: '2026-11-02',
      member: 'Sistem Otomatis',
      notes: 'Pemakaian 442 kWh bulan berjalan'
    },
    {
      id: 'trx-003',
      title: 'Belanja Bulanan Sembako & Dapur',
      category: 'Groceries',
      amount: -1250000,
      date: '2026-11-03',
      member: 'Ibu Rumah Tangga',
      notes: 'Beras 25kg, minyak goreng, sayur, dan kebutuhan pokok'
    },
    {
      id: 'trx-004',
      title: 'Internet Fiber Optik & Keamanan CCTV Lingkungan',
      category: 'Utilities',
      amount: -420000,
      date: '2026-11-04',
      member: 'Admin Teknis',
      notes: 'Paket 150 Mbps + Cloud Backup Lokal'
    },
    {
      id: 'trx-005',
      title: 'Kontribusi Dana Sosial & Kebersihan Lingkungan',
      category: 'Community',
      amount: -180000,
      date: '2026-11-05',
      member: 'Koordinator Warga',
      notes: 'Iuran sampah, keamanan malam, dan kas darurat'
    }
  ],
  devices: [
    {
      id: 'dev-001',
      name: 'Smart LED Ruang Keluarga',
      room: 'Ruang Utama',
      type: 'Lighting',
      status: 'ON',
      watts: 18,
      dailyHours: 6.5
    },
    {
      id: 'dev-002',
      name: 'AC Inverter Kamar Utama',
      room: 'Kamar Tidur',
      type: 'Climate',
      status: 'ON',
      watts: 420,
      dailyHours: 8.0
    },
    {
      id: 'dev-003',
      name: 'CCTV Gerbang Depan (AI Local Node)',
      room: 'Area Luar',
      type: 'Security',
      status: 'ON',
      watts: 12,
      dailyHours: 24.0
    },
    {
      id: 'dev-004',
      name: 'Kulkas Smart 2 Pintu',
      room: 'Dapur',
      type: 'Appliance',
      status: 'ON',
      watts: 95,
      dailyHours: 24.0
    },
    {
      id: 'dev-005',
      name: 'Pompa Air Otomatis & Filter',
      room: 'Area Belakang',
      type: 'Utility',
      status: 'OFF',
      watts: 250,
      dailyHours: 1.5
    },
    {
      id: 'dev-006',
      name: 'Lampu Taman Solar Sensor',
      room: 'Taman Depan',
      type: 'Lighting',
      status: 'OFF',
      watts: 15,
      dailyHours: 11.0
    }
  ],
  inventory: [
    {
      id: 'inv-001',
      item: 'Beras Premium',
      category: 'Pangan Pokok',
      quantity: 18,
      minThreshold: 5,
      unit: 'kg',
      updatedAt: '2026-11-05'
    },
    {
      id: 'inv-002',
      item: 'Air Galon Mineral',
      category: 'Minuman',
      quantity: 4,
      minThreshold: 2,
      unit: 'galon',
      updatedAt: '2026-11-05'
    },
    {
      id: 'inv-003',
      item: 'Minyak Goreng',
      category: 'Dapur',
      quantity: 2,
      minThreshold: 2,
      unit: 'liter',
      updatedAt: '2026-11-04'
    },
    {
      id: 'inv-004',
      item: 'Kotak P3K & Obat Darurat',
      category: 'Kesehatan',
      quantity: 1,
      minThreshold: 1,
      unit: 'set',
      updatedAt: '2026-11-01'
    },
    {
      id: 'inv-005',
      item: 'Tabung Gas LPG 12kg',
      category: 'Dapur',
      quantity: 1,
      minThreshold: 2,
      unit: 'tabung',
      updatedAt: '2026-11-05'
    }
  ],
  tasks: [
    {
      id: 'tsk-001',
      title: 'Pemeriksaan Rutin Instalasi Listrik & Panel Surya',
      assignee: 'Teknisi Rumah',
      priority: 'High',
      dueDate: '2026-11-10',
      completed: false
    },
    {
      id: 'tsk-002',
      title: 'Kerja Bakti & Pembersihan Saluran Air Lingkungan',
      assignee: 'Seluruh Anggota',
      priority: 'Medium',
      dueDate: '2026-11-08',
      completed: false
    },
    {
      id: 'tsk-003',
      title: 'Rekapitulasi Laporan Kas Bulanan Oktober',
      assignee: 'Bendahara Rumah',
      priority: 'Low',
      dueDate: '2026-11-02',
      completed: true
    }
  ]
};

export class HouseholdStore {
  /**
   * @param {{ filePath?: string | null }} [options]
   */
  constructor(options = {}) {
    this.filePath = options.filePath || null;
    this.state = structuredClone(DEFAULT_SEED_DATA);
    if (this.filePath) {
      this._loadFromDisk();
    }
  }

  _loadFromDisk() {
    try {
      if (this.filePath && fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.state = sanitizeObject(parsed);
      }
    } catch {
      this.state = structuredClone(DEFAULT_SEED_DATA);
    }
  }

  _saveToDisk() {
    if (!this.filePath) return;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const safeState = sanitizeObject(this.state);
    fs.writeFileSync(this.filePath, JSON.stringify(safeState, null, 2), 'utf8');
  }

  /**
   * Computes real-time financial, energy, inventory, and task metrics.
   */
  getDashboardSummary() {
    const transactions = this.state.transactions || [];
    let totalIncome = 0;
    let totalExpense = 0;

    for (const trx of transactions) {
      const amt = Number(trx.amount) || 0;
      if (amt >= 0) {
        totalIncome += amt;
      } else {
        totalExpense += Math.abs(amt);
      }
    }

    const balance = totalIncome - totalExpense;

    const devices = this.state.devices || [];
    const activeDevices = devices.filter((d) => d.status === 'ON');
    const currentWatts = activeDevices.reduce((sum, d) => sum + (Number(d.watts) || 0), 0);
    const estimatedDailyWh = devices.reduce(
      (sum, d) => sum + (Number(d.watts) || 0) * (Number(d.dailyHours) || 0),
      0
    );
    const estimatedMonthlyKwh = Number(((estimatedDailyWh * 30) / 1000).toFixed(2));
    // Standard household tariff ~ IDR 1,444.70 / kWh
    const estimatedMonthlyElectricityCostIdr = Math.round(estimatedMonthlyKwh * 1444.7);

    const inventory = this.state.inventory || [];
    const lowStockItems = inventory.filter((item) => item.quantity <= item.minThreshold);

    const tasks = this.state.tasks || [];
    const pendingTasks = tasks.filter((t) => !t.completed);

    const serializedState = JSON.stringify(this.state);
    const privacyAudit = auditStringPrivacy(serializedState);

    return {
      meta: this.state.meta,
      finance: {
        totalIncome,
        totalExpense,
        balance,
        savingsRatePercent:
          totalIncome > 0 ? Number((((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1)) : 0,
        transactionCount: transactions.length
      },
      energy: {
        totalDevices: devices.length,
        activeDevicesCount: activeDevices.length,
        currentLoadWatts: currentWatts,
        estimatedMonthlyKwh,
        estimatedMonthlyElectricityCostIdr
      },
      inventory: {
        totalSkus: inventory.length,
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockItems.map((i) => i.item)
      },
      tasks: {
        totalTasks: tasks.length,
        pendingCount: pendingTasks.length,
        completedCount: tasks.length - pendingTasks.length
      },
      privacyStatus: {
        clean: privacyAudit.clean,
        findings: privacyAudit.findings,
        mode: 'LOCAL_FIRST_ZERO_TELEMETRY'
      }
    };
  }

  getState() {
    return sanitizeObject(this.state);
  }

  addTransaction({ title, category = 'General', amount, date, member = 'Anggota', notes = '' }) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new Error('Transaction title is required');
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount === 0) {
      throw new Error('Transaction amount must be a non-zero number');
    }

    const newTrx = sanitizeObject({
      id: `trx-${crypto.randomUUID().slice(0, 8)}`,
      title: title.trim(),
      category: String(category).trim(),
      amount: numericAmount,
      date: date || new Date().toISOString().slice(0, 10),
      member: String(member).trim(),
      notes: String(notes).trim()
    });

    this.state.transactions.unshift(newTrx);
    this._saveToDisk();
    return newTrx;
  }

  toggleDevice(deviceId) {
    const dev = this.state.devices.find((d) => d.id === deviceId);
    if (!dev) {
      throw new Error(`Device with id "${deviceId}" not found`);
    }
    dev.status = dev.status === 'ON' ? 'OFF' : 'ON';
    this._saveToDisk();
    return sanitizeObject(dev);
  }

  updateInventoryQuantity(itemId, delta) {
    const item = this.state.inventory.find((i) => i.id === itemId);
    if (!item) {
      throw new Error(`Inventory item with id "${itemId}" not found`);
    }
    const nextQty = Math.max(0, Number(item.quantity) + Number(delta));
    item.quantity = nextQty;
    item.updatedAt = new Date().toISOString().slice(0, 10);
    this._saveToDisk();
    return sanitizeObject(item);
  }

  addTask({ title, assignee = 'Semua Warga', priority = 'Medium', dueDate }) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new Error('Task title is required');
    }
    const newTask = sanitizeObject({
      id: `tsk-${crypto.randomUUID().slice(0, 8)}`,
      title: title.trim(),
      assignee: String(assignee).trim(),
      priority: ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium',
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      completed: false
    });
    this.state.tasks.unshift(newTask);
    this._saveToDisk();
    return newTask;
  }

  toggleTask(taskId) {
    const task = this.state.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task with id "${taskId}" not found`);
    }
    task.completed = !task.completed;
    this._saveToDisk();
    return sanitizeObject(task);
  }
}
