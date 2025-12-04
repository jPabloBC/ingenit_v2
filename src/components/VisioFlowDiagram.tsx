"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Panel,
  Handle,
  Position,
  NodeTypes,
  EdgeTypes,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Settings,
  Plus,
  Trash2,
  Edit,
  Save,
  RotateCcw,
  Download,
  Upload,
  MessageCircle,
  Globe,
  Wifi,
  Database,
  Code,
  TestTube,
  Rocket,
  FileText,
  Users
} from "lucide-react";

interface ProcessStep {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "error" | "skipped";
  order: number;
  estimated_hours: number;
  actual_hours?: number;
  notes?: string;
  completed_at?: string;
  assigned_to?: string;
  type?: string;
}

interface VisioFlowDiagramProps {
  steps: ProcessStep[];
  onStepsUpdate: (steps: ProcessStep[]) => void;
  processType?: string;
  readOnly?: boolean;
}

// Nodos personalizados para diferentes tipos de pasos
const CustomNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const getNodeIcon = (type: string) => {
    switch (type) {
      case "start":
        return <Play className="w-6 h-6 text-green-600" />;
      case "process":
        return <Settings className="w-6 h-6 text-blue-600" />;
      case "decision":
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case "database":
        return <Database className="w-6 h-6 text-purple-600" />;
      case "api":
        return <Code className="w-6 h-6 text-orange-600" />;
      case "test":
        return <TestTube className="w-6 h-6 text-indigo-600" />;
      case "deploy":
        return <Rocket className="w-6 h-6 text-red-600" />;
      case "document":
        return <FileText className="w-6 h-6 text-gray-600" />;
      case "user":
        return <Users className="w-6 h-6 text-pink-600" />;
      case "whatsapp":
        return <MessageCircle className="w-6 h-6 text-green-600" />;
      case "web":
        return <Globe className="w-6 h-6 text-blue-600" />;
      case "network":
        return <Wifi className="w-6 h-6 text-cyan-600" />;
      default:
        return <Settings className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "border-green-500 bg-green-50";
      case "in_progress":
        return "border-blue-500 bg-blue-50";
      case "error":
        return "border-red-500 bg-red-50";
      case "skipped":
        return "border-yellow-500 bg-yellow-50";
      default:
        return "border-gray-300 bg-white";
    }
  };

  const getNodeShape = (type: string) => {
    switch (type) {
      case "start":
      case "end":
        return "rounded-full";
      case "decision":
        return "transform rotate-45";
      case "process":
      default:
        return "rounded-lg";
    }
  };

  return (
    <div
      className={`${getNodeShape(data.type)} ${getStatusColor(data.status)} border-2 p-4 min-w-[200px] ${
        selected ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center gap-3 mb-2">
        {getNodeIcon(data.type)}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">{data.name}</h3>
          <p className="text-xs text-gray-600">{data.description}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{data.estimated_hours}h</span>
        <span>{data.assigned_to}</span>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export default function VisioFlowDiagram({
  steps,
  onStepsUpdate,
  processType = "process",
  readOnly = false,
}: VisioFlowDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showToolbar, setShowToolbar] = useState(true);

  // Convertir pasos a nodos de React Flow
  const initialNodes = useMemo(() => {
    return steps.map((step, index) => ({
      id: step.id,
      type: "custom",
      position: { x: 250 * (index % 3), y: 150 * Math.floor(index / 3) },
      data: {
        ...step,
        type: getStepType(step.name, processType),
      },
    }));
  }, [steps, processType]);

  // Crear conexiones entre nodos
  const initialEdges = useMemo(() => {
    const edges: Edge[] = [];
    for (let i = 0; i < steps.length - 1; i++) {
      edges.push({
        id: `e${steps[i].id}-${steps[i + 1].id}`,
        source: steps[i].id,
        target: steps[i + 1].id,
        type: "smoothstep",
        animated: steps[i].status === "in_progress",
        style: {
          stroke: getEdgeColor(steps[i].status),
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: getEdgeColor(steps[i].status),
        },
      });
    }
    return edges;
  }, [steps]);

  // Función para determinar el tipo de nodo basado en el nombre y tipo de proceso
  function getStepType(stepName: string, processType: string): string {
    const name = stepName.toLowerCase();
    
    if (processType === "whatsapp") {
      if (name.includes("análisis") || name.includes("requerimientos")) return "start";
      if (name.includes("menú") || name.includes("interactivo")) return "whatsapp";
      if (name.includes("api") || name.includes("webhook")) return "api";
      if (name.includes("test") || name.includes("prueba")) return "test";
      if (name.includes("despliegue") || name.includes("activación")) return "deploy";
      if (name.includes("documentación")) return "document";
      if (name.includes("entrenamiento")) return "user";
    }
    
    if (processType === "web") {
      if (name.includes("análisis") || name.includes("requerimientos")) return "start";
      if (name.includes("frontend") || name.includes("backend")) return "code";
      if (name.includes("test") || name.includes("prueba")) return "test";
      if (name.includes("despliegue")) return "deploy";
      if (name.includes("documentación")) return "document";
    }
    
    if (processType === "network") {
      if (name.includes("evaluación") || name.includes("sitio")) return "start";
      if (name.includes("cableado") || name.includes("instalación")) return "network";
      if (name.includes("configuración")) return "settings";
      if (name.includes("prueba") || name.includes("conectividad")) return "test";
      if (name.includes("entrega") || name.includes("capacitación")) return "user";
    }
    
    // Tipos genéricos
    if (name.includes("inicio") || name.includes("start")) return "start";
    if (name.includes("decisión") || name.includes("decision")) return "decision";
    if (name.includes("base de datos") || name.includes("database")) return "database";
    if (name.includes("api") || name.includes("servicio")) return "api";
    if (name.includes("test") || name.includes("prueba")) return "test";
    if (name.includes("despliegue") || name.includes("deploy")) return "deploy";
    if (name.includes("documentación") || name.includes("manual")) return "document";
    if (name.includes("usuario") || name.includes("user")) return "user";
    
    return "process";
  }

  function getEdgeColor(status: string): string {
    switch (status) {
      case "completed":
        return "#10b981"; // green
      case "in_progress":
        return "#3b82f6"; // blue
      case "error":
        return "#ef4444"; // red
      case "skipped":
        return "#f59e0b"; // yellow
      default:
        return "#6b7280"; // gray
    }
  }

  // Inicializar nodos y edges
  useState(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  });

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const addNewNode = () => {
    const newNodeId = `step-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: "custom",
      position: { x: Math.random() * 500, y: Math.random() * 300 },
      data: {
        id: newNodeId,
        name: "Nuevo Paso",
        description: "Descripción del nuevo paso",
        status: "pending",
        order: nodes.length + 1,
        estimated_hours: 8,
        assigned_to: "Sin asignar",
        type: "process",
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const deleteSelectedNode = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
      setSelectedNode(null);
    }
  };

  const saveDiagram = () => {
    const updatedSteps: ProcessStep[] = nodes.map((node, index) => ({
      id: node.data.id as string,
      name: node.data.name as string,
      description: node.data.description as string,
      status: node.data.status as ProcessStep['status'],
      order: index + 1,
      estimated_hours: node.data.estimated_hours as number,
      actual_hours: node.data.actual_hours as number | undefined,
      notes: node.data.notes as string | undefined,
      completed_at: node.data.completed_at as string | undefined,
      assigned_to: node.data.assigned_to as string | undefined,
      type: node.data.type as string | undefined,
    }));
    onStepsUpdate(updatedSteps);
  };

  const resetDiagram = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  const exportDiagram = () => {
    const diagramData = {
      nodes,
      edges,
      steps,
      processType,
    };
    const dataStr = JSON.stringify(diagramData, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `diagram-${processType}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="w-full h-[600px] border border-gray-200 rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-gray-50"
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.type === "input") return "#0041d0";
            if (n.type === "output") return "#ff0072";
            return "#1a192b";
          }}
          nodeColor={(n) => {
            if (n.data?.status === "completed") return "#10b981";
            if (n.data?.status === "in_progress") return "#3b82f6";
            if (n.data?.status === "error") return "#ef4444";
            return "#fff";
          }}
        />
        
        {!readOnly && (
          <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-2">
            <div className="flex gap-2">
              <button
                onClick={addNewNode}
                className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                title="Agregar nodo"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={deleteSelectedNode}
                disabled={!selectedNode}
                className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                title="Eliminar nodo seleccionado"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={saveDiagram}
                className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                title="Guardar diagrama"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={resetDiagram}
                className="p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                title="Resetear diagrama"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={exportDiagram}
                className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                title="Exportar diagrama"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </Panel>
        )}
        
        <Panel position="top-right" className="bg-white rounded-lg shadow-lg p-2">
          <div className="text-xs text-gray-600">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Completado</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>En Progreso</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Error</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded"></div>
              <span>Pendiente</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
