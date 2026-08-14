// 太玄问道 · ECO 发布脚本
// 用法：
//   node scripts/release.mjs <patch|minor|major|x.y.z> [--notes "更新说明"] [--no-git] [--no-pack]
// 流程：校验 → 同步版本号(package.json + renderer/src/core/config.js + eco-manifest.json)
//       → 自检 → 本地打出 ECO 压缩包(release/{name}-{version}-eco.tar.gz) 验证
//       → git 提交/打标签/推送（tag 推送触发 GitHub Action 构建并发布 ECO 压缩包）
// 说明：本项目 Release 只提供 ECO 友好压缩包，不发布安装器/一键启动包（见 eco-manifest.json）
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const CONFIG_PATH = path.join(ROOT, 'renderer', 'src', 'core', 'config.js');
const MANIFEST_PATH = path.join(ROOT, 'eco-manifest.json');

// ECO 压缩包内容：可直接运行的源码树 + 依赖/启动清单（不含 node_modules 与构建产物）
const ECO_FILES = ['package.json', 'package-lock.json', 'eco-manifest.json', 'main.js', 'preload.js', 'selfcheck.js', 'start.bat', 'renderer'];

/* ---------- 参数解析 ---------- */
const args = process.argv.slice(2);
const bump = args.find(a => !a.startsWith('--')) || 'patch';
const optNotes = (() => { const i = args.indexOf('--notes'); return i >= 0 ? args[i + 1] : ''; })();
const optGit = !args.includes('--no-git');
const optPack = !args.includes('--no-pack');

const fail = (msg) => { console.error(`\n[release] 失败：${msg}`); process.exit(1); };
const run = (cmd, opts = {}) => {
  console.log(`[release] $ ${cmd}`);
  const r = spawnSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true, ...opts });
  if (r.status !== 0) fail(`命令执行失败：${cmd}`);
};

/* ---------- 版本号 ---------- */
function nextVersion(cur, spec) {
  if (/^\d+\.\d+\.\d+$/.test(spec)) return spec;
  const [a, b, c] = cur.split('.').map(Number);
  if (spec === 'major') return `${a + 1}.0.0`;
  if (spec === 'minor') return `${a}.${b + 1}.0`;
  if (spec === 'patch') return `${a}.${b}.${c + 1}`;
  fail(`无法识别的版本规格：${spec}（应为 patch|minor|major|x.y.z）`);
}

const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
const oldVer = pkg.version;
const newVer = nextVersion(oldVer, bump);
if (newVer === oldVer) fail(`新版本号与当前相同（${oldVer}）`);
console.log(`[release] 版本：${oldVer} → ${newVer}`);

/* ---------- 三处版本号同步 ---------- */
pkg.version = newVer;
fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

const cfg = fs.readFileSync(CONFIG_PATH, 'utf-8');
const cfgNext = cfg.replace(/version:\s*'[^']*'/, `version: '${newVer}'`);
if (cfgNext === cfg) fail('config.js 中未找到 version 字段，无法同步');
fs.writeFileSync(CONFIG_PATH, cfgNext, 'utf-8');

manifest.version = newVer;
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
console.log('[release] 已同步 package.json / config.js / eco-manifest.json 版本号');

/* ---------- 自检 ---------- */
if (fs.existsSync(path.join(ROOT, 'selfcheck.js'))) run('node selfcheck.js');

/* ---------- 本地打出 ECO 压缩包（验证内容完整性） ---------- */
if (optPack) {
  const stage = path.join(ROOT, 'release', 'eco-staging');
  fs.rmSync(stage, { recursive: true, force: true });
  fs.mkdirSync(stage, { recursive: true });
  for (const f of ECO_FILES) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) fail(`ECO 打包缺少文件：${f}`);
    fs.cpSync(src, path.join(stage, f), { recursive: true });
  }
  const artifact = `${manifest.name}-${newVer}-eco.tar.gz`;
  const out = path.join(ROOT, 'release', artifact);
  fs.rmSync(out, { force: true });
  run(`tar -czf "${out}" -C "${stage}" .`);
  fs.rmSync(stage, { recursive: true, force: true });
  console.log(`[release] ECO 压缩包：release/${artifact}`);
}

/* ---------- git 提交 / 标签 / 推送（tag 触发 GitHub Action 发布） ---------- */
if (optGit) {
  run('git add package.json renderer/src/core/config.js eco-manifest.json');
  run(`git commit -m "release: v${newVer}${optNotes ? ` — ${optNotes}` : ''}"`);
  run(`git tag -a "v${newVer}" -m "v${newVer}${optNotes ? `\n${optNotes}` : ''}"`);
  run('git push');
  run(`git push origin "v${newVer}"`);
}

console.log(`\n[release] 完成：v${newVer}`);
if (optGit) console.log('[release] tag 已推送，GitHub Action 将自动构建并发布 ECO 压缩包到 Release');
else console.log('[release] 本次未执行 git 操作（--no-git）');
