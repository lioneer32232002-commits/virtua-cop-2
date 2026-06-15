const { app, BrowserWindow } = require('electron')
const path = require('path')
function createWindow() {
  const win = new BrowserWindow({ width: 1280, height: 720, webPreferences: { backgroundThrottling: false } })
  win.loadFile(path.join(__dirname, '..', 'game', 'dist', 'm0.html'))
}
app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
