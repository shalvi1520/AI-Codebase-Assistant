"use client"

import ReactFlow, { Background, Controls } from "reactflow"
import * as dagre from "dagre"
import "reactflow/dist/style.css"

// node size
const nodeWidth = 180
const nodeHeight = 60

// 🔥 AUTO LAYOUT FUNCTION (TREE STRUCTURE)
function getLayoutedElements(nodes: any[], edges: any[]) {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  // 🔥 TB = top to bottom flowchart
  dagreGraph.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 100 })

  // add nodes
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight
    })
  })

  // add edges
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // calculate layout
  dagre.layout(dagreGraph)

  // assign positions
  nodes.forEach((node) => {
    const pos = dagreGraph.node(node.id)
    node.position = {
      x: pos.x - nodeWidth / 2,
      y: pos.y - nodeHeight / 2
    }
  })

  return { nodes, edges }
}

export default function DependencyGraph({ graph }: any) {

  // 🔥 CREATE BEAUTIFUL NODES
  let nodes = graph.nodes.map((n: string) => ({
    id: n,
    data: {
      label: (
        <div style={{
          padding: "10px 16px",
          background: "linear-gradient(135deg,#7c5cfc,#5138d4)",
          color: "white",
          borderRadius: "10px",
          fontWeight: "600",
          textAlign: "center",
          minWidth: "120px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
        }}>
          {n}
        </div>
      )
    },
    position: { x: 0, y: 0 }
  }))

  // 🔥 CREATE EDGES
  let edges = graph.edges.map((e: any, i: number) => ({
    id: String(i),
    source: e.source,
    target: e.target,
    animated: true, // 🔥 smooth animation
    style: { stroke: "#9b7ffe", strokeWidth: 2 }
  }))

  // 🔥 APPLY AUTO LAYOUT
  const layout = getLayoutedElements(nodes, edges)

  return (
    <div style={{ height: 600 }}>
      <ReactFlow nodes={layout.nodes} edges={layout.edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}