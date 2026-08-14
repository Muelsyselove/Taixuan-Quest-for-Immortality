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
  // 角色登记册（按模式分离：list/create 携带 mode）
  chars: {
    list: (mode) => ipcRenderer.invoke('chars:list', mode),
    create: (payload) => ipcRenderer.invoke('chars:create', payload),
    read: (id) => ipcRenderer.invoke('chars:read', id),
    remove: (id) => ipcRenderer.invoke('chars:delete', id)
  },
  // 存档（按角色独立，按域分文件）
  saves: {
    list: (charId) => ipcRenderer.invoke('saves:list', charId),
    read: (charId, slot) => ipcRenderer.invoke('saves:read', charId, slot),
    write: (charId, slot, payload) => ipcRenderer.invoke('saves:write', charId, slot, payload),
    remove: (charId, slot) => ipcRenderer.invoke('saves:delete', charId, slot)
  },
  // Token 用量统计
  usage: {
    record: (entry) => ipcRenderer.invoke('usage:record', entry),
    read: () => ipcRenderer.invoke('usage:read')
  },
  win: {
    min: () => ipcRenderer.send('win:min'),
    max: () => ipcRenderer.send('win:max'),
    close: () => ipcRenderer.send('win:close')
  }
});
