'use client';
// Registra el trabajador que permite ver sin conexión las páginas ya visitadas. Solo en producción y con HTTPS.
import { useEffect } from 'react'; // Efecto al cargar

export function RegistroTrabajador() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return; // En desarrollo no: evita copias viejas mientras se programa
    if (!('serviceWorker' in navigator)) return; // Navegador sin soporte: la web sigue igual
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {}); // Si falla, la web funciona igual sin modo sin conexión
  }, []); // Solo una vez
  return null; // No dibuja nada
}
