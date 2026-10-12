// Script de una sola vez: agrega role: 'authenticated' a usuarios que ya existían
// antes de desplegar las funciones (las funciones solo actúan en nuevos registros e inicios).
// Uso: GOOGLE_APPLICATION_CREDENTIALS=cuenta-servicio.json node dist/asignar-rol-existentes.js

import { initializeApp } from 'firebase-admin/app'; // Inicializa el SDK de administración de Firebase
import { getAuth } from 'firebase-admin/auth'; // Acceso a las cuentas de Firebase Authentication

initializeApp(); // Usa las credenciales de la variable GOOGLE_APPLICATION_CREDENTIALS

async function asignarRol(): Promise<void> {
  let siguientePagina: string | undefined = undefined; // Marcador para recorrer las cuentas de 1000 en 1000
  let actualizadas = 0; // Contador de cuentas actualizadas para el informe final
  let fallidas = 0; // Contador de cuentas que no se pudieron actualizar
  do {
    const pagina = await getAuth().listUsers(1000, siguientePagina); // Pide la siguiente página de cuentas
    siguientePagina = pagina.pageToken; // Guarda el marcador de la página que sigue (undefined si era la última)
    for (const usuario of pagina.users) {
      // Recorre cada cuenta de esta página
      try {
        const actuales = usuario.customClaims ?? {}; // Datos personalizados que ya tenía la cuenta
        await getAuth().setCustomUserClaims(usuario.uid, { ...actuales, role: 'authenticated' }); // Agrega el rol sin borrar lo que ya tenía
        actualizadas += 1; // Suma una cuenta actualizada
      } catch (error) {
        fallidas += 1; // Suma una cuenta con error
        console.error('No se pudo asignar el rol a', usuario.uid, error); // Informa qué cuenta falló y por qué
      }
    }
  } while (siguientePagina); // Repite mientras queden páginas
  console.log(`Listo: ${actualizadas} cuentas actualizadas, ${fallidas} con error.`); // Informe final real, sin redondeos
}

asignarRol().then(() => process.exit(0)); // Ejecuta el script y termina el proceso al acabar
