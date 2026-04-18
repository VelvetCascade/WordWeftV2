
// ═══════════════════════════════════════════════════════════════
//   WordWeft Pro — Studio Context
//   Global state for all Pro entities + CRUD dispatchers + autosave
// ═══════════════════════════════════════════════════════════════

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { proDb } from '../utils/proDb';
import type {
  ProProject, ProVolume, ProChapter, ProScene,
  ProCharacter, ProRelation, ProWorldEntry, ProMap, ProStudioState
} from '../types/pro';

// ─── Context Shape ────────────────────────────────────────────
interface ProStudioContextValue extends ProStudioState {
  // Project
  loadProjects: () => Promise<void>;
  createProject: (data: Partial<ProProject>) => Promise<ProProject>;
  updateProject: (id: string, patch: Partial<ProProject>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setActiveProject: (project: ProProject | null) => void;
  openProject: (projectId: string) => Promise<void>;

  // Volume
  createVolume: (data: Partial<ProVolume> & { projectId: string }) => Promise<ProVolume>;
  updateVolume: (id: string, patch: Partial<ProVolume>) => Promise<void>;
  deleteVolume: (id: string) => Promise<void>;
  reorderVolumes: (projectId: string, orderedIds: string[]) => Promise<void>;

  // Chapter
  createChapter: (data: Partial<ProChapter> & { volumeId: string; projectId: string }) => Promise<ProChapter>;
  updateChapter: (id: string, patch: Partial<ProChapter>) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;
  reorderChapters: (volumeId: string, orderedIds: string[]) => Promise<void>;

  // Scene
  createScene: (data: Partial<ProScene> & { chapterId: string; volumeId: string; projectId: string }) => Promise<ProScene>;
  updateScene: (id: string, patch: Partial<ProScene>) => Promise<void>;
  deleteScene: (id: string) => Promise<void>;
  reorderScenes: (chapterId: string, orderedIds: string[]) => Promise<void>;
  setActiveScene: (sceneId: string | null) => void;

  // Characters
  characters: ProCharacter[];
  createCharacter: (data: Partial<ProCharacter> & { projectId: string }) => Promise<ProCharacter>;
  updateCharacter: (id: string, patch: Partial<ProCharacter>) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;

  // Relations
  relations: ProRelation[];
  createRelation: (data: Partial<ProRelation> & { projectId: string; sourceId: string; targetId: string }) => Promise<ProRelation>;
  updateRelation: (id: string, patch: Partial<ProRelation>) => Promise<void>;
  deleteRelation: (id: string) => Promise<void>;

  // World Entries
  worldEntries: ProWorldEntry[];
  createWorldEntry: (data: Partial<ProWorldEntry> & { projectId: string }) => Promise<ProWorldEntry>;
  updateWorldEntry: (id: string, patch: Partial<ProWorldEntry>) => Promise<void>;
  deleteWorldEntry: (id: string) => Promise<void>;

  // Maps
  maps: ProMap[];
  createMap: (data: Partial<ProMap> & { projectId: string; imageUrl: string }) => Promise<ProMap>;
  updateMap: (id: string, patch: Partial<ProMap>) => Promise<void>;
  deleteMap: (id: string) => Promise<void>;

  // UI
  toggleBinder: () => void;
  toggleInspector: () => void;
  setInspectorTab: (tab: ProStudioState['inspectorTab']) => void;
  toggleBinderNode: (id: string) => void;
  setActiveChapter: (chapterId: string | null) => void;
  setActiveVolume: (volumeId: string | null) => void;
}

// ─── Initial State ────────────────────────────────────────────
const initialState: Omit<ProStudioState, never> & {
  characters: ProCharacter[];
  relations: ProRelation[];
  worldEntries: ProWorldEntry[];
  maps: ProMap[];
} = {
  projects: [],
  activeProject: null,
  volumes: [],
  chapters: [],
  scenes: [],
  activeVolumeId: null,
  activeChapterId: null,
  activeSceneId: null,
  binderExpanded: {},
  inspectorTab: 'scene',
  binderCollapsed: false,
  inspectorCollapsed: false,
  isSaving: false,
  lastSavedAt: null,
  characters: [],
  relations: [],
  worldEntries: [],
  maps: [],
};

// ─── Action Types ─────────────────────────────────────────────
type Action =
  | { type: 'SET_PROJECTS'; payload: ProProject[] }
  | { type: 'SET_ACTIVE_PROJECT'; payload: ProProject | null }
  | { type: 'SET_VOLUMES'; payload: ProVolume[] }
  | { type: 'SET_CHAPTERS'; payload: ProChapter[] }
  | { type: 'SET_SCENES'; payload: ProScene[] }
  | { type: 'SET_CHARACTERS'; payload: ProCharacter[] }
  | { type: 'SET_RELATIONS'; payload: ProRelation[] }
  | { type: 'SET_WORLD_ENTRIES'; payload: ProWorldEntry[] }
  | { type: 'SET_MAPS'; payload: ProMap[] }
  | { type: 'SET_ACTIVE_VOLUME'; payload: string | null }
  | { type: 'SET_ACTIVE_CHAPTER'; payload: string | null }
  | { type: 'SET_ACTIVE_SCENE'; payload: string | null }
  | { type: 'TOGGLE_BINDER_NODE'; payload: string }
  | { type: 'TOGGLE_BINDER' }
  | { type: 'TOGGLE_INSPECTOR' }
  | { type: 'SET_INSPECTOR_TAB'; payload: ProStudioState['inspectorTab'] }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_LAST_SAVED'; payload: string }
  | { type: 'UPSERT_PROJECT'; payload: ProProject }
  | { type: 'REMOVE_PROJECT'; payload: string }
  | { type: 'UPSERT_VOLUME'; payload: ProVolume }
  | { type: 'REMOVE_VOLUME'; payload: string }
  | { type: 'UPSERT_CHAPTER'; payload: ProChapter }
  | { type: 'REMOVE_CHAPTER'; payload: string }
  | { type: 'UPSERT_SCENE'; payload: ProScene }
  | { type: 'REMOVE_SCENE'; payload: string }
  | { type: 'UPSERT_CHARACTER'; payload: ProCharacter }
  | { type: 'REMOVE_CHARACTER'; payload: string }
  | { type: 'UPSERT_RELATION'; payload: ProRelation }
  | { type: 'REMOVE_RELATION'; payload: string }
  | { type: 'UPSERT_WORLD_ENTRY'; payload: ProWorldEntry }
  | { type: 'REMOVE_WORLD_ENTRY'; payload: string }
  | { type: 'UPSERT_MAP'; payload: ProMap }
  | { type: 'REMOVE_MAP'; payload: string };

// ─── Reducer ──────────────────────────────────────────────────
function reducer(state: typeof initialState, action: Action): typeof initialState {
  function upsert<T extends { id: string }>(arr: T[], item: T): T[] {
    const idx = arr.findIndex(x => x.id === item.id);
    if (idx >= 0) { const next = [...arr]; next[idx] = item; return next; }
    return [...arr, item];
  }
  function remove<T extends { id: string }>(arr: T[], id: string): T[] {
    return arr.filter(x => x.id !== id);
  }

  switch (action.type) {
    case 'SET_PROJECTS':      return { ...state, projects: action.payload };
    case 'SET_ACTIVE_PROJECT': return { ...state, activeProject: action.payload };
    case 'SET_VOLUMES':       return { ...state, volumes: action.payload };
    case 'SET_CHAPTERS':      return { ...state, chapters: action.payload };
    case 'SET_SCENES':        return { ...state, scenes: action.payload };
    case 'SET_CHARACTERS':    return { ...state, characters: action.payload };
    case 'SET_RELATIONS':     return { ...state, relations: action.payload };
    case 'SET_WORLD_ENTRIES': return { ...state, worldEntries: action.payload };
    case 'SET_MAPS':          return { ...state, maps: action.payload };
    case 'SET_ACTIVE_VOLUME': return { ...state, activeVolumeId: action.payload };
    case 'SET_ACTIVE_CHAPTER':return { ...state, activeChapterId: action.payload };
    case 'SET_ACTIVE_SCENE':  return { ...state, activeSceneId: action.payload };
    case 'TOGGLE_BINDER_NODE':
      return { ...state, binderExpanded: { ...state.binderExpanded, [action.payload]: !state.binderExpanded[action.payload] } };
    case 'TOGGLE_BINDER':     return { ...state, binderCollapsed: !state.binderCollapsed };
    case 'TOGGLE_INSPECTOR':  return { ...state, inspectorCollapsed: !state.inspectorCollapsed };
    case 'SET_INSPECTOR_TAB': return { ...state, inspectorTab: action.payload };
    case 'SET_SAVING':        return { ...state, isSaving: action.payload };
    case 'SET_LAST_SAVED':    return { ...state, lastSavedAt: action.payload, isSaving: false };
    case 'UPSERT_PROJECT':    return { ...state, projects: upsert(state.projects, action.payload) };
    case 'REMOVE_PROJECT':    return { ...state, projects: remove(state.projects, action.payload) };
    case 'UPSERT_VOLUME':     return { ...state, volumes: upsert(state.volumes, action.payload).sort((a,b) => a.order - b.order) };
    case 'REMOVE_VOLUME':     return { ...state, volumes: remove(state.volumes, action.payload) };
    case 'UPSERT_CHAPTER':    return { ...state, chapters: upsert(state.chapters, action.payload).sort((a,b) => a.order - b.order) };
    case 'REMOVE_CHAPTER':    return { ...state, chapters: remove(state.chapters, action.payload) };
    case 'UPSERT_SCENE':      return { ...state, scenes: upsert(state.scenes, action.payload).sort((a,b) => a.order - b.order) };
    case 'REMOVE_SCENE':      return { ...state, scenes: remove(state.scenes, action.payload) };
    case 'UPSERT_CHARACTER':  return { ...state, characters: upsert(state.characters, action.payload) };
    case 'REMOVE_CHARACTER':  return { ...state, characters: remove(state.characters, action.payload) };
    case 'UPSERT_RELATION':   return { ...state, relations: upsert(state.relations, action.payload) };
    case 'REMOVE_RELATION':   return { ...state, relations: remove(state.relations, action.payload) };
    case 'UPSERT_WORLD_ENTRY':return { ...state, worldEntries: upsert(state.worldEntries, action.payload) };
    case 'REMOVE_WORLD_ENTRY':return { ...state, worldEntries: remove(state.worldEntries, action.payload) };
    case 'UPSERT_MAP':        return { ...state, maps: upsert(state.maps, action.payload) };
    case 'REMOVE_MAP':        return { ...state, maps: remove(state.maps, action.payload) };
    default: return state;
  }
}

// ─── Context ──────────────────────────────────────────────────
const ProStudioContext = createContext<ProStudioContextValue | null>(null);

export const useProStudio = (): ProStudioContextValue => {
  const ctx = useContext(ProStudioContext);
  if (!ctx) throw new Error('useProStudio must be used inside ProStudioProvider');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────
export const ProStudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load all projects ──────────────────────────────────────
  const loadProjects = useCallback(async () => {
    const projects = await proDb.projects.getAll();
    dispatch({ type: 'SET_PROJECTS', payload: projects });
  }, []);

  // ── Open a fully-hydrated project ─────────────────────────
  const openProject = useCallback(async (projectId: string) => {
    const project = await proDb.projects.get(projectId);
    if (!project) return;
    dispatch({ type: 'SET_ACTIVE_PROJECT', payload: project });

    const [volumes, chars, rels, entries, maps] = await Promise.all([
      proDb.volumes.getByProject(projectId),
      proDb.characters.getByProject(projectId),
      proDb.relations.getByProject(projectId),
      proDb.worldEntries.getByProject(projectId),
      proDb.maps.getByProject(projectId),
    ]);

    dispatch({ type: 'SET_VOLUMES', payload: volumes });
    dispatch({ type: 'SET_CHARACTERS', payload: chars });
    dispatch({ type: 'SET_RELATIONS', payload: rels });
    dispatch({ type: 'SET_WORLD_ENTRIES', payload: entries });
    dispatch({ type: 'SET_MAPS', payload: maps });

    // Load all chapters across all volumes
    const allChapters: ProChapter[] = [];
    for (const vol of volumes) {
      const chs = await proDb.chapters.getByVolume(vol.id);
      allChapters.push(...chs);
    }
    dispatch({ type: 'SET_CHAPTERS', payload: allChapters });

    // Load all scenes across all chapters
    const allScenes: ProScene[] = [];
    for (const ch of allChapters) {
      const scs = await proDb.scenes.getByChapter(ch.id);
      allScenes.push(...scs);
    }
    dispatch({ type: 'SET_SCENES', payload: allScenes });

    // Auto-expand the first volume in the binder
    if (volumes.length > 0) {
      dispatch({ type: 'TOGGLE_BINDER_NODE', payload: volumes[0].id });
      dispatch({ type: 'SET_ACTIVE_VOLUME', payload: volumes[0].id });
    }
  }, []);

  // ── Project CRUD ──────────────────────────────────────────
  const createProject = useCallback(async (data: Partial<ProProject>): Promise<ProProject> => {
    const p = await proDb.projects.create(data);
    dispatch({ type: 'UPSERT_PROJECT', payload: p });
    return p;
  }, []);

  const updateProject = useCallback(async (id: string, patch: Partial<ProProject>) => {
    const p = await proDb.projects.update(id, patch);
    if (p) {
      dispatch({ type: 'UPSERT_PROJECT', payload: p });
      if (state.activeProject?.id === id) dispatch({ type: 'SET_ACTIVE_PROJECT', payload: p });
    }
  }, [state.activeProject]);

  const deleteProject = useCallback(async (id: string) => {
    await proDb.projects.delete(id);
    dispatch({ type: 'REMOVE_PROJECT', payload: id });
    if (state.activeProject?.id === id) dispatch({ type: 'SET_ACTIVE_PROJECT', payload: null });
  }, [state.activeProject]);

  // ── Volume CRUD ───────────────────────────────────────────
  const createVolume = useCallback(async (data: Partial<ProVolume> & { projectId: string }): Promise<ProVolume> => {
    const v = await proDb.volumes.create(data);
    dispatch({ type: 'UPSERT_VOLUME', payload: v });
    dispatch({ type: 'TOGGLE_BINDER_NODE', payload: v.id }); // auto-expand
    return v;
  }, []);

  const updateVolume = useCallback(async (id: string, patch: Partial<ProVolume>) => {
    const v = await proDb.volumes.update(id, patch);
    if (v) dispatch({ type: 'UPSERT_VOLUME', payload: v });
  }, []);

  const deleteVolume = useCallback(async (id: string) => {
    await proDb.volumes.delete(id);
    dispatch({ type: 'REMOVE_VOLUME', payload: id });
    // Remove child chapters and scenes from state
    const childChapters = state.chapters.filter(c => c.volumeId === id);
    childChapters.forEach(c => {
      dispatch({ type: 'REMOVE_CHAPTER', payload: c.id });
      state.scenes.filter(s => s.chapterId === c.id).forEach(s => dispatch({ type: 'REMOVE_SCENE', payload: s.id }));
    });
  }, [state.chapters, state.scenes]);

  const reorderVolumes = useCallback(async (projectId: string, orderedIds: string[]) => {
    await proDb.volumes.reorder(projectId, orderedIds);
    const updated = state.volumes.map(v => ({ ...v, order: orderedIds.indexOf(v.id) })).sort((a,b) => a.order - b.order);
    dispatch({ type: 'SET_VOLUMES', payload: updated });
  }, [state.volumes]);

  // ── Chapter CRUD ──────────────────────────────────────────
  const createChapter = useCallback(async (data: Partial<ProChapter> & { volumeId: string; projectId: string }): Promise<ProChapter> => {
    const c = await proDb.chapters.create(data);
    dispatch({ type: 'UPSERT_CHAPTER', payload: c });
    dispatch({ type: 'TOGGLE_BINDER_NODE', payload: c.id }); // auto-expand
    return c;
  }, []);

  const updateChapter = useCallback(async (id: string, patch: Partial<ProChapter>) => {
    const c = await proDb.chapters.update(id, patch);
    if (c) dispatch({ type: 'UPSERT_CHAPTER', payload: c });
  }, []);

  const deleteChapter = useCallback(async (id: string) => {
    await proDb.chapters.delete(id);
    dispatch({ type: 'REMOVE_CHAPTER', payload: id });
    state.scenes.filter(s => s.chapterId === id).forEach(s => dispatch({ type: 'REMOVE_SCENE', payload: s.id }));
  }, [state.scenes]);

  const reorderChapters = useCallback(async (volumeId: string, orderedIds: string[]) => {
    await proDb.chapters.reorder(volumeId, orderedIds);
    const updated = state.chapters.map(c => ({ ...c, order: orderedIds.indexOf(c.id) >= 0 ? orderedIds.indexOf(c.id) : c.order })).sort((a,b) => a.order - b.order);
    dispatch({ type: 'SET_CHAPTERS', payload: updated });
  }, [state.chapters]);

  // ── Scene CRUD ────────────────────────────────────────────
  const createScene = useCallback(async (data: Partial<ProScene> & { chapterId: string; volumeId: string; projectId: string }): Promise<ProScene> => {
    const s = await proDb.scenes.create(data);
    dispatch({ type: 'UPSERT_SCENE', payload: s });
    dispatch({ type: 'SET_ACTIVE_SCENE', payload: s.id });
    return s;
  }, []);

  const updateScene = useCallback(async (id: string, patch: Partial<ProScene>) => {
    const s = await proDb.scenes.update(id, patch);
    if (s) dispatch({ type: 'UPSERT_SCENE', payload: s });
  }, []);

  const deleteScene = useCallback(async (id: string) => {
    await proDb.scenes.delete(id);
    dispatch({ type: 'REMOVE_SCENE', payload: id });
    if (state.activeSceneId === id) dispatch({ type: 'SET_ACTIVE_SCENE', payload: null });
  }, [state.activeSceneId]);

  const reorderScenes = useCallback(async (chapterId: string, orderedIds: string[]) => {
    await proDb.scenes.reorder(chapterId, orderedIds);
    const updated = state.scenes.map(s => ({ ...s, order: orderedIds.indexOf(s.id) >= 0 ? orderedIds.indexOf(s.id) : s.order })).sort((a,b) => a.order - b.order);
    dispatch({ type: 'SET_SCENES', payload: updated });
  }, [state.scenes]);

  const setActiveScene = useCallback((sceneId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_SCENE', payload: sceneId });
    // Also set active chapter and volume when selecting a scene
    if (sceneId) {
      const scene = state.scenes.find(s => s.id === sceneId);
      if (scene) {
        dispatch({ type: 'SET_ACTIVE_CHAPTER', payload: scene.chapterId });
        dispatch({ type: 'SET_ACTIVE_VOLUME', payload: scene.volumeId });
      }
    }
  }, [state.scenes]);

  // ── Character CRUD ────────────────────────────────────────
  const createCharacter = useCallback(async (data: Partial<ProCharacter> & { projectId: string }): Promise<ProCharacter> => {
    const c = await proDb.characters.create(data);
    dispatch({ type: 'UPSERT_CHARACTER', payload: c });
    return c;
  }, []);

  const updateCharacter = useCallback(async (id: string, patch: Partial<ProCharacter>) => {
    const c = await proDb.characters.update(id, patch);
    if (c) dispatch({ type: 'UPSERT_CHARACTER', payload: c });
  }, []);

  const deleteCharacter = useCallback(async (id: string) => {
    await proDb.characters.delete(id);
    dispatch({ type: 'REMOVE_CHARACTER', payload: id });
    // Remove relations
    state.relations.filter(r => r.sourceId === id || r.targetId === id)
      .forEach(r => { proDb.relations.delete(r.id); dispatch({ type: 'REMOVE_RELATION', payload: r.id }); });
  }, [state.relations]);

  // ── Relation CRUD ─────────────────────────────────────────
  const createRelation = useCallback(async (data: Partial<ProRelation> & { projectId: string; sourceId: string; targetId: string }): Promise<ProRelation> => {
    const r = await proDb.relations.create(data);
    dispatch({ type: 'UPSERT_RELATION', payload: r });
    return r;
  }, []);

  const updateRelation = useCallback(async (id: string, patch: Partial<ProRelation>) => {
    const r = await proDb.relations.update(id, patch);
    if (r) dispatch({ type: 'UPSERT_RELATION', payload: r });
  }, []);

  const deleteRelation = useCallback(async (id: string) => {
    await proDb.relations.delete(id);
    dispatch({ type: 'REMOVE_RELATION', payload: id });
  }, []);

  // ── World Entry CRUD ──────────────────────────────────────
  const createWorldEntry = useCallback(async (data: Partial<ProWorldEntry> & { projectId: string }): Promise<ProWorldEntry> => {
    const e = await proDb.worldEntries.create(data);
    dispatch({ type: 'UPSERT_WORLD_ENTRY', payload: e });
    return e;
  }, []);

  const updateWorldEntry = useCallback(async (id: string, patch: Partial<ProWorldEntry>) => {
    const e = await proDb.worldEntries.update(id, patch);
    if (e) dispatch({ type: 'UPSERT_WORLD_ENTRY', payload: e });
  }, []);

  const deleteWorldEntry = useCallback(async (id: string) => {
    await proDb.worldEntries.delete(id);
    dispatch({ type: 'REMOVE_WORLD_ENTRY', payload: id });
  }, []);

  // ── Map CRUD ──────────────────────────────────────────────
  const createMap = useCallback(async (data: Partial<ProMap> & { projectId: string; imageUrl: string }): Promise<ProMap> => {
    const m = await proDb.maps.create(data);
    dispatch({ type: 'UPSERT_MAP', payload: m });
    return m;
  }, []);

  const updateMap = useCallback(async (id: string, patch: Partial<ProMap>) => {
    const m = await proDb.maps.update(id, patch);
    if (m) dispatch({ type: 'UPSERT_MAP', payload: m });
  }, []);

  const deleteMap = useCallback(async (id: string) => {
    await proDb.maps.delete(id);
    dispatch({ type: 'REMOVE_MAP', payload: id });
  }, []);

  // ── UI Controls ───────────────────────────────────────────
  const toggleBinder = useCallback(() => dispatch({ type: 'TOGGLE_BINDER' }), []);
  const toggleInspector = useCallback(() => dispatch({ type: 'TOGGLE_INSPECTOR' }), []);
  const setInspectorTab = useCallback((tab: ProStudioState['inspectorTab']) => dispatch({ type: 'SET_INSPECTOR_TAB', payload: tab }), []);
  const toggleBinderNode = useCallback((id: string) => dispatch({ type: 'TOGGLE_BINDER_NODE', payload: id }), []);
  const setActiveChapter = useCallback((id: string | null) => dispatch({ type: 'SET_ACTIVE_CHAPTER', payload: id }), []);
  const setActiveVolume = useCallback((id: string | null) => dispatch({ type: 'SET_ACTIVE_VOLUME', payload: id }), []);
  const setActiveProject = useCallback((p: ProProject | null) => dispatch({ type: 'SET_ACTIVE_PROJECT', payload: p }), []);

  // ── Keyboard Shortcuts ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === '\\') { e.preventDefault(); dispatch({ type: 'TOGGLE_BINDER' }); }
      if (mod && e.altKey && e.key === '\\') { e.preventDefault(); dispatch({ type: 'TOGGLE_INSPECTOR' }); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const value: ProStudioContextValue = {
    ...state,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setActiveProject,
    openProject,
    createVolume,
    updateVolume,
    deleteVolume,
    reorderVolumes,
    createChapter,
    updateChapter,
    deleteChapter,
    reorderChapters,
    createScene,
    updateScene,
    deleteScene,
    reorderScenes,
    setActiveScene,
    characters: state.characters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    relations: state.relations,
    createRelation,
    updateRelation,
    deleteRelation,
    worldEntries: state.worldEntries,
    createWorldEntry,
    updateWorldEntry,
    deleteWorldEntry,
    maps: state.maps,
    createMap,
    updateMap,
    deleteMap,
    toggleBinder,
    toggleInspector,
    setInspectorTab,
    toggleBinderNode,
    setActiveChapter,
    setActiveVolume,
  };

  return <ProStudioContext.Provider value={value}>{children}</ProStudioContext.Provider>;
};

export default ProStudioContext;
