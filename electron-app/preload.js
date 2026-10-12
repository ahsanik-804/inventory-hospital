const { contextBridge } = require('electron');

// Expose safe APIs to renderer if needed in future
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0'
});