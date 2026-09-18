import { Car } from 'lucide-react'
import {
  siAudi,
  siBmw,
  siChevrolet,
  siChrysler,
  siCitroen,
  siDacia,
  siFiat,
  siFord,
  siHonda,
  siHyundai,
  siIveco,
  siJeep,
  siKia,
  siMazda,
  siMg,
  siMini,
  siMitsubishi,
  siNissan,
  siOpel,
  siPeugeot,
  siPorsche,
  siRam,
  siRenault,
  siSeat,
  siSkoda,
  siSubaru,
  siSuzuki,
  siToyota,
  siVolkswagen,
  siVolvo,
  type SimpleIcon,
} from 'simple-icons'
import { cn } from '@/lib/utils'

// Solo las marcas que trae simple-icons. Faltan, entre otras, Mercedes-Benz,
// Chery, Dodge, Land Rover, Jaguar, Lexus, Alfa Romeo y BYD: para esas (y para
// cualquier marca escrita distinto) se muestra un ícono de auto genérico.
const iconos: Record<string, SimpleIcon> = {
  audi: siAudi,
  bmw: siBmw,
  chevrolet: siChevrolet,
  chrysler: siChrysler,
  citroen: siCitroen,
  dacia: siDacia,
  fiat: siFiat,
  ford: siFord,
  honda: siHonda,
  hyundai: siHyundai,
  iveco: siIveco,
  jeep: siJeep,
  kia: siKia,
  mazda: siMazda,
  mg: siMg,
  mini: siMini,
  mitsubishi: siMitsubishi,
  nissan: siNissan,
  opel: siOpel,
  peugeot: siPeugeot,
  porsche: siPorsche,
  ram: siRam,
  renault: siRenault,
  seat: siSeat,
  skoda: siSkoda,
  subaru: siSubaru,
  suzuki: siSuzuki,
  toyota: siToyota,
  volkswagen: siVolkswagen,
  volvo: siVolvo,
}

// La marca es texto libre: se normaliza (minúsculas, sin acentos ni símbolos)
// y se aceptan las abreviaturas más comunes.
const alias: Record<string, string> = {
  vw: 'volkswagen',
  chevy: 'chevrolet',
}

function normalizar(marca: string) {
  const limpia = marca
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  return alias[limpia] ?? limpia
}

// Logo de la marca en el color del texto (un solo acento en la app, sin colores
// de marca). Decorativo: el nombre de la marca ya está escrito al lado.
export function MarcaLogo({
  marca,
  className,
}: {
  marca: string
  className?: string
}) {
  const icono = iconos[normalizar(marca)]
  const clases = cn('text-muted-foreground size-6 shrink-0', className)

  if (!icono) return <Car aria-hidden className={clases} />
  return (
    <svg
      aria-hidden
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={clases}
    >
      <path d={icono.path} />
    </svg>
  )
}
