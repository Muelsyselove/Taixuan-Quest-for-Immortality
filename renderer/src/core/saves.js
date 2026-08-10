// 存档管理器：按角色独立存档，存档内容按域分文件存储
// 每个角色一个存档空间；每次写档把状态拆成 profile/inventory/skills/relations/history 等域文件
export class SaveManager {
  constructor(store) {
    this.store = store;
    this.AUTO_SLOT = 'auto';
    this.charId = null; // 当前角色 id（进入游戏前必须绑定）
  }

  bind(charId) {
    this.charId = charId;
  }

  _needChar() {
    if (!this.charId) throw new Error('尚未绑定角色，无法读写存档');
  }

  async save(slot) {
    this._needChar();
    const s = this.store.state;
    const payload = {
      files: this.store.serializeDomains(),
      meta: {
        savedAt: Date.now(),
        day: s.day,
        realm: s.realm,
        name: s.name
      }
    };
    return window.taixuan.saves.write(this.charId, slot, payload);
  }

  async autoSave() {
    return this.save(this.AUTO_SLOT);
  }

  async list() {
    this._needChar();
    return (await window.taixuan.saves.list(this.charId)) || [];
  }

  async load(slot) {
    this._needChar();
    const data = await window.taixuan.saves.read(this.charId, slot);
    if (!data) return false;
    if (data.legacy) return this.store.deserialize(data.legacy); // 旧版整树兼容
    return this.store.deserializeDomains(data.files);
  }

  async hasAuto() {
    const list = await this.list();
    return list.some(s => s.auto);
  }

  async remove(slot) {
    this._needChar();
    return window.taixuan.saves.remove(this.charId, slot);
  }
}
