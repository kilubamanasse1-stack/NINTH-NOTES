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


/* TRANSCRIPTION LOCALE — traitement sur l'appareil, sans envoi de l'audio. */
let localPipelinePromise=null;
async function loadLocalTranscriber(){
  if(localPipelinePromise)return localPipelinePromise;
  $("transcriptionState").textContent="Chargement du moteur vocal…";
  localPipelinePromise=(async()=>{
    const mod=await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2");
    mod.env.useBrowserCache=true;
    mod.env.allowRemoteModels=true;
    return await mod.pipeline("automatic-speech-recognition","onnx-community/whisper-tiny",{
      dtype:"q8",
      progress_callback:p=>{
        if(p.status==="progress"&&p.total)$("transcriptionState").textContent="Téléchargement du modèle "+Math.round(p.progress||0)+" %";
        else if(p.status==="done")$("transcriptionState").textContent="Modèle vocal prêt";
      }
    });
  })().catch(err=>{localPipelinePromise=null;throw err});
  return localPipelinePromise;
}
/* Décodage en mono 16 kHz : évite de conserver plusieurs grandes copies PCM. */
async function audioTo16k(blob){
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)throw new Error("Décodage audio indisponible sur ce navigateur.");
  const ctx=new Ctx();
  try{
    const buffer=await ctx.decodeAudioData(await blob.arrayBuffer());
    const rate=16000, outLength=Math.ceil(buffer.length*rate/buffer.sampleRate);
    const out=new Float32Array(outLength), ratio=buffer.sampleRate/rate;
    const channels=buffer.numberOfChannels;
    for(let i=0;i<outLength;i++){
      const pos=i*ratio,left=Math.floor(pos),frac=pos-left;
      let sample=0;
      for(let c=0;c<channels;c++){
        const data=buffer.getChannelData(c);
        sample+=(data[left]||0)*(1-frac)+(data[Math.min(left+1,buffer.length-1)]||0)*frac;
      }
      out[i]=sample/channels;
    }
    return out;
  }finally{await ctx.close()}
}
const waitForUI=()=>new Promise(resolve=>setTimeout(resolve,30));
async function transcribeActiveCourse(){
  const item=await getOne(activeCourseId);if(!item)return;
  if(!item.audio){alert("Aucun enregistrement audio n'est associé à ce cours.");return}
  const btn=$("transcribeBtn");btn.disabled=true;
  try{
    btn.textContent="Préparation de l'audio…";
    $("transcriptionState").textContent="Conversion audio en cours";
    const audio=await audioTo16k(item.audio);
    await waitForUI();
    btn.textContent="Chargement du modèle léger…";
    const transcriber=await loadLocalTranscriber();
    const segmentSeconds=24, overlapSeconds=1, samplesPerSegment=segmentSeconds*16000;
    const overlap=overlapSeconds*16000, pieces=[];
    const total=Math.ceil(audio.length/samplesPerSegment);
    for(let offset=0,index=0;offset<audio.length;offset+=samplesPerSegment-overlap,index++){
      const end=Math.min(audio.length,offset+samplesPerSegment);
      const segment=audio.slice(offset,end);
      btn.textContent="Transcription "+(index+1)+" / "+total+"…";
      $("transcriptionState").textContent="Partie "+(index+1)+" sur "+total+" · garde Safari ouvert";
      await waitForUI();
      const result=await transcriber(segment,{sampling_rate:16000,language:"french",task:"transcribe"});
      const piece=Array.isArray(result)?result.map(x=>x.text||"").join(" "):(result.text||"");
      if(piece.trim())pieces.push(piece.trim());
      if(end>=audio.length)break;
    }
    const textResult=pieces.join("\n\n");
    if(!textResult.trim())throw new Error("Aucune parole n'a pu être reconnue. Vérifie la qualité de l'audio.");
    const existing=$("transcript").value.trim();
    $("transcript").value=existing?existing+"\n\n"+textResult:textResult;
    item.transcript=$("transcript").value;await put(item);
    $("transcriptionState").textContent="Transcription terminée et sauvegardée";
    alert("Transcription terminée et enregistrée sur cet appareil. Relis les noms propres et les termes techniques.");
  }catch(err){
    $("transcriptionState").textContent="Transcription interrompue";
    const detail=err?.message||String(err);
    alert("La transcription n'a pas abouti : "+detail+"\n\nVérifie que le premier téléchargement du modèle est terminé et que Safari dispose d'assez de mémoire. Ton audio original reste enregistré.");
  }finally{btn.disabled=false;btn.textContent="✦ Transcrire sur cet appareil"}
}
$("transcribeBtn").onclick=transcribeActiveCourse;

function courseDocumentHtml(item){
  const esc=s=>String(s??"").replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  const lines=esc(item.transcript||"Aucune transcription saisie.").replace(/\n/g,"<br>");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(item.title)}</title><style>
  @page{size:A4;margin:22mm}body{font-family:Arial,sans-serif;color:#222;line-height:1.65;font-size:11pt}h1{font-family:Georgia,serif;font-size:24pt;margin:0 0 8pt;color:#252525}h2{font-size:13pt;border-bottom:1px solid #b28a3b;padding-bottom:5pt;margin-top:24pt}.brand{color:#9b762f;letter-spacing:3px;font-size:9pt;font-weight:bold;margin-bottom:24pt}.meta{color:#555;font-size:10pt;border-left:3px solid #b28a3b;padding:8pt 12pt;margin:18pt 0 25pt}.transcript{white-space:normal;overflow-wrap:anywhere}footer{margin-top:35pt;padding-top:8pt;border-top:1px solid #ddd;color:#888;font-size:9pt}</style></head><body>
  <div class="brand">9TH NOTE · RECORD · TRANSCRIBE · LEARN</div><h1>${esc(item.title)}</h1>
  <div class="meta"><b>Matière :</b> ${esc(item.subject)}<br><b>Date :</b> ${esc(fmtDate(item.createdAt))}<br><b>Durée :</b> ${esc(durationText(item.duration))}</div>
  <h2>TRANSCRIPTION DU COURS</h2><div class="transcript">${lines}</div><footer>Document créé avec 9TH NOTE · Tes cours restent à toi.</footer></body></html>`;
}
async function exportPdf(){
  const item=await getOne(activeCourseId);if(!item)return;
  const win=window.open("","_blank");
  if(!win){alert("Safari a bloqué la fenêtre. Autorise les fenêtres surgissantes puis réessaie.");return}
  win.document.open();win.document.write(courseDocumentHtml(item));win.document.close();
  setTimeout(()=>{try{win.focus();win.print()}catch(e){alert("Ouvre le menu de partage/impression de Safari pour enregistrer en PDF.")}},500);
}
async function exportWord(){
  const item=await getOne(activeCourseId);if(!item)return;
  try{
    const {Document,Packer,Paragraph,TextRun,HeadingLevel}=await import("https://cdn.jsdelivr.net/npm/docx@8.5.0/+esm");
    const paragraphs=[
      new Paragraph({text:"9TH NOTE",heading:HeadingLevel.HEADING_2}),
      new Paragraph({text:item.title,heading:HeadingLevel.TITLE}),
      new Paragraph({children:[new TextRun({text:"Matière : ",bold:true}),new TextRun(item.subject)]}),
      new Paragraph({children:[new TextRun({text:"Date : ",bold:true}),new TextRun(fmtDate(item.createdAt))]}),
      new Paragraph({children:[new TextRun({text:"Durée : ",bold:true}),new TextRun(durationText(item.duration))]}),
      new Paragraph({text:"TRANSCRIPTION DU COURS",heading:HeadingLevel.HEADING_1})
    ];
    const body=(item.transcript||"Aucune transcription saisie.").split(/\r?\n/);
    for(const line of body)paragraphs.push(new Paragraph({children:[new TextRun(line||" ")]}));
    paragraphs.push(new Paragraph({text:"Document créé avec 9TH NOTE · Tes cours restent à toi."}));
    const doc=new Document({sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1134,right:1134,bottom:1134,left:1134}}},children:paragraphs}]});
    const blob=await Packer.toBlob(doc);
    await shareOrDownload(blob,safeName(item.title)+".docx");
  }catch(err){alert("Impossible de créer le document Word. Vérifie la connexion Internet pour charger le module DOCX. "+(err.message||err))}
}
$("exportPdf").onclick=exportPdf;
$("exportWord").onclick=exportWord;
