const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path')

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        fullscreen: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            allowRunningInsecureContent: true
        },
    });
    if (process.env.NODE_ENV === 'development') {
        const devUrl = 'http://localhost:3000';
        win.loadURL(devUrl);
        win.webContents.openDevTools();
    } else {
        const prodPath = path.join(__dirname, 'dist', 'index.html');
        win.loadFile(prodPath);
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// Пример IPC
ipcMain.handle('ping', async () => {
    return 'pong from main process';
});

ipcMain.handle('selectFile', async (event) => {
    const result = await dialog.showOpenDialog({
        title: 'Выберите изображения',
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
    });

    if (!result.canceled) {
        return result.filePaths[0];
    }

    return '';
});