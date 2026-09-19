// Bot de Telegram por voz, etapa 2a: el mecánico manda una nota de voz o un
// texto y el bot BUSCA información en la app (solo lectura): un vehículo por
// patente o su historial, lo que hay en el taller, qué entregar hoy, a quién
// avisar y la información de los clientes. Todavía no modifica nada. Diseño completo en context.md §15. Corre en una Edge Function
// de Supabase (Deno), con webhook; los secretos se cargan con
// `supabase secrets set`.
import { Bot, InlineKeyboard, webhookCallback } from 'npm:grammy'
import { entorno, rpc } from './datos.ts'
import {
  textoCliente,
  textoEntregasDeHoy,
  textoEstadoTaller,
  textoHistorial,
  textoListaClientes,
  textoParaAvisar,
  textoVehiculo,
  type FichaCliente,
  type FichaVehiculo,
  type Historial,
  type ListaClientes,
  type ParaAvisar,
} from './formato.ts'
import { interpretar } from './llm.ts'
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

// Interpreta el texto (que puede venir de un audio) y responde.
async function atender(
  ctx: Parameters<Parameters<typeof bot.on>[1]>[0],
  texto: string,
) {
  const usuario = ctx.from!.id
  let accion = 'ninguna'
  try {
    await ctx.replyWithChatAction('typing')
    const orden = await interpretar(texto)
    accion = orden.tipo

    if (
      orden.tipo === 'buscar_vehiculo' ||
      orden.tipo === 'historial_vehiculo'
    ) {
      const patente = normalizarPatente(orden.patente)
      if (!esPatenteValida(patente)) {
        await ctx.reply(
          `No entendí bien la patente ("${orden.patente}"). Decímela de nuevo, por favor.`,
        )
      } else {
        if (orden.tipo === 'historial_vehiculo') {
          const historial = await rpc<Historial | null>(
            'bot_historial_vehiculo',
            { p_telegram_user_id: usuario, p_patente: patente },
          )
          await ctx.reply(
            historial
              ? textoHistorial(historial)
              : `No encontré la patente ${patente} en el taller.`,
          )
        } else {
          const ficha = await rpc<FichaVehiculo | null>('bot_buscar_vehiculo', {
            p_telegram_user_id: usuario,
            p_patente: patente,
          })
          await ctx.reply(
            ficha
              ? textoVehiculo(ficha)
              : `No encontré la patente ${patente} en el taller.`,
          )
        }
      }
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
          'Por ahora solo puedo consultar. Mandame /ayuda para ver ejemplos.',
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
  ctx: Parameters<Parameters<typeof bot.on>[1]>[0],
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
  'Mandame una nota de voz o un texto. Puedo consultar:',
  '',
  '🚗 "Buscá la patente AB123CD"',
  '🧾 "Qué le hicimos a la patente AB123CD" (historial)',
  '🔧 "Qué hay en el taller" / "cuáles están listos"',
  '📅 "Qué tengo para entregar hoy"',
  '🔔 "A quién tengo que avisar"',
  '👤 "Qué datos tenés de Juan Pérez"',
  '📋 "Qué clientes tengo" / "clientes con G"',
  '',
  'Por ahora solo consulto: todavía no modifico nada.',
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

// Botón para elegir entre varios clientes con el mismo nombre.
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
