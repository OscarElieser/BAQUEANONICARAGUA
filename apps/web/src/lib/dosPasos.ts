'use client'; // Solo en el navegador: usa la sesión de Firebase

// Verificación en dos pasos con una app de autenticación (códigos TOTP de 6 dígitos) de Firebase.
// El Ops Center la exige (la API revisa que el token traiga el segundo factor). Cualquier persona puede activarla.
// Si el proyecto de Firebase todavía no tiene activada esta opción, se dice "No disponible todavía".
import {
  getMultiFactorResolver, // Segundo paso al iniciar sesión
  multiFactor, // Factores de una cuenta
  TotpMultiFactorGenerator, // Códigos de app de autenticación
  type Auth, // Servicio de autenticación
  type MultiFactorError, // Error que pide el segundo paso
  type MultiFactorResolver, // Completa el inicio de sesión con el segundo paso
  type TotpSecret, // Clave que se carga en la app de autenticación
  type User, // Persona con sesión
} from 'firebase/auth';

/** Error propio con código app/... para traducirlo al mostrarlo. */
function appError(code: string, extra: Record<string, unknown> = {}): Error {
  return Object.assign(new Error(code), { code, ...extra }); // Mismo formato que los errores de Firebase
}

/** Si la cuenta ya tiene la verificación en dos pasos activada. */
export function tieneDosPasos(user: User): boolean {
  return multiFactor(user).enrolledFactors.some((f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID); // Tiene un factor TOTP
}

/** Lo que la persona necesita para cargar la cuenta en su app de autenticación. */
export type Preparacion = { secreto: TotpSecret; clave: string; enlace: string }; // Clave manual y enlace otpauth://

/** Crea la clave para la app de autenticación (todavía no queda activada). */
export async function prepararDosPasos(user: User): Promise<Preparacion> {
  try {
    const sesion = await multiFactor(user).getSession(); // Sesión de inscripción (exige haber entrado hace poco)
    const secreto = await TotpMultiFactorGenerator.generateSecret(sesion); // Clave nueva generada por Firebase
    const clave = secreto.secretKey.replace(/(.{4})/g, '$1 ').trim(); // En grupos de 4 para escribirla sin errores
    return { secreto, clave, enlace: secreto.generateQrCodeUrl(user.email ?? 'BAQUEANO', 'BAQUEANO') }; // Enlace que abre la app en el teléfono
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''; // Código de Firebase
    if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') throw appError('app/mfa-off'); // El proyecto aún no la tiene activada
    throw e; // Otros errores se traducen al mostrarlos
  }
}

/** Confirma con el primer código de la app y deja activada la verificación. */
export async function confirmarDosPasos(user: User, prep: Preparacion, codigo: string): Promise<void> {
  const limpio = codigo.replace(/\D/g, ''); // Solo los dígitos
  if (limpio.length !== 6) throw appError('auth/invalid-verification-code'); // Siempre son 6 dígitos
  const asercion = TotpMultiFactorGenerator.assertionForEnrollment(prep.secreto, limpio); // Prueba de que la app quedó bien cargada
  await multiFactor(user).enroll(asercion, 'App de autenticación'); // Activa el segundo paso en la cuenta
}

/** Quita la verificación en dos pasos (Firebase exige haber entrado hace poco). */
export async function quitarDosPasos(user: User): Promise<void> {
  const factor = multiFactor(user).enrolledFactors.find((f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID); // Factor TOTP
  if (factor) await multiFactor(user).unenroll(factor); // Lo quita
}

/** Si el inicio de sesión pidió el segundo paso, devuelve un error con lo necesario para completarlo. */
export function siPideSegundoPaso(auth: Auth, error: unknown): Error | null {
  if ((error as { code?: string }).code !== 'auth/multi-factor-auth-required') return null; // No es este caso
  const resolver = getMultiFactorResolver(auth, error as MultiFactorError); // Datos para completar el inicio
  return appError('app/mfa-required', { resolver }); // La pantalla pide el código
}

/** Completa el inicio de sesión con el código de la app de autenticación. */
export async function completarSegundoPaso(resolver: MultiFactorResolver, codigo: string): Promise<User> {
  const hint = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID); // Factor TOTP de la cuenta
  if (!hint) throw appError('app/mfa-unsupported'); // Solo se usa app de autenticación
  const limpio = codigo.replace(/\D/g, ''); // Solo los dígitos
  if (limpio.length !== 6) throw appError('auth/invalid-verification-code'); // Siempre son 6 dígitos
  const cred = await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, limpio)); // Termina el inicio de sesión
  return cred.user; // Persona con sesión (el token ya trae el segundo factor)
}
