/* Browser-specific TOTK adapter. No network upload or server-side save handling. */
(function () {
  'use strict';
  var hasLoaded = function () {
    return typeof tempFile !== 'undefined' && tempFile &&
      tempFile._u8array instanceof Uint8Array && tempFile._u8array.length > 0;
  };

  // Override the original warning-dialog + FileSaver path with the
  // same filename-preserving native file picker / Web Share logic used for BOTW.
  window.saveChanges = function () {
    if (!hasLoaded()) {
      alert('请先载入 progress.sav 存档');
      return;
    }
    try {
      // In the Master Editor, changes have already been applied in memory.
      // Other tabs must copy UI edits back into the save buffer.
      SavegameEditor.save();
      Promise.resolve(tempFile.save()).then(function (result) {
        var filename = (result && result.filename) || tempFile.fileName || 'progress.sav';
        if (result && result.method === 'cancelled') {
          UI.toast('已取消保存', 'save-status');
        } else if (result && result.method === 'share') {
          UI.toast('系统分享已结束，请确认已将 ' + filename + ' 存储到文件', 'save-status', 6000);
        } else {
          UI.toast('已保存/下载：' + filename, 'save-status', 5000);
        }
      }).catch(function (error) {
        UI.toast('保存失败：' + (error.message || String(error)), 'save-error', 8000);
      });
    } catch (error) {
      UI.toast('保存失败：' + (error.message || String(error)), 'save-error', 8000);
    }
  };

  // Preserve the original UI's multilingual translations and user's language selection.
  // The build defaults fresh visitors to simplified Chinese.
  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('file-load');
    if (input) input.setAttribute('accept', '.sav,application/octet-stream');
    var demo = document.getElementById('demo');
    if (demo) demo.remove(); // No game saves are hosted on the site.
  });
}());
