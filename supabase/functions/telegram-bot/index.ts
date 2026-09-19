// Bot de Telegram por voz. El mecánico manda una nota de voz o un texto y el
// bot (a) CONSULTA la app: un vehículo o su historial, lo que hay en el taller,
// qué entregar hoy, a quién avisar y la información de los clientes; y (b)
// MODIFICA solo con confirmación por botones: marcar un auto como listo o
// entregado y cargarle repuestos o mano de obra. Los autos se nombran por la
// patente o por el cliente ("el auto de Juan"); si hace falta, el bot pregunta
// cuál (por modelo y, si son iguales, por patente). Diseño completo en
// context.md §15. Corre en una Edge Function de Supabase (Deno), con webhook;
// los secretos se cargan con `supabase secrets set`.
import { Bot, InlineKeyboard, webhookCallback } from 'npm:grammy'
import { entorno, rpc } from './datos.ts'
import {
  etiquetaCandidato,
  textoCliente,
  textoConfirmarEstado,
  textoConfirmarServicios,
  textoEntregasDeHoy,
  textoErrorPreparar,
  textoErrorResolver,
  textoEstadoTaller,
  textoHistorial,
  textoListaClientes,
  textoParaAvisar,
  textoPreguntaClientes,
  textoPreguntaVehiculo,
  textoResultado,
  textoVehiculo,
  type Candidato,
  type ClienteCandidato,
  type Confirmacion,
  type FichaCliente,
  type FichaVehiculo,
  type Historial,
  type ListaClientes,
  type ParaAvisar,
  type Preparacion,
} from './formato.ts'
import { interpretar, type OrdenConAuto } from './llm.ts'
import { esPatenteValida, normalizarPatente } from './patente.ts'

const token = entorno('TELEGRAM_BOT_TOKEN')
const secretoWebhook = entorno('TELEGRAM_WEBHOOK_SECRET')
const claveGroq = entorno('GROQ_API_KEY')
// Ids numéricos de Telegram autorizados, separados por coma (primer filtro; el
// segundo es la tabla telegram_usuarios, que además define el taller).
const permitidos = new Set(
  entorno('TELEGRAM_ALLOWED_IDS')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
)

// Ayuda a Whisper con el vocabulario del taller (máx. 224 tokens).
const VOCABULARIO =
  'Taller mecánico en Argentina. Patentes como AB123CD o ABC123. Marcas: Toyota, Volkswagen, Ford, Chevrolet, Fiat, Renault, Peugeot, Nissan. Cambio de aceite, pastillas de freno, alineación, balanceo, correa de distribución, repuesto, mano de obra.'

// Un audio muy largo no es un comando: se corta para cuidar el límite gratuito.
const SEGUNDOS_MAXIMOS = 60

async function transcribir(audio: Blob) {
  const formulario = new FormData()
  formulario.append(
    'file',
    new File([audio], 'audio.ogg', { type: 'audio/ogg' }),
  )
  formulario.append('model', 'whisper-large-v3-turbo')
  formulario.append('language', 'es')
  formulario.append('temperature', '0')
  formulario.append('prompt', VOCABULARIO)

  const respuesta = await fetch(
    'https://api.groq.com/openai/v1/audio/transcriptions',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${claveGroq}` },
      body: formulario,
    },
  )
  if (!respuesta.ok) {
    throw new Error(
      `Groq respondió ${respuesta.status}: ${await respuesta.text()}`,
    )
  }
  const { text } = await respuesta.json()
  return String(text ?? '').trim()
}

const bot = new Bot(token)
type Ctx = Parameters<Parameters<typeof bot.on>[1]>[0]

// Solo chats privados y usuarios de la lista; a los demás no se les responde.
bot.use(async (ctx, next) => {
  const id = ctx.from?.id
  if (
    ctx.chat?.type !== 'private' ||
    id === undefined ||
    !permitidos.has(String(id))
  ) {
    return
  }
  await next()
})

// Telegram reintenta si tarda: un mensaje ya procesado no se vuelve a atender.
bot.use(async (ctx, next) => {
  let esNuevo = true
  try {
    esNuevo = await rpc<boolean>('bot_registrar_update', {
      p_update_id: ctx.update.update_id,
    })
  } catch (error) {
    console.error('No se pudo registrar el update:', error)
  }
  if (!esNuevo) return
  await next()
})

async function registrar(
  usuario: number,
  texto: string,
  accion: string,
  resultado: string,
) {
  try {
    await rpc('bot_registrar_log', {
      p_telegram_user_id: usuario,
      p_texto: texto,
      p_accion: accion,
      p_resultado: resultado,
    })
  } catch (error) {
    console.error('No se pudo guardar el registro:', error)
  }
}

const esNoAutorizado = (error: unknown) =>
  String((error as { message?: string })?.message ?? error).includes(
    'no_autorizado',
  )

// ---------------------------------------------------------------------------
// Encontrar el auto: por patente o por el cliente, preguntando solo si hace falta
// ---------------------------------------------------------------------------

type Resolucion = {
  tipo?: 'vehiculo' | 'clientes' | 'aclarar'
  error?: string
  patente?: string
  cliente?: string
  clientes?: ClienteCandidato[]
  candidatos?: Candidato[]
}

// La pregunta pendiente: la orden original y las opciones entre las que elegir.
type Aclaracion =
  | { tipo: 'vehiculos'; orden: OrdenConAuto; candidatos: Candidato[] }
  | { tipo: 'clientes'; orden: OrdenConAuto; candidatos: ClienteCandidato[] }

const sinAcentos = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const palabras = (t: string) =>
  sinAcentos(t)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 3)

// Qué opciones coinciden con lo que contestó el mecánico (por voz o texto).
function elegirCandidato(texto: string, pendiente: Aclaracion) {
  if (pendiente.tipo === 'vehiculos') {
    const patente = normalizarPatente(texto)
    const porPatente = pendiente.candidatos.filter((c) =>
      patente.includes(c.patente),
    )
    if (porPatente.length > 0) return porPatente
    const dichas = palabras(texto)
    return pendiente.candidatos.filter((c) => {
      const propias = palabras(`${c.marca} ${c.modelo}`)
      return dichas.some((d) => propias.includes(d))
    })
  }
  const dichas = palabras(texto)
  return pendiente.candidatos.filter((c) => {
    const propias = palabras(c.nombre)
    return dichas.some((d) => propias.includes(d))
  })
}

// Guarda la pregunta (vence a los 5 minutos) y la muestra con botones.
async function preguntar(ctx: Ctx, usuario: number, pendiente: Aclaracion) {
  await rpc('bot_guardar_aclaracion', {
    p_telegram_user_id: usuario,
    p_tipo: pendiente.tipo,
    p_orden: pendiente.orden,
    p_candidatos: pendiente.candidatos,
  })
  const teclado = new InlineKeyboard()
  if (pendiente.tipo === 'vehiculos') {
    for (const c of pendiente.candidatos) {
      teclado
        .text(etiquetaCandidato(c, pendiente.candidatos), `v:${c.id}`)
        .row()
    }
    await ctx.reply(
      textoPreguntaVehiculo(
        pendiente.orden.cliente || 'El cliente',
        pendiente.candidatos,
      ),
      { reply_markup: teclado },
    )
  } else {
    for (const c of pendiente.candidatos) {
      teclado
        .text(`${c.nombre}${c.telefono ? ` · ${c.telefono}` : ''}`, `k:${c.id}`)
        .row()
    }
    await ctx.reply(textoPreguntaClientes(pendiente.candidatos.length), {
      reply_markup: teclado,
    })
  }
}

// Ya se sabe cuál es el auto (patente válida): consulta o prepara la acción.
async function ejecutarConPatente(
  ctx: Ctx,
  usuario: number,
  orden: OrdenConAuto,
  patente: string,
) {
  if (orden.tipo === 'historial_vehiculo') {
    const historial = await rpc<Historial | null>('bot_historial_vehiculo', {
      p_telegram_user_id: usuario,
      p_patente: patente,
    })
    await ctx.reply(
      historial
        ? textoHistorial(historial)
        : `No encontré la patente ${patente} en el taller.`,
    )
    return
  }
  if (orden.tipo === 'buscar_vehiculo') {
    const ficha = await rpc<FichaVehiculo | null>('bot_buscar_vehiculo', {
      p_telegram_user_id: usuario,
      p_patente: patente,
    })
    await ctx.reply(
      ficha
        ? textoVehiculo(ficha)
        : `No encontré la patente ${patente} en el taller.`,
    )
    return
  }
  // Acciones que modifican: todavía no se toca nada. Se guarda la acción
  // pendiente y se pide confirmar con botones.
  type Preparada = Preparacion & { error?: string; estado?: string }
  const preparada =
    orden.tipo === 'cambiar_estado'
      ? await rpc<Preparada>('bot_preparar_cambio_estado', {
          p_telegram_user_id: usuario,
          p_patente: patente,
          p_estado: orden.estado,
        })
      : await rpc<Preparada>('bot_preparar_servicios', {
          p_telegram_user_id: usuario,
          p_patente: patente,
          p_items: orden.renglones,
        })
  if (preparada.error) {
    await ctx.reply(
      textoErrorPreparar(preparada.error, patente, preparada.estado),
    )
    return
  }
  const teclado = new InlineKeyboard()
    .text('✅ Confirmar', `a:ok:${preparada.accion_id}`)
    .text('✖️ Cancelar', `a:no:${preparada.accion_id}`)
  await ctx.reply(
    orden.tipo === 'cambiar_estado'
      ? textoConfirmarEstado(preparada)
      : textoConfirmarServicios(preparada),
    { reply_markup: teclado },
  )
}

// Busca el auto por patente o por cliente y sigue; pregunta solo si hay dudas.
async function resolverVehiculo(
  ctx: Ctx,
  usuario: number,
  orden: OrdenConAuto,
  clienteId?: string,
) {
  const dicha = orden.patente ? normalizarPatente(orden.patente) : ''
  const patente = esPatenteValida(dicha) ? dicha : ''
  if (!patente && !orden.cliente && !clienteId) {
    await ctx.reply(
      dicha
        ? `No entendí bien la patente ("${orden.patente}"). Decime la patente de nuevo o el nombre del cliente.`
        : '¿De qué auto? Decime la patente o el nombre del cliente.',
    )
    return
  }
  const requiereIngreso =
    orden.tipo === 'cambiar_estado' || orden.tipo === 'agregar_servicios'
  const r = await rpc<Resolucion>('bot_resolver_vehiculo', {
    p_telegram_user_id: usuario,
    p_patente: patente || null,
    p_cliente: orden.cliente || null,
    p_cliente_id: clienteId ?? null,
    p_modelo: orden.modelo || null,
    p_requiere_ingreso: requiereIngreso,
  })
  if (r.error) {
    await ctx.reply(textoErrorResolver(r.error, r.cliente, patente || dicha))
  } else if (r.tipo === 'clientes' && r.clientes) {
    await preguntar(ctx, usuario, {
      tipo: 'clientes',
      orden,
      candidatos: r.clientes,
    })
  } else if (r.tipo === 'aclarar' && r.candidatos) {
    await preguntar(ctx, usuario, {
      tipo: 'vehiculos',
      orden: { ...orden, cliente: r.cliente ?? orden.cliente },
      candidatos: r.candidatos,
    })
  } else if (r.patente) {
    await ejecutarConPatente(ctx, usuario, orden, r.patente)
  } else {
    await ctx.reply('No pude encontrar el auto. Probá de nuevo.')
  }
}

// El mecánico eligió una opción de la pregunta (con un botón o contestando).
async function continuarAclaracion(
  ctx: Ctx,
  usuario: number,
  pendiente: Aclaracion,
  elegido: Candidato | ClienteCandidato,
) {
  if (pendiente.tipo === 'clientes') {
    await resolverVehiculo(ctx, usuario, pendiente.orden, elegido.id)
  } else {
    await ejecutarConPatente(
      ctx,
      usuario,
      pendiente.orden,
      (elegido as Candidato).patente,
    )
  }
}

// ---------------------------------------------------------------------------

// Interpreta el texto (que puede venir de un audio) y responde.
async function atender(ctx: Ctx, texto: string) {
  const usuario = ctx.from!.id
  let accion = 'ninguna'
  try {
    await ctx.replyWithChatAction('typing')

    // ¿Está contestando una pregunta de "¿cuál auto?" / "¿cuál cliente?"?
    const pendiente = await rpc<Aclaracion | null>('bot_leer_aclaracion', {
      p_telegram_user_id: usuario,
    })
    if (pendiente) {
      const elegidos = elegirCandidato(texto, pendiente)
      if (elegidos.length === 1) {
        await rpc('bot_borrar_aclaracion', { p_telegram_user_id: usuario })
        await continuarAclaracion(ctx, usuario, pendiente, elegidos[0])
        await registrar(usuario, texto, 'aclaracion', 'ok')
        return
      }
      const respuestaCorta = texto.trim().split(/\s+/).length <= 3
      if (elegidos.length > 1 || respuestaCorta) {
        // Varias coinciden (por ejemplo, dos autos del mismo modelo) o no se
        // entendió una respuesta corta: se vuelve a preguntar.
        await preguntar(
          ctx,
          usuario,
          elegidos.length > 1
            ? ({ ...pendiente, candidatos: elegidos } as Aclaracion)
            : pendiente,
        )
        await registrar(usuario, texto, 'aclaracion', 'repregunta')
        return
      }
      // Es un pedido nuevo: se descarta la pregunta anterior.
      await rpc('bot_borrar_aclaracion', { p_telegram_user_id: usuario })
    }

    const orden = await interpretar(texto)
    accion = orden.tipo

    if (
      orden.tipo === 'buscar_vehiculo' ||
      orden.tipo === 'historial_vehiculo' ||
      orden.tipo === 'cambiar_estado' ||
      orden.tipo === 'agregar_servicios'
    ) {
      await resolverVehiculo(ctx, usuario, orden)
    } else if (orden.tipo === 'estado_del_taller') {
      const filas = await rpc<Parameters<typeof textoEstadoTaller>[0]>(
        'bot_estado_taller',
        { p_telegram_user_id: usuario },
      )
      await ctx.reply(textoEstadoTaller(filas, orden.soloListos))
    } else if (orden.tipo === 'entregas_de_hoy') {
      const filas = await rpc<Parameters<typeof textoEntregasDeHoy>[0]>(
        'bot_para_hoy',
        { p_telegram_user_id: usuario },
      )
      await ctx.reply(textoEntregasDeHoy(filas, orden.soloVencidos))
    } else if (orden.tipo === 'recordatorios_para_avisar') {
      const datos = await rpc<ParaAvisar>('bot_para_avisar', {
        p_telegram_user_id: usuario,
      })
      await ctx.reply(textoParaAvisar(datos, orden.soloVencidos))
    } else if (orden.tipo === 'listar_clientes') {
      const datos = await rpc<ListaClientes>('bot_listar_clientes', {
        p_telegram_user_id: usuario,
        p_prefijo: orden.prefijo || null,
      })
      await ctx.reply(textoListaClientes(datos, orden.prefijo))
    } else if (orden.tipo === 'buscar_cliente') {
      const clientes = await rpc<
        { id: string; nombre: string; telefono: string | null }[]
      >('bot_buscar_clientes', {
        p_telegram_user_id: usuario,
        p_nombre: orden.nombre,
      })
      if (clientes.length === 0) {
        await ctx.reply(
          `No encontré ningún cliente que se llame "${orden.nombre}".`,
        )
      } else if (clientes.length === 1) {
        await enviarFichaCliente(ctx, usuario, clientes[0].id)
      } else {
        const teclado = new InlineKeyboard()
        for (const c of clientes) {
          teclado
            .text(
              `${c.nombre}${c.telefono ? ` · ${c.telefono}` : ''}`,
              `c:${c.id}`,
            )
            .row()
        }
        await ctx.reply(
          clientes.length >= 6
            ? 'Hay varios clientes con ese nombre (muestro 6). ¿Cuál? Si no está, decime el nombre completo.'
            : `Encontré ${clientes.length} clientes con ese nombre. ¿Cuál?`,
          { reply_markup: teclado },
        )
      }
    } else {
      await ctx.reply(
        orden.respuesta ||
          'No entendí qué querés hacer. Mandame /ayuda para ver ejemplos.',
      )
    }
    await registrar(usuario, texto, accion, 'ok')
  } catch (error) {
    console.error('Error al atender el pedido:', error)
    await registrar(
      usuario,
      texto,
      accion,
      `error: ${String((error as Error)?.message ?? error)}`,
    )
    await ctx.reply(
      esNoAutorizado(error)
        ? 'Tu usuario de Telegram todavía no está vinculado a la app.'
        : 'No pude resolverlo. Probá de nuevo.',
    )
  }
}

async function enviarFichaCliente(
  ctx: Ctx,
  usuario: number,
  clienteId: string,
) {
  const ficha = await rpc<FichaCliente | null>('bot_ficha_cliente', {
    p_telegram_user_id: usuario,
    p_cliente_id: clienteId,
  })
  await ctx.reply(ficha ? textoCliente(ficha) : 'No encontré ese cliente.')
}

const AYUDA = [
  'Mandame una nota de voz o un texto. Al auto lo nombrás por la patente o por el cliente.',
  '',
  'CONSULTAS',
  '🚗 "Buscá el auto de Juan Pérez" / "buscá la patente AB123CD"',
  '🧾 "Qué le hicimos al auto de Juan" (historial)',
  '🔧 "Qué hay en el taller" / "cuáles están listos"',
  '📅 "Qué tengo para entregar hoy"',
  '🔔 "A quién tengo que avisar"',
  '👤 "Qué datos tenés de Juan Pérez"',
  '📋 "Qué clientes tengo" / "clientes con G"',
  '',
  'CAMBIOS (siempre te pido confirmar con un botón)',
  '✅ "El auto de Juan está listo" / "ya se entregó el Fiat de María"',
  '➕ "Al auto de Juan cargale pastillas de freno, dos a veinte mil, y mano de obra doce mil"',
  '',
  'Si el cliente tiene más de un auto te pregunto cuál (el modelo, o la patente si son iguales). Para cargar servicios el auto tiene que estar recibido en el taller.',
].join('\n')

bot.command('start', (ctx) => ctx.reply(AYUDA))
bot.command('ayuda', (ctx) => ctx.reply(AYUDA))

bot.on('message:voice', async (ctx) => {
  if (ctx.message.voice.duration > SEGUNDOS_MAXIMOS) {
    await ctx.reply(
      `El audio es muy largo (máximo ${SEGUNDOS_MAXIMOS} segundos).`,
    )
    return
  }
  let texto = ''
  try {
    const archivo = await ctx.getFile()
    const descarga = await fetch(
      `https://api.telegram.org/file/bot${token}/${archivo.file_path}`,
    )
    if (!descarga.ok)
      throw new Error(`Telegram respondió ${descarga.status} al bajar el audio`)
    texto = await transcribir(await descarga.blob())
  } catch (error) {
    console.error('Error al procesar el audio:', error)
    await ctx.reply('No pude procesar el audio. Probá de nuevo.')
    return
  }
  if (!texto) {
    await ctx.reply('No entendí nada en el audio.')
    return
  }
  // Se muestra lo que se entendió: si Whisper se equivocó, se nota enseguida.
  await ctx.reply(`🎤 Entendí: "${texto}"`)
  await atender(ctx, texto)
})

bot.on('message:text', (ctx) => atender(ctx, ctx.message.text))

// Botón para elegir entre varios clientes con el mismo nombre (solo consulta).
bot.callbackQuery(/^c:([0-9a-f-]{36})$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const usuario = ctx.from.id
  try {
    await enviarFichaCliente(ctx, usuario, ctx.match[1])
    await registrar(
      usuario,
      `(botón) cliente ${ctx.match[1]}`,
      'ficha_cliente',
      'ok',
    )
  } catch (error) {
    console.error('Error al mostrar la ficha:', error)
    await ctx.reply('No pude resolverlo. Probá de nuevo.')
  }
})

// Botón de una pregunta de aclaración: v = qué auto, k = qué cliente.
bot.callbackQuery(/^([vk]):([0-9a-f-]{36})$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const usuario = ctx.from.id
  try {
    const pendiente = await rpc<Aclaracion | null>('bot_leer_aclaracion', {
      p_telegram_user_id: usuario,
    })
    const elegido = (
      pendiente?.candidatos as { id: string }[] | undefined
    )?.find((c) => c.id === ctx.match[2])
    if (!pendiente || !elegido) {
      await ctx.reply('Esa pregunta ya venció. Pedímelo de nuevo.')
      return
    }
    await ctx
      .editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } })
      .catch(() => {})
    await rpc('bot_borrar_aclaracion', { p_telegram_user_id: usuario })
    await continuarAclaracion(
      ctx,
      usuario,
      pendiente,
      elegido as Candidato | ClienteCandidato,
    )
    await registrar(
      usuario,
      `(botón) ${ctx.match[1]} ${ctx.match[2]}`,
      'aclaracion',
      'ok',
    )
  } catch (error) {
    console.error('Error al continuar la aclaración:', error)
    await ctx.reply(
      esNoAutorizado(error)
        ? 'Tu usuario de Telegram todavía no está vinculado a la app.'
        : 'No pude resolverlo. Probá de nuevo.',
    )
  }
})

// Botones Confirmar / Cancelar de una acción que modifica datos. Recién acá se
// ejecuta (en la base, una sola vez); el modelo de IA no interviene.
bot.callbackQuery(/^a:(ok|no):([0-9a-f-]{36})$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const usuario = ctx.from.id
  const accion = ctx.match[2]
  try {
    // Se sacan los botones para que no se toquen dos veces.
    await ctx
      .editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } })
      .catch(() => {})
    if (ctx.match[1] === 'no') {
      const cancelada = await rpc<boolean>('bot_cancelar', {
        p_telegram_user_id: usuario,
        p_accion_id: accion,
      })
      await ctx.reply(
        cancelada
          ? 'Cancelado. No hice nada.'
          : 'Esa acción ya no estaba pendiente.',
      )
      await registrar(
        usuario,
        `(botón) cancelar ${accion}`,
        'cancelar',
        cancelada ? 'ok' : 'no estaba pendiente',
      )
    } else {
      const resultado = await rpc<Confirmacion>('bot_confirmar', {
        p_telegram_user_id: usuario,
        p_accion_id: accion,
      })
      await ctx.reply(textoResultado(resultado))
      await registrar(
        usuario,
        `(botón) confirmar ${accion}`,
        resultado.tipo ?? 'confirmar',
        resultado.ok ? 'ok' : `no: ${resultado.error}`,
      )
    }
  } catch (error) {
    console.error('Error al confirmar o cancelar:', error)
    await registrar(
      usuario,
      `(botón) ${ctx.match[1]} ${accion}`,
      'confirmar',
      `error: ${String((error as Error)?.message ?? error)}`,
    )
    await ctx.reply(
      esNoAutorizado(error)
        ? 'Tu usuario de Telegram todavía no está vinculado a la app.'
        : 'No pude resolverlo. Probá de nuevo.',
    )
  }
})

// Un error no debe hacer que Telegram reintente el mismo mensaje una y otra vez.
bot.catch((error) => console.error('Error del bot:', error.error))

const manejarActualizacion = webhookCallback(bot, 'std/http', {
  timeoutMilliseconds: 60_000,
})

Deno.serve(async (peticion) => {
  // Telegram manda el secreto en este encabezado (se define al registrar el webhook).
  if (
    peticion.headers.get('x-telegram-bot-api-secret-token') !== secretoWebhook
  ) {
    return new Response('No autorizado', { status: 401 })
  }
  return await manejarActualizacion(peticion)
})
