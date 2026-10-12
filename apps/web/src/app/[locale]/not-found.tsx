import { Extraviado } from '@/components/Extraviado'; // Página "te perdiste en la neblina"

/** Se muestra cuando una dirección no existe o la ficha ya no está publicada (código 404). */
export default function NoEncontrado() {
  return <Extraviado />; // Mensaje claro y dos caminos de regreso
}
