"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  MessageCircle,
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Edit,
  Settings,
  ArrowRight,
  Menu,
  List,
  Send,
  Phone,
  User,
  Database,
  Code,
  FileText,
  Play,
  Pause,
  AlertTriangle,
  Clock
} from "lucide-react";

interface WhatsAppOption {
  id: string;
  text: string;
  nextNodeId?: string;
  action?: string;
  response?: string;
}

interface WhatsAppMenu {
  id: string;
  title: string;
  message: string;
  options: WhatsAppOption[];
  position: { x: number; y: number };
}

interface WhatsAppFlow {
  id: string;
  name: string;
  description: string;
  menus: WhatsAppMenu[];
  systemMessages?: Array<{
    id: string;
    message: string;
    position: { x: number; y: number };
  }>;
  clientMessages?: Array<{
    id: string;
    message: string;
    position: { x: number; y: number };
  }>;
  startNode: string;
  endNodes: string[];
  decisions?: Array<{
    id: string;
    question: string;
    options: Array<{ id: string; text: string; action: string }>;
    position: { x: number; y: number };
  }>;
  delays?: Array<{
    id: string;
    duration: number;
    message: string;
    position: { x: number; y: number };
  }>;
  connections?: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    label?: string;
    validationStatus?: 'pass' | 'error' | 'pending';
  }>;
  validationStatus: "pending" | "validated" | "error";
  createdAt: string;
  updatedAt: string;
}

interface WhatsAppFlowEditorProps {
  flow?: WhatsAppFlow;
  onSave: (flow: WhatsAppFlow) => void;
  onValidate: (flow: WhatsAppFlow) => boolean;
  readOnly?: boolean;
}

// Nodo personalizado para menús de WhatsApp
const WhatsAppMenuNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const { setEdges } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);

  const handleSave = () => {
    data.onUpdate(editData);
    setIsEditing(false);
  };

  const addOption = () => {
    const newOption: WhatsAppOption = {
      id: `option-${Date.now()}`,
      text: "Nueva opción",
      action: "message",
      nextNodeId: ""
    };
    const updatedData = {
      ...editData,
      options: [...editData.options, newOption]
    };
    setEditData(updatedData);
  };

  const removeOption = (optionId: string) => {
    const updatedData = {
      ...editData,
      options: editData.options.filter((opt: WhatsAppOption) => opt.id !== optionId)
    };
    setEditData(updatedData);
  };

  const updateOption = (optionId: string, field: string, value: string) => {
    const updatedData = {
      ...editData,
      options: editData.options.map((opt: WhatsAppOption) => 
        opt.id === optionId ? { ...opt, [field]: value } : opt
      )
    };
    setEditData(updatedData);
  };

  return (
    <div
      className={`bg-white border-2 rounded-lg p-4 min-w-[350px] max-w-[450px] ${
        selected ? "ring-2 ring-blue-500" : "border-gray-300"
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      {/* Handles para cada opción del menú - posicionados en el lado derecho */}
      {editData.options && editData.options.map((option: WhatsAppOption, index: number) => {
        // Calcular posición exacta para alinear con el texto de la opción
        if (isEditing) {
          // En modo edición, las opciones están en un contenedor con scroll
          const headerHeight = 120; // Altura del header (título + botones)
          const titleHeight = 20; // Altura del título del menú
          const messageHeight = 16; // Altura del mensaje
          const labelHeight = 16; // Altura del label "Opciones del menú"
          const optionHeight = 40; // Altura de cada opción en modo edición
          const optionPadding = 8; // Padding inicial
          
          // Posición base: header + título + mensaje + label + padding inicial
          const baseTop = headerHeight + titleHeight + messageHeight + labelHeight + optionPadding;
          
                     // Posición de cada opción: base + (índice * altura de opción) + mitad de la altura - 5px hacia arriba y separadas 6px
           const topPosition = baseTop + (index * (optionHeight + 6)) + (optionHeight / 2) - 5;
          
          return (
            <div key={`handle-container-${option.id}`} className="absolute right-0" style={{ top: `${topPosition}px`, transform: 'translateY(-50%)' }}>
              <Handle
                type="source"
                position={Position.Right}
                id={`option-${option.id}`}
                className="w-3 h-3 bg-green-500 hover:bg-green-600 transition-colors"
              />
              {/* Etiqueta del número de opción */}
              <div className="absolute -left-6 -top-1 w-5 h-5 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-medium">
                {index + 1}
              </div>
            </div>
          );
        } else {
          // En modo visualización, alinear con el texto de las opciones
          const headerHeight = 80; // Altura del header (título + botones)
          const titleHeight = 20; // Altura del título del menú
          const messageHeight = 16; // Altura del mensaje
          const optionPadding = 8; // Padding de cada opción
          const optionContentHeight = 24; // Altura del contenido de la opción (texto)
          
          // Posición base: header + título + mensaje + padding inicial
          const baseTop = headerHeight + titleHeight + messageHeight + optionPadding;
          
                     // Posición de cada opción: base + (índice * altura total de opción) + mitad de la altura del contenido - 5px hacia arriba y separadas 6px
           const optionTotalHeight = optionPadding + optionContentHeight + optionPadding; // padding + contenido + padding
           const topPosition = baseTop + (index * (optionTotalHeight + 6)) + (optionContentHeight / 2) - 5;
          
          return (
            <div key={`handle-container-${option.id}`} className="absolute right-0" style={{ top: `${topPosition}px`, transform: 'translateY(-50%)' }}>
              <Handle
                type="source"
                position={Position.Right}
                id={`option-${option.id}`}
                className="w-3 h-3 bg-green-500 hover:bg-green-600 transition-colors"
              />
              {/* Etiqueta del número de opción */}
              <div className="absolute -left-6 -top-1 w-5 h-5 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-medium">
                {index + 1}
              </div>
            </div>
          );
                 }
       })}
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-sm">Menú WhatsApp</span>
          {/* Indicador de conexiones */}
          {data.options && data.options.filter((opt: WhatsAppOption) => opt.nextNodeId).length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {data.options.filter((opt: WhatsAppOption) => opt.nextNodeId).length} conexiones
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 text-gray-500 hover:text-blue-600"
            title="Editar menú"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              // Cambiar estado de todas las conexiones de este menú a PASS
              const menuId = data.id;
              setEdges((prevEdges: Edge[]) => prevEdges.map((edge: Edge) => {
                if (edge.source === menuId) {
                  return {
                    ...edge,
                    style: { ...edge.style, stroke: "#10b981", strokeDasharray: "none" },
                    label: `✅ PASS - ${typeof edge.label === 'string' ? edge.label.replace(/^[✅❌⏳]\s*(PASS|ERROR|PENDING)\s*-\s*/, '') : 'Conexión'}`,
                    labelStyle: { fontSize: 11, fill: "#059669", fontWeight: "bold", backgroundColor: "#ecfdf5", padding: "3px 6px", borderRadius: "4px" },
                    labelBgStyle: { fill: "#ecfdf5", fillOpacity: 0.9 },
                    markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "#10b981" }
                  };
                }
                return edge;
              }));
            }}
            className="p-1 text-green-600 hover:text-green-700"
            title="Marcar conexiones como PASS"
          >
            ✓
          </button>
          <button
            onClick={() => {
              // Cambiar estado de todas las conexiones de este menú a ERROR
              const menuId = data.id;
              setEdges((prevEdges: Edge[]) => prevEdges.map((edge: Edge) => {
                if (edge.source === menuId) {
                  return {
                    ...edge,
                    style: { ...edge.style, stroke: "#ef4444", strokeDasharray: "10,5" },
                    label: `❌ ERROR - ${typeof edge.label === 'string' ? edge.label.replace(/^[✅❌⏳]\s*(PASS|ERROR|PENDING)\s*-\s*/, '') : 'Conexión'}`,
                    labelStyle: { fontSize: 11, fill: "#dc2626", fontWeight: "bold", backgroundColor: "#fef2f2", padding: "3px 6px", borderRadius: "4px" },
                    labelBgStyle: { fill: "#fef2f2", fillOpacity: 0.9 },
                    markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "#ef4444" }
                  };
                }
                return edge;
              }));
            }}
            className="p-1 text-red-600 hover:text-red-700"
            title="Marcar conexiones como ERROR"
          >
            ✗
          </button>
          <button
            onClick={() => {
              // Cambiar estado de todas las conexiones de este menú a PENDING
              const menuId = data.id;
              setEdges((prevEdges: Edge[]) => prevEdges.map((edge: Edge) => {
                if (edge.source === menuId) {
                  return {
                    ...edge,
                    style: { ...edge.style, stroke: "#f59e0b", strokeDasharray: "5,5" },
                    label: `⏳ PENDING - ${typeof edge.label === 'string' ? edge.label.replace(/^[✅❌⏳]\s*(PASS|ERROR|PENDING)\s*-\s*/, '') : 'Conexión'}`,
                    labelStyle: { fontSize: 11, fill: "#d97706", fontWeight: "bold", backgroundColor: "#fffbeb", padding: "3px 6px", borderRadius: "4px" },
                    labelBgStyle: { fill: "#fffbeb", fillOpacity: 0.9 },
                    markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "#f59e0b" }
                  };
                }
                return edge;
              }));
            }}
            className="p-1 text-yellow-600 hover:text-yellow-700"
            title="Marcar conexiones como PENDING"
          >
            ⏳
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Título del menú</label>
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mensaje</label>
            <textarea
              value={editData.message}
              onChange={(e) => setEditData({ ...editData, message: e.target.value })}
              rows={2}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700">Opciones del menú</label>
              <button
                onClick={addOption}
                className="p-1 text-green-600 hover:text-green-700"
                title="Agregar opción"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {editData.options.map((option: WhatsAppOption, index: number) => (
                <div key={option.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="text-xs text-gray-500 w-6">{index + 1}</span>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => updateOption(option.id, 'text', e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                    placeholder="Texto de la opción"
                  />
                  <select
                    value={option.action || 'message'}
                    onChange={(e) => updateOption(option.id, 'action', e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded"
                  >
                    <option value="message">Mensaje</option>
                    <option value="menu">Submenú</option>
                    <option value="phone">Llamar</option>
                    <option value="url">Enlace</option>
                    <option value="end">Finalizar</option>
                  </select>
                  <input
                    type="text"
                    value={option.nextNodeId || ''}
                    onChange={(e) => updateOption(option.id, 'nextNodeId', e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded w-20"
                    placeholder="ID nodo"
                    title="ID del nodo destino"
                  />
                  <button
                    onClick={() => removeOption(option.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="Eliminar opción"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
              Guardar
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <h4 className="font-medium text-sm text-gray-900">{data.title}</h4>
            <p className="text-xs text-gray-600 mt-1">{data.message}</p>
          </div>
          
          <div className="space-y-2">
            {data.options.map((option: WhatsAppOption, index: number) => (
              <div key={option.id} className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded border-l-4 border-green-300">
                <span className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <span className="text-gray-700 font-medium flex-1">{option.text}</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">→</span>
                  <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                    {option.action}
                  </span>
                  {option.nextNodeId && (
                    <>
                      <span className="text-gray-500">→</span>
                      <span className="text-purple-600 text-xs bg-purple-100 px-2 py-1 rounded font-mono">
                        {option.nextNodeId}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Nodo para mensajes del sistema
const SystemMessageNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);

  const handleSave = () => {
    data.onUpdate(editData);
    setIsEditing(false);
  };

  return (
    <div
      className={`bg-blue-50 border-2 rounded-lg p-4 min-w-[250px] ${
        selected ? "ring-2 ring-blue-500" : "border-blue-300"
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-sm">Mensaje Sistema</span>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-1 text-gray-500 hover:text-blue-600"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mensaje del Sistema</label>
            <textarea
              value={editData.message}
              onChange={(e) => setEditData({ ...editData, message: e.target.value })}
              rows={3}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              placeholder="Escribe el mensaje que enviará el sistema..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Guardar
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-700">{data.message}</p>
          <div className="mt-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
            💬 Sistema → Cliente
          </div>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

// Nodo para mensajes del cliente
const ClientMessageNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);

  const handleSave = () => {
    data.onUpdate(editData);
    setIsEditing(false);
  };

  return (
    <div
      className={`bg-green-50 border-2 rounded-lg p-4 min-w-[250px] ${
        selected ? "ring-2 ring-green-500" : "border-green-300"
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-sm">Mensaje Cliente</span>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-1 text-gray-500 hover:text-green-600"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mensaje del Cliente</label>
            <textarea
              value={editData.message}
              onChange={(e) => setEditData({ ...editData, message: e.target.value })}
              rows={3}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
              placeholder="Escribe el mensaje que enviará el cliente..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
              Guardar
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-700">{data.message}</p>
          <div className="mt-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
            👤 Cliente → Sistema
          </div>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

// Nodo para inicio (editable)
const StartNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);

  const handleSave = () => {
    data.onUpdate(editData);
    setIsEditing(false);
  };

  return (
    <div
      className={`bg-green-50 border-2 rounded-full p-4 w-32 h-32 flex items-center justify-center ${
        selected ? "ring-2 ring-green-500" : "border-green-300"
      }`}
    >
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      
      {isEditing ? (
        <div className="text-center w-full">
          <input
            type="text"
            value={editData.label}
            onChange={(e) => setEditData({ ...editData, label: e.target.value })}
            className="w-full text-xs text-center bg-white border border-green-300 rounded px-1 py-1 mb-1"
            placeholder="Etiqueta"
          />
          <div className="flex gap-1 justify-center">
            <button
              onClick={handleSave}
              className="w-4 h-4 bg-green-600 text-white rounded text-xs flex items-center justify-center"
            >
              ✓
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="w-4 h-4 bg-gray-500 text-white rounded text-xs flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <Play className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <span className="text-sm font-medium text-green-800">{data.label || "Inicio"}</span>
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-1 right-1 p-1 text-green-600 hover:text-green-700 opacity-0 hover:opacity-100 transition-opacity"
          >
            <Edit className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

// Nodo para fin (editable)
const EndNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);

  const handleSave = () => {
    data.onUpdate(editData);
    setIsEditing(false);
  };

  return (
    <div
      className={`bg-red-50 border-2 rounded-full p-4 w-32 h-32 flex items-center justify-center ${
        selected ? "ring-2 ring-red-500" : "border-red-300"
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      {isEditing ? (
        <div className="text-center w-full">
          <input
            type="text"
            value={editData.label}
            onChange={(e) => setEditData({ ...editData, label: e.target.value })}
            className="w-full text-xs text-center bg-white border border-red-300 rounded px-1 py-1 mb-1"
            placeholder="Etiqueta"
          />
          <div className="flex gap-1 justify-center">
            <button
              onClick={handleSave}
              className="w-4 h-4 bg-red-600 text-white rounded text-xs flex items-center justify-center"
            >
              ✓
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="w-4 h-4 bg-gray-500 text-white rounded text-xs flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
          <span className="text-sm font-medium text-red-800">{data.label || "Fin"}</span>
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-1 right-1 p-1 text-red-600 hover:text-red-700 opacity-0 hover:opacity-100 transition-opacity"
          >
            <Edit className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

// Nodo para decisiones
const DecisionNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);

  const handleSave = () => {
    data.onUpdate(editData);
    setIsEditing(false);
  };

  const addOption = () => {
    const newOption = {
      id: `opt-${Date.now()}`,
      text: "Nueva opción",
      action: "yes"
    };
    setEditData({
      ...editData,
      options: [...editData.options, newOption]
    });
  };

  const removeOption = (optionId: string) => {
    setEditData({
      ...editData,
      options: editData.options.filter((opt: any) => opt.id !== optionId)
    });
  };

  const updateOption = (optionId: string, field: string, value: string) => {
    setEditData({
      ...editData,
      options: editData.options.map((opt: any) => 
        opt.id === optionId ? { ...opt, [field]: value } : opt
      )
    });
  };

  return (
    <div
      className={`bg-yellow-50 border-2 rounded-lg p-4 min-w-[250px] ${
        selected ? "ring-2 ring-yellow-500" : "border-yellow-300"
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <span className="font-semibold text-sm">Decisión</span>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-1 text-gray-500 hover:text-yellow-600"
          title="Editar decisión"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Pregunta</label>
            <input
              type="text"
              value={editData.question}
              onChange={(e) => setEditData({ ...editData, question: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700">Opciones</label>
              <button
                onClick={addOption}
                className="p-1 text-green-600 hover:text-green-700"
                title="Agregar opción"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            
            <div className="space-y-2 max-h-24 overflow-y-auto">
              {editData.options.map((option: any, index: number) => (
                <div key={option.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="text-xs text-gray-500 w-4">{index + 1}</span>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => updateOption(option.id, 'text', e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                    placeholder="Texto de la opción"
                  />
                  <button
                    onClick={() => removeOption(option.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="Eliminar opción"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
            >
              Guardar
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-900">{data.question}</h4>
          <div className="space-y-1">
            {data.options.map((option: any, index: number) => (
              <div key={option.id} className="flex items-center gap-2 text-xs">
                <span className="w-4 h-4 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-xs">
                  {index + 1}
                </span>
                <span className="text-gray-700">{option.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

// Nodo para delays/esperas
const DelayNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);

  const handleSave = () => {
    data.onUpdate(editData);
    setIsEditing(false);
  };

  return (
    <div
      className={`bg-purple-50 border-2 rounded-lg p-4 min-w-[200px] ${
        selected ? "ring-2 ring-purple-500" : "border-purple-300"
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-600" />
          <span className="font-semibold text-sm">Espera</span>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-1 text-gray-500 hover:text-purple-600"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Duración (segundos)</label>
            <input
              type="number"
              value={editData.duration}
              onChange={(e) => setEditData({ ...editData, duration: parseInt(e.target.value) })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
              min="1"
              max="300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mensaje de espera</label>
            <input
              type="text"
              value={editData.message}
              onChange={(e) => setEditData({ ...editData, message: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
            >
              Guardar
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-sm text-gray-700">{data.message}</p>
          <p className="text-xs text-purple-600 font-medium">{data.duration} segundos</p>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

const nodeTypes: NodeTypes = {
  whatsappMenu: WhatsAppMenuNode,
  systemMessage: SystemMessageNode,
  clientMessage: ClientMessageNode,
  start: StartNode,
  end: EndNode,
  decision: DecisionNode,
  delay: DelayNode,
};

export default function WhatsAppFlowEditor({
  flow,
  onSave,
  onValidate,
  readOnly = false,
}: WhatsAppFlowEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [showValidationPanel, setShowValidationPanel] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [processTracker, setProcessTracker] = useState<Array<{
    id: string;
    step: string;
    status: 'pending' | 'pass' | 'error';
    message: string;
    timestamp: string;
  }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [connectionValidator, setConnectionValidator] = useState<Array<{
    id: string;
    sourceNode: string;
    targetNode: string;
    sourceHandle?: string;
    label?: string;
    status: 'pending' | 'pass' | 'error';
    timestamp: string;
  }>>([]);

  // Convertir flujo a nodos de React Flow
  const initialNodes = useMemo(() => {
    if (!flow) return [];
    
    const nodes: Node[] = [];
    
    // Nodo de inicio
    if (flow.startNode) {
      // Buscar si hay una posición guardada para el nodo de inicio
      const startNodeData = flow.menus.find(m => m.id === flow.startNode) || 
                           flow.systemMessages?.find(m => m.id === flow.startNode) ||
                           flow.clientMessages?.find(m => m.id === flow.startNode) ||
                           flow.decisions?.find(d => d.id === flow.startNode) ||
                           flow.delays?.find(d => d.id === flow.startNode);
      
      nodes.push({
        id: flow.startNode,
        type: "start",
        position: startNodeData?.position || { x: 250, y: 50 }, // Usar posición guardada o por defecto
        data: { 
          label: "Inicio",
          onUpdate: (updatedData: any) => {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === flow.startNode ? { ...node, data: { ...node.data, ...updatedData } } : node
              )
            );
          },
        },
      });
    }

    // Nodos de menús
    flow.menus.forEach((menu) => {
      nodes.push({
        id: menu.id,
        type: "whatsappMenu",
        position: menu.position ? { x: menu.position.x, y: menu.position.y } : { x: 250, y: 150 },
        data: {
          ...menu,
          setEdges,
          onUpdate: (updatedData: any) => {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === menu.id ? { ...node, data: { ...node.data, ...updatedData } } : node
              )
            );
          },
        },
      });
    });

    // Nodos de mensajes del sistema
    flow.systemMessages?.forEach((message: any) => {
      nodes.push({
        id: message.id,
        type: "systemMessage",
        position: message.position ? { x: message.position.x, y: message.position.y } : { x: 250, y: 250 },
        data: {
          ...message,
          onUpdate: (updatedData: any) => {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === message.id ? { ...node, data: { ...node.data, ...updatedData } } : node
              )
            );
          },
        },
      });
    });

    // Nodos de mensajes del cliente
    flow.clientMessages?.forEach((message: any) => {
      nodes.push({
        id: message.id,
        type: "clientMessage",
        position: message.position ? { x: message.position.x, y: message.position.y } : { x: 250, y: 250 },
        data: {
          ...message,
          onUpdate: (updatedData: any) => {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === message.id ? { ...node, data: { ...node.data, ...updatedData } } : node
              )
            );
          },
        },
      });
    });

    // Nodos de decisiones
    flow.decisions?.forEach((decision) => {
      nodes.push({
        id: decision.id,
        type: "decision",
        position: decision.position ? { x: decision.position.x, y: decision.position.y } : { x: 250, y: 350 },
        data: {
          ...decision,
          onUpdate: (updatedData: any) => {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === decision.id ? { ...node, data: { ...node.data, ...updatedData } } : node
              )
            );
          },
        },
      });
    });

    // Nodos de delays
    flow.delays?.forEach((delay) => {
      nodes.push({
        id: delay.id,
        type: "delay",
        position: delay.position ? { x: delay.position.x, y: delay.position.y } : { x: 250, y: 450 },
        data: {
          ...delay,
          onUpdate: (updatedData: any) => {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === delay.id ? { ...node, data: { ...node.data, ...updatedData } } : node
              )
            );
          },
        },
      });
    });

    // Nodos de fin
    flow.endNodes.forEach((endNode, index) => {
      nodes.push({
        id: endNode,
        type: "end",
        position: { x: 250 + index * 200, y: 500 },
        data: { 
          label: "Fin",
          onUpdate: (updatedData: any) => {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === endNode ? { ...node, data: { ...node.data, ...updatedData } } : node
              )
            );
          },
        },
      });
    });

    return nodes;
  }, [flow]);

  // Crear conexiones con validadores visuales
  const initialEdges = useMemo(() => {
    if (!flow) return [];
    
    const edges: Edge[] = [];
    
    // Cargar conexiones guardadas
    if (flow.connections && flow.connections.length > 0) {
      flow.connections.forEach((connection) => {
        // Determinar estado de validación basado en la conexión guardada
        const validationStatus = connection.validationStatus || 'pending';
        const getValidationStyle = (status: string) => {
          switch (status) {
            case 'pass':
              return {
                stroke: "#10b981",
                strokeWidth: 3,
                strokeDasharray: "none"
              };
            case 'error':
              return {
                stroke: "#ef4444", 
                strokeWidth: 3,
                strokeDasharray: "10,5"
              };
            case 'retry':
              return {
                stroke: "#8b5cf6",
                strokeWidth: 3,
                strokeDasharray: "8,4"
              };
            case 'pending':
            default:
              return {
                stroke: "#f59e0b",
                strokeWidth: 3,
                strokeDasharray: "5,5"
              };
          }
        };
        
        const getValidationLabel = (status: string) => {
          switch (status) {
            case 'pass':
              return `✅ PASS - ${connection.label || 'Conexión'}`;
            case 'error':
              return `❌ ERROR - ${connection.label || 'Conexión'}`;
            case 'retry':
              return `🔄 RETRY - ${connection.label || 'Conexión'}`;
            case 'pending':
            default:
              return `⏳ PENDING - ${connection.label || 'Conexión'}`;
          }
        };
        
        const getValidationLabelStyle = (status: string) => {
          switch (status) {
            case 'pass':
              return {
                fontSize: 11,
                fill: "#059669",
                fontWeight: "bold",
                backgroundColor: "#ecfdf5",
                padding: "3px 6px",
                borderRadius: "4px"
              };
            case 'error':
              return {
                fontSize: 11,
                fill: "#dc2626",
                fontWeight: "bold",
                backgroundColor: "#fef2f2",
                padding: "3px 6px",
                borderRadius: "4px"
              };
            case 'retry':
              return {
                fontSize: 11,
                fill: "#7c3aed",
                fontWeight: "bold",
                backgroundColor: "#f3f4f6",
                padding: "3px 6px",
                borderRadius: "4px"
              };
            case 'pending':
            default:
              return {
                fontSize: 11,
                fill: "#d97706",
                fontWeight: "bold",
                backgroundColor: "#fffbeb",
                padding: "3px 6px",
                borderRadius: "4px"
              };
          }
        };
        
        const getValidationLabelBgStyle = (status: string) => {
          switch (status) {
            case 'pass':
              return { fill: "#ecfdf5", fillOpacity: 0.9 };
            case 'error':
              return { fill: "#fef2f2", fillOpacity: 0.9 };
            case 'retry':
              return { fill: "#f3f4f6", fillOpacity: 0.9 };
            case 'pending':
            default:
              return { fill: "#fffbeb", fillOpacity: 0.9 };
          }
        };
        
        edges.push({
          id: connection.id,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          type: "smoothstep",
          style: getValidationStyle(validationStatus),
          markerEnd: { 
            type: MarkerType.ArrowClosed, 
            width: 20, 
            height: 20, 
            color: getValidationStyle(validationStatus).stroke 
          },
          label: getValidationLabel(validationStatus),
          labelStyle: getValidationLabelStyle(validationStatus),
          labelBgStyle: getValidationLabelBgStyle(validationStatus),
          data: {
            validationStatus: validationStatus
          }
        });
      });
    } else {
      // Conexiones por defecto si no hay conexiones guardadas
      // Conectar inicio con el primer menú
      if (flow.menus.length > 0) {
        edges.push({
          id: `e-${flow.startNode}-${flow.menus[0].id}`,
          source: flow.startNode,
          target: flow.menus[0].id,
          type: "smoothstep",
          style: { 
            stroke: "#10b981", 
            strokeWidth: 3,
            strokeDasharray: "none"
          },
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "#10b981" },
          label: "✅ PASS - Inicio",
          labelStyle: { 
            fontSize: 11, 
            fill: "#059669",
            fontWeight: "bold",
            backgroundColor: "#ecfdf5",
            padding: "3px 6px",
            borderRadius: "4px"
          },
          labelBgStyle: { fill: "#ecfdf5", fillOpacity: 0.9 },
        });
      }
      
      // Crear conexiones basadas en las opciones de los menús
      flow.menus.forEach((menu) => {
        menu.options.forEach((option, optionIndex) => {
          if (option.nextNodeId) {
            // Buscar el nodo destino
            const targetNode = flow.menus.find(m => m.id === option.nextNodeId) || 
                             flow.endNodes.find(endId => endId === option.nextNodeId);
            
            if (targetNode) {
              edges.push({
                id: `e-${menu.id}-${option.id}-${option.nextNodeId}`,
                source: menu.id,
                target: option.nextNodeId,
                sourceHandle: `option-${option.id}`,
                type: "smoothstep",
                style: { 
                  stroke: "#3b82f6", 
                  strokeWidth: 3,
                  strokeDasharray: optionIndex % 2 === 0 ? "5,5" : "none"
                },
                markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "#3b82f6" },
                label: `⏳ PENDING - ${option.text}`,
                labelStyle: { 
                  fontSize: 11, 
                  fill: "#d97706",
                  fontWeight: "bold",
                  backgroundColor: "#fffbeb",
                  padding: "3px 6px",
                  borderRadius: "4px"
                },
                labelBgStyle: { fill: "#fffbeb", fillOpacity: 0.9 },
              });
            }
          } else if (option.action === "end") {
            // Conectar con nodo de fin
            const endNodeId = flow.endNodes[optionIndex] || flow.endNodes[0];
            if (endNodeId) {
              edges.push({
                id: `e-${menu.id}-${option.id}-${endNodeId}`,
                source: menu.id,
                target: endNodeId,
                sourceHandle: `option-${option.id}`,
                type: "smoothstep",
                style: { 
                  stroke: "#ef4444", 
                  strokeWidth: 3,
                  strokeDasharray: "10,5"
                },
                markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "#ef4444" },
                label: `❌ ERROR - ${option.text}`,
                labelStyle: { 
                  fontSize: 11, 
                  fill: "#dc2626",
                  fontWeight: "bold",
                  backgroundColor: "#fef2f2",
                  padding: "3px 6px",
                  borderRadius: "4px"
                },
                labelBgStyle: { fill: "#fef2f2", fillOpacity: 0.9 },
              });
            }
          }
        });
      });
    }

    return edges;
  }, [flow]);

  // Inicializar nodos y edges
  useState(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  });
  
  // Inicializar validador de conexiones cuando se carguen los edges
  useEffect(() => {
    if (edges.length > 0) {
      updateConnectionValidator();
    }
  }, [edges.length]);
  
  // Actualizar validador cuando cambien las conexiones
  useEffect(() => {
    updateConnectionValidator();
  }, [edges]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Agregar la nueva conexión
      setEdges((eds) => addEdge(params, eds));
      
      // Si la conexión viene de un handle de opción, actualizar el nextNodeId
      if (params.sourceHandle && params.sourceHandle.startsWith('option-')) {
        const optionId = params.sourceHandle.replace('option-', '');
        const sourceNode = nodes.find(n => n.id === params.source);
        
        if (sourceNode && sourceNode.data.options) {
          const options = sourceNode.data.options as WhatsAppOption[];
          const updatedOptions = options.map((opt: WhatsAppOption) => 
            opt.id === optionId ? { ...opt, nextNodeId: params.target } : opt
          );
          
          setNodes((nds) =>
            nds.map((node) =>
              node.id === params.source 
                ? { ...node, data: { ...node.data, options: updatedOptions } }
                : node
            )
          );
        }
      }
      
      // Actualizar validador de conexiones después de un breve delay
      setTimeout(() => updateConnectionValidator(), 100);
    },
    [setEdges, nodes, setNodes]
  );
  
  // Función para actualizar el validador de conexiones
  const updateConnectionValidator = useCallback(() => {
    const newConnections = edges.map(edge => ({
      id: edge.id,
      sourceNode: edge.source,
      targetNode: edge.target,
      sourceHandle: edge.sourceHandle || undefined,
      label: typeof edge.label === 'string' ? edge.label : undefined,
      status: 'pending' as const,
      timestamp: new Date().toISOString()
    }));
    
    // Mantener estados existentes para conexiones que ya existen
    const updatedConnections = newConnections.map(newConn => {
      const existingConn = connectionValidator.find(conn => conn.id === newConn.id);
      return existingConn ? { ...newConn, status: existingConn.status } : newConn;
    });
    
    setConnectionValidator(updatedConnections);
  }, [edges, connectionValidator]);

  const onNodeClick = useCallback((event: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onEdgeClick = useCallback((event: any, edge: Edge) => {
    // Mostrar menú contextual para cambiar estado de validación
    const newStatus = prompt(
      `Cambiar estado de conexión "${edge.label || 'Conexión'}":\n\n1. PASS (Cumple)\n2. ERROR (No cumple)\n3. PENDING (Pendiente)\n\nIngresa el número (1, 2 o 3):`
    );
    
    if (newStatus === '1' || newStatus === '2' || newStatus === '3') {
      let status: 'pass' | 'error' | 'pending';
      let style: any;
      let label: string;
      let labelStyle: any;
      let labelBgStyle: any;
      let markerColor: string;
      
      switch (newStatus) {
        case '1':
          status = 'pass';
          style = { stroke: "#10b981", strokeWidth: 3, strokeDasharray: "none" };
          label = `✅ PASS - ${typeof edge.label === 'string' ? edge.label.replace(/^[✅❌⏳]\s*(PASS|ERROR|PENDING)\s*-\s*/, '') : 'Conexión'}`;
          labelStyle = { fontSize: 11, fill: "#059669", fontWeight: "bold", backgroundColor: "#ecfdf5", padding: "3px 6px", borderRadius: "4px" };
          labelBgStyle = { fill: "#ecfdf5", fillOpacity: 0.9 };
          markerColor = "#10b981";
          break;
        case '2':
          status = 'error';
          style = { stroke: "#ef4444", strokeWidth: 3, strokeDasharray: "10,5" };
          label = `❌ ERROR - ${typeof edge.label === 'string' ? edge.label.replace(/^[✅❌⏳]\s*(PASS|ERROR|PENDING)\s*-\s*/, '') : 'Conexión'}`;
          labelStyle = { fontSize: 11, fill: "#dc2626", fontWeight: "bold", backgroundColor: "#fef2f2", padding: "3px 6px", borderRadius: "4px" };
          labelBgStyle = { fill: "#fef2f2", fillOpacity: 0.9 };
          markerColor = "#ef4444";
          break;
        case '3':
        default:
          status = 'pending';
          style = { stroke: "#f59e0b", strokeWidth: 3, strokeDasharray: "5,5" };
          label = `⏳ PENDING - ${typeof edge.label === 'string' ? edge.label.replace(/^[✅❌⏳]\s*(PASS|ERROR|PENDING)\s*-\s*/, '') : 'Conexión'}`;
          labelStyle = { fontSize: 11, fill: "#d97706", fontWeight: "bold", backgroundColor: "#fffbeb", padding: "3px 6px", borderRadius: "4px" };
          labelBgStyle = { fill: "#fffbeb", fillOpacity: 0.9 };
          markerColor = "#f59e0b";
          break;
      }
      
      setEdges(prevEdges => prevEdges.map(e => 
        e.id === edge.id ? {
          ...e,
          style,
          label,
          labelStyle,
          labelBgStyle,
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: markerColor }
        } : e
      ));
      
      // Guardar automáticamente después de cambiar el estado de validación (deshabilitado temporalmente)
      // setTimeout(() => saveFlow(), 300);
    }
  }, [setEdges]);

  // Guardar posiciones automáticamente cuando se mueven los nodos
  const onNodeDragStop = useCallback((event: any, node: Node) => {
    console.log("📍 Nodo movido:", node.id, "a posición:", node.position);
    // Guardar automáticamente después de mover un nodo (deshabilitado temporalmente)
    // setTimeout(() => saveFlow(), 500);
  }, []);

  const addMenuNode = () => {
    const newNodeId = `menu-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: "whatsappMenu",
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 150 },
      data: {
        id: newNodeId,
        title: "Nuevo Menú",
        message: "Selecciona una opción:",
        options: [
          { id: `opt-${Date.now()}-1`, text: "Opción 1", action: "message", nextNodeId: "" },
          { id: `opt-${Date.now()}-2`, text: "Opción 2", action: "message", nextNodeId: "" },
        ],
        setEdges,
        onUpdate: (updatedData: any) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === newNodeId ? { ...node, data: { ...node.data, ...updatedData } } : node
            )
          );
          
          // Actualizar conexiones basadas en las opciones actualizadas
          updateConnectionsFromMenu(newNodeId, updatedData.options);
        },
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const updateConnectionsFromMenu = (menuId: string, options: WhatsAppOption[]) => {
    // Eliminar conexiones existentes de este menú
    setEdges((eds) => eds.filter(edge => !edge.source.startsWith(menuId)));
    
    // Crear nuevas conexiones basadas en las opciones
    options.forEach((option, index) => {
      if (option.nextNodeId) {
        const newEdge: Edge = {
          id: `e-${menuId}-${option.id}-${option.nextNodeId}`,
          source: menuId,
          target: option.nextNodeId,
          sourceHandle: `option-${option.id}`,
          type: "smoothstep",
          style: { 
            stroke: "#f59e0b", 
            strokeWidth: 3,
            strokeDasharray: "5,5"
          },
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "#f59e0b" },
          label: `⏳ PENDING - ${option.text}`,
          labelStyle: { 
            fontSize: 11, 
            fill: "#d97706",
            fontWeight: "bold",
            backgroundColor: "#fffbeb",
            padding: "3px 6px",
            borderRadius: "4px"
          },
          labelBgStyle: { fill: "#fffbeb", fillOpacity: 0.9 },
        };
        setEdges((eds) => [...eds, newEdge]);
      } else if (option.action === "end") {
        // Conexión de fin
        const newEdge: Edge = {
          id: `e-${menuId}-${option.id}-end`,
          source: menuId,
          target: "end",
          sourceHandle: `option-${option.id}`,
          type: "smoothstep",
          style: { 
            stroke: "#ef4444", 
            strokeWidth: 3,
            strokeDasharray: "10,5"
          },
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "#ef4444" },
          label: `❌ ERROR - ${option.text}`,
          labelStyle: { 
            fontSize: 11, 
            fill: "#dc2626",
            fontWeight: "bold",
            backgroundColor: "#fef2f2",
            padding: "3px 6px",
            borderRadius: "4px"
          },
          labelBgStyle: { fill: "#fef2f2", fillOpacity: 0.9 },
        };
        setEdges((eds) => [...eds, newEdge]);
      }
    });
  };

  const addSystemMessageNode = () => {
    const newNodeId = `system-message-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: "systemMessage",
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 150 },
      data: {
        id: newNodeId,
        message: "Nuevo mensaje del sistema",
        onUpdate: (updatedData: any) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === newNodeId ? { ...node, data: { ...node.data, ...updatedData } } : node
            )
          );
        },
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const addClientMessageNode = () => {
    const newNodeId = `client-message-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: "clientMessage",
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 150 },
      data: {
        id: newNodeId,
        message: "Nuevo mensaje del cliente",
        onUpdate: (updatedData: any) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === newNodeId ? { ...node, data: { ...node.data, ...updatedData } } : node
            )
          );
        },
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const addStartNode = () => {
    const newNodeId = `start-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: "start",
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 150 },
      data: {
        id: newNodeId,
        label: "Nuevo Inicio",
        onUpdate: (updatedData: any) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === newNodeId ? { ...node, data: { ...node.data, ...updatedData } } : node
            )
          );
        },
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const addEndNode = () => {
    const newNodeId = `end-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: "end",
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 150 },
      data: {
        id: newNodeId,
        label: "Nuevo Fin",
        onUpdate: (updatedData: any) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === newNodeId ? { ...node, data: { ...node.data, ...updatedData } } : node
            )
          );
        },
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const addDecisionNode = () => {
    const newNodeId = `decision-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: "decision",
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 150 },
      data: {
        id: newNodeId,
        question: "¿Pregunta de decisión?",
        options: [
          { id: `opt-${Date.now()}-1`, text: "Sí", action: "yes" },
          { id: `opt-${Date.now()}-2`, text: "No", action: "no" },
        ],
        onUpdate: (updatedData: any) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === newNodeId ? { ...node, data: { ...node.data, ...updatedData } } : node
            )
          );
        },
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const addDelayNode = () => {
    const newNodeId = `delay-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: "delay",
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 150 },
      data: {
        id: newNodeId,
        duration: 5,
        message: "Esperando...",
        onUpdate: (updatedData: any) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === newNodeId ? { ...node, data: { ...node.data, ...updatedData } } : node
            )
          );
        },
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const validateFlow = () => {
    const results: any[] = [];
    
    // Validar que hay un nodo de inicio
    const startNode = nodes.find(n => n.type === "start");
    if (!startNode) {
      results.push({ type: "error", message: "Falta nodo de inicio" });
    } else {
      results.push({ type: "success", message: "Nodo de inicio presente" });
    }

    // Validar que hay nodos de fin
    const endNodes = nodes.filter(n => n.type === "end");
    if (endNodes.length === 0) {
      results.push({ type: "error", message: "Falta al menos un nodo de fin" });
    } else {
      results.push({ type: "success", message: `${endNodes.length} nodos de fin encontrados` });
    }

    // Validar menús
    const menuNodes = nodes.filter(n => n.type === "whatsappMenu");
    menuNodes.forEach((menuNode, index) => {
      const menuData = menuNode.data as any;
      if (!menuData.title || menuData.title.trim() === "") {
        results.push({ type: "error", message: `Menú ${index + 1}: Falta título` });
      } else {
        results.push({ type: "success", message: `Menú ${index + 1}: Título válido` });
      }

      if (!menuData.message || menuData.message.trim() === "") {
        results.push({ type: "error", message: `Menú ${index + 1}: Falta mensaje` });
      } else {
        results.push({ type: "success", message: `Menú ${index + 1}: Mensaje válido` });
      }

      if (!menuData.options || menuData.options.length === 0) {
        results.push({ type: "error", message: `Menú ${index + 1}: Sin opciones` });
      } else {
        results.push({ type: "success", message: `Menú ${index + 1}: ${menuData.options.length} opciones` });
      }
    });

    // Validar mensajes
    const messageNodes = nodes.filter(n => n.type === "message");
    messageNodes.forEach((messageNode, index) => {
      const messageData = messageNode.data as any;
      if (!messageData.message || messageData.message.trim() === "") {
        results.push({ type: "error", message: `Mensaje ${index + 1}: Falta contenido` });
      } else {
        results.push({ type: "success", message: `Mensaje ${index + 1}: Contenido válido` });
      }
    });

    // Validar decisiones
    const decisionNodes = nodes.filter(n => n.type === "decision");
    decisionNodes.forEach((decisionNode, index) => {
      const decisionData = decisionNode.data as any;
      if (!decisionData.question || decisionData.question.trim() === "") {
        results.push({ type: "error", message: `Decisión ${index + 1}: Falta pregunta` });
      } else {
        results.push({ type: "success", message: `Decisión ${index + 1}: Pregunta válida` });
      }

      if (!decisionData.options || decisionData.options.length === 0) {
        results.push({ type: "error", message: `Decisión ${index + 1}: Sin opciones` });
      } else {
        results.push({ type: "success", message: `Decisión ${index + 1}: ${decisionData.options.length} opciones` });
      }
    });

    // Validar delays
    const delayNodes = nodes.filter(n => n.type === "delay");
    delayNodes.forEach((delayNode, index) => {
      const delayData = delayNode.data as any;
      if (!delayData.duration || delayData.duration < 1) {
        results.push({ type: "error", message: `Espera ${index + 1}: Duración inválida` });
      } else {
        results.push({ type: "success", message: `Espera ${index + 1}: Duración válida (${delayData.duration}s)` });
      }
    });

    // Validar conexiones
    if (edges.length === 0) {
      results.push({ type: "warning", message: "No hay conexiones entre nodos" });
    } else {
      results.push({ type: "success", message: `${edges.length} conexiones válidas` });
    }

    // Validar nodos aislados
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
    
    const isolatedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
    if (isolatedNodes.length > 0) {
      results.push({ type: "warning", message: `${isolatedNodes.length} nodos sin conexiones` });
    }

    setValidationResults(results);
    setShowValidationPanel(true);
    
    return results.every(r => r.type === "success");
  };

  const saveFlow = () => {
    if (!flow) return;
    
    // Hacer la función disponible globalmente para los nodos
    (window as any).saveFlowFunction = saveFlow;
    
    // Mostrar indicador de guardado
    setIsSaving(true);
    
    // Extraer todos los nodos y sus conexiones
    const menuNodes = nodes.filter(n => n.type === "whatsappMenu");
    const systemMessageNodes = nodes.filter(n => n.type === "systemMessage");
    const clientMessageNodes = nodes.filter(n => n.type === "clientMessage");
    const startNodes = nodes.filter(n => n.type === "start");
    const endNodes = nodes.filter(n => n.type === "end");
    const decisionNodes = nodes.filter(n => n.type === "decision");
    const delayNodes = nodes.filter(n => n.type === "delay");

    // Función para extraer el estado de validación de una conexión
    const getValidationStatus = (edge: Edge): 'pass' | 'error' | 'pending' => {
      const label = typeof edge.label === 'string' ? edge.label : '';
      if (label.includes('✅ PASS')) return 'pass';
      if (label.includes('❌ ERROR')) return 'error';
      return 'pending';
    };

    // Función para extraer el texto original sin el estado
    const getOriginalLabel = (edge: Edge): string => {
      const label = typeof edge.label === 'string' ? edge.label : '';
      return label.replace(/^[✅❌⏳]\s*(PASS|ERROR|PENDING)\s*-\s*/, '') || 'Conexión';
    };

    // Preservar datos existentes y solo actualizar lo que ha cambiado
    const updatedFlow: WhatsAppFlow = {
      ...flow,
      // Actualizar menús preservando datos existentes
      menus: menuNodes.map(n => {
        const existingMenu = flow.menus.find(m => m.id === n.id);
        return {
          ...existingMenu, // Preservar datos existentes
          id: n.id,
          title: (n.data as any).title || existingMenu?.title || "Nuevo Menú",
          message: (n.data as any).message || existingMenu?.message || "Selecciona una opción:",
          options: (n.data as any).options || existingMenu?.options || [],
          position: { x: n.position.x, y: n.position.y }, // Actualizar posición
        };
      }),
      // Actualizar mensajes del sistema preservando datos existentes
      systemMessages: systemMessageNodes.map(n => {
        const existingMessage = flow.systemMessages?.find(m => m.id === n.id);
        return {
          ...existingMessage, // Preservar datos existentes
          id: n.id,
          message: (n.data as any).message || existingMessage?.message || "Nuevo mensaje del sistema",
          position: { x: n.position.x, y: n.position.y }, // Actualizar posición
        };
      }),
      // Actualizar mensajes del cliente preservando datos existentes
      clientMessages: clientMessageNodes.map(n => {
        const existingMessage = flow.clientMessages?.find(m => m.id === n.id);
        return {
          ...existingMessage, // Preservar datos existentes
          id: n.id,
          message: (n.data as any).message || existingMessage?.message || "Nuevo mensaje del cliente",
          position: { x: n.position.x, y: n.position.y }, // Actualizar posición
        };
      }),
      startNode: startNodes.length > 0 ? startNodes[0].id : flow.startNode,
      endNodes: endNodes.map(n => n.id),
      // Actualizar decisiones preservando datos existentes
      decisions: decisionNodes.map(n => {
        const existingDecision = flow.decisions?.find(d => d.id === n.id);
        return {
          ...existingDecision, // Preservar datos existentes
          id: n.id,
          question: (n.data as any).question || existingDecision?.question || "¿Pregunta?",
          options: (n.data as any).options || existingDecision?.options || [],
          position: { x: n.position.x, y: n.position.y }, // Actualizar posición
        };
      }),
      // Actualizar delays preservando datos existentes
      delays: delayNodes.map(n => {
        const existingDelay = flow.delays?.find(d => d.id === n.id);
        return {
          ...existingDelay, // Preservar datos existentes
          id: n.id,
          duration: (n.data as any).duration || existingDelay?.duration || 5,
          message: (n.data as any).message || existingDelay?.message || "Esperando...",
          position: { x: n.position.x, y: n.position.y }, // Actualizar posición
        };
      }),
      // Actualizar conexiones preservando datos existentes
      connections: edges.map(edge => {
        const existingConnection = flow.connections?.find(c => c.id === edge.id);
        return {
          ...existingConnection, // Preservar datos existentes
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle || existingConnection?.sourceHandle,
          label: getOriginalLabel(edge),
          validationStatus: getValidationStatus(edge), // Actualizar estado de validación
        };
      }),
      updatedAt: new Date().toISOString(),
    };

    console.log("💾 Guardando flujo preservando datos existentes:", updatedFlow);
    onSave(updatedFlow);
    
    // Ocultar indicador de guardado después de un delay
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="w-full h-full border border-gray-200 rounded-lg relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-gray-50"
        style={{ width: '100%', height: '100%' }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.type === "start") return "#10b981";
            if (n.type === "end") return "#ef4444";
            if (n.type === "whatsappMenu") return "#3b82f6";
            return "#1a192b";
          }}
          nodeColor={(n) => {
            if (n.type === "start") return "#10b981";
            if (n.type === "end") return "#ef4444";
            if (n.type === "whatsappMenu") return "#3b82f6";
            return "#fff";
          }}
        />
        
        {!readOnly && (
          <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-2">
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1">
                <button
                  onClick={addStartNode}
                  className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  title="Agregar inicio"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  onClick={addEndNode}
                  className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  title="Agregar fin"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex gap-1">
                <button
                  onClick={addMenuNode}
                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  title="Agregar menú WhatsApp"
                >
                  <Menu className="w-4 h-4" />
                </button>
                <button
                  onClick={addSystemMessageNode}
                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  title="Agregar mensaje del sistema"
                >
                  <Send className="w-4 h-4" />
                </button>
                <button
                  onClick={addClientMessageNode}
                  className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  title="Agregar mensaje del cliente"
                >
                  <User className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex gap-1">
                <button
                  onClick={addDecisionNode}
                  className="p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                  title="Agregar decisión"
                >
                  <AlertTriangle className="w-4 h-4" />
                </button>
                <button
                  onClick={addDelayNode}
                  className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  title="Agregar espera"
                >
                  <Clock className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex gap-1">

                <button
                  onClick={() => {
                    // Leer el diagrama actual y crear procesos de validación
                    const validationProcesses = [];
                    
                    // Validar nodo de inicio
                    const startNode = nodes.find(n => n.type === 'start');
                    validationProcesses.push({
                      id: `start-${Date.now()}`,
                      step: "Nodo de Inicio",
                      status: (startNode ? 'pass' : 'error') as 'pending' | 'pass' | 'error',
                      message: startNode ? "✅ Nodo de inicio encontrado" : "❌ Falta nodo de inicio",
                      timestamp: new Date().toISOString()
                    });
                    
                    // Validar menús
                    const menuNodes = nodes.filter(n => n.type === 'whatsappMenu');
                    menuNodes.forEach((menu: Node, index) => {
                      const menuData = menu.data as any;
                      const hasTitle = menuData?.title && menuData.title.trim() !== '';
                      const hasMessage = menuData?.message && menuData.message.trim() !== '';
                      const hasOptions = menuData?.options && menuData.options.length > 0;
                      
                      validationProcesses.push({
                        id: `menu-${menu.id}-${Date.now()}`,
                        step: `Menú ${index + 1}: ${menu.data.title || 'Sin título'}`,
                        status: hasTitle && hasMessage && hasOptions ? 'pass' : 'error',
                        message: `${hasTitle ? '✅' : '❌'} Título | ${hasMessage ? '✅' : '❌'} Mensaje | ${hasOptions ? '✅' : '❌'} Opciones`,
                        timestamp: new Date().toISOString()
                      });
                    });
                    
                    // Validar conexiones
                    const connectedOptions = menuNodes.reduce((total, node) => {
                      return total + ((node.data as any).options?.filter((opt: any) => opt.nextNodeId)?.length || 0);
                    }, 0);
                    const totalOptions = menuNodes.reduce((total, node) => {
                      return total + ((node.data as any).options?.length || 0);
                    }, 0);
                    
                    validationProcesses.push({
                      id: `connections-${Date.now()}`,
                      step: "Conexiones",
                      status: connectedOptions === totalOptions && totalOptions > 0 ? 'pass' : 'error',
                      message: `${connectedOptions}/${totalOptions} opciones conectadas`,
                      timestamp: new Date().toISOString()
                    });
                    
                    // Validar nodos finales
                    const endNodes = nodes.filter(n => n.type === 'end');
                    validationProcesses.push({
                      id: `end-${Date.now()}`,
                      step: "Nodos Finales",
                      status: endNodes.length > 0 ? 'pass' : 'error',
                      message: `${endNodes.length} nodos de finalización encontrados`,
                      timestamp: new Date().toISOString()
                    });
                    
                    setProcessTracker(validationProcesses as Array<{
                      id: string;
                      step: string;
                      status: 'pending' | 'pass' | 'error';
                      message: string;
                      timestamp: string;
                    }>);
                  }}
                  className="p-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                  title="Leer y validar diagrama"
                >
                  <Database className="w-4 h-4" />
                </button>

                <button
                  onClick={validateFlow}
                  className="p-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                  title="Validar flujo"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={saveFlow}
                  className={`p-2 rounded transition-colors flex items-center gap-2 ${
                    isSaving 
                      ? 'bg-green-600 text-white cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                  title={isSaving ? "Guardando..." : "Guardar flujo"}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Guardando...</span>
                    </>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              
            </div>
          </Panel>
        )}
      </ReactFlow>



      {/* Panel de validación */}
      {showValidationPanel && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Validación del Flujo</h3>
            <button
              onClick={() => setShowValidationPanel(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            {validationResults.map((result, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 p-2 rounded text-sm ${
                  result.type === "success" ? "bg-green-50 text-green-800" :
                  result.type === "error" ? "bg-red-50 text-red-800" :
                  "bg-yellow-50 text-yellow-800"
                }`}
              >
                {result.type === "success" && <CheckCircle className="w-4 h-4" />}
                {result.type === "error" && <XCircle className="w-4 h-4" />}
                {result.type === "warning" && <AlertTriangle className="w-4 h-4" />}
                <span>{result.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validador de Procesos - Solo Lector */}
      {processTracker.length > 0 && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Validador
            </h3>
            <button
              onClick={() => setProcessTracker([])}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            {processTracker.map((process) => (
              <div
                key={process.id}
                className={`flex items-center gap-2 p-2 rounded text-sm ${
                  process.status === 'pass' ? 'bg-green-50 text-green-800' :
                  process.status === 'error' ? 'bg-red-50 text-red-800' :
                  'bg-yellow-50 text-yellow-800'
                }`}
              >
                <div className="flex gap-1">
                  <button
                    onClick={() => setProcessTracker(prev => prev.map(p => 
                      p.id === process.id ? { ...p, status: 'pass' } : p
                    ))}
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      process.status === 'pass' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-green-100'
                    }`}
                    title="Marcar como pass"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setProcessTracker(prev => prev.map(p => 
                      p.id === process.id ? { ...p, status: 'error' } : p
                    ))}
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      process.status === 'error' 
                        ? 'bg-red-500 text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-red-100'
                    }`}
                    title="Marcar como error"
                  >
                    ✗
                  </button>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{process.step}</div>
                  <div className="text-xs opacity-75">{process.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Panel de ayuda colapsable */}
      <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg z-50">
        <button
          onClick={() => setShowHelpPanel(!showHelpPanel)}
          className="p-3 text-gray-600 hover:text-gray-800 transition-colors"
          title="Mostrar/ocultar ayuda"
        >
          <Code className="w-5 h-5" />
        </button>
        
        {showHelpPanel && (
          <div className="p-4 max-w-sm border-t border-gray-100 max-h-64 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-2">📱 Conexiones y Posiciones:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>🎯 <strong>Puntos de conexión:</strong> Cada opción tiene su punto verde en el lado derecho</p>
              <p>🔗 <strong>Conectar opciones:</strong> Arrastra desde los puntos verdes a otros menús</p>
              <p>📝 <strong>Configurar destino:</strong> Escribe el ID del nodo en el campo "ID nodo"</p>
              <p>💾 <strong>Guardar flujo:</strong> Usa el botón "Guardar flujo" para guardar todos los cambios</p>
              <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                <p className="text-blue-800 font-medium">✅ <strong>Estados de validación:</strong></p>
                <ul className="mt-1 space-y-1">
                  <li>✅ <strong>PASS:</strong> Cumple - Continúa al siguiente paso</li>
                  <li>❌ <strong>ERROR:</strong> No cumple - Finaliza con error</li>
                  <li>⏳ <strong>PENDING:</strong> Pendiente de validación</li>
                </ul>
              </div>
              <div className="mt-2 p-2 bg-green-50 rounded border-l-4 border-green-400">
                <p className="text-green-800 font-medium">💡 Tip: Mueve los nodos donde quieras y luego guarda para mantener las posiciones</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
