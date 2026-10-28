/* BOTW browser save adapter.
 * Chrome/Edge: native Save As with suggested original filename.
 * iOS/macOS Safari: native Share sheet for Save to Files.
 * Other browsers: File object + anchor[download].
 * No save data is sent to a server.
 */
(function () {
  "use strict";

  function originalFilename(file) {
    var source = typeof file.fileName === "string" ? file.fileName : "";
    // The browser normally exposes a filename rather than a path.
    source = source.split(String.fromCharCode(92)).pop().split("/").pop();
    source = source.replace(/[\u0000-\u001f\u007f]/g, "");
    return source || "game_data.sav";
  }

  function offerDownload(fileObject, filename) {
    var url = URL.createObjectURL(fileObject);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_self"; // Avoid WebKit target=_blank / blob download issues.
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
    return { method: "download", filename: filename };
  }

  function safariLike() {
    var ua = (navigator && navigator.userAgent) || "";
    var isIOS = /iPhone|iPad|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    var isSafari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS/.test(ua);
    return isIOS || isSafari;
  }

  MarcFile.prototype.save = function () {
    if (!(this._u8array instanceof Uint8Array) || !this._u8array.length) {
      throw new Error("未加载有效存档");
    }
    var name = originalFilename(this);
    // Snapshot data now, before any system picker opens.
    var bytes = new Uint8Array(this._u8array);
    var fileObject = typeof File === "function"
      ? new File([bytes], name, { type: "application/octet-stream" })
      : new Blob([bytes], { type: "application/octet-stream" });

    // Chromium desktop provides an explicit file name through the native dialog.
    // The call must happen synchronously within the Save button user gesture.
    if (typeof window.showSaveFilePicker === "function") {
      var handlePromise;
      try {
        handlePromise = window.showSaveFilePicker({ suggestedName: name });
      } catch (error) {
        return Promise.resolve(offerDownload(fileObject, name));
      }
      return Promise.resolve(handlePromise)
        .then(function (handle) { return handle.createWritable(); })
        .then(function (writer) {
          return Promise.resolve(writer.write(bytes))
            .then(function () { return writer.close(); });
        })
        .then(function () { return { method: "picker", filename: name }; })
        .catch(function (error) {
          if (error && error.name === "AbortError") {
            return { method: "cancelled", filename: name };
          }
          throw error; // Never silently report a failed disk write as success.
        });
    }

    // WebKit sometimes ignores <a download> and names blobs
    // "hostname.octet-stream". Share an actual named File on Apple browsers.
    if (safariLike() && typeof File === "function" &&
        typeof navigator.canShare === "function" && typeof navigator.share === "function") {
      var canShare = false;
      try {
        canShare = navigator.canShare({ files: [fileObject] });
      } catch (_) {
        canShare = false;
      }
      if (canShare) {
        var sharePromise;
        try {
          sharePromise = navigator.share({ files: [fileObject] });
        } catch (error) {
          if (error && error.name === "AbortError") {
            return Promise.resolve({ method: "cancelled", filename: name });
          }
          return Promise.resolve(offerDownload(fileObject, name));
        }
        return Promise.resolve(sharePromise)
          .then(function () { return { method: "share", filename: name }; })
          .catch(function (error) {
            if (error && error.name === "AbortError") {
              return { method: "cancelled", filename: name };
            }
            return offerDownload(fileObject, name);
          });
      }
    }

    return Promise.resolve(offerDownload(fileObject, name));
  };
}());
