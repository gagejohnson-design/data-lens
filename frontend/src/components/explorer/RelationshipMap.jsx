import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from '@dagrejs/dagre';
import { useMemo, useState, useCallback } from 'react';
import { useSnapshot } from '../../context/SnapshotContext';
import { updateSnapshotData } from '../../api/snapshots';
import { inferRelationships } from '../../utils/inferRelationships';
import NodeSidePanel from './NodeSidePanel';

const NODE_W = 160;
const NODE_H = 40;
const MAX_GRAPH_NODES = 60;

function edgeKey(r) {
  return `${r.from_table}::${r.from_column}::${r.to_table}::${r.to_column}`;
}

function layoutGraph(tables, relationships, direction) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 90, nodesep: 55, marginx: 24, marginy: 24 });
  tables.forEach(t => g.setNode(t.name, { width: NODE_W, height: NODE_H }));
  relationships.forEach(r => {
    if (g.hasNode(r.from_table) && g.hasNode(r.to_table)) {
      g.setEdge(r.from_table, r.to_table);
    }
  });
  dagre.layout(g);
  return g;
}

export default function RelationshipMap() {
  const { mergedSnapshot, activeSnapshot, loadSnapshot } = useSnapshot();
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedEdgeKey, setSelectedEdgeKey] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState('LR');
  const [fullscreen, setFullscreen] = useState(false);
  const [draggedPositions, setDraggedPositions] = useState({});

  const tables = mergedSnapshot?.snapshot_data?.tables || [];
  const existingRels = mergedSnapshot?.snapshot_data?.relationships || [];

  const { nodes, edges } = useMemo(() => {
    if (!mergedSnapshot) return { nodes: [], edges: [] };

    const visibleTables = tables.slice(0, MAX_GRAPH_NODES);
    const accepted = suggestions?.filter(s => s._accepted) || [];
    const allRels = [...existingRels, ...accepted];

    const g = layoutGraph(visibleTables, allRels, direction);

    const nodes = visibleTables.map((t, i) => {
      const pos = g.node(t.name);
      const dragged = draggedPositions[t.name];
      const isExternal = t._isPrimary === false;
      const displayName = isExternal
        ? t.name.split('__').slice(1).join('__')
        : t.name;
      const rowLabel = t.row_count != null ? `\n${t.row_count.toLocaleString()} rows` : '';
      return {
        id: t.name,
        data: { label: `${displayName}${rowLabel}` },
        position: dragged ?? {
          x: pos ? pos.x - NODE_W / 2 : (i % 8) * 200,
          y: pos ? pos.y - NODE_H / 2 : Math.floor(i / 8) * 120,
        },
        style: {
          background: isExternal ? '#1e1a2e' : '#1a1d27',
          border: `1px solid ${isExternal ? '#4b3a7a' : '#2e3250'}`,
          borderRadius: 8,
          color: isExternal ? '#c4b5fd' : '#e2e8f0',
          fontSize: 11,
          padding: '6px 14px',
          minWidth: NODE_W,
          cursor: 'grab',
          lineHeight: 1.4,
          whiteSpace: 'pre',
        },
      };
    });

    const edges = allRels.map(r => {
      const id = edgeKey(r);
      const isSelected = id === selectedEdgeKey;
      const isSuggested = !!r._accepted;
      return {
        id,
        source: r.from_table,
        target: r.to_table,
        label: `${r.from_column} → ${r.to_column}`,
        style: {
          stroke: isSuggested ? '#22c55e' : isSelected ? '#f59e0b' : '#4b5563',
          strokeWidth: isSelected ? 2.5 : 1.5,
        },
        labelStyle: {
          fill: isSuggested ? '#86efac' : isSelected ? '#fde047' : '#6b7280',
          fontSize: 10,
        },
        labelBgStyle: { fill: '#0f1117', fillOpacity: 0.85 },
        animated: isSuggested,
      };
    });

    return { nodes, edges };
  }, [mergedSnapshot, existingRels, suggestions, tables, direction, selectedEdgeKey, draggedPositions]);

  if (!mergedSnapshot) return null;

  const totalTables = tables.length;
  const isExistingEdgeSelected = selectedEdgeKey &&
    existingRels.some(r => edgeKey(r) === selectedEdgeKey);

  const handleSuggest = () => {
    const inferred = inferRelationships(tables);
    const existingKeys = new Set(
      existingRels.map(r => `${r.from_table}.${r.from_column}->${r.to_table}`)
    );
    const novel = inferred.filter(
      r => !existingKeys.has(`${r.from_table}.${r.from_column}->${r.to_table}`)
    );
    setSuggestions(novel.length > 0 ? novel.map(r => ({ ...r, _accepted: false })) : []);
  };

  const toggleSuggestion = (i) => {
    setSuggestions(prev => prev.map((s, idx) => idx === i ? { ...s, _accepted: !s._accepted } : s));
  };

  const handleAcceptSelected = async () => {
    if (!activeSnapshot) return;
    const toAdd = (suggestions || []).filter(s => s._accepted).map(({ _accepted, ...r }) => r);
    if (toAdd.length === 0) return;
    setSaving(true);
    try {
      const updated = {
        ...activeSnapshot.snapshot_data,
        relationships: [...(activeSnapshot.snapshot_data?.relationships || []), ...toAdd],
      };
      const { data } = await updateSnapshotData(activeSnapshot.id, updated);
      loadSnapshot(data);
      setSuggestions(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEdge = async () => {
    if (!activeSnapshot || !selectedEdgeKey) return;
    if (!window.confirm('Remove this relationship?')) return;
    setSaving(true);
    try {
      const remaining = (activeSnapshot.snapshot_data?.relationships || [])
        .filter(r => edgeKey(r) !== selectedEdgeKey);
      const updated = { ...activeSnapshot.snapshot_data, relationships: remaining };
      const { data } = await updateSnapshotData(activeSnapshot.id, updated);
      loadSnapshot(data);
      setSelectedEdgeKey(null);
    } finally {
      setSaving(false);
    }
  };

  const handleNodeDragStop = useCallback((_, node) => {
    setDraggedPositions(prev => ({ ...prev, [node.id]: node.position }));
  }, []);

  const resetLayout = () => setDraggedPositions({});

  const acceptedCount = (suggestions || []).filter(s => s._accepted).length;

  return (
    <div>
      {totalTables > MAX_GRAPH_NODES && (
        <div className="map-notice">
          Showing {MAX_GRAPH_NODES} of {totalTables} tables. All tables available in Schema Browser.
        </div>
      )}
      {mergedSnapshot._isSession && (
        <div className="map-notice map-notice-purple">
          Purple nodes are from secondary sources.
        </div>
      )}

      <div className="map-toolbar">
        <button className="btn btn-secondary btn-sm" onClick={handleSuggest}>
          Suggest Relationships
        </button>
        {existingRels.length > 0 && (
          <span className="map-toolbar-hint">
            {existingRels.length} relationship{existingRels.length !== 1 ? 's' : ''} · click an edge to select
          </span>
        )}
        {isExistingEdgeSelected && (
          <button
            className="btn btn-danger btn-sm"
            onClick={handleDeleteEdge}
            disabled={saving}
            style={{ marginLeft: 'auto' }}
          >
            {saving ? 'Removing…' : 'Delete Relationship'}
          </button>
        )}
        {selectedEdgeKey && !isExistingEdgeSelected && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSelectedEdgeKey(null)}
            style={{ marginLeft: 'auto' }}
          >
            Deselect
          </button>
        )}
        <select
          className="sidebar-sort map-direction-select"
          value={direction}
          onChange={e => { setDirection(e.target.value); setDraggedPositions({}); }}
          title="Layout direction"
          style={{ marginLeft: isExistingEdgeSelected || (selectedEdgeKey && !isExistingEdgeSelected) ? '0' : 'auto' }}
        >
          <option value="LR">Layout: L→R</option>
          <option value="TB">Layout: T→B</option>
          <option value="RL">Layout: R→L</option>
          <option value="BT">Layout: B→T</option>
        </select>
        {Object.keys(draggedPositions).length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={resetLayout} title="Reset to auto layout">
            Reset Layout
          </button>
        )}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setFullscreen(v => !v)}
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
        >
          {fullscreen ? '⊡' : '⊞'}
        </button>
      </div>

      {suggestions !== null && (
        <div className="suggestion-panel">
          {suggestions.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              No new relationships detected based on column naming conventions.
            </p>
          ) : (
            <>
              <div className="suggestion-list">
                {suggestions.map((s, i) => (
                  <label key={i} className={`suggestion-item ${s._accepted ? 'suggestion-item-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={s._accepted}
                      onChange={() => toggleSuggestion(i)}
                    />
                    <span className="suggestion-text">
                      <code>{s.from_table}.{s.from_column}</code>
                      <span className="suggestion-arrow">→</span>
                      <code>{s.to_table}.{s.to_column}</code>
                    </span>
                  </label>
                ))}
              </div>
              <div className="suggestion-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAcceptSelected}
                  disabled={acceptedCount === 0 || saving}
                >
                  {saving ? 'Saving…' : `Save ${acceptedCount} relationship${acceptedCount !== 1 ? 's' : ''}`}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSuggestions(null)}>
                  Dismiss
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tables.length === 0 && (
        <div className="empty-state">
          <p>No tables in this snapshot.</p>
        </div>
      )}

      {tables.length > 0 && (
        <div className={`map-wrapper ${fullscreen ? 'map-wrapper-fullscreen' : ''}`}>
          <div className="map-canvas">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodeClick={(_, node) => {
                setSelectedTable(node.id);
                setSelectedEdgeKey(null);
              }}
              onEdgeClick={(_, edge) => {
                setSelectedEdgeKey(edge.id);
                setSelectedTable(null);
              }}
              onNodeDragStop={handleNodeDragStop}
              onPaneClick={() => {
                setSelectedEdgeKey(null);
              }}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              proOptions={{ hideAttribution: true }}
              minZoom={0.1}
            >
              <Background color="#1e2035" gap={24} />
              <Controls style={{ background: '#1a1d27', border: '1px solid #2e3250' }} />
              <MiniMap
                style={{ background: '#1a1d27', border: '1px solid #2e3250' }}
                nodeColor={n => n.style?.background || '#2e3250'}
                maskColor="rgba(15,17,23,0.8)"
              />
            </ReactFlow>
          </div>

          {selectedTable && (
            <NodeSidePanel
              tableName={selectedTable}
              onClose={() => setSelectedTable(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
