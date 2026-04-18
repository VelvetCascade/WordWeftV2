
import React, { useEffect, useRef, useState } from 'react';
import { useProStudio } from '../../contexts/ProStudioContext';
import type { ProMap, MapPin } from '../../types/pro';

const PIN_ICONS: Record<MapPin['type'], string> = {
  location: '📍', milestone: '🏆', battle: '⚔️',
  character: '👤', faction: '🏰', custom: '📌',
};

const PIN_TYPES: { value: MapPin['type']; label: string }[] = [
  { value: 'location',  label: 'Location'  },
  { value: 'milestone', label: 'Milestone' },
  { value: 'battle',    label: 'Battle'    },
  { value: 'character', label: 'Character' },
  { value: 'faction',   label: 'Faction'   },
  { value: 'custom',    label: 'Custom'    },
];

function nanoid(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

// ─── Pin Modal ────────────────────────────────────────────────
const PinModal: React.FC<{
  pin: Partial<MapPin>;
  onSave: (p: MapPin) => void;
  onClose: () => void;
}> = ({ pin, onSave, onClose }) => {
  const [label, setLabel] = useState(pin.label || '');
  const [type, setType] = useState<MapPin['type']>(pin.type || 'location');
  const [note, setNote] = useState(pin.note || '');

  return (
    <div className="pro-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pro-modal" style={{ maxWidth: 400 }}>
        <h2 className="pro-modal-title">Map Pin</h2>
        <p className="pro-modal-sub">Label this location on your map</p>

        <div className="pro-form-field">
          <label className="pro-form-label">Label</label>
          <input className="pro-form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. The Shattered Keep" autoFocus />
        </div>
        <div className="pro-form-field">
          <label className="pro-form-label">Type</label>
          <select className="pro-form-input" value={type} onChange={e => setType(e.target.value as MapPin['type'])}>
            {PIN_TYPES.map(t => <option key={t.value} value={t.value}>{PIN_ICONS[t.value]} {t.label}</option>)}
          </select>
        </div>
        <div className="pro-form-field">
          <label className="pro-form-label">Note</label>
          <textarea className="pro-form-textarea" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Additional info…" />
        </div>

        <div className="pro-modal-footer">
          <button className="pro-btn pro-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pro-btn pro-btn-primary" onClick={() => {
            if (!label.trim()) return;
            onSave({ id: pin.id || nanoid(), x: pin.x || 50, y: pin.y || 50, label: label.trim(), type, note });
            onClose();
          }}>Save Pin</button>
        </div>
      </div>
    </div>
  );
};

// ─── New Map Modal ────────────────────────────────────────────
const NewMapModal: React.FC<{ projectId: string; onClose: () => void; onCreate: (m: ProMap) => void }> = ({ projectId, onClose, onCreate }) => {
  const { createMap } = useProStudio();
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setImageUrl(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  return (
    <div className="pro-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pro-modal" style={{ maxWidth: 480 }}>
        <h2 className="pro-modal-title">New Map</h2>
        <p className="pro-modal-sub">Upload an image to annotate with pins</p>

        <div className="pro-form-field">
          <label className="pro-form-label">Map Title</label>
          <input className="pro-form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. The Known World" autoFocus />
        </div>

        <div className="pro-form-field">
          <label className="pro-form-label">Map Image</label>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          {imageUrl
            ? <img src={imageUrl} alt="preview" style={{ width: '100%', borderRadius: 'var(--pro-radius)', marginBottom: 8, maxHeight: 200, objectFit: 'cover' }} />
            : null
          }
          <button
            className="pro-btn pro-btn-ghost"
            style={{ width: '100%', justifyContent: 'center', padding: '20px 0' }}
            onClick={() => fileRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            {imageUrl ? 'Change Image' : 'Upload Map Image'}
          </button>
        </div>

        <div className="pro-modal-footer">
          <button className="pro-btn pro-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="pro-btn pro-btn-primary"
            disabled={!title.trim() || !imageUrl}
            onClick={async () => {
              if (!title.trim() || !imageUrl) return;
              const m = await createMap({ projectId, title: title.trim(), imageUrl, pins: [] });
              onCreate(m);
              onClose();
            }}
          >Create Map</button>
        </div>
      </div>
    </div>
  );
};

// ─── Map Canvas ───────────────────────────────────────────────
const MapCanvas: React.FC<{ map: ProMap; onUpdate: (pins: MapPin[]) => void }> = ({ map, onUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [editingPin, setEditingPin] = useState<MapPin | null>(null);
  const [addMode, setAddMode] = useState(false);

  const onMouseDown = (e: React.MouseEvent) => {
    if (addMode) return;
    isPanning.current = true;
    lastPan.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setPan({ x: e.clientX - lastPan.current.x, y: e.clientY - lastPan.current.y });
  };

  const onMouseUp = () => { isPanning.current = false; };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(4, Math.max(0.2, z * (1 - e.deltaY * 0.001))));
  };

  const onMapClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!addMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x, y });
    setAddMode(false);
  };

  const savePin = (pin: MapPin) => {
    if (pendingPin) {
      // New pin
      onUpdate([...map.pins, { ...pin, x: pendingPin.x, y: pendingPin.y }]);
      setPendingPin(null);
    } else if (editingPin) {
      // Update existing pin
      onUpdate(map.pins.map(p => p.id === pin.id ? pin : p));
      setEditingPin(null);
    }
  };

  const deletePin = (pinId: string) => {
    onUpdate(map.pins.filter(p => p.id !== pinId));
  };

  return (
    <>
      <div
        className="pro-maps-canvas-area"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        style={{ cursor: addMode ? 'crosshair' : isPanning.current ? 'grabbing' : 'grab' }}
      >
        {/* Controls */}
        <div className="pro-graph-toolbar" style={{ top: 12, right: 12 }}>
          <button
            className={`pro-graph-toolbar-btn${addMode ? '' : ''}`}
            title="Add Pin (click map)"
            onClick={() => setAddMode(v => !v)}
            style={addMode ? { background: 'var(--pro-accent)', borderColor: 'var(--pro-accent)', color: '#fff' } : {}}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <button className="pro-graph-toolbar-btn" title="Zoom In" onClick={() => setZoom(z => Math.min(4, z * 1.2))}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
          </button>
          <button className="pro-graph-toolbar-btn" title="Zoom Out" onClick={() => setZoom(z => Math.max(0.2, z / 1.2))}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
          </button>
          <button className="pro-graph-toolbar-btn" title="Reset" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          </button>
        </div>

        {addMode && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--pro-accent)', color: '#fff', fontSize: 12, fontWeight: 600,
            padding: '6px 16px', borderRadius: 100, pointerEvents: 'none', zIndex: 20,
            boxShadow: 'var(--pro-shadow-lifted)',
          }}>
            Click anywhere on the map to place a pin
          </div>
        )}

        {/* Map image + pins */}
        <div
          ref={containerRef}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left', position: 'absolute' }}
        >
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={map.imageUrl}
              alt={map.title}
              className="pro-map-image"
              onClick={onMapClick}
              draggable={false}
              style={{ display:'block', maxWidth:'none', maxHeight:'none', width:'auto', height:'auto', minWidth: 600 }}
            />
            {/* Pins */}
            {map.pins.map(pin => (
              <div
                key={pin.id}
                className="pro-map-pin"
                style={{ left: `${pin.x}%`, top: `${pin.y}%`, position: 'absolute' }}
                onClick={e => { e.stopPropagation(); setEditingPin(pin); }}
              >
                <div className="pro-map-pin-icon">{pin.icon || PIN_ICONS[pin.type]}</div>
                <div className="pro-map-pin-label">{pin.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pin modals */}
      {(pendingPin || editingPin) && (
        <PinModal
          pin={editingPin || { x: pendingPin!.x, y: pendingPin!.y }}
          onSave={savePin}
          onClose={() => { setPendingPin(null); setEditingPin(null); }}
        />
      )}
    </>
  );
};

// ─── Maps Page ────────────────────────────────────────────────
export const ProMapsPage: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { openProject, activeProject, maps, updateMap, deleteMap } = useProStudio();
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { openProject(projectId).then(() => setLoading(false)); }, [projectId]);

  const activeMap = maps.find(m => m.id === activeMapId);

  if (loading) return (
    <div className="pro-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--pro-text-muted)' }}>Loading…</span>
    </div>
  );

  return (
    <div className="pro-shell">
      {/* Top bar */}
      <div className="pro-topbar">
        <a href={`#/pro/studio/${projectId}`} className="pro-topbar-logo" onClick={e => { e.preventDefault(); window.location.hash = `/pro/studio/${projectId}`; }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          <span className="pro-topbar-logo-text">Back to Studio</span>
        </a>
        <div className="pro-topbar-breadcrumb">
          <span className="pro-topbar-breadcrumb-item">{activeProject?.title}</span>
          <span className="pro-topbar-breadcrumb-sep">›</span>
          <span className="pro-topbar-breadcrumb-item active">Maps</span>
        </div>
        <div className="pro-topbar-actions">
          <button className="pro-btn pro-btn-primary" style={{ height: 32, fontSize: 12 }} onClick={() => setShowNewModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New Map
          </button>
        </div>
      </div>

      <div className="pro-maps-page">
        {/* Sidebar */}
        <div className="pro-maps-sidebar">
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--pro-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--pro-text-muted)' }}>Maps</span>
            <button className="pro-binder-icon-btn" onClick={() => setShowNewModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            {maps.map(m => (
              <div
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px',
                  borderRadius: 'var(--pro-radius-sm)', cursor: 'pointer', transition: 'background 0.15s',
                  background: activeMapId === m.id ? 'rgba(141,110,99,0.15)' : 'transparent',
                }}
                onClick={() => setActiveMapId(m.id)}
              >
                <div style={{ width: 40, height: 28, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--pro-surface-3)' }}>
                  <img src={m.imageUrl} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--pro-text-rich)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--pro-text-muted)' }}>{m.pins.length} pin{m.pins.length !== 1 ? 's' : ''}</div>
                </div>
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--pro-text-muted)', cursor: 'pointer', fontSize: 10 }}
                  onClick={e => { e.stopPropagation(); if (window.confirm(`Delete map "${m.title}"?`)) deleteMap(m.id); }}
                >✕</button>
              </div>
            ))}
            {maps.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--pro-text-muted)', fontSize: 11 }}>
                No maps yet
              </div>
            )}
          </div>
        </div>

        {/* Canvas */}
        {activeMap
          ? <MapCanvas
              key={activeMap.id}
              map={activeMap}
              onUpdate={pins => updateMap(activeMap.id, { pins })}
            />
          : <div className="pro-editor-empty-state">
              <div className="pro-editor-empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                  <line x1="9" y1="3" x2="9" y2="18" />
                  <line x1="15" y1="6" x2="15" y2="21" />
                </svg>
              </div>
              <h3>Interactive Maps</h3>
              <p>Upload a map image and annotate it with pins — locations, battles, factions, and more.</p>
              <button className="pro-btn pro-btn-primary" onClick={() => setShowNewModal(true)}>
                Upload a Map
              </button>
            </div>
        }
      </div>

      {showNewModal && (
        <NewMapModal
          projectId={projectId}
          onClose={() => setShowNewModal(false)}
          onCreate={m => { setActiveMapId(m.id); }}
        />
      )}
    </div>
  );
};
