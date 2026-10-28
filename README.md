# 《旷野之息》存档修改器 · 纯 Web 版

本项目是 [Xunzi229/Botw-Savediter](https://github.com/Xunzi229/Botw-Savediter) 的静态网页改造。保留其中文界面及 Switch `game_data.sav` 解析和编辑功能。

## 网站

**https://ojeo.github.io/botw-save-web/**

若网站尚未开放，请查看 [自动部署状态](https://github.com/ojeo/botw-save-web/actions/workflows/pages.yml)，并确认 [Settings → Pages](https://github.com/ojeo/botw-save-web/settings/pages) 的 Source 为 **GitHub Actions**。

## 使用

1. 在 Switch 上使用 JKSV 备份《塞尔达传说：旷野之息》。
2. 打开存档槽位 `0/`、`1/` 等目录中的 `game_data.sav`。
3. 将其载入网站，在网页修改卢比、物品、装备、生命值等。
4. 点击 **保存存档**，下载新的 `game_data.sav`。
5. 手动替换相同槽位中的存档文件（始终保留原始备份），再导入 Switch 或 nxnative。

**存档不会上传服务器。** 浏览器读取、编辑并下载文件。没有 Electron 原地覆盖、自动文件夹扫描和历史备份功能。

## 原理与本地构建

GitHub Actions 从上游获取编辑器源码，运行 [convert_full_repo.py](convert_full_repo.py)，去除桌面相关操作与示例存档，修改下载实现，然后发布静态网页。

```bash
git clone --depth 1 https://github.com/Xunzi229/Botw-Savediter.git upstream
python3 convert_full_repo.py upstream web-dist
python3 -m http.server 8000 --directory web-dist
```

## 版权

上游 MIT 许可证和版权声明在网站构建产物中保留。项目与 Nintendo 无关；修改前务必保留 JKSV 原始备份。
