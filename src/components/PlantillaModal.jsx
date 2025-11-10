// src/components/PlantillaModal.jsx
import { useState } from "react";
import FormularioObjetivos from "./FormularioObjetivos";
import FormularioAptitudes from "./FormularioAptitudes";

export default function PlantillaModal({
  isOpen,
  onClose,
  modalType,
  editing,
  onAfterSave,   
  areas,
  sectores,
  empleados = [],
  scopeType,
}) {
  
  if (!isOpen) return null;

 const handleSaved = (saved, { keepOpen = false } = {}) => {
   onAfterSave?.(saved);              // ✅ sólo actualiza estado en el padre
   if (!keepOpen) onClose();
 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 relative animate-fadeIn">
        {/* Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold mb-4">
          {editing ? "Editar Plantilla" : "Nueva Plantilla"}
        </h2>

        {modalType === "objetivo" && (
          <FormularioObjetivos
          onSaved={(saved) => handleSaved(saved, { keepOpen: false })}
           onSaveAndContinue={(saved) => handleSaved(saved, { keepOpen: true })}
            onCancelar={onClose}
            initialData={editing}
            areas={areas}
            sectores={sectores}
            empleados={empleados}   // ✅ empleados llegan al form
            initialScopeType={scopeType}
          />
        )}

        {modalType === "aptitud" && (
          <FormularioAptitudes
           onSaved={(saved) => handleSaved(saved, { keepOpen: false })}
          onSaveAndContinue={(saved) => handleSaved(saved, { keepOpen: true })}
            onCancelar={onClose}
            datosIniciales={editing}
            areas={areas}
            sectores={sectores}
              empleados={empleados}   
            initialScopeType={scopeType}
          />
        )}
      </div>
    </div>
  );
}