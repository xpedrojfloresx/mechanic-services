import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { enlaceWhatsApp } from '@/features/whatsapp/whatsapp'

type BotonWhatsAppProps = {
  telefono: string | null | undefined
  mensaje: string
  texto?: string
  // Solo el ícono (para tarjetas chicas). Sin teléfono válido no se muestra.
  soloIcono?: boolean
  variant?: 'default' | 'outline' | 'ghost'
}

// Abre WhatsApp (wa.me) con el mensaje ya armado; la persona lo revisa y lo
// envía ella. No usa la API de WhatsApp Business.
export function BotonWhatsApp({
  telefono,
  mensaje,
  texto = 'Avisar por WhatsApp',
  soloIcono = false,
  variant = 'outline',
}: BotonWhatsAppProps) {
  const enlace = enlaceWhatsApp(telefono ?? null, mensaje)

  if (!enlace) {
    if (soloIcono) return null
    return (
      <Button
        variant={variant}
        size="sm"
        disabled
        title="Falta un teléfono válido"
      >
        <MessageCircle /> {texto}
      </Button>
    )
  }

  return (
    <Button asChild variant={variant} size="sm" aria-label={texto}>
      <a href={enlace} target="_blank" rel="noopener noreferrer">
        <MessageCircle /> {!soloIcono && texto}
      </a>
    </Button>
  )
}
