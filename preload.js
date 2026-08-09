// 预加载脚本：以白名单方式向渲染进程暴露能力
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taixuan', {
  ai: {
    chat: (payload) => ipcRenderer.invoke('ai:chat', payload),
    models: (payload) => ipcRenderer.invoke('ai:models', payload)
  },
  settings: {
    read: () => ipcRenderer.invoke('settings:read'),
    write: (data) => ipcRenderer.invoke('settings:write', data)
  },
  saves: {
    list: () => ipcRenderer.invoke('saves:list'),
    read: (slot) => ipcRenderer.invoke('saves:read', slot),
    write: (slot, data) => ipcRenderer.invoke('saves:write', slot, data),
    remove: (slot) => ipcRenderer.invoke('saves:delete', slot)
  },
  win: {
    min: () => ipcRenderer.send('win:min'),
    max: () => ipcRenderer.send('win:max'),
    close: () => ipcRenderer.send('win:close')
  }
});
