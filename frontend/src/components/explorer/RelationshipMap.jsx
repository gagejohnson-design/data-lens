import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { useMemo, useState } from 'react';
import { useSnapshot } from '../../context/SnapshotContext';
import NodeSidePanel from './NodeSidePanel';

const MAX_GRAPH_NODES = 50;

export default function RelationshipMap() {
  const { activeSnapshot } = useSnapshot();
  const [selectedTable, setSelectedTable] = useState(null);

  const { nodes, edges } = useMemo(() => {
    if (!activeSnapshot) return { nodes: [], edges: [] };

    const tables = (activeSnapshot.snapshot_data?.tables || []).slice(0, MAX_GRAPH_NODES);
    const relationships = activeSnapshot.snapshot_data?.relationships || [];

    const nodes = tables.map((t, i) => ({
      id: t.name,
      data: { label: t.name },
      position: { x: (i % 8) * 200, y: Math.floor(i / 8) * 120 },
      style: {
        background: '#1a1d27',
        border: '1px solid #2e3250',
        borderRadius: 8,
        color: '#e2e8f0',
        fontSize: 12,
        padding: '8px 14px',
      },
    }));

    const edges = relationships.map((r, i) => ({
      id: `e-${i}`,
      source: r.from_table,
      target: r.to_table,
      label: `${r.from_column} → ${r.to_column}`,
      style: { stroke: '#2e3250' },
      labelStyle: { fill: '#8892a4', fontSize: 10 },
      labelBgStyle: { fill: '#0f1117', fillOpacity: 0.8 },
    }));

    return { nodes, edges };
  }, [activeSnapshot]);

  if (!activeSnapshot) return null;

  const totalTables = activeSnapshot.snapshot_data?.tables?.length || 0;

  return (
    <div>
      {totalTables > MAX_GRAPH_NODES && (
        <div className="map-notice">
          Showing {MAX_GRAPH_NODES} of {totalTables} tables. All tables are visible in Schema Browser.
        </div>
      )}
      <div className="map-wrapper">
        <div className="map-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={(_, node) => setSelectedTable(node.id)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#2e3250" gap={24} />
            <Controls style={{ background: '#1a1d27', border: '1px solid #2e3250' }} />
            <MiniMap
              style={{ background: '#1a1d27', border: '1px solid #2e3250' }}
              nodeColor="#2e3250"
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
    </div>
  );
}
