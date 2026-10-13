// Watch QuteNote build processing, then submit for beta review + attach to the Public Beta group
// Usage: node qutenote_testflight.js <buildVersion> ["what to test notes"]   (version is REQUIRED — polling "latest"
// right after an upload can grab the PREVIOUS build before ASC registers the new one)
const { asc } = require('./asc')

const APP_ID = '6819877820'
const DREAMBOUND_APP_ID = '6817987157'
const PUBLIC_BETA_GROUP_ID = 'afef6516-eef8-413d-b7c3-8103aba2b473' // original group, link BRW6MMEJ

const VERSION = process.argv[2]
if (!VERSION) { console.error('Usage: node qutenote_testflight.js <buildVersion>'); process.exit(1) }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  // 1. Wait for the uploaded build to finish processing
  let build = null
  for (let i = 0; i < 60; i++) {
    const r = await asc('GET', `/v1/builds?filter[app]=${APP_ID}&filter[version]=${VERSION}&limit=1`)
    build = r.json?.data?.[0]
    const state = build?.attributes?.processingState
    console.log(new Date().toISOString(), 'processingState:', state ?? 'no build yet')
    if (state === 'VALID') break
    if (state === 'FAILED' || state === 'INVALID') throw new Error('Build processing failed: ' + state)
    await sleep(60000)
  }
  if (build?.attributes?.processingState !== 'VALID') throw new Error('Timed out waiting for processing')
  console.log('Build ready:', build.id, build.attributes.version)

  // 2. Copy beta review contact info from Dreambound
  const dbDetail = await asc('GET', `/v1/apps/${DREAMBOUND_APP_ID}/betaAppReviewDetail`)
  const qnDetail = await asc('GET', `/v1/apps/${APP_ID}/betaAppReviewDetail`)
  const a = dbDetail.json?.data?.attributes
  if (a && qnDetail.json?.data?.id) {
    const patch = await asc('PATCH', `/v1/betaAppReviewDetails/${qnDetail.json.data.id}`, {
      data: {
        type: 'betaAppReviewDetails',
        id: qnDetail.json.data.id,
        attributes: {
          contactFirstName: a.contactFirstName,
          contactLastName: a.contactLastName,
          contactEmail: a.contactEmail,
          contactPhone: a.contactPhone,
          demoAccountRequired: false,
        },
      },
    })
    console.log('Review contact copied:', patch.status)
  } else {
    console.log('WARN: could not copy review contact', dbDetail.status, qnDetail.status)
  }

  // 3. Beta "what to test" notes
  const locs = await asc('GET', `/v1/builds/${build.id}/betaBuildLocalizations`)
  const locId = locs.json?.data?.[0]?.id
  if (locId) {
    await asc('PATCH', `/v1/betaBuildLocalizations/${locId}`, {
      data: { type: 'betaBuildLocalizations', id: locId, attributes: { whatsNew: process.argv[3] || 'Bug fixes and improvements.' } },
    })
    console.log('Test notes set')
  }

  // 4. Use the existing Public Beta group — NEVER create a new one (did that by accident Oct 13)
  const groupId = PUBLIC_BETA_GROUP_ID

  // 5. Add build to the group
  const add = await asc('POST', `/v1/betaGroups/${groupId}/relationships/builds`, {
    data: [{ type: 'builds', id: build.id }],
  })
  console.log('Build added to group:', add.status)

  // 6. Submit for beta app review
  const sub = await asc('POST', '/v1/betaAppReviewSubmissions', {
    data: {
      type: 'betaAppReviewSubmissions',
      relationships: { build: { data: { type: 'builds', id: build.id } } },
    },
  })
  console.log('Beta review submitted:', sub.status, JSON.stringify(sub.json?.errors ?? '').slice(0, 300))

  // Re-read group for the final public link
  const g2 = await asc('GET', `/v1/betaGroups/${groupId}`)
  console.log('PUBLIC LINK:', g2.json?.data?.attributes?.publicLink)
}

main().catch((e) => { console.error('WATCHER ERROR:', e.message); process.exit(1) })
