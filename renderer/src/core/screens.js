// 屏幕管理器：单屏切换（主界面 / 角色选择 / 存档选择 / 设置 / 游戏界面）
// 切屏时销毁旧屏幕（组件销毁自动解绑订阅与监听器），避免泄漏
export class ScreenManager {
  constructor(root) {
    this.root = root;
    this.current = null;
    this.name = '';
  }

  /** @param name 屏幕名（自检/调试钩子） @param screen Component 实例 */
  show(name, screen) {
    this.current?.destroy?.();
    this.root.innerHTML = '';
    this.current = screen;
    this.name = name;
    screen.mount(this.root);
    return screen;
  }
}
