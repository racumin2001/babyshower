import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Define TypeScript interfaces
export interface EventConfig {
  date: string;
  time: string;
  locationName: string;
  locationAddress: string;
  locationNotes?: string;
  locationMapUrl: string;
  adminPassword?: string;
  organizerEmails?: string;
}

export interface RSVP {
  id: string;
  name: string;
  phone: string;
  email: string;
  guestsCount: number;
  isAttending: boolean;
  message: string;
  createdAt: string;
}

export interface Gift {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  reservedBy?: string | null;
  reservedAt?: string | null;
  reservedEmail?: string | null;
  reminderSent?: boolean;
}

// Initial/default gifts catalog
const BASE_GIFTS: Gift[] = [
  { id: '6', name: 'Juego de toallas con capucha', category: 'Baño e Higiene' },
  { id: '9', name: 'Juego de biberones anticólicos', category: 'Alimentación' },
  { id: '19', name: 'Set de cortaúñas y cepillo', category: 'Baño e Higiene' },
  { id: '22', name: 'Ropa de bebé (Pijamas o Enterizos 3-9m)', category: 'Ropa' },
  { id: '25', name: 'Mantas de bebé', category: 'Dormitorio' },
  { id: '26', name: 'Trenza anti golpes de cuna', category: 'Dormitorio' },
  { id: '27', name: 'Pañales de género', category: 'Cuidado' },
  { id: '28', name: 'Chupetes', category: 'Alimentación' },
  { id: '29', name: 'Juguetes, mordedor y sonajero', category: 'Estimulación' },
  { id: '30', name: 'Set de comida', category: 'Alimentación' },
];

const DEFAULT_GIFTS: Gift[] = [...BASE_GIFTS];

const REMOVED_GIFT_IDS = new Set(['1', '2', '3', '4', '5', '7', '10', '17', '18', '20', '21', '23', '24']);

const diaperSizes = [
  { code: 'RN', label: 'Talla RN (34-40 pañales)', count: 4 },
  { code: 'P', label: 'Talla P (50-56 pañales)', count: 12 },
  { code: 'M', label: 'Talla M (68-72 pañales)', count: 12 },
  { code: 'G', label: 'Talla G (56-60 pañales)', count: 15 },
  { code: 'WIPES', label: 'Toallitas Húmedas (Multipack x12)', count: 12 },
];

const carePacks = [
  { code: 'cream', label: 'Crema para coceduras', count: 4 },
  { code: 'shampoo', label: 'Shampoo para bebé', count: 4 },
  { code: 'balsam', label: 'Bálsamo para bebé', count: 4 },
];

diaperSizes.forEach(size => {
  const isWipes = size.code === 'WIPES';
  for (let i = 1; i <= size.count; i++) {
    DEFAULT_GIFTS.push({
      id: `diaper_${size.code.toLowerCase()}_${i}`,
      name: isWipes
        ? `${size.label} - Caja ${i}/${size.count}`
        : `Pañales ${size.label} - Paquete ${i}/${size.count}`,
      category: 'Pañales',
    });
  }
});

carePacks.forEach(pack => {
  for (let i = 1; i <= pack.count; i++) {
    DEFAULT_GIFTS.push({
      id: `diaper_${pack.code}_${i}`,
      name: `${pack.label} - Unidad ${i}/${pack.count}`,
      category: 'Pañales',
    });
  }
});

const DEFAULT_CONFIG: EventConfig = {
  date: '2026-10-03',
  time: '14:00 a 19:00 hs',
  locationName: 'Quinchos de la azotea',
  locationAddress: 'Bezanilla 1320, Independencia, Santiago',
  locationNotes: 'En el ascensor, marca PM',
  locationMapUrl: 'https://www.google.com/maps/search/?api=1&query=Bezanilla+1320+Independencia+Santiago',
  adminPassword: 'Mil140397#',
  organizerEmails: '',
};

export function formatEventLocation(config: Pick<EventConfig, 'locationName' | 'locationAddress' | 'locationNotes'>): string {
  const base = [config.locationName, config.locationAddress].filter(Boolean).join(', ');
  if (config.locationNotes) {
    return base ? `${base}. ${config.locationNotes}` : config.locationNotes;
  }
  return base || 'Por definir';
}

function applyConfigDefaults(config: EventConfig): { config: EventConfig; changed: boolean } {
  let changed = false;
  const next = { ...config };
  if (!next.date) {
    next.date = DEFAULT_CONFIG.date;
    changed = true;
  }
  if (!next.time || next.time === '14:00 hrs' || next.time === '14:00 Hrs') {
    next.time = DEFAULT_CONFIG.time;
    changed = true;
  }
  if (!next.locationName || next.locationName === 'Bezanilla 1320') {
    next.locationName = DEFAULT_CONFIG.locationName;
    changed = true;
  }
  if (!next.locationAddress || next.locationAddress === 'Independencia, Santiago') {
    next.locationAddress = DEFAULT_CONFIG.locationAddress;
    changed = true;
  }
  if (!next.locationNotes) {
    next.locationNotes = DEFAULT_CONFIG.locationNotes;
    changed = true;
  }
  if (!next.locationMapUrl) {
    next.locationMapUrl = DEFAULT_CONFIG.locationMapUrl;
    changed = true;
  }
  return { config: next, changed };
}

function applyCatalogUpdates(gifts: Gift[]): { gifts: Gift[]; changed: boolean } {
  const byId = new Map(gifts.map(gift => [gift.id, gift]));
  let changed = false;

  for (const id of REMOVED_GIFT_IDS) {
    if (byId.has(id)) {
      byId.delete(id);
      changed = true;
    }
  }

  for (const gift of [...byId.values()]) {
    if (gift.id.startsWith('diaper_cologne_')) {
      byId.delete(gift.id);
      changed = true;
    }
    if (!gift.id.startsWith('diaper_rn_')) continue;
    const index = Number(gift.id.replace('diaper_rn_', ''));
    if (index > 4 && !gift.reservedBy) {
      byId.delete(gift.id);
      changed = true;
    }
  }

  for (const desired of DEFAULT_GIFTS) {
    const existing = byId.get(desired.id);
    if (!existing) {
      byId.set(desired.id, { ...desired });
      changed = true;
      continue;
    }
    if (existing.name !== desired.name || existing.category !== desired.category) {
      existing.name = desired.name;
      existing.category = desired.category;
      changed = true;
    }
  }

  return { gifts: Array.from(byId.values()), changed };
}

// JSON database settings
const JSON_DB_DIR = path.join(process.cwd(), 'src', 'data');
const JSON_DB_PATH = path.join(JSON_DB_DIR, 'db.json');

interface Schema {
  config: EventConfig;
  rsvps: RSVP[];
  gifts: Gift[];
}

function initJsonDb(): Schema {
  if (!fs.existsSync(JSON_DB_DIR)) {
    fs.mkdirSync(JSON_DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(JSON_DB_PATH)) {
    const defaultData: Schema = {
      config: DEFAULT_CONFIG,
      rsvps: [],
      gifts: DEFAULT_GIFTS,
    };
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
  try {
    const content = fs.readFileSync(JSON_DB_PATH, 'utf-8');
    const parsed = JSON.parse(content);
    // Ensure structure is correct
    if (!parsed.config || !parsed.rsvps || !parsed.gifts) {
      throw new Error('Invalid structure');
    }
    let changed = false;
    if (parsed.config.adminPassword === 'admin123') {
      parsed.config.adminPassword = 'Mil140397#';
      changed = true;
    }
    const configSync = applyConfigDefaults(parsed.config);
    parsed.config = configSync.config;
    const catalogSync = applyCatalogUpdates(parsed.gifts);
    parsed.gifts = catalogSync.gifts;
    if (changed || configSync.changed || catalogSync.changed) {
      writeJsonDb(parsed);
    }
    return parsed;
  } catch (e) {
    const defaultData: Schema = {
      config: DEFAULT_CONFIG,
      rsvps: [],
      gifts: DEFAULT_GIFTS,
    };
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
}

function writeJsonDb(data: Schema) {
  if (!fs.existsSync(JSON_DB_DIR)) {
    fs.mkdirSync(JSON_DB_DIR, { recursive: true });
  }
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// PostgreSQL settings
let pool: Pool | null = null;
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

let isInitialized = false;

async function initPostgres() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bs_config (
      key VARCHAR(50) PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bs_rsvps (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      guests_count INTEGER NOT NULL DEFAULT 1,
      is_attending BOOLEAN NOT NULL DEFAULT TRUE,
      message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bs_gifts (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      image_url TEXT,
      reserved_by VARCHAR(255),
      reserved_at TIMESTAMP WITH TIME ZONE
    );
  `);

  // Add migrations for reserved_email and reminder_sent if they don't exist
  await pool.query(`
    ALTER TABLE bs_gifts ADD COLUMN IF NOT EXISTS reserved_email VARCHAR(255);
  `);
  await pool.query(`
    ALTER TABLE bs_gifts ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  // Seed default configuration if empty
  const configCheck = await pool.query('SELECT count(*) FROM bs_config');
  if (parseInt(configCheck.rows[0].count) === 0) {
    await pool.query('INSERT INTO bs_config (key, value) VALUES ($1, $2)', ['config_data', JSON.stringify(DEFAULT_CONFIG)]);
  } else {
    // If it exists but still has default password 'admin123', update it to 'Mil140397#'
    const existingConfigRes = await pool.query("SELECT value FROM bs_config WHERE key = 'config_data'");
    if (existingConfigRes.rows.length > 0) {
      try {
        const configData = JSON.parse(existingConfigRes.rows[0].value);
        let configChanged = false;
        if (configData.adminPassword === 'admin123') {
          configData.adminPassword = 'Mil140397#';
          configChanged = true;
        }
        const configSync = applyConfigDefaults(configData);
        if (configChanged || configSync.changed) {
          await pool.query("UPDATE bs_config SET value = $1 WHERE key = 'config_data'", [JSON.stringify(configSync.config)]);
        }
      } catch (e) {
        console.error('Error migrating event config:', e);
      }
    }
  }

  // Seed default gifts if empty, then sync catalog updates
  const giftsCheck = await pool.query('SELECT count(*) FROM bs_gifts');
  if (parseInt(giftsCheck.rows[0].count) === 0) {
    for (const g of DEFAULT_GIFTS) {
      await pool.query(
        'INSERT INTO bs_gifts (id, name, category, image_url, reserved_by, reserved_at, reserved_email, reminder_sent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [g.id, g.name, g.category, g.imageUrl || null, null, null, null, false]
      );
    }
  } else {
    await pool.query(
      `DELETE FROM bs_gifts
       WHERE id = ANY($1::varchar[])
         AND (reserved_by IS NULL OR reserved_by = '')`,
      [Array.from(REMOVED_GIFT_IDS)]
    );
    await pool.query(
      `DELETE FROM bs_gifts
       WHERE id LIKE 'diaper_rn_%'
         AND id NOT IN ('diaper_rn_1', 'diaper_rn_2', 'diaper_rn_3', 'diaper_rn_4')
         AND (reserved_by IS NULL OR reserved_by = '')`
    );
    await pool.query(
      `DELETE FROM bs_gifts
       WHERE id LIKE 'diaper_cologne_%'
         AND (reserved_by IS NULL OR reserved_by = '')`
    );
    for (const g of DEFAULT_GIFTS) {
      await pool.query(
        `INSERT INTO bs_gifts (id, name, category, image_url, reserved_by, reserved_at, reserved_email, reminder_sent)
         VALUES ($1, $2, $3, $4, NULL, NULL, NULL, FALSE)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category`,
        [g.id, g.name, g.category, g.imageUrl || null]
      );
    }
  }
}

async function ensureDbInitialized() {
  if (isInitialized) return;

  if (pool) {
    try {
      await initPostgres();
      isInitialized = true;
    } catch (err) {
      console.error('Failed to initialize Postgres, falling back to JSON local file.', err);
      pool = null; // force JSON fallback
      initJsonDb();
      isInitialized = true;
    }
  } else {
    initJsonDb();
    isInitialized = true;
  }
}

// Database helper API
export async function getConfig(): Promise<EventConfig> {
  await ensureDbInitialized();
  if (pool) {
    const res = await pool.query("SELECT value FROM bs_config WHERE key = 'config_data'");
    if (res.rows.length > 0) {
      const parsed = JSON.parse(res.rows[0].value);
      const synced = applyConfigDefaults(parsed);
      if (synced.changed) {
        await pool.query("UPDATE bs_config SET value = $1 WHERE key = 'config_data'", [JSON.stringify(synced.config)]);
      }
      return synced.config;
    }
    return DEFAULT_CONFIG;
  } else {
    const data = initJsonDb();
    return data.config;
  }
}

export async function saveConfig(config: EventConfig): Promise<void> {
  await ensureDbInitialized();
  if (pool) {
    await pool.query("UPDATE bs_config SET value = $1 WHERE key = 'config_data'", [JSON.stringify(config)]);
  } else {
    const data = initJsonDb();
    data.config = { ...data.config, ...config };
    writeJsonDb(data);
  }
}

export async function getRsvps(): Promise<RSVP[]> {
  await ensureDbInitialized();
  if (pool) {
    const res = await pool.query(`
      SELECT 
        id, 
        name, 
        phone, 
        email, 
        guests_count as "guestsCount", 
        is_attending as "isAttending", 
        message, 
        created_at as "createdAt" 
      FROM bs_rsvps 
      ORDER BY created_at DESC
    `);
    return res.rows.map(row => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  } else {
    const data = initJsonDb();
    return data.rsvps;
  }
}

export async function addRsvp(rsvp: Omit<RSVP, 'id' | 'createdAt'>): Promise<RSVP> {
  await ensureDbInitialized();
  const id = Math.random().toString(36).substr(2, 9);
  const createdAt = new Date().toISOString();
  const newRsvp: RSVP = { ...rsvp, id, createdAt };

  if (pool) {
    await pool.query(
      `INSERT INTO bs_rsvps (id, name, phone, email, guests_count, is_attending, message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        newRsvp.id,
        newRsvp.name,
        newRsvp.phone,
        newRsvp.email,
        newRsvp.guestsCount,
        newRsvp.isAttending,
        newRsvp.message,
        newRsvp.createdAt,
      ]
    );
  } else {
    const data = initJsonDb();
    data.rsvps.unshift(newRsvp);
    writeJsonDb(data);
  }

  return newRsvp;
}

export async function deleteRsvp(rsvpId: string): Promise<boolean> {
  await ensureDbInitialized();
  if (pool) {
    const res = await pool.query('DELETE FROM bs_rsvps WHERE id = $1', [rsvpId]);
    return (res.rowCount ?? 0) > 0;
  } else {
    const data = initJsonDb();
    const initialLength = data.rsvps.length;
    data.rsvps = data.rsvps.filter(r => r.id !== rsvpId);
    if (data.rsvps.length < initialLength) {
      writeJsonDb(data);
      return true;
    }
    return false;
  }
}

export async function getGifts(): Promise<Gift[]> {
  await ensureDbInitialized();
  if (pool) {
    const res = await pool.query(`
      SELECT 
        id, 
        name, 
        category, 
        image_url as "imageUrl", 
        reserved_by as "reservedBy", 
        reserved_at as "reservedAt",
        reserved_email as "reservedEmail",
        reminder_sent as "reminderSent"
      FROM bs_gifts 
      ORDER BY id ASC
    `);
    return res.rows.map(row => ({
      ...row,
      reservedAt: row.reservedAt ? row.reservedAt.toISOString() : null,
    }));
  } else {
    const data = initJsonDb();
    return data.gifts;
  }
}

export async function reserveGift(giftId: string, reservedBy: string, reservedEmail: string): Promise<boolean> {
  await ensureDbInitialized();
  if (pool) {
    // Only update if currently not reserved (reserved_by IS NULL or '')
    const res = await pool.query(
      `UPDATE bs_gifts 
       SET reserved_by = $1, reserved_email = $2, reserved_at = NOW(), reminder_sent = FALSE 
       WHERE id = $3 AND (reserved_by IS NULL OR reserved_by = '')`,
      [reservedBy, reservedEmail, giftId]
    );
    return (res.rowCount ?? 0) > 0;
  } else {
    const data = initJsonDb();
    const gift = data.gifts.find(g => g.id === giftId);
    if (gift && !gift.reservedBy) {
      gift.reservedBy = reservedBy;
      gift.reservedEmail = reservedEmail;
      gift.reservedAt = new Date().toISOString();
      gift.reminderSent = false;
      writeJsonDb(data);
      return true;
    }
    return false;
  }
}

export async function unreserveGift(giftId: string): Promise<boolean> {
  await ensureDbInitialized();
  if (pool) {
    const res = await pool.query(
      `UPDATE bs_gifts 
       SET reserved_by = NULL, reserved_email = NULL, reserved_at = NULL, reminder_sent = FALSE 
       WHERE id = $1`,
      [giftId]
    );
    return (res.rowCount ?? 0) > 0;
  } else {
    const data = initJsonDb();
    const gift = data.gifts.find(g => g.id === giftId);
    if (gift) {
      gift.reservedBy = null;
      gift.reservedEmail = null;
      gift.reservedAt = null;
      gift.reminderSent = false;
      writeJsonDb(data);
      return true;
    }
    return false;
  }
}

export async function addGift(gift: Omit<Gift, 'id'>): Promise<Gift> {
  await ensureDbInitialized();
  const id = Math.random().toString(36).substr(2, 9);
  const newGift: Gift = { ...gift, id, reservedBy: null, reservedAt: null, reservedEmail: null, reminderSent: false };

  if (pool) {
    await pool.query(
      `INSERT INTO bs_gifts (id, name, category, image_url, reserved_by, reserved_at, reserved_email, reminder_sent)
       VALUES ($1, $2, $3, $4, NULL, NULL, NULL, FALSE)`,
      [newGift.id, newGift.name, newGift.category, newGift.imageUrl || null]
    );
  } else {
    const data = initJsonDb();
    data.gifts.push(newGift);
    writeJsonDb(data);
  }

  return newGift;
}

export async function deleteGift(giftId: string): Promise<boolean> {
  await ensureDbInitialized();
  if (pool) {
    const res = await pool.query('DELETE FROM bs_gifts WHERE id = $1', [giftId]);
    return (res.rowCount ?? 0) > 0;
  } else {
    const data = initJsonDb();
    const initialLength = data.gifts.length;
    data.gifts = data.gifts.filter(g => g.id !== giftId);
    if (data.gifts.length < initialLength) {
      writeJsonDb(data);
      return true;
    }
    return false;
  }
}

export async function markReminderSent(giftId: string): Promise<boolean> {
  await ensureDbInitialized();
  if (pool) {
    const res = await pool.query('UPDATE bs_gifts SET reminder_sent = TRUE WHERE id = $1', [giftId]);
    return (res.rowCount ?? 0) > 0;
  } else {
    const data = initJsonDb();
    const gift = data.gifts.find(g => g.id === giftId);
    if (gift) {
      gift.reminderSent = true;
      writeJsonDb(data);
      return true;
    }
    return false;
  }
}
