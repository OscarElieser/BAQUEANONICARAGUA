// Tipos de security-headers.mjs para que TypeScript lo entienda desde next.config.ts.
export declare function securityHeaders(env?: Record<string, string | undefined>, dev?: boolean): Array<{ key: string; value: string }>; // Devuelve la lista de cabeceras
