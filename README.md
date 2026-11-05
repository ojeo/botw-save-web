# 塞尔达传说 · 浏览器存档修改器（BOTW + TOTK）

一个纯静态 GitHub Pages 网站，同时支持两款 Switch 游戏的存档编辑，游戏存档仅在浏览器中处理，不会上传到服务器。

## 在线使用

| 游戏 | 网站入口 | 需要的存档文件 |
| --- | --- | --- |
| 《旷野之息》BOTW | [打开 BOTW 编辑器](https://ojeo.github.io/botw-save-web/) | `game_data.sav` |
| 《王国之泪》TOTK | [打开 TOTK 编辑器](https://ojeo.github.io/botw-save-web/totk/) | `progress.sav` |

### 王国之泪（TOTK）

1. 在 Switch 上使用 JKSV 备份《王国之泪》，并保存一份**不作修改的原始备份**。
2. 在 JKSV 备份中找到所需槽位，例如 `slot_00/progress.sav`。如支持文件夹导入，也可在浏览器中选择带有多个槽位的备份。
3. 打开 [TOTK 编辑器](https://ojeo.github.io/botw-save-web/totk/)，上传存档。
4. 修改卢比、心心、精力、武器、弓、盾、防具、材料、马匹等；高级编辑请谨慎使用。
5. 点击保存。Windows Chrome/Edge 在系统“另存为”窗口中保留 **`progress.sav`** 原文件名；iOS Safari 使用分享菜单中的“存储到文件”，确认文件名后保存。
6. 将下载的 `progress.sav` 替换到相同的 `slot_0x` 槽位，然后通过 JKSV 还原；**勿替换 `caption.sav`**（它用于截图和存档展示）。

### 旷野之息（BOTW）

1. 通过 JKSV 导出完整备份。
2. 选择任一槽位中的 `game_data.sav`。
3. 修改存档，保存后将新文件替换到同一槽位，再通过 JKSV 还原。

## 当前分类批量设置百分比

BOTW 和 TOTK 的“当前分类数量/耐久最大化”按钮现在可以选择 **1%～100%** 的目标比例，默认 **100%**：

1. 加载存档并打开相应物品分类。
2. 在按钮旁的“批量目标”数字框中填写整数百分比，例如 `90`；失去焦点或回车后自动保存设置。
3. 点击“当前分类数量/耐久最大化（90%）”，按每件物品自己的正常上限计算目标值，向下取整，最低为 1。
4. 点击“保存存档”导出修改结果；设置比例本身不会立即改动存档。

例如：普通材料上限 999 → 90% 为 899；武器最大耐久 70 → 90% 为 63。

- 比例保存在当前浏览器的 `localStorage`，BOTW/TOTK 共用，页面刷新或再次访问会恢复；不上传服务器。
- 隐私浏览或浏览器禁用本地存储时，会在本次会话内使用设置，关闭后可能恢复为 100%。
- 对低于 100% 的设置，执行前提示可能减少已经拥有的数量。
- TOTK 装备按有限的正常最大耐久计算，**保留攻击力、连射等原有词条**；异常或已设置无限耐久的装备会跳过。原先的“无限耐久”不会由 100% 自动触发。
- 特殊重要物品的持有标志不做批量数量修改；不修改防具染色属性和马匹状态。

## 技术实现

构建脚本 `convert_full_repo.py` 下载并复用两套开源编辑器源代码，分别放在静态站根目录（BOTW）和 `/totk/`（TOTK）：

- BOTW 来自 [Xunzi229/Botw-Savediter](https://github.com/Xunzi229/Botw-Savediter)，保留中文编辑器及游戏存档解析逻辑。
- TOTK 来自 [Marc Robledo/savegame-editors/zelda-totk](https://github.com/marcrobledo/savegame-editors/tree/master/zelda-totk)，包含官方的简体中文语言包和原版解析/编辑逻辑。
- `web/web-download.js` 提供 Chromium 原生另存为、Apple Web Share 以及标准 Blob 下载兼容方案，尽量保持上传文件名。
- TOTK 页面依赖的 `fflate@0.8.0` 构建时固定下载并本地托管，不在浏览器运行时引用 CDN。
- 原项目的示例 `.sav` 文件不包含在公开网站中。
- 不具备 Electron 桌面版的自动扫描磁盘目录、原地写入及历史备份功能。

注意：游戏版本、MOD、存档格式可能影响兼容性。请先在副本上编辑并验证可读取，不要覆盖唯一存档。

## 本地构建

```bash
git clone --depth 1 https://github.com/Xunzi229/Botw-Savediter.git upstream
git clone --depth 1 https://github.com/marcrobledo/savegame-editors.git upstream_totk
curl -fLsS https://unpkg.com/fflate@0.8.0/umd/index.js -o upstream_totk/zelda-totk/lib/fflate.min.js
curl -fLsS https://unpkg.com/fflate@0.8.0/LICENSE -o upstream_totk/zelda-totk/lib/FFLATE-LICENSE
python3 convert_full_repo.py upstream web-dist upstream_totk
python3 -m http.server 8000 --directory web-dist
```

## 自动部署

每次提交到 `main`，GitHub Actions 会构建两款游戏的编辑器、验证脚本资源和保存下载行为，并发布到 Pages。

[部署运行记录](https://github.com/ojeo/botw-save-web/actions/workflows/pages.yml)

## 许可和致谢

项目基于 MIT 协议开源。发布产物中保留各上游编辑器的 LICENSE 及 fflate 的许可证。Nintendo、The Legend of Zelda 属于各自权利人，本项目非官方产品。
