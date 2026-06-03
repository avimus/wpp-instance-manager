import express from 'express'
import pino from 'pino'
import { startSession, stopSession, getStatus, getSessionCount, sendMessage } from './sessions/manager'

const app = express()
const logger = pino({ level: 'info' })
const WPP_SERVICE_SECRET = process.env.WPP_SERVICE_SECRET!

app.use(express.json())

// Auth middleware
app.use((req, res, next) => {
  if (req.path === '/health') return next()
  const auth = req.headers['authorization']
  if (auth !== `Bearer ${WPP_SERVICE_SECRET}`) {
    res.status(401).json({ error: 'UNAUTHORIZED' })
    return
  }
  next()
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sessions: getSessionCount() })
})

app.post('/sessions/:sessionId/start', async (req, res) => {
  try {
    const result = await startSession(req.params.sessionId)
    res.json(result)
  } catch (err) {
    logger.error({ err }, 'start session failed')
    res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

app.post('/sessions/:sessionId/stop', async (req, res) => {
  try {
    await stopSession(req.params.sessionId)
    res.json({ status: 'offline' })
  } catch (err) {
    logger.error({ err }, 'stop session failed')
    res.status(500).json({ error: 'INTERNAL_ERROR' })
  }
})

app.get('/sessions/:sessionId/status', (req, res) => {
  const state = getStatus(req.params.sessionId)
  res.json({ session_id: req.params.sessionId, ...state })
})

app.post('/sessions/:sessionId/send', async (req, res) => {
  const { to, message } = req.body as { to: string; message: string }
  try {
    const messageId = await sendMessage(req.params.sessionId, to, message)
    res.json({ message_id: messageId, status: 'sent' })
  } catch (err) {
    const isOffline = err instanceof Error && err.message === 'SESSION_OFFLINE'
    if (isOffline) {
      const state = getStatus(req.params.sessionId)
      res.status(503).json({ error: 'INSTANCE_OFFLINE', status: state.status })
    } else {
      logger.error({ err, sessionId: req.params.sessionId }, 'send message failed')
      res.status(500).json({ error: 'INTERNAL_ERROR' })
    }
  }
})

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => logger.info({ port: PORT }, 'WPP Service started'))
