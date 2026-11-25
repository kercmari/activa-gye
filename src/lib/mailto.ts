/**
 * Enlaces `mailto:` para pedir suscripciones y escribir a la administración (sin pasarela de pago).
 * Todo va con encodeURIComponent: el correo, el asunto y el cuerpo pueden traer +, tildes o saltos de línea.
 */

export interface SubscriptionRequest {
  plan: string;
  price: number;
  fullName: string;
  email: string;
}

/** Precio para el cuerpo del correo: "$19" o "$9.50". */
function precioTexto(price: number): string {
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

/** Correo a la administradora con el pedido de suscripción ya escrito. */
export function subscriptionMailto(
  adminEmail: string,
  { plan, price, fullName, email }: SubscriptionRequest,
): string {
  const subject = `Solicitud de suscripción ${plan}`;
  const body = [
    'Hola, quiero solicitar la suscripción.',
    '',
    `Nombre: ${fullName}`,
    `Correo: ${email}`,
    `Plan: ${plan}`,
    `Precio: ${precioTexto(price)} al mes`,
  ].join('\n');
  return `mailto:${encodeURIComponent(adminEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Correo genérico a la administradora (pie de página, contacto, respuestas). */
export function contactMailto(adminEmail: string, subject?: string): string {
  const base = `mailto:${encodeURIComponent(adminEmail)}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}
