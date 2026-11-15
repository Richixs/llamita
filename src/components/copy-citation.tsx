"use client";
import { useState } from "react";
import { Icon } from "./icon";
export function CopyCitation({ text }: { text: string }) {
  const [status, setStatus] = useState("");
  return (
    <div>
      <button
        className="btn"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setStatus("Cita copiada");
          } catch {
            setStatus("Selecciona el texto de la cita para copiarlo.");
          }
        }}
      >
        <Icon name={status === "Cita copiada" ? "check" : "copy"} />
        {status === "Cita copiada" ? "Cita copiada" : "Copiar cita"}
      </button>
      <span className="sr-only" role="status">
        {status}
      </span>
    </div>
  );
}
