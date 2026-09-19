// Bot de Telegram por voz, etapa 1 (prueba de conexión): recibe una nota de voz
// o un texto y responde lo que entendió. Todavía NO toca datos de la app.
// Diseño completo en context.md §15. Corre en una Edge Function de Supabase
// (Deno), con webhook. Los secretos se cargan con `supabase secrets set`.
import { Bot, webhookCallback } from 'npm:grammy'

function entorno(nombre: string) {
  const valor = Deno.env.get(nombre)
  if (!valor) throw new Error(`Falta el secreto ${nombre}`)
  return valor
}

const token = entorno('TELEGRAM_BOT_TOKEN')
const secretoWebhook = entorno('TELEGRAM_WEBHOOK_SECRET')
const claveGroq = entorno('GROQ_API_KEY')
// Ids numéricos de Telegram autorizados, separados por coma.
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

bot.command('start', (ctx) =>
  ctx.reply('Listo. Mandame una nota de voz o un texto y te digo qué entendí.'),
)

bot.on('message:voice', async (ctx) => {
  if (ctx.message.voice.duration > SEGUNDOS_MAXIMOS) {
    await ctx.reply(
      `El audio es muy largo (máximo ${SEGUNDOS_MAXIMOS} segundos).`,
    )
    return
  }
  try {
    const archivo = await ctx.getFile()
    const descarga = await fetch(
      `https://api.telegram.org/file/bot${token}/${archivo.file_path}`,
    )
    if (!descarga.ok)
      throw new Error(`Telegram respondió ${descarga.status} al bajar el audio`)
    const texto = await transcribir(await descarga.blob())
    await ctx.reply(
      texto ? `Entendí: "${texto}"` : 'No entendí nada en el audio.',
    )
  } catch (error) {
    console.error('Error al procesar el audio:', error)
    await ctx.reply('No pude procesar el audio. Probá de nuevo.')
  }
})

bot.on('message:text', (ctx) =>
  ctx.reply(`Recibí tu texto: "${ctx.message.text}"`),
)

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
