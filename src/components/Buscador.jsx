import { Input } from "@/components/ui/input";

function Buscador({ valor, onChange }) {
  return (
    <div className="relative">
      <Input
        value={valor}
        onChange={onChange}
        placeholder="Buscar empleado por nombre o DNI…"
        className="w-full"
      />
    </div>
  );
}

export default Buscador;
