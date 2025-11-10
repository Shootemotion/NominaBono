import Modal from '@/components/Modal';
import FormularioObjetivo from '@/components/FormularioObjetivo';

export default function ObjetivoModal({
  open,
  onClose,
  initialData = null,
  onSave,
  totalPesoActual = 0,
  scopeType,        // 👈 agregar
  areaNombre,       // 👈 agregar
  sectorNombre,     // 👈 agregar
  empleadoNombre,   // 👈 agregar
}) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={initialData ? 'Editar Objetivo' : 'Nuevo Objetivo'}
    >
      <FormularioObjetivo
          datosIniciales={initialData}
          onGuardar={onSave}
          onCancelar={onClose}
          totalPesoActual={totalPesoActual}
          scopeType={scopeType}
          areaNombre={areaNombre}
          sectorNombre={sectorNombre}
          empleadoNombre={empleadoNombre}
/>
    </Modal>
  );
}
