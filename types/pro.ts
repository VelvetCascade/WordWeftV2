
// ═══════════════════════════════════════════════════════════════
//   WordWeft Pro — Core Type Definitions
//   Hierarchy: Project → Volume → Chapter → Scene
// ═══════════════════════════════════════════════════════════════

// ─── Project Bible ───────────────────────────────────────────
export interface ProProjectBible {
  worldRules: string;         // Rich text (TipTap JSON stringified)
  seriesNotes: string;
  thematicStatement: string;
  logline: string;
  synopsis: string;
}

// ─── Editor Settings ─────────────────────────────────────────
export interface ProEditorSettings {
  theme: 'dark' | 'sepia' | 'light';
  font: 'Literata' | 'Inter' | 'JetBrains Mono';
  fontSize: number;           // px, e.g. 18
  lineHeight: number;         // multiplier, e.g. 1.8
  sidePadding: number;        // px, e.g. 80
  typewriterMode: boolean;
  focusMode: 'none' | 'paragraph' | 'sentence' | 'line';
  autoSaveInterval: number;   // ms, e.g. 2000
  showWordCount: boolean;
  showStatus: boolean;
}

// ─── Project ─────────────────────────────────────────────────
export interface ProProject {
  id: string;
  title: string;
  subtitle?: string;
  genre: string[];
  coverUrl?: string;
  createdAt: string;          // ISO string
  updatedAt: string;
  bible: ProProjectBible;
  settings: ProEditorSettings;
  wordCountGoal?: number;
  ownerId?: string;           // For future multi-user
}

// ─── Volume (Book within a Project) ──────────────────────────
export interface ProVolume {
  id: string;
  projectId: string;
  title: string;
  subtitle?: string;
  order: number;              // Sort order
  synopsis?: string;
  coverUrl?: string;
  wordCountGoal?: number;
  status: 'drafting' | 'revising' | 'complete' | 'abandoned';
  createdAt: string;
  updatedAt: string;
}

// ─── Chapter ─────────────────────────────────────────────────
export type ChapterStatus = 'outline' | 'draft' | 'revised' | 'final';
export type ChapterColor =
  | 'red' | 'orange' | 'amber' | 'green' | 'teal'
  | 'blue' | 'violet' | 'pink' | 'brown' | null;

export interface ProChapter {
  id: string;
  volumeId: string;
  projectId: string;
  title: string;
  order: number;
  synopsis?: string;
  status: ChapterStatus;
  pov?: string;               // Character ID
  color?: ChapterColor;       // Binder label color
  wordCountGoal?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Scene ───────────────────────────────────────────────────
export type SceneStatus = 'empty' | 'outline' | 'draft' | 'revised' | 'final';
export type BeatType = 'action' | 'reaction' | 'sequel' | 'transition' | 'climax' | 'none';

export interface ParagraphTag {
  paragraphIndex: number;
  characterIds?: string[];
  locationIds?: string[];
  note?: string;
}

export interface ProScene {
  id: string;
  chapterId: string;
  volumeId: string;
  projectId: string;
  title: string;
  order: number;
  // Content stored as TipTap JSON (stringified)
  content: string;
  synopsis?: string;
  // Scene Inspector metadata
  goal?: string;
  conflict?: string;
  disaster?: string;
  emotionalShift?: string;    // e.g. "+Hope / -Despair"
  emotionStart?: number;      // 0–10 scale
  emotionEnd?: number;        // 0–10 scale
  beatType?: BeatType;
  pov?: string;               // Character ID
  settingId?: string;         // World Entry ID (location)
  worldTime?: string;         // In-world date/time string
  characterIds: string[];     // Characters present
  locationIds: string[];      // Locations referenced
  wordCount: number;
  status: SceneStatus;
  paragraphTags?: ParagraphTag[];
  createdAt: string;
  updatedAt: string;
}

// ─── Character ───────────────────────────────────────────────
export type CharacterRole = 'protagonist' | 'antagonist' | 'supporting' | 'minor' | 'historical' | 'mythological';
export type MoralAlignment =
  | 'lawful-good' | 'neutral-good' | 'chaotic-good'
  | 'lawful-neutral' | 'true-neutral' | 'chaotic-neutral'
  | 'lawful-evil' | 'neutral-evil' | 'chaotic-evil';

export interface ProCharacter {
  id: string;
  projectId: string;
  name: string;
  aliases?: string[];
  role: CharacterRole;
  imageUrl?: string;

  // ── Physical ──
  age?: string;
  sex?: string;
  pronouns?: string;
  height?: string;
  weight?: string;
  eyeColor?: string;
  hairColor?: string;
  skinTone?: string;
  build?: string;
  scars?: string;
  distinctiveMarks?: string;
  posture?: string;
  voice?: string;
  dressStyle?: string;

  // ── Psychological ──
  archetype?: string;         // e.g. "The Trickster"
  mbti?: string;              // e.g. "INTJ"
  enneagram?: string;         // e.g. "Type 4w5"
  coreDesire?: string;
  coreFear?: string;
  motivation?: string;
  internalConflict?: string;
  externalConflict?: string;
  moralAlignment?: MoralAlignment;
  epiphany?: string;          // Key moment of growth
  fatalFlaw?: string;
  ghost?: string;             // Past wound shaping them
  mantra?: string;            // Their core belief

  // ── Sociocultural ──
  religion?: string;
  socialClass?: string;
  education?: string;
  occupation?: string;
  languages?: string[];
  nationality?: string;
  ethnicity?: string;
  familyBackground?: string;
  politicalViews?: string;
  economicStatus?: string;

  // ── Functional / Skills ──
  magicAbility?: string;
  magicLimitations?: string;
  combatStyle?: string;
  weaponry?: string[];
  specialSkills?: string[];
  inventory?: string[];
  weaknesses?: string[];
  gameStats?: Record<string, string>; // e.g. { STR: "18", INT: "14" }

  // ── Narrative ──
  firstAppearance?: string;   // Scene/Chapter ID or label
  backstory?: string;         // Rich text JSON
  arcStart?: string;          // Where they begin emotionally
  arcMidpoint?: string;
  arcEnd?: string;            // Where they end up
  notes?: string;
  secretsKnown?: string;      // What they know that others don't
  secretsHidden?: string;     // What they hide from others

  createdAt: string;
  updatedAt: string;
}

// ─── Relationship (Graph Edge) ────────────────────────────────
export type RelationNature = 'familial' | 'romantic' | 'professional' | 'antagonistic' | 'social' | 'spiritual' | 'unknown';

export interface ProRelation {
  id: string;
  projectId: string;
  sourceId: string;           // Character ID (from)
  targetId: string;           // Character ID (to)
  label: string;              // e.g. "Parent of", "Rivals with", "Married to"
  nature: RelationNature;
  isBidirectional: boolean;   // true = symmetric relationship
  startDate?: string;         // In-world or real date
  endDate?: string;
  notes?: string;
  strength: 1 | 2 | 3;       // Graph edge weight (1=weak, 3=strong)
  createdAt: string;
}

// ─── World Entry (Compendium Wiki) ───────────────────────────
export type WorldEntryType =
  | 'location' | 'culture' | 'magic' | 'species'
  | 'language' | 'event' | 'artifact' | 'faction'
  | 'lore' | 'religion' | 'technology' | 'custom';

export interface MapPin {
  id: string;
  x: number;                  // Percentage (0–100)
  y: number;
  label: string;
  type: 'location' | 'milestone' | 'battle' | 'character' | 'faction' | 'custom';
  linkedEntityId?: string;    // World entry or character ID
  linkedEntityType?: 'world' | 'character';
  color?: string;
  note?: string;
  icon?: string;              // Emoji override
}

export interface ProWorldEntry {
  id: string;
  projectId: string;
  type: WorldEntryType;
  title: string;
  content: string;            // TipTap JSON (wiki article body)
  imageUrl?: string;
  tags: string[];
  linkedCharacterIds?: string[];
  linkedEntryIds?: string[];
  mapPins?: MapPin[];         // Pins on project maps

  // ── Location-specific ──
  coordinates?: string;
  climate?: string;
  politicalAffiliation?: string;
  population?: string;

  // ── Magic/Tech-specific ──
  sourceOfPower?: string;
  costs?: string;
  limitations?: string;
  historicalRestrictions?: string;

  // ── Culture-specific ──
  taboos?: string;
  ritesOfPassage?: string;
  socialHierarchy?: string;
  gestures?: string;

  // ── Species-specific ──
  anatomy?: string;
  diet?: string;
  evolutionaryAdvantages?: string;
  vulnerabilities?: string;

  // ── Language-specific ──
  phonemes?: string;
  scriptDirection?: string;
  commonPhrases?: string;
  namingConventions?: string;

  createdAt: string;
  updatedAt: string;
}

// ─── Map ─────────────────────────────────────────────────────
export interface ProMap {
  id: string;
  projectId: string;
  title: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  scale?: string;             // e.g. "1 unit = 10 miles"
  pins: MapPin[];
  createdAt: string;
  updatedAt: string;
}

// ─── Binder Tree Node ─────────────────────────────────────────
export interface BinderNode {
  type: 'project' | 'volume' | 'chapter' | 'scene' | 'section';
  id: string;
  label: string;
  children?: BinderNode[];
  isExpanded?: boolean;
  status?: SceneStatus | ChapterStatus;
  color?: ChapterColor;
  wordCount?: number;
}

// ─── Studio Context State ─────────────────────────────────────
export interface ProStudioState {
  projects: ProProject[];
  activeProject: ProProject | null;
  volumes: ProVolume[];
  chapters: ProChapter[];
  scenes: ProScene[];
  activeVolumeId: string | null;
  activeChapterId: string | null;
  activeSceneId: string | null;
  binderExpanded: Record<string, boolean>;
  inspectorTab: 'scene' | 'reference' | 'bible' | 'notes';
  binderCollapsed: boolean;
  inspectorCollapsed: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
}
