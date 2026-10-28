// Browser-only download contract tests. Run after web-dist is generated.
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const source = fs.readFileSync("web-dist/js/web-download.js", "utf8");
const observed = [];
let blob;
function MarcFile() {}
const globals = {
  MarcFile,
  window: {},
  navigator: {userAgent:"Mozilla/5.0 Chrome/156 Safari/537.36",platform:"Win32",maxTouchPoints:0},
  Blob,
  Uint8Array,
  URL: {
    createObjectURL(value) { blob = value; return "blob:save"; },
    revokeObjectURL() {},
  },
  document: {
    body: { appendChild() {} },
    createElement() {
      return {
        href: "",
        download: "",
        click() { observed.push(this.download); },
        remove() {},
      };
    },
  },
  setTimeout() {},
};
vm.runInNewContext(source, globals, {filename:"web-download.js"});

for (const [name, expected] of [
  ["game_data.sav", "game_data.sav"],
  ["game_data.sav.bak", "game_data.sav.bak"],
  ["我的存档 2026.sav", "我的存档 2026.sav"],
  ["backup.01", "backup.01"],
  ["C:\\Backup\\original.sav", "original.sav"],
  ["", "game_data.sav"],
]) {
  const file = new MarcFile();
  file.fileName = name;
  file._u8array = new Uint8Array([1, 4, 9, 16]);
  file.save();
  assert.equal(observed.at(-1), expected, "Wrong downloaded name for " + name);
  assert.equal(blob.size, 4, "Binary contents changed");
}
console.log("PASS: original filename preserved; downloaded binary length unchanged.");
