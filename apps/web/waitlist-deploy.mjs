// Deploy-time assembly (runs in build:deploy, after vite build):
// the static waitlist page becomes the site's homepage, and the React app
// shell moves to app.html, which DigitalOcean serves as the catchall for
// every other path (/login, /home, /admin, /i/..., Google OAuth returns).
// The iOS app uses the plain `npm run build` output and never sees this.
import fs from 'fs'

fs.renameSync('dist/index.html', 'dist/app.html')
fs.cpSync('waitlist', 'dist', {
  recursive: true,
  force: true,
  filter: (src) => !src.endsWith('README.md'),
})
console.log('[waitlist-deploy] homepage = waitlist page, app shell = app.html')
