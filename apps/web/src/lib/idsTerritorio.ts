// Número de cada territorio en la tabla departments (fijado en la migración 0009, códigos ISO 3166-2:NI).
// Es estructura de la base de datos, no un dato turístico: sirve para filtrar por territorio sin otra consulta.
export const ID_TERRITORIO: Record<string, number> = { boaco: 1, carazo: 2, chinandega: 3, chontales: 4, esteli: 5, granada: 6, jinotega: 7, leon: 8, madriz: 9, managua: 10, masaya: 11, matagalpa: 12, 'nueva-segovia': 13, 'rio-san-juan': 14, rivas: 15, 'costa-caribe-norte': 16, 'costa-caribe-sur': 17 }; // slug → número

export const SLUG_DE_ID: Record<number, string> = Object.fromEntries(Object.entries(ID_TERRITORIO).map(([s, id]) => [id, s])); // número → slug
