const DB_NAME="ninth-note-db", STORE="courses";
let db, recorder=null, chunks=[], startedAt=0, elapsedBeforePause=0, timerHandle=null, activeCourseId=null, activeStream=null;
const $=id=>document.getElementById(id);
const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2);
const fmtDate=d=>new Date(d).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"});
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const s=req.result.createObjectStore(STORE,{keyPath:"id"});s.createIndex("createdAt","createdAt")};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function tx(mode="readonly"){return db.transaction(STORE,mode).objectStore(STORE)}
function put(item){return new Promise((res,rej)=>{const r=tx("readwrite").put(item);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function getAll(){return new Promise((res,rej)=>{const r=tx().getAll();r.onsuccess=()=>res(r.result.sort((a,b)=>b.createdAt-a.createdAt));r.onerror=()=>rej(r.error)})}
function getOne(id){return new Promise((res,rej)=>{const r=tx().get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function remove(id){return new Promise((res,rej)=>{const r=tx("readwrite").delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function updateTimer(){const sec=Math.floor(elapsedBeforePause+(recorder&&recorder.state==="recording"?(Date.now()-startedAt)/1000:0));$("timer").textContent=[Math.floor(sec/3600),Math.floor(sec%3600/60),sec%60].map(n=>String(n).padStart(2,"0")).join(":")}
function setRecordingUI(state){$("startBtn").disabled=state!=="idle";$("pauseBtn").disabled=state!=="recording"&&state!=="paused";$("stopBtn").disabled=state==="idle";$("pauseBtn").textContent=state==="paused"?"▶ Reprendre":"Ⅱ Pause";$("recordDot").classList.toggle("live",state==="recording");$("recordHint").textContent=state==="recording"?"Enregistrement en cours":state==="paused"?"Enregistrement en pause":"Prêt à enregistrer"}
async function startRecording(){
  const subject=$("subject").value.trim(); if(!subject){alert("Indique d'abord la matière.");$("subject").focus();return}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){alert("Cet iPhone ou ce navigateur ne prend pas en charge l'enregistrement requis. Ouvre 9TH NOTE dans Safari récent.");return}
  try{
    activeStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    chunks=[];elapsedBeforePause=0;
    let options={};for(const type of ["audio/mp4","audio/webm;codecs=opus","audio/webm"]){if(MediaRecorder.isTypeSupported(type)){options.mimeType=type;break}}
    recorder=new MediaRecorder(activeStream,options);
    recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    recorder.onerror=e=>alert("Erreur d'enregistrement : "+(e.error?.message||"inconnue"));
    recorder.onstop=async()=>{
      const mime=recorder.mimeType||chunks[0]?.type||"audio/mp4";
      const blob=new Blob(chunks,{type:mime});
      const item={id:uid(),subject,title:$("courseTitle").value.trim()||subject,createdAt:Date.now(),duration:Math.round(elapsedBeforePause),audio:blob,mime,transcript:""};
      await put(item);activeStream?.getTracks().forEach(t=>t.stop());activeStream=null;recorder=null;chunks=[];clearInterval(timerHandle);timerHandle=null;
      $("timer").textContent="00:00:00";setRecordingUI("idle");$("courseTitle").value="";await renderCourses();
      alert("Cours enregistré sur cet appareil.");
    };
    recorder.start(1000);startedAt=Date.now();timerHandle=setInterval(updateTimer,500);setRecordingUI("recording");
  }catch(err){alert("Impossible d'accéder au microphone. Vérifie les autorisations de Safari. "+err.message)}
}
function pauseRecording(){if(!recorder)return;if(recorder.state==="recording"){recorder.pause();elapsedBeforePause+=(Date.now()-startedAt)/1000;setRecordingUI("paused")}else if(recorder.state==="paused"){recorder.resume();startedAt=Date.now();setRecordingUI("recording")}updateTimer()}
function stopRecording(){if(recorder&&recorder.state!=="inactive"){if(recorder.state==="recording")elapsedBeforePause+=(Date.now()-startedAt)/1000;recorder.stop();}}
async function renderCourses(){
  const items=await getAll(), q=$("search").value.toLowerCase();$("courseCount").textContent=items.length;
  const filtered=items.filter(x=>(x.subject+" "+x.title).toLowerCase().includes(q));const list=$("courseList");list.innerHTML="";
  if(!filtered.length){list.innerHTML='<div class="empty">Aucun cours trouvé.</div>';return}
  for(const item of filtered){const el=document.createElement("div");el.className="course-item";const info=document.createElement("div");const strong=document.createElement("strong");strong.textContent=item.title;const small=document.createElement("small");small.textContent=item.subject+" · "+fmtDate(item.createdAt)+" · "+durationText(item.duration);info.append(strong,small);const btn=document.createElement("button");btn.className="btn btn-outline";btn.textContent="Ouvrir";btn.onclick=()=>openCourse(item.id);el.append(info,btn);list.append(el)}
}
function durationText(s){s=Math.max(0,Math.floor(s||0));const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),r=s%60;if(h)return h+" h "+m+" min";if(m)return m+" min "+r+" s";return r+" s"}
async function openCourse(id){const item=await getOne(id);if(!item)return;activeCourseId=id;$("dialogTitle").textContent=item.title;$("dialogMeta").textContent=item.subject+" · "+fmtDate(item.createdAt)+" · "+durationText(item.duration);$("transcript").value=item.transcript||"";$("courseDialog").showModal()}
async function saveTranscript(){const item=await getOne(activeCourseId);if(!item)return;item.transcript=$("transcript").value;await put(item);alert("Notes enregistrées.");await renderCourses()}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
async function shareOrDownload(blob,name){const file=new File([blob],name,{type:blob.type||"application/octet-stream"});if(navigator.canShare?.({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:name})}catch(e){if(e.name!=="AbortError")download(blob,name)}}else download(blob,name)}
function safeName(s){return (s||"cours").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9_-]+/gi,"_").slice(0,50)}
async function exportTxt(){const x=await getOne(activeCourseId);const text=`${x.title}\nMatière : ${x.subject}\nDate : ${fmtDate(x.createdAt)}\nDurée : ${durationText(x.duration)}\n\nTRANSCRIPTION / NOTES\n\n${x.transcript||"(Aucune note saisie)"}`;await shareOrDownload(new Blob([text],{type:"text/plain;charset=utf-8"}),safeName(x.title)+".txt")}
async function exportJson(){const x=await getOne(activeCourseId);const payload={format:"NINTH_NOTE_COURSE",version:1,title:x.title,subject:x.subject,createdAt:x.createdAt,duration:x.duration,transcript:x.transcript||"",audioIncluded:false};await shareOrDownload(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),safeName(x.title)+".julnotes.json")}
async function exportAudio(){const x=await getOne(activeCourseId);if(!x.audio){alert("Aucun audio disponible.");return}const ext=x.mime?.includes("mp4")?"m4a":x.mime?.includes("webm")?"webm":"audio";await shareOrDownload(x.audio,safeName(x.title)+"."+ext)}
async function deleteCourse(){if(!confirm("Supprimer définitivement ce cours et son audio de cet appareil ?"))return;await remove(activeCourseId);$("courseDialog").close();await renderCourses()}
async function registerSW(){if("serviceWorker"in navigator){try{await navigator.serviceWorker.register("./sw.js")}catch(e){console.warn("Service worker non installé",e)}}}
$("startBtn").onclick=startRecording;$("pauseBtn").onclick=pauseRecording;$("stopBtn").onclick=stopRecording;$("search").oninput=renderCourses;$("refreshBtn").onclick=renderCourses;$("closeDialog").onclick=()=>$("courseDialog").close();$("saveTranscript").onclick=saveTranscript;$("exportText").onclick=exportTxt;$("exportCourse").onclick=exportJson;$("exportAudio").onclick=exportAudio;$("deleteCourse").onclick=deleteCourse;
window.addEventListener("beforeunload",e=>{if(recorder&&recorder.state!=="inactive"){e.preventDefault();e.returnValue=""}});
(async()=>{try{db=await openDB();await renderCourses();await registerSW()}catch(e){alert("Le stockage local n'a pas pu démarrer : "+e.message)}if(!navigator.onLine)$("offlineState").textContent="● Hors ligne";window.addEventListener("online",()=>$("offlineState").textContent="● Prêt");window.addEventListener("offline",()=>$("offlineState").textContent="● Hors ligne")})();
