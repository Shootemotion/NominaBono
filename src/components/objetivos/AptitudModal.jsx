import Modal from '@/components/Modal';
import FormularioAptitud from '@/components/FormularioAptitudes';

export default function AptitudModal({
  open,
  onClose,
  initialData = null,
  onSave,
  totalPesoActual = 0,   // 👈 por si querés controlar suma de pesos
  scopeType,
  areaNombre,
  sectorNombre,
  empleadoNombre,
}) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={initialData ? 'Editar Aptitud' : 'Nueva Aptitud'}
    >
            <FormularioAptitud
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