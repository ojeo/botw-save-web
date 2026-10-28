// Filename correctness across native Save As, iOS Safari Share, and cancellation.
// CI runs this against generated web-dist/js/web-download.js.
const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const {File}=require("node:buffer");
const source=fs.readFileSync("web-dist/js/web-download.js","utf8");

function makeAdapter(overrides={}){
  function MarcFile(){}
  const anchorCalls=[];
  const base={
    window:{},navigator:{userAgent:"Mozilla Chrome/156",platform:"Win32",maxTouchPoints:0},
    MarcFile,File,Blob,Uint8Array,
    URL:{createObjectURL(){return "blob:object"},revokeObjectURL(){}},
    document:{body:{appendChild(){}},createElement(){return{
      download:"",href:"",target:"",rel:"",
      click(){anchorCalls.push(this.download)},
      remove(){}
    }}},
    setTimeout(){}
  };
  const global={...base,...overrides};
  vm.runInNewContext(source,global,{filename:"web-download.js"});
  return {MarcFile,anchorCalls};
}
function sample(adapter,name){
  const file=new adapter.MarcFile();
  file.fileName=name;
  file._u8array=new Uint8Array([0,1,7,255]);
  return file;
}
async function run(){
  // Desktop Chromium: built-in save picker receives the exact original name.
  let suggested="",written,closed=false;
  const chrome=makeAdapter({
    window:{showSaveFilePicker(options){
      suggested=options.suggestedName;
      return Promise.resolve({createWritable(){return {
        write(bytes){written=Uint8Array.from(bytes)},
        close(){closed=true}
      }}});
    }}
  });
  let result=await sample(chrome,"原始存档 2026.sav").save();
  assert.equal(suggested,"原始存档 2026.sav");
  assert.deepEqual(Array.from(written),[0,1,7,255]);
  assert.equal(closed,true);
  assert.equal(result.method,"picker");
  assert.deepEqual(chrome.anchorCalls,[]);

  // Safari/iOS: share a REAL File named like the uploaded save, not a nameless Blob.
  let shareName="",shareBytes;
  const safari=makeAdapter({
    navigator:{
      userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 26_5 like Mac OS X) AppleWebKit/605.1.15 Version/26.5 Mobile/15E148 Safari/604.1",
      platform:"iPhone",maxTouchPoints:5,
      canShare(data){return data.files.length===1},
      share(data){
        shareName=data.files[0].name;
        return data.files[0].arrayBuffer().then(b=>{shareBytes=new Uint8Array(b)});
      }
    }
  });
  result=await sample(safari,"game_data.sav").save();
  assert.equal(shareName,"game_data.sav");
  assert.deepEqual(Array.from(shareBytes),[0,1,7,255]);
  assert.equal(result.method,"share");
  assert.deepEqual(safari.anchorCalls,[]);

  // Safari share canceled: no automatic fallback to a wrongly named blob download.
  const cancelled=makeAdapter({
    navigator:{
      userAgent:"Mozilla Safari/605.1.15",platform:"MacIntel",maxTouchPoints:0,
      canShare(){return true},
      share(){return Promise.reject(Object.assign(new Error("Cancel"),{name:"AbortError"}))}
    }
  });
  result=await sample(cancelled,"game_data.sav").save();
  assert.equal(result.method,"cancelled");
  assert.deepEqual(cancelled.anchorCalls,[]);

  // Chrome Save As canceled: do not create an unrequested second download.
  const pickerCancel=makeAdapter({
    window:{showSaveFilePicker(){return Promise.reject(Object.assign(new Error("Cancel"),{name:"AbortError"}))}}
  });
  result=await sample(pickerCancel,"game_data.sav").save();
  assert.equal(result.method,"cancelled");
  assert.deepEqual(pickerCancel.anchorCalls,[]);

  console.log("PASS: native filename; exact binary output; Safari named File; cancel safety.");
}
run().catch(e=>{console.error(e);process.exitCode=1});
