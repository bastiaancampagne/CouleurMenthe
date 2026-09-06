const CFG=window.COUL_MENTHE_CONFIG||{};
const SCOPES="https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtDate=d=>new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long"}).format(d);
const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)};
const state={page:"signin",token:null,email:"",messages:[],events:[],loading:false,error:"",mailFilter:"all"};
let tokenClient=null;

function configured(){
  return CFG.GOOGLE_CLIENT_ID && !CFG.GOOGLE_CLIENT_ID.startsWith("REMPLACEZ_");
}
function setScene(page){document.body.dataset.scene=page}
function navVisible(show){$("#bottomNav").classList.toggle("hidden",!show)}
function setPage(page){
  state.page=page;setScene(page);navVisible(!!state.token);
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>setPage(b.dataset.page));

function header(title,actions=""){
 return `<div class="topbar"><h1>${title}</h1>${actions}</div>`;
}
function loading(){return `<div class="loading"><div class="spinner"></div>Chargement des données Google…</div>`}
function googleError(){
 return state.error?`<div class="oauth-warning"><b>⚠️ ${esc(state.error)}</b></div>`:"";
}
function initGoogle(){
 if(!configured()||!window.google?.accounts?.oauth2)return false;
 tokenClient=google.accounts.oauth2.initTokenClient({
   client_id:CFG.GOOGLE_CLIENT_ID,
   scope:SCOPES,
   callback:async resp=>{
     if(resp.error){state.error="Connexion Google refusée : "+resp.error;render();return}
     state.token=resp.access_token;state.error="";
     await loadAll();
     setPage("home");
   }
 });
 return true;
}
function connect(){
 if(!configured()){
   state.error="L’ID client OAuth Web n’est pas encore renseigné dans config.js.";
   render();return;
 }
 if(!tokenClient && !initGoogle()){
   state.error="Google Identity Services n’est pas encore chargé. Réessayez dans quelques secondes.";
   render();return;
 }
 tokenClient.requestAccessToken({prompt:"consent"});
}
function disconnect(){
 state.token=null;state.email="";state.messages=[];state.events=[];
 setPage("signin");
}
async function api(url){
 const r=await fetch(url,{headers:{Authorization:`Bearer ${state.token}`}});
 if(r.status===401){state.token=null;throw new Error("Session Google expirée. Reconnectez-vous.")}
 if(!r.ok)throw new Error(`Google API : ${r.status}`);
 return r.json();
}
function getHeader(headers,name){
 return (headers||[]).find(h=>h.name?.toLowerCase()===name.toLowerCase())?.value||"";
}
async function loadProfile(){
 const p=await api("https://gmail.googleapis.com/gmail/v1/users/me/profile");
 state.email=p.emailAddress||"";
}
async function loadMessages(){
 const q=encodeURIComponent("in:inbox -in:spam -category:promotions -category:social -category:forums {is:important is:starred}");
 const refs=await api(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=20`);
 const ids=(refs.messages||[]).map(x=>x.id);
 const msgs=await Promise.all(ids.map(async id=>{
   try{
     const m=await api(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
     const h=m.payload?.headers||[];
     return {
       id:m.id,
       sender:getHeader(h,"From")||"Expéditeur inconnu",
       subject:getHeader(h,"Subject")||"(Sans objet)",
       date:getHeader(h,"Date"),
       snippet:m.snippet||"",
       internalDate:Number(m.internalDate||0),
       starred:(m.labelIds||[]).includes("STARRED")
     };
   }catch{return null}
 }));
 state.messages=msgs.filter(Boolean).sort((a,b)=>b.internalDate-a.internalDate);
}
function isoNoZ(d){return d.toISOString()}
async function loadEvents(){
 const now=new Date(), start=new Date(now);start.setHours(0,0,0,0);
 const end=new Date(start);end.setDate(end.getDate()+4);
 const url="https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=100"+
   `&timeMin=${encodeURIComponent(isoNoZ(start))}&timeMax=${encodeURIComponent(isoNoZ(end))}`;
 const j=await api(url);
 state.events=(j.items||[]).map(e=>({
   id:e.id,title:e.summary||"Sans titre",location:e.location||"",
   htmlLink:e.htmlLink||"",
   start:e.start?.dateTime||e.start?.date||"",
   allDay:!!e.start?.date
 }));
}
async function loadAll(){
 if(!state.token)return;
 state.loading=true;state.error="";render();
 try{await Promise.all([loadProfile(),loadMessages(),loadEvents()])}
 catch(e){state.error=e.message||"Impossible de récupérer les données Google."}
 state.loading=false;render();
}
function refresh(){loadAll()}
function openMail(id){
 const url=`https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(id)}`;
 window.open(url,"_blank","noopener");
}
function openEvent(url){if(url)window.open(url,"_blank","noopener")}
function todayLabel(){return fmtDate(new Date()).replace(/^./,c=>c.toUpperCase())}

function renderSignin(){
 navVisible(false);setScene("signin");
 $("#app").innerHTML=`<section class="hero-card">
   <h1>🌿 Couleur Menthe</h1>
   <p><b>Vos courriels et événements, simplement, au quotidien !</b></p>
   <div class="hero-note">Même fatigué, l’émeu garde un œil sur vos messages et vos rendez-vous ! ☕</div>
   ${googleError()}
   <div style="margin-top:18px"><button class="primary" id="connect">🔐 Se connecter avec Google</button></div>
   <p class="muted">Accès en lecture seule : Gmail et Google Agenda.</p>
   ${!configured()?`<div class="oauth-warning"><b>Configuration nécessaire :</b><br>
     renseignez votre ID client OAuth <b>Application Web</b> dans <code>config.js</code>.
     Les étapes exactes sont détaillées dans le README du ZIP.</div>`:""}
 </section>`;
 $("#connect").onclick=connect;
}
function renderHome(){
 setScene("home");
 const mails=state.messages.length,events=state.events.length;
 $("#app").innerHTML=header("🌿 Couleur Menthe",`<button id="refreshTop">↻</button>`)+`
 <section class="panel">
   <h2 style="margin-top:0">Bonjour${state.email?`, ${esc(state.email.split("@")[0])}`:""} 👋</h2>
   <p><b>${todayLabel()}</b></p>
   <p>Vos messages importants et vos événements des quatre prochaines journées sont regroupés ici.</p>
 </section>
 <section class="grid2">
   <button class="tile mail" data-go="mail"><span>💬</span>Courriels<br><small>${mails} message(s)</small></button>
   <button class="tile calendar" data-go="calendar"><span>📅</span>Agenda<br><small>${events} événement(s)</small></button>
   <button class="tile fav" data-go="favorites"><span>⭐</span>Favoris<br><small>${state.messages.filter(m=>m.starred).length} étoilé(s)</small></button>
   <button class="tile settings" data-go="settings"><span>⚙️</span>Paramètres</button>
 </section>
 ${state.loading?loading():""}${googleError()}
 <div class="panel"><div class="row"><button class="secondary" id="refresh">↻ Actualiser</button><button class="secondary" data-go="settings">⚙️ Paramètres</button></div></div>`;
 $("#refreshTop").onclick=refresh;$("#refresh").onclick=refresh;
 document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>setPage(b.dataset.go));
}
function messageHtml(m){
 return `<article class="message-card" data-mail="${esc(m.id)}">
   ${m.starred?'<span class="star">★</span>':""}
   <div class="sender">${esc(m.sender)}</div>
   <div class="subject">${esc(m.subject)}</div>
   <div class="meta">${esc(m.date||"")}</div>
   <div class="snippet">${esc(m.snippet)}</div>
   <div class="muted" style="margin-top:7px">Toucher pour ouvrir dans Gmail ↗</div>
 </article>`;
}
function renderMail(){
 setScene("mail");
 let list=state.messages;
 if(state.mailFilter==="unread"){} // réservé à une évolution ultérieure
 if(state.mailFilter==="starred")list=list.filter(m=>m.starred);
 $("#app").innerHTML=header("💬 Courriels",`<button id="refreshTop">↻</button>`)+`
 <section class="panel"><div class="filters">
   <button class="chip ${state.mailFilter==="all"?"active":""}" data-filter="all">Tous (${state.messages.length})</button>
   <button class="chip ${state.mailFilter==="starred"?"active":""}" data-filter="starred">Étoilés (${state.messages.filter(m=>m.starred).length})</button>
 </div><p class="muted">Promotions, réseaux sociaux, forums et spam sont exclus.</p></section>
 ${state.loading?loading():""}${googleError()}
 <section>${list.length?list.map(messageHtml).join(""):'<div class="empty">Aucun courriel correspondant.</div>'}</section>`;
 $("#refreshTop").onclick=refresh;
 document.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{state.mailFilter=b.dataset.filter;renderMail()});
 document.querySelectorAll("[data-mail]").forEach(x=>x.onclick=()=>openMail(x.dataset.mail));
}
function eventDateKey(e){
 const d=e.allDay?new Date(e.start+"T00:00:00"):new Date(e.start);
 return d.toISOString().slice(0,10);
}
function eventTime(e){
 if(e.allDay)return "Toute la journée";
 return new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit"}).format(new Date(e.start));
}
function renderCalendar(){
 setScene("calendar");
 const groups={};state.events.forEach(e=>(groups[eventDateKey(e)]??=[]).push(e));
 let html="";
 for(const [key,arr] of Object.entries(groups)){
   const d=new Date(key+"T00:00:00");
   html+=`<div class="day-title">${esc(fmtDate(d).replace(/^./,c=>c.toUpperCase()))}</div>`;
   html+=arr.map(e=>`<article class="event-card" data-event="${esc(e.htmlLink)}">
     <div class="subject">${esc(e.title)}</div>
     <div><b>${esc(eventTime(e))}</b>${e.location?` · 📍 ${esc(e.location)}`:""}</div>
     <div class="muted" style="margin-top:6px">Toucher pour ouvrir dans Google Agenda ↗</div>
   </article>`).join("");
 }
 $("#app").innerHTML=header("📅 Agenda",`<button id="refreshTop">↻</button>`)+`
 <section class="panel"><b>Aujourd’hui + les 3 jours à venir</b></section>
 ${state.loading?loading():""}${googleError()}
 <section>${html||'<div class="empty">Aucun événement prévu sur les quatre journées.</div>'}</section>`;
 $("#refreshTop").onclick=refresh;
 document.querySelectorAll("[data-event]").forEach(x=>x.onclick=()=>openEvent(x.dataset.event));
}
function renderFavorites(){
 setScene("favorites");
 const fav=state.messages.filter(m=>m.starred);
 $("#app").innerHTML=header("⭐ Favoris",`<button id="refreshTop">↻</button>`)+`
 <section class="panel"><b>Vos courriels étoilés</b><p class="muted">Cette page reprend les messages marqués d’une étoile dans Gmail.</p></section>
 ${state.loading?loading():""}${googleError()}
 <section>${fav.length?fav.map(messageHtml).join(""):'<div class="empty">Aucun courriel étoilé dans la sélection actuelle.</div>'}</section>`;
 $("#refreshTop").onclick=refresh;
 document.querySelectorAll("[data-mail]").forEach(x=>x.onclick=()=>openMail(x.dataset.mail));
}
function renderSettings(){
 setScene("settings");
 $("#app").innerHTML=header("⚙️ Paramètres")+`
 <section class="settings-card"><h3>👤 Compte Google</h3><p>${esc(state.email||"Compte connecté")}</p></section>
 <section class="settings-card"><h3>📬 Courriels</h3>
   <p>Lecture seule. Seuls les messages importants ou étoilés sont récupérés ; promotions, social, forums et spam sont exclus.</p>
   <p class="muted">Dans une PWA, le lien Gmail s’ouvre dans le navigateur ou peut être repris par l’application Gmail selon les réglages de l’appareil.</p>
 </section>
 <section class="settings-card"><h3>📅 Agenda</h3><p>Aujourd’hui + J+1 + J+2 + J+3, en lecture seule.</p></section>
 <section class="settings-card"><h3>🔄 Fonctionnement</h3>
   <p>Actualisation au lancement après connexion et via le bouton ↻. Aucune notification et aucune tâche d’arrière-plan.</p>
 </section>
 <section class="settings-card"><h3>🔐 OAuth Web</h3>
   <p>L’ID client utilisé est configuré dans <code>config.js</code>.</p>
   <p class="muted">Pour GitHub Pages, ajoutez l’URL de votre site aux « Origines JavaScript autorisées » dans Google Cloud.</p>
 </section>
 <div class="row"><button class="secondary" id="refresh">↻ Actualiser</button><button class="danger" id="disconnect">Se déconnecter</button></div>`;
 $("#refresh").onclick=refresh;$("#disconnect").onclick=disconnect;
}
function render(){
 if(!state.token){renderSignin();return}
 navVisible(true);
 document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===state.page));
 if(state.page==="home")renderHome();
 else if(state.page==="mail")renderMail();
 else if(state.page==="calendar")renderCalendar();
 else if(state.page==="favorites")renderFavorites();
 else renderSettings();
}
window.addEventListener("load",()=>{
 render();
 let tries=0;
 const t=setInterval(()=>{tries++;if(initGoogle()||tries>20)clearInterval(t)},250);
 if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js?v=1").catch(()=>{});
});
