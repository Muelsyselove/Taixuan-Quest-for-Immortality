// 领域：人物关系（登记 / 好感增减）
// 本文件导出方法集，由 store.js 混入 GameStore.prototype（方法内 this 即 store 实例）

export const relationDomain = {
  /**
   * 注册/更新出场角色：{name, identity, relation, affinity, delta}
   * - 新角色：登记姓名/身份/关系/初始好感（默认 0）
   * - 已登记：补充身份/关系描述，好感按 delta 增减（或 affinity 直接设值）
   */
  upsertRelation(entry) {
    if (!entry?.name) return null;
    const name = String(entry.name).slice(0, 20);
    const list = [...this.state.relations];
    const idx = list.findIndex(r => r.name === name);
    const clampAff = (v) => Math.max(-100, Math.min(100, Math.round(v)));

    if (idx >= 0) {
      const cur = list[idx];
      const next = { ...cur };
      if (entry.identity) next.identity = String(entry.identity).slice(0, 30);
      if (entry.relation) next.relation = String(entry.relation).slice(0, 40);
      if (typeof entry.affinity === 'number') next.affinity = clampAff(entry.affinity);
      if (typeof entry.delta === 'number' && entry.delta) next.affinity = clampAff(next.affinity + entry.delta);
      if (next.affinity !== cur.affinity) {
        this.pushHistory(`【${name}】好感${next.affinity > cur.affinity ? '升温' : '转冷'}至 ${next.affinity}`, 'relation');
      }
      list[idx] = next;
      this.set({ relations: list });
      return next;
    }

    const fresh = {
      id: `rl-${Date.now()}-${++this._uid}`,
      name,
      identity: String(entry.identity || '身份未明').slice(0, 30),
      relation: String(entry.relation || '萍水相逢').slice(0, 40),
      affinity: clampAff(typeof entry.affinity === 'number' ? entry.affinity : 0),
      day: this.state.day
    };
    list.push(fresh);
    this.set({ relations: list });
    this.pushHistory(`结识【${fresh.name}】——${fresh.identity}，${fresh.relation}`, 'relation');
    return fresh;
  }
};
