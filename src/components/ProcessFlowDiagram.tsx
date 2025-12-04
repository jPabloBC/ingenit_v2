"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Clock, Play, ArrowRight, Edit, Plus, AlertTriangle } from "lucide-react";

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
}

interface ProcessFlowDiagramProps {
  steps: ProcessStep[];
  onStepUpdate: (stepId: string, status: ProcessStep["status"]) => void;
  onStepEdit: (step: ProcessStep) => void;
  onStepAdd: () => void;
}

export default function ProcessFlowDiagram({ 
  steps, 
  onStepUpdate, 
  onStepEdit, 
  onStepAdd 
}: ProcessFlowDiagramProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const getStepIcon = (status: ProcessStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case "error":
        return <XCircle className="w-6 h-6 text-red-500" />;
      case "in_progress":
        return <Play className="w-6 h-6 text-blue-500" />;
      case "skipped":
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      default:
        return <Clock className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStepColor = (status: ProcessStep["status"]) => {
    switch (status) {
      case "completed":
        return "border-green-200 bg-green-50";
      case "error":
        return "border-red-200 bg-red-50";
      case "in_progress":
        return "border-blue-200 bg-blue-50";
      case "skipped":
        return "border-yellow-200 bg-yellow-50";
      default:
        return "border-gray-200 bg-white";
    }
  };

  const getStepTextColor = (status: ProcessStep["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-800";
      case "error":
        return "text-red-800";
      case "in_progress":
        return "text-blue-800";
      case "skipped":
        return "text-yellow-800";
      default:
        return "text-gray-600";
    }
  };

  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Diagrama de Flujo del Proceso</h3>
        <button
          onClick={onStepAdd}
          className="flex items-center gap-2 px-3 py-2 bg-blue6 text-white rounded-lg hover:bg-blue4 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Agregar Paso
        </button>
      </div>

      <div className="space-y-4">
        {sortedSteps.map((step, index) => (
          <div key={step.id}>
            {/* Step Card */}
            <div className={`relative border-2 rounded-xl p-4 transition-all duration-200 ${getStepColor(step.status)}`}>
              <div className="flex items-start gap-4">
                {/* Step Number */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center font-semibold text-gray-600">
                    {step.order}
                  </div>
                </div>

                {/* Step Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step.status)}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-semibold text-lg ${getStepTextColor(step.status)}`}>
                        {step.name}
                      </h4>
                      <p className="text-gray-600 text-sm mt-1">{step.description}</p>
                      
                      {/* Step Details */}
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <span>Estimado: {step.estimated_hours}h</span>
                        {step.actual_hours && (
                          <span>Real: {step.actual_hours}h</span>
                        )}
                        {step.assigned_to && (
                          <span>Asignado: {step.assigned_to}</span>
                        )}
                        {step.completed_at && (
                          <span>Completado: {new Date(step.completed_at).toLocaleDateString("es-CL")}</span>
                        )}
                      </div>

                      {/* Notes */}
                      {step.notes && (
                        <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                          <p className="text-sm text-gray-700">{step.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => onStepUpdate(step.id, "completed")}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Marcar como completado"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onStepUpdate(step.id, "in_progress")}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Marcar en progreso"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onStepUpdate(step.id, "error")}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Marcar como error"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onStepEdit(step)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Editar paso"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Progreso del paso</span>
                  <span>
                    {step.status === "completed" ? "100%" :
                     step.status === "in_progress" ? "50%" :
                     step.status === "error" ? "0%" : "0%"}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      step.status === "completed" ? "bg-green-500" :
                      step.status === "in_progress" ? "bg-blue-500" :
                      step.status === "error" ? "bg-red-500" : "bg-gray-300"
                    }`}
                    style={{ 
                      width: step.status === "completed" ? "100%" :
                              step.status === "in_progress" ? "50%" : "0%" 
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Arrow to next step */}
            {index < sortedSteps.length - 1 && (
              <div className="flex justify-center my-4">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl">
        <h4 className="font-semibold text-gray-900 mb-3">Resumen del Proceso</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total pasos:</span>
            <span className="font-semibold ml-2">{steps.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Completados:</span>
            <span className="font-semibold ml-2 text-green-600">
              {steps.filter(s => s.status === "completed").length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">En progreso:</span>
            <span className="font-semibold ml-2 text-blue-600">
              {steps.filter(s => s.status === "in_progress").length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Con errores:</span>
            <span className="font-semibold ml-2 text-red-600">
              {steps.filter(s => s.status === "error").length}
            </span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Progreso general:</span>
            <span className="font-semibold text-lg">
              {Math.round((steps.filter(s => s.status === "completed").length / steps.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="h-2 bg-blue6 rounded-full transition-all duration-300"
              style={{ 
                width: `${(steps.filter(s => s.status === "completed").length / steps.length) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
