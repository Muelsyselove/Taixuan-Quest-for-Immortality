// 存档管理器：手动存档 / 读档 / 自动存档（每次剧情推进后）
export class SaveManager {
  constructor(store) {
    this.store = store;
    this.AUTO_SLOT = 'auto';
  }

  async save(slot) {
    const data = this.store.serialize();
    return window.taixuan.saves.write(slot, data);
  }

  async autoSave() {
    return this.save(this.AUTO_SLOT);
  }

  async list() {
    return (await window.taixuan.saves.list()) || [];
  }

  async load(slot) {
    const data = await window.taixuan.saves.read(slot);
    if (!data) return false;
    return this.store.deserialize(data);
  }

  async remove(slot) {
    return window.taixuan.saves.remove(slot);
  }
}
