"use client"

import ReactFlow, { Background, Controls } from "reactflow"
import "reactflow/dist/style.css"

export default function DependencyGraph({ graph }: any) {
  const nodes = graph.nodes.map((n: string, i: number) => ({
    id: n,
    position: { x: 200, y: i * 80 },
    data: { label: n }
  }))

  const edges = graph.edges.map((e: any, i: number) => ({
    id: String(i),
    source: e.source,
    target: e.target
  }))

  return (
    <div style={{ height: 400 }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}