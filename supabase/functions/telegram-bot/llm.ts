// Interpretación de lo que pide el mecánico con Gemini (vía AI SDK). El modelo
// SOLO elige una herramienta y extrae sus datos: no ejecuta nada ni redacta las
// respuestas (eso lo hace el código, con lo que devuelve la base). Las
// herramientas no tienen `execute` a propósito. Para cambiar de proveedor de
// LLM hay que tocar solo este archivo.
import { generateText, tool } from 'npm:ai'
import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google'
import { z } from 'npm:zod'
import { entorno } from './datos.ts'

const google = createGoogleGenerativeAI({ apiKey: entorno('GEMINI_API_KEY') })
const modelo = google(Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite')

// Cómo se nombra un auto: por la patente O por el cliente (lo normal en el
// taller: "el auto de Juan"). El código después busca cuál es.
const auto = {
  patente: z
    .string()
    .optional()
    .describe(
      'Patente, solo si la dice. Formato ABC123 o AB123CD, sin espacios.',
    ),
  cliente: z
    .string()
    .optional()
    .describe(
      'Nombre del cliente dueño del auto, si lo nombra (en lugar de la patente). Ej: "Juan Pérez", "Belén".',
    ),
  modelo: z
    .string()
    .optional()
    .describe(
      'Marca o modelo del auto si lo menciona. Ej: "el Fiat", "la Hilux".',
    ),
}

const herramientas = {
  buscar_vehiculo: tool({
    description:
      'Buscar un vehículo (por patente o por su dueño) y mostrar sus datos, si está en el taller y el último trabajo que se le hizo.',
    inputSchema: z.object(auto),
  }),
  historial_vehiculo: tool({
    description:
      'Mostrar el historial de un vehículo (por patente o por su dueño): los últimos ingresos con los trabajos hechos y sus precios. Usar cuando pregunta qué se le hizo antes al auto.',
    inputSchema: z.object(auto),
  }),
  estado_del_taller: tool({
    description:
      'Listar los vehículos que están ahora en el taller (en taller y listos para entregar).',
    inputSchema: z.object({
      solo_listos: z
        .boolean()
        .optional()
        .describe('true si pregunta únicamente por los que están listos.'),
    }),
  }),
  entregas_de_hoy: tool({
    description:
      'Listar los vehículos que se prometieron para entregar hoy o antes y siguen en el taller. Usar cuando pregunta qué tiene que entregar hoy o qué está atrasado.',
    inputSchema: z.object({
      solo_vencidos: z
        .boolean()
        .optional()
        .describe('true si pregunta solo por los que ya están atrasados.'),
    }),
  }),
  recordatorios_para_avisar: tool({
    description:
      'Listar los recordatorios de próximo servicio vencidos o de este mes, con a quién hay que avisar. Usar cuando pregunta a quién tiene que avisar o llamar.',
    inputSchema: z.object({
      solo_vencidos: z
        .boolean()
        .optional()
        .describe('true si pregunta solo por los ya vencidos.'),
    }),
  }),
  buscar_cliente: tool({
    description:
      'Buscar un cliente por nombre y mostrar toda la información que tiene cargada (teléfono, autos, últimos servicios, recordatorios). Usar solo cuando pide información o datos del cliente, no cuando quiere cambiar o cargar algo de su auto.',
    inputSchema: z.object({
      nombre: z.string().describe('Nombre o parte del nombre del cliente.'),
    }),
  }),
  recibir_vehiculo: tool({
    description:
      'Registrar el ingreso de un auto que llegó al taller (crea el cliente y el auto si son nuevos). Usar cuando dice que le trajeron o llegó un auto para arreglar. Pasá lo que haya dicho aunque falten datos: el sistema pregunta lo que falte. Pide confirmación antes de guardar.',
    inputSchema: z.object({
      cliente: z
        .string()
        .optional()
        .describe('Nombre del cliente dueño del auto.'),
      telefono: z
        .string()
        .optional()
        .describe('Teléfono del cliente, si lo dice.'),
      patente: z
        .string()
        .optional()
        .describe(
          'Patente, solo si la dice. Formato ABC123 o AB123CD, sin espacios.',
        ),
      marca: z.string().optional().describe('Marca del auto. Ej: Volkswagen.'),
      modelo: z
        .string()
        .optional()
        .describe(
          'Modelo del auto con su versión o motor si lo dice. Ej: Golf 1.6.',
        ),
      anio: z.number().optional().describe('Año del auto, si lo dice.'),
      km: z
        .number()
        .optional()
        .describe('Kilómetros del auto como número (150000, no "150.000").'),
      motivo: z
        .string()
        .optional()
        .describe('Qué hay que hacerle al auto, corto. Ej: cambio de aceite.'),
    }),
  }),
  crear_cliente: tool({
    description:
      'Cargar un cliente nuevo SIN auto. Si le trajeron un auto usá recibir_vehiculo. Pide confirmación antes de guardar.',
    inputSchema: z.object({
      nombre: z.string().describe('Nombre y apellido del cliente.'),
      telefono: z.string().optional().describe('Teléfono, si lo dice.'),
    }),
  }),
  listar_clientes: tool({
    description:
      'Listar los clientes cargados, por orden alfabético, con el total. Usar cuando pide ver los clientes disponibles, cuántos clientes hay o los que empiezan con una letra.',
    inputSchema: z.object({
      prefijo: z
        .string()
        .optional()
        .describe('Letra o comienzo del nombre, si pide solo algunos.'),
    }),
  }),
  cambiar_estado: tool({
    description:
      'Marcar un vehículo (por patente o por su dueño) como listo para entregar o como entregado. Usar cuando el mecánico dice que un auto está listo o que ya se entregó. Pide confirmación antes de hacerlo.',
    inputSchema: z.object({
      ...auto,
      estado: z
        .enum(['listo', 'entregado'])
        .describe(
          'listo = terminado, esperando que lo retiren; entregado = ya se lo llevó.',
        ),
    }),
  }),
  agregar_servicios: tool({
    description:
      'Cargar repuestos y/o mano de obra a un vehículo (por patente o por su dueño) que está en el taller. Usar cuando el mecánico dice qué le hizo o qué le puso al auto, o pide cargarle algo. Pide confirmación antes de guardar.',
    inputSchema: z.object({
      ...auto,
      renglones: z
        .array(
          z.object({
            tipo: z
              .enum(['repuesto', 'mano_de_obra'])
              .describe(
                'repuesto = una pieza o material (pastillas, filtro, aceite, correa); mano_de_obra = una tarea (cambio, colocación, alineación, balanceo).',
              ),
            descripcion: z
              .string()
              .describe('Qué es, corto. Ej: Pastillas de freno.'),
            cantidad: z.number().optional().describe('Cantidad; 1 si no dice.'),
            precio: z
              .number()
              .optional()
              .describe(
                'Precio POR UNIDAD en pesos, como número (45000, no "45 mil"). Omitir si no lo dice.',
              ),
          }),
        )
        .describe('Uno por cada cosa que menciona (máximo 5).'),
    }),
  }),
}

const SISTEMA = `Sos el asistente por voz de un taller mecánico argentino. El mecánico te habla con las manos ocupadas: el texto viene de un audio transcripto y puede tener errores.
Elegí la herramienta que corresponde a lo que pide.
Los autos se nombran por la patente O por el cliente ("el auto de Juan", "la camioneta de Pérez"). NUNCA pidas la patente ni contestes que falta: si nombra al cliente, pasá el nombre del cliente (y el modelo si lo dice); si dicta una patente, pasala sin espacios y en mayúsculas ("a be uno dos tres ce de" es AB123CD). Las patentes tienen formato ABC123 o AB123CD.
Si dice que le trajeron o llegó un auto para arreglar, usá recibir_vehiculo con lo que haya dicho (cliente, auto, kilómetros, qué hay que hacerle); NO pidas los datos que falten, el sistema los pregunta. Si solo quiere cargar un cliente sin auto, usá crear_cliente.
Si el pedido no corresponde a ninguna herramienta, no llames ninguna y contestá en una sola frase corta que podés: consultar un vehículo o su historial, qué hay en el taller, qué hay para entregar hoy, a quién avisar, la información de un cliente y la lista de clientes; marcar un auto como listo o entregado; cargar repuestos o mano de obra a un auto que está en el taller; registrar un auto que llega (con su cliente) y cargar un cliente nuevo.
Para marcar estados o cargar servicios llamá la herramienta: el sistema le pide confirmación al mecánico, vos no confirmes nada. Los precios son por unidad y en pesos: "cuarenta y cinco mil" es 45000. No inventes datos: si no dice un precio, omitilo.`

type Auto = { patente: string; cliente: string; modelo: string }

export type Orden =
  | ({ tipo: 'buscar_vehiculo' } & Auto)
  | ({ tipo: 'historial_vehiculo' } & Auto)
  | ({ tipo: 'cambiar_estado'; estado: string } & Auto)
  | ({
      tipo: 'agregar_servicios'
      renglones: {
        tipo: string
        descripcion: string
        cantidad?: number
        precio?: number
      }[]
    } & Auto)
  | { tipo: 'estado_del_taller'; soloListos: boolean }
  | { tipo: 'entregas_de_hoy'; soloVencidos: boolean }
  | { tipo: 'recordatorios_para_avisar'; soloVencidos: boolean }
  | { tipo: 'buscar_cliente'; nombre: string }
  | { tipo: 'listar_clientes'; prefijo: string }
  | {
      tipo: 'recibir_vehiculo'
      cliente: string
      telefono: string
      patente: string
      marca: string
      modelo: string
      anio?: number
      km?: number
      motivo: string
      clienteId?: string
      crearNuevo?: boolean
    }
  | {
      tipo: 'crear_cliente'
      nombre: string
      telefono: string
      crearNuevo?: boolean
    }
  | { tipo: 'ninguna'; respuesta: string }

export type OrdenConAuto = Extract<
  Orden,
  {
    tipo:
      | 'buscar_vehiculo'
      | 'historial_vehiculo'
      | 'cambiar_estado'
      | 'agregar_servicios'
  }
>

export type OrdenAlta = Extract<
  Orden,
  { tipo: 'recibir_vehiculo' | 'crear_cliente' }
>

export async function interpretar(texto: string): Promise<Orden> {
  const resultado = await generateText({
    model: modelo,
    system: SISTEMA,
    prompt: texto,
    tools: herramientas,
    temperature: 0,
  })
  const llamada = resultado.toolCalls?.[0]
  if (!llamada) return { tipo: 'ninguna', respuesta: resultado.text.trim() }

  // deno-lint-ignore no-explicit-any
  const datos = (llamada as any).input ?? {}
  const auto = {
    patente: String(datos.patente ?? ''),
    cliente: String(datos.cliente ?? ''),
    modelo: String(datos.modelo ?? ''),
  }
  switch (llamada.toolName) {
    case 'buscar_vehiculo':
      return { tipo: 'buscar_vehiculo', ...auto }
    case 'historial_vehiculo':
      return { tipo: 'historial_vehiculo', ...auto }
    case 'cambiar_estado':
      return {
        tipo: 'cambiar_estado',
        estado: String(datos.estado ?? ''),
        ...auto,
      }
    case 'agregar_servicios':
      return {
        tipo: 'agregar_servicios',
        renglones: Array.isArray(datos.renglones) ? datos.renglones : [],
        ...auto,
      }
    case 'estado_del_taller':
      return {
        tipo: 'estado_del_taller',
        soloListos: datos.solo_listos === true,
      }
    case 'entregas_de_hoy':
      return {
        tipo: 'entregas_de_hoy',
        soloVencidos: datos.solo_vencidos === true,
      }
    case 'recordatorios_para_avisar':
      return {
        tipo: 'recordatorios_para_avisar',
        soloVencidos: datos.solo_vencidos === true,
      }
    case 'buscar_cliente':
      return { tipo: 'buscar_cliente', nombre: String(datos.nombre ?? '') }
    case 'recibir_vehiculo':
      return {
        tipo: 'recibir_vehiculo',
        cliente: String(datos.cliente ?? ''),
        telefono: String(datos.telefono ?? ''),
        patente: String(datos.patente ?? ''),
        marca: String(datos.marca ?? ''),
        modelo: String(datos.modelo ?? ''),
        anio: typeof datos.anio === 'number' ? datos.anio : undefined,
        km: typeof datos.km === 'number' ? datos.km : undefined,
        motivo: String(datos.motivo ?? ''),
      }
    case 'crear_cliente':
      return {
        tipo: 'crear_cliente',
        nombre: String(datos.nombre ?? ''),
        telefono: String(datos.telefono ?? ''),
      }
    case 'listar_clientes':
      return { tipo: 'listar_clientes', prefijo: String(datos.prefijo ?? '') }
    default:
      return { tipo: 'ninguna', respuesta: '' }
  }
}
