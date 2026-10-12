'use client';

import { useState } from 'react';
import { ActionButton } from '@/ops/ActionButton';
import { opsAction } from '@/ops/useOps';

// Lista blanca: debe coincidir con admin_set_setting (migración 0014)
const SETTINGS: Array<{ key: string; label: string; help: string }> = [
  { key: 'firebase_project_id', label: 'Proyecto de Firebase', help: 'Las sesiones de otros proyectos se rechazan.' },
  { key: 'support_email', label: 'Correo de soporte', help: 'Aparece en avisos y correos del sistema.' },
  { key: 'maintenance_message', label: 'Aviso de mantenimiento', help: 'Se muestra en la web y en Android cuando no está vacío.' },
];

export default function Configuracion() {
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <>
      <h1 className="m-0 font-display text-[36px] font-normal">Configuración</h1>
      <p className="mt-2 max-w-[70ch] text-ink-muted">Solo los ajustes permitidos. Las claves secretas nunca se editan desde aquí: viven en el gestor de secretos del servidor. Cada cambio queda en Auditoría.</p>
      <ul className="m-0 mt-5 flex list-none flex-col gap-4 p-0">
        {SETTINGS.map((s) => (
          <li key={s.key} className="flex flex-col gap-2 rounded-m bg-ground-raised p-5">
            <label htmlFor={s.key} className="font-bold">{s.label}</label>
            <input id={s.key} value={values[s.key] ?? ''} onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
              className="h-11 rounded-[12px] border border-control-border bg-ground-raised px-3 text-base text-ink" />
            <p className="m-0 text-sm text-ink-muted">{s.help}</p>
            <div>
              <ActionButton label="Guardar" done="Ajuste guardado" variant="primary"
                run={() => opsAction(`/settings/${s.key}`, 'POST', { value: values[s.key] ?? '' })} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
