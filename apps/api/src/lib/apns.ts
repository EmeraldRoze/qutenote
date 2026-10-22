import crypto from 'crypto'
import http2 from 'http2'
import fs from 'fs'
import os from 'os'

// Apple Push Notifications over HTTP/2 with a team-wide auth key.
// Key: APNS_KEY_BASE64 env (deploy) or the local .p8 file (dev on the Mac mini).

const KEY_ID = process.env.APNS_KEY_ID ?? 'CXSX9P9S8Z'
const TEAM_ID = '97276PB95S'
const TOPIC = 'club.cutenote.app'
const HOST = 'https://api.push.apple.com'

let cachedKey: string | null = null
function getKey(): string | null {
  if (cachedKey) return cachedKey
  if (process.env.APNS_KEY_BASE64) {
    cachedKey = Buffer.from(process.env.APNS_KEY_BASE64, 'base64').toString('utf8')
    return cachedKey
  }
  const local = `${os.homedir()}/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8`
  if (fs.existsSync(local)) {
    cachedKey = fs.readFileSync(local, 'utf8')
    return cachedKey
  }
  return null
}

let cachedJwt: { token: string; at: number } | null = null
function apnsJwt(key: string): string {
  // APNs tokens are valid 20–60 minutes; refresh every 40
  if (cachedJwt && Date.now() - cachedJwt.at < 40 * 60 * 1000) return cachedJwt.token
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const head = b64({ alg: 'ES256', kid: KEY_ID })
  const payload = b64({ iss: TEAM_ID, iat: Math.floor(Date.now() / 1000) })
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${payload}`), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')
  cachedJwt = { token: `${head}.${payload}.${sig}`, at: Date.now() }
  return cachedJwt.token
}

export async function sendPush(deviceToken: string, title: string, body: string): Promise<boolean> {
  const key = getKey()
  if (!key) {
    console.warn('[apns] no key configured — skipping push')
    return false
  }
  return new Promise((resolve) => {
    const client = http2.connect(HOST)
    client.on('error', (e) => { console.error('[apns] connect error', e.message); resolve(false) })
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${apnsJwt(key)}`,
      'apns-topic': TOPIC,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    })
    let status = 0
    let data = ''
    req.on('response', (headers) => { status = Number(headers[':status']) })
    req.on('data', (c) => { data += c })
    req.on('end', () => {
      client.close()
      if (status !== 200) console.error('[apns] status', status, data)
      resolve(status === 200)
    })
    req.on('error', (e) => { console.error('[apns] request error', e.message); client.close(); resolve(false) })
    req.end(JSON.stringify({ aps: { alert: { title, body }, sound: 'default' } }))
  })
}

// Push straight to every device a user has registered, ignoring notification
// preferences — used for admin-only alerts (brick walls, daily digests).
import { prisma as _prisma } from './prisma'
export async function pushToUserDevices(userId: string, title: string, body: string): Promise<void> {
  const tokens = await _prisma.deviceToken.findMany({ where: { userId }, select: { token: true } })
  for (const t of tokens) {
    sendPush(t.token, title, body).catch(() => {})
  }
}
