
// ═══════════════════════════════════════════════════════════════
//   WordWeft Pro — IndexedDB Service Layer
//   All data is persisted client-side. No backend required.
// ═══════════════════════════════════════════════════════════════

import type {
  ProProject, ProVolume, ProChapter, ProScene,
  ProCharacter, ProRelation, ProWorldEntry, ProMap,
  ProEditorSettings, ProProjectBible
} from '../types/pro';

const DB_NAME = 'wordweft_pro';
const DB_VERSION = 1;

// ─── Store Names ─────────────────────────────────────────────
const STORES = {
  projects:    'pro_projects',
  volumes:     'pro_volumes',
  chapters:    'pro_chapters',
  scenes:      'pro_scenes',
  characters:  'pro_characters',
  relations:   'pro_relations',
  worldEntries:'pro_world_entries',
  maps:        'pro_maps',
} as const;

// ─── Default Settings ─────────────────────────────────────────
export const DEFAULT_EDITOR_SETTINGS: ProEditorSettings = {
  theme: 'dark',
  font: 'Literata',
  fontSize: 18,
  lineHeight: 1.8,
  sidePadding: 80,
  typewriterMode: false,
  focusMode: 'none',
  autoSaveInterval: 2000,
  showWordCount: true,
  showStatus: true,
};

export const DEFAULT_BIBLE: ProProjectBible = {
  worldRules: '',
  seriesNotes: '',
  thematicStatement: '',
  logline: '',
  synopsis: '',
};

// ─── Open / Init DB ──────────────────────────────────────────
let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      // Create stores with indexes
      if (!db.objectStoreNames.contains(STORES.projects)) {
        db.createObjectStore(STORES.projects, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.volumes)) {
        const vs = db.createObjectStore(STORES.volumes, { keyPath: 'id' });
        vs.createIndex('projectId', 'projectId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.chapters)) {
        const cs = db.createObjectStore(STORES.chapters, { keyPath: 'id' });
        cs.createIndex('volumeId', 'volumeId', { unique: false });
        cs.createIndex('projectId', 'projectId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.scenes)) {
        const ss = db.createObjectStore(STORES.scenes, { keyPath: 'id' });
        ss.createIndex('chapterId', 'chapterId', { unique: false });
        ss.createIndex('projectId', 'projectId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.characters)) {
        const chs = db.createObjectStore(STORES.characters, { keyPath: 'id' });
        chs.createIndex('projectId', 'projectId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.relations)) {
        const rs = db.createObjectStore(STORES.relations, { keyPath: 'id' });
        rs.createIndex('projectId', 'projectId', { unique: false });
        rs.createIndex('sourceId', 'sourceId', { unique: false });
        rs.createIndex('targetId', 'targetId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.worldEntries)) {
        const ws = db.createObjectStore(STORES.worldEntries, { keyPath: 'id' });
        ws.createIndex('projectId', 'projectId', { unique: false });
        ws.createIndex('type', 'type', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.maps)) {
        const ms = db.createObjectStore(STORES.maps, { keyPath: 'id' });
        ms.createIndex('projectId', 'projectId', { unique: false });
      }
    };

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

// ─── Generic Helpers ─────────────────────────────────────────
function nanoid(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function tx(db: IDBDatabase, store: string, mode: IDBTransactionMode = 'readonly') {
  return db.transaction([store], mode).objectStore(store);
}

function getAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function getByIndex<T>(store: IDBObjectStore, indexName: string, value: IDBValidKey): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = store.index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function getOne<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

function putOne<T>(store: IDBObjectStore, item: T): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

function deleteOne(store: IDBObjectStore, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ═══════════════════════════════════════════════════════════════
//   PROJECT CRUD
// ═══════════════════════════════════════════════════════════════

async function createProject(data: Partial<ProProject>): Promise<ProProject> {
  const db = await openDB();
  const now = new Date().toISOString();
  const project: ProProject = {
    id: nanoid(),
    title: data.title || 'Untitled Project',
    subtitle: data.subtitle,
    genre: data.genre || [],
    coverUrl: data.coverUrl,
    createdAt: now,
    updatedAt: now,
    bible: data.bible || { ...DEFAULT_BIBLE },
    settings: data.settings || { ...DEFAULT_EDITOR_SETTINGS },
    wordCountGoal: data.wordCountGoal,
    ownerId: data.ownerId,
  };
  return putOne<ProProject>(tx(db, STORES.projects, 'readwrite'), project);
}

async function getAllProjects(): Promise<ProProject[]> {
  const db = await openDB();
  const all = await getAll<ProProject>(tx(db, STORES.projects));
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function getProject(id: string): Promise<ProProject | null> {
  const db = await openDB();
  return getOne<ProProject>(tx(db, STORES.projects), id);
}

async function updateProject(id: string, patch: Partial<ProProject>): Promise<ProProject | null> {
  const db = await openDB();
  const existing = await getOne<ProProject>(tx(db, STORES.projects), id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
  return putOne<ProProject>(tx(db, STORES.projects, 'readwrite'), updated);
}

async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  // Cascade delete all related data
  await deleteOne(tx(db, STORES.projects, 'readwrite'), id);
  const volumes = await getByIndex<ProVolume>(tx(db, STORES.volumes), 'projectId', id);
  for (const vol of volumes) await deleteVolume(vol.id);
  const chars = await getByIndex<ProCharacter>(tx(db, STORES.characters), 'projectId', id);
  for (const c of chars) await deleteOne(tx(db, STORES.characters, 'readwrite'), c.id);
  const rels = await getByIndex<ProRelation>(tx(db, STORES.relations), 'projectId', id);
  for (const r of rels) await deleteOne(tx(db, STORES.relations, 'readwrite'), r.id);
  const entries = await getByIndex<ProWorldEntry>(tx(db, STORES.worldEntries), 'projectId', id);
  for (const e of entries) await deleteOne(tx(db, STORES.worldEntries, 'readwrite'), e.id);
  const maps = await getByIndex<ProMap>(tx(db, STORES.maps), 'projectId', id);
  for (const m of maps) await deleteOne(tx(db, STORES.maps, 'readwrite'), m.id);
}

// ═══════════════════════════════════════════════════════════════
//   VOLUME CRUD
// ═══════════════════════════════════════════════════════════════

async function createVolume(data: Partial<ProVolume> & { projectId: string }): Promise<ProVolume> {
  const db = await openDB();
  const now = new Date().toISOString();
  const existing = await getByIndex<ProVolume>(tx(db, STORES.volumes), 'projectId', data.projectId);
  const volume: ProVolume = {
    id: nanoid(),
    projectId: data.projectId,
    title: data.title || `Volume ${existing.length + 1}`,
    subtitle: data.subtitle,
    order: data.order ?? existing.length,
    synopsis: data.synopsis,
    coverUrl: data.coverUrl,
    wordCountGoal: data.wordCountGoal,
    status: data.status || 'drafting',
    createdAt: now,
    updatedAt: now,
  };
  return putOne<ProVolume>(tx(db, STORES.volumes, 'readwrite'), volume);
}

async function getVolumesByProject(projectId: string): Promise<ProVolume[]> {
  const db = await openDB();
  const all = await getByIndex<ProVolume>(tx(db, STORES.volumes), 'projectId', projectId);
  return all.sort((a, b) => a.order - b.order);
}

async function updateVolume(id: string, patch: Partial<ProVolume>): Promise<ProVolume | null> {
  const db = await openDB();
  const existing = await getOne<ProVolume>(tx(db, STORES.volumes), id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
  return putOne<ProVolume>(tx(db, STORES.volumes, 'readwrite'), updated);
}

async function reorderVolumes(projectId: string, orderedIds: string[]): Promise<void> {
  const db = await openDB();
  for (let i = 0; i < orderedIds.length; i++) {
    const ex = await getOne<ProVolume>(tx(db, STORES.volumes), orderedIds[i]);
    if (ex) await putOne(tx(db, STORES.volumes, 'readwrite'), { ...ex, order: i, updatedAt: new Date().toISOString() });
  }
}

async function deleteVolume(id: string): Promise<void> {
  const db = await openDB();
  await deleteOne(tx(db, STORES.volumes, 'readwrite'), id);
  const chapters = await getByIndex<ProChapter>(tx(db, STORES.chapters), 'volumeId', id);
  for (const ch of chapters) await deleteChapter(ch.id);
}

// ═══════════════════════════════════════════════════════════════
//   CHAPTER CRUD
// ═══════════════════════════════════════════════════════════════

async function createChapter(data: Partial<ProChapter> & { volumeId: string; projectId: string }): Promise<ProChapter> {
  const db = await openDB();
  const now = new Date().toISOString();
  const existing = await getByIndex<ProChapter>(tx(db, STORES.chapters), 'volumeId', data.volumeId);
  const chapter: ProChapter = {
    id: nanoid(),
    volumeId: data.volumeId,
    projectId: data.projectId,
    title: data.title || `Chapter ${existing.length + 1}`,
    order: data.order ?? existing.length,
    synopsis: data.synopsis,
    status: data.status || 'outline',
    pov: data.pov,
    color: data.color || null,
    wordCountGoal: data.wordCountGoal,
    createdAt: now,
    updatedAt: now,
  };
  return putOne<ProChapter>(tx(db, STORES.chapters, 'readwrite'), chapter);
}

async function getChaptersByVolume(volumeId: string): Promise<ProChapter[]> {
  const db = await openDB();
  const all = await getByIndex<ProChapter>(tx(db, STORES.chapters), 'volumeId', volumeId);
  return all.sort((a, b) => a.order - b.order);
}

async function updateChapter(id: string, patch: Partial<ProChapter>): Promise<ProChapter | null> {
  const db = await openDB();
  const existing = await getOne<ProChapter>(tx(db, STORES.chapters), id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
  return putOne<ProChapter>(tx(db, STORES.chapters, 'readwrite'), updated);
}

async function reorderChapters(volumeId: string, orderedIds: string[]): Promise<void> {
  const db = await openDB();
  for (let i = 0; i < orderedIds.length; i++) {
    const ex = await getOne<ProChapter>(tx(db, STORES.chapters), orderedIds[i]);
    if (ex) await putOne(tx(db, STORES.chapters, 'readwrite'), { ...ex, order: i, updatedAt: new Date().toISOString() });
  }
}

async function deleteChapter(id: string): Promise<void> {
  const db = await openDB();
  await deleteOne(tx(db, STORES.chapters, 'readwrite'), id);
  const scenes = await getByIndex<ProScene>(tx(db, STORES.scenes), 'chapterId', id);
  for (const s of scenes) await deleteOne(tx(db, STORES.scenes, 'readwrite'), s.id);
}

// ═══════════════════════════════════════════════════════════════
//   SCENE CRUD
// ═══════════════════════════════════════════════════════════════

async function createScene(data: Partial<ProScene> & { chapterId: string; volumeId: string; projectId: string }): Promise<ProScene> {
  const db = await openDB();
  const now = new Date().toISOString();
  const existing = await getByIndex<ProScene>(tx(db, STORES.scenes), 'chapterId', data.chapterId);
  const scene: ProScene = {
    id: nanoid(),
    chapterId: data.chapterId,
    volumeId: data.volumeId,
    projectId: data.projectId,
    title: data.title || `Scene ${existing.length + 1}`,
    order: data.order ?? existing.length,
    content: data.content || '',
    synopsis: data.synopsis,
    goal: data.goal,
    conflict: data.conflict,
    disaster: data.disaster,
    emotionalShift: data.emotionalShift,
    emotionStart: data.emotionStart,
    emotionEnd: data.emotionEnd,
    beatType: data.beatType || 'none',
    pov: data.pov,
    settingId: data.settingId,
    worldTime: data.worldTime,
    characterIds: data.characterIds || [],
    locationIds: data.locationIds || [],
    wordCount: data.wordCount || 0,
    status: data.status || 'empty',
    paragraphTags: data.paragraphTags || [],
    createdAt: now,
    updatedAt: now,
  };
  return putOne<ProScene>(tx(db, STORES.scenes, 'readwrite'), scene);
}

async function getScenesByChapter(chapterId: string): Promise<ProScene[]> {
  const db = await openDB();
  const all = await getByIndex<ProScene>(tx(db, STORES.scenes), 'chapterId', chapterId);
  return all.sort((a, b) => a.order - b.order);
}

async function getScene(id: string): Promise<ProScene | null> {
  const db = await openDB();
  return getOne<ProScene>(tx(db, STORES.scenes), id);
}

async function updateScene(id: string, patch: Partial<ProScene>): Promise<ProScene | null> {
  const db = await openDB();
  const existing = await getOne<ProScene>(tx(db, STORES.scenes), id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
  return putOne<ProScene>(tx(db, STORES.scenes, 'readwrite'), updated);
}

async function reorderScenes(chapterId: string, orderedIds: string[]): Promise<void> {
  const db = await openDB();
  for (let i = 0; i < orderedIds.length; i++) {
    const ex = await getOne<ProScene>(tx(db, STORES.scenes), orderedIds[i]);
    if (ex) await putOne(tx(db, STORES.scenes, 'readwrite'), { ...ex, order: i, updatedAt: new Date().toISOString() });
  }
}

async function deleteScene(id: string): Promise<void> {
  const db = await openDB();
  await deleteOne(tx(db, STORES.scenes, 'readwrite'), id);
}

// ═══════════════════════════════════════════════════════════════
//   CHARACTER CRUD
// ═══════════════════════════════════════════════════════════════

async function createCharacter(data: Partial<ProCharacter> & { projectId: string }): Promise<ProCharacter> {
  const db = await openDB();
  const now = new Date().toISOString();
  const char: ProCharacter = {
    id: nanoid(),
    projectId: data.projectId,
    name: data.name || 'Unnamed Character',
    role: data.role || 'supporting',
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  return putOne<ProCharacter>(tx(db, STORES.characters, 'readwrite'), char);
}

async function getCharactersByProject(projectId: string): Promise<ProCharacter[]> {
  const db = await openDB();
  const all = await getByIndex<ProCharacter>(tx(db, STORES.characters), 'projectId', projectId);
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

async function getCharacter(id: string): Promise<ProCharacter | null> {
  const db = await openDB();
  return getOne<ProCharacter>(tx(db, STORES.characters), id);
}

async function updateCharacter(id: string, patch: Partial<ProCharacter>): Promise<ProCharacter | null> {
  const db = await openDB();
  const existing = await getOne<ProCharacter>(tx(db, STORES.characters), id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
  return putOne<ProCharacter>(tx(db, STORES.characters, 'readwrite'), updated);
}

async function deleteCharacter(id: string): Promise<void> {
  const db = await openDB();
  // Get character to find projectId
  const char = await getOne<ProCharacter>(tx(db, STORES.characters), id);
  await deleteOne(tx(db, STORES.characters, 'readwrite'), id);
  // Cascade: delete all relations involving this character
  if (char) {
    const rels = await getByIndex<ProRelation>(tx(db, STORES.relations), 'projectId', char.projectId);
    for (const r of rels) {
      if (r.sourceId === id || r.targetId === id) {
        await deleteOne(tx(db, STORES.relations, 'readwrite'), r.id);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//   RELATION CRUD
// ═══════════════════════════════════════════════════════════════

async function createRelation(data: Partial<ProRelation> & { projectId: string; sourceId: string; targetId: string }): Promise<ProRelation> {
  const db = await openDB();
  const rel: ProRelation = {
    id: nanoid(),
    projectId: data.projectId,
    sourceId: data.sourceId,
    targetId: data.targetId,
    label: data.label || 'Related to',
    nature: data.nature || 'social',
    isBidirectional: data.isBidirectional ?? true,
    startDate: data.startDate,
    endDate: data.endDate,
    notes: data.notes,
    strength: data.strength || 1,
    createdAt: new Date().toISOString(),
  };
  return putOne<ProRelation>(tx(db, STORES.relations, 'readwrite'), rel);
}

async function getAllRelationsByProject(projectId: string): Promise<ProRelation[]> {
  const db = await openDB();
  if (!projectId) return getAll<ProRelation>(tx(db, STORES.relations));
  return getByIndex<ProRelation>(tx(db, STORES.relations), 'projectId', projectId);
}

async function updateRelation(id: string, patch: Partial<ProRelation>): Promise<ProRelation | null> {
  const db = await openDB();
  const existing = await getOne<ProRelation>(tx(db, STORES.relations), id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id };
  return putOne<ProRelation>(tx(db, STORES.relations, 'readwrite'), updated);
}

async function deleteRelation(id: string): Promise<void> {
  const db = await openDB();
  await deleteOne(tx(db, STORES.relations, 'readwrite'), id);
}

// ═══════════════════════════════════════════════════════════════
//   WORLD ENTRY CRUD
// ═══════════════════════════════════════════════════════════════

async function createWorldEntry(data: Partial<ProWorldEntry> & { projectId: string }): Promise<ProWorldEntry> {
  const db = await openDB();
  const now = new Date().toISOString();
  const entry: ProWorldEntry = {
    id: nanoid(),
    projectId: data.projectId,
    type: data.type || 'lore',
    title: data.title || 'Untitled Entry',
    content: data.content || '',
    imageUrl: data.imageUrl,
    tags: data.tags || [],
    linkedCharacterIds: data.linkedCharacterIds || [],
    linkedEntryIds: data.linkedEntryIds || [],
    mapPins: data.mapPins || [],
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  return putOne<ProWorldEntry>(tx(db, STORES.worldEntries, 'readwrite'), entry);
}

async function getWorldEntriesByProject(projectId: string): Promise<ProWorldEntry[]> {
  const db = await openDB();
  const all = await getByIndex<ProWorldEntry>(tx(db, STORES.worldEntries), 'projectId', projectId);
  return all.sort((a, b) => a.title.localeCompare(b.title));
}

async function getWorldEntry(id: string): Promise<ProWorldEntry | null> {
  const db = await openDB();
  return getOne<ProWorldEntry>(tx(db, STORES.worldEntries), id);
}

async function updateWorldEntry(id: string, patch: Partial<ProWorldEntry>): Promise<ProWorldEntry | null> {
  const db = await openDB();
  const existing = await getOne<ProWorldEntry>(tx(db, STORES.worldEntries), id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
  return putOne<ProWorldEntry>(tx(db, STORES.worldEntries, 'readwrite'), updated);
}

async function deleteWorldEntry(id: string): Promise<void> {
  const db = await openDB();
  await deleteOne(tx(db, STORES.worldEntries, 'readwrite'), id);
}

// ═══════════════════════════════════════════════════════════════
//   MAP CRUD
// ═══════════════════════════════════════════════════════════════

async function createMap(data: Partial<ProMap> & { projectId: string; imageUrl: string }): Promise<ProMap> {
  const db = await openDB();
  const now = new Date().toISOString();
  const map: ProMap = {
    id: nanoid(),
    projectId: data.projectId,
    title: data.title || 'Untitled Map',
    imageUrl: data.imageUrl,
    imageWidth: data.imageWidth,
    imageHeight: data.imageHeight,
    scale: data.scale,
    pins: data.pins || [],
    createdAt: now,
    updatedAt: now,
  };
  return putOne<ProMap>(tx(db, STORES.maps, 'readwrite'), map);
}

async function getMapsByProject(projectId: string): Promise<ProMap[]> {
  const db = await openDB();
  return getByIndex<ProMap>(tx(db, STORES.maps), 'projectId', projectId);
}

async function updateMap(id: string, patch: Partial<ProMap>): Promise<ProMap | null> {
  const db = await openDB();
  const existing = await getOne<ProMap>(tx(db, STORES.maps), id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
  return putOne<ProMap>(tx(db, STORES.maps, 'readwrite'), updated);
}

async function deleteMap(id: string): Promise<void> {
  const db = await openDB();
  await deleteOne(tx(db, STORES.maps, 'readwrite'), id);
}

// ─── Word Count Aggregation ───────────────────────────────────
export async function getProjectWordCount(projectId: string): Promise<number> {
  const db = await openDB();
  const scenes = await getByIndex<ProScene>(tx(db, STORES.scenes), 'projectId', projectId);
  return scenes.reduce((sum, s) => sum + (s.wordCount || 0), 0);
}

export async function getVolumeWordCount(volumes: ProVolume[], chapters: ProChapter[], scenes: ProScene[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const vol of volumes) {
    const volChapters = chapters.filter(c => c.volumeId === vol.id);
    const volScenes = scenes.filter(s => volChapters.some(c => c.id === s.chapterId));
    result[vol.id] = volScenes.reduce((sum, s) => sum + (s.wordCount || 0), 0);
  }
  return result;
}

// ─── Exported API Surface ─────────────────────────────────────
export const proDb = {
  projects: {
    create: createProject,
    getAll: getAllProjects,
    get: getProject,
    update: updateProject,
    delete: deleteProject,
  },
  volumes: {
    create: createVolume,
    getByProject: getVolumesByProject,
    update: updateVolume,
    reorder: reorderVolumes,
    delete: deleteVolume,
  },
  chapters: {
    create: createChapter,
    getByVolume: getChaptersByVolume,
    update: updateChapter,
    reorder: reorderChapters,
    delete: deleteChapter,
  },
  scenes: {
    create: createScene,
    getByChapter: getScenesByChapter,
    get: getScene,
    update: updateScene,
    reorder: reorderScenes,
    delete: deleteScene,
  },
  characters: {
    create: createCharacter,
    getByProject: getCharactersByProject,
    get: getCharacter,
    update: updateCharacter,
    delete: deleteCharacter,
  },
  relations: {
    create: createRelation,
    getByProject: getAllRelationsByProject,
    update: updateRelation,
    delete: deleteRelation,
  },
  worldEntries: {
    create: createWorldEntry,
    getByProject: getWorldEntriesByProject,
    get: getWorldEntry,
    update: updateWorldEntry,
    delete: deleteWorldEntry,
  },
  maps: {
    create: createMap,
    getByProject: getMapsByProject,
    update: updateMap,
    delete: deleteMap,
  },
};
