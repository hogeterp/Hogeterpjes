const DEFAULT_DATA = {
  family: [
    {name:"Rinze", birth:"1966-12-18", email:""},
    {name:"Christa", birth:"1971-03-08", email:""},
    {name:"Tessa", birth:"2000-06-20", email:""},
    {name:"Maaike", birth:"2002-02-28", email:""},
    {name:"Jasmijn", birth:"2005-10-25", email:""},
    {name:"Lisa", birth:"2011-08-05", email:""},
    {name:"Rivaldo", birth:"1999-04-21", email:""}
  ],
  households: [
    {id:crypto.randomUUID(), name:"Rinze & Christa", members:["Rinze","Christa","Lisa","Jasmijn","Maaike"]},
    {id:crypto.randomUUID(), name:"Tessa & Rivaldo", members:["Tessa","Rivaldo"]},
    {id:crypto.randomUUID(), name:"Maaike", members:["Maaike"]},
    {id:crypto.randomUUID(), name:"Jasmijn", members:["Jasmijn"]}
  ],
  recipes: [],
  groceries: [],
  wishes: [],
  giftEvents: [],
  events: [],
  weekMenus: [],
  notifications: [],
  products: [],
  stores: ["Jumbo","Albert Heijn","Lidl","Aldi","Plus","Dirk","Vomar","Hoogvliet","Action","Kruidvat","Etos","HEMA"]
};

const KEY="hogeterpjes-data-v1";
const PROFILE_KEY="hogeterpjes-demo-profile";
const PROFILE_PHOTO_KEY="hogeterpjes-profile-photo-v1";
const PRIVATE_AGENDA_KEY="hogeterpjes-private-agenda-v1";
const CALENDAR_PREF_KEY="hogeterpjes-calendar-preference-v1";
let showPastAgenda=false;
let signupVerificationInProgress=false;
let data=loadData();
data.products=Array.isArray(data.products)?data.products:[];
data.stores=Array.isArray(data.stores)&&data.stores.length?data.stores:["Jumbo","Albert Heijn","Lidl","Aldi","Plus","Dirk","Vomar","Hoogvliet","Action","Kruidvat","Etos","HEMA"];
let currentHousehold=data.households[0]?.id || "";
let currentWeekmenuHousehold="";
let currentWeekStart=getFriday(new Date());
let simpleMode="";
let currentUser=null;
let auth=null;
let db=null;
let storage=null;
let cloudUnsubscribe=null;
let vaultFilesUnsubscribe=null;
let diaryUnsubscribe=null;
let diaryEntries=[];
let selectedDiaryPhotos=[];
let diaryExistingPhotoPaths=[];
let diaryPreviewObjectUrls=[];
let privateGiftIdeas=[];
let privateGiftIdeasUnsubscribe=null;
let privateTodos=[];
let privateTodosUnsubscribe=null;
let weekMenusUnsubscribe=null;
let sharedAgendaUnsubscribe=null;
let sharedCollectionsReady=false;
let cloudReady=false;
let applyingRemote=false;
let saveTimer=null;
let agendaSaveInProgress=false;
const agendaDeleteInProgress=new Set();
const SHARED_DATA_DOC="appData/hogeterpjes";
const ADMIN_DOC="appAdmin/settings";
const WEEK_MENUS_COLLECTION="sharedWeekMenus";
const SHARED_AGENDA_COLLECTION="sharedAgendaEvents";
const CHANGE_LOG_COLLECTION="appChangeLog";
const ADMIN_EMAIL="rohogeterp@gmail.com";
const DIARY_OWNER_EMAIL=ADMIN_EMAIL;
let adminSettings={allowedEmails:[ADMIN_EMAIL],accounts:[{name:"Rinze",email:ADMIN_EMAIL,active:true}]};
const KNOWN_USERS = {
  "rohogeterp@gmail.com": "Rinze"
};

function withTimeout(promise, ms, message="Actie duurde te lang"){
  return Promise.race([
    promise,
    new Promise((_, reject)=>setTimeout(()=>reject(new Error(message)), ms))
  ]);
}

function provisionalProfile(user){
  const email=(user?.email || "").toLowerCase();
  const invited=adminSettings.accounts?.find(a=>(a.email||"").toLowerCase()===email);
  const displayName=
    invited?.name ||
    KNOWN_USERS[email] ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Familielid";

  return {
    uid:user.uid,
    email:user.email || "",
    displayName
  };
}


function cloneDefaults(){ return JSON.parse(JSON.stringify(DEFAULT_DATA)); }
function loadData(){
  try{
    const saved=localStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : cloneDefaults();
  }catch(e){ return cloneDefaults(); }
}
function saveData(){
  localStorage.setItem(KEY,JSON.stringify(data));
  renderAll();
  if(db && currentUser && cloudReady && !applyingRemote){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(pushDataToCloud,350);
  }
}

async function pushDataToCloud(){
  if(!db || !currentUser || !cloudReady) return;
  try{
    setSyncStatus("Wijzigingen opslaan…");
    const {events,weekMenus,...sharedData}=data;
    await db.doc(SHARED_DATA_DOC).set({
      ...sharedData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: currentUser.uid
    },{merge:true});
    setSyncStatus("✓ Opgeslagen in Firebase");
  }catch(error){
    console.error(error);
    setSyncStatus("Opslaan mislukt — controleer je verbinding",true);
    showSaveWarning("De wijziging kon niet in Firebase worden opgeslagen. Laat deze pagina open en probeer opnieuw.");
  }
}

function showSaveWarning(message){
  let box=document.getElementById("saveWarningToast");
  if(!box){
    box=document.createElement("div");
    box.id="saveWarningToast";
    box.className="save-warning-toast";
    document.body.appendChild(box);
  }
  box.textContent=message;
  box.classList.add("show");
  clearTimeout(showSaveWarning.timer);
  showSaveWarning.timer=setTimeout(()=>box.classList.remove("show"),6500);
}

async function writeChangeLog(kind,action,beforeValue,afterValue){
  if(!db || !currentUser) return;
  try{
    await db.collection(CHANGE_LOG_COLLECTION).add({
      kind,action,before:beforeValue||null,after:afterValue||null,
      userUid:currentUser.uid,userName:currentPersonName(),
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
  }catch(error){ console.warn("Back-upregistratie mislukt",error); }
}

async function saveWeekMenuRecord(record,beforeValue=null){
  if(!db || !currentUser) throw new Error("Firebase is niet beschikbaar");
  setSyncStatus("Weekmenu opslaan…");
  await db.collection(WEEK_MENUS_COLLECTION).doc(record.id).set({...record,serverUpdatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  await writeChangeLog("weekmenu",beforeValue?"update":"create",beforeValue,record);
  setSyncStatus("✓ Weekmenu opgeslagen in Firebase");
}
async function deleteWeekMenuRecord(record){
  if(!db || !currentUser) throw new Error("Firebase is niet beschikbaar");
  setSyncStatus("Weekmenu verwijderen…");
  await withTimeout(
    db.collection(WEEK_MENUS_COLLECTION).doc(record.id).delete(),
    20000,
    "Weekmenu verwijderen duurde te lang"
  );
  void writeChangeLog("weekmenu","delete",record,null);
  setSyncStatus("✓ Weekmenu bijgewerkt");
}
async function saveSharedAgendaRecord(record,beforeValue=null){
  if(!db || !currentUser) throw new Error("Firebase is niet beschikbaar");
  setSyncStatus("Afspraak opslaan…");
  await db.collection(SHARED_AGENDA_COLLECTION).doc(record.id).set({...record,serverUpdatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  await writeChangeLog("agenda",beforeValue?"update":"create",beforeValue,record);
  setSyncStatus("✓ Afspraak opgeslagen in Firebase");
}
async function deleteSharedAgendaRecord(record){
  if(!db || !currentUser) throw new Error("Firebase is niet beschikbaar");
  setSyncStatus("Afspraak verwijderen…");
  await withTimeout(
    db.collection(SHARED_AGENDA_COLLECTION).doc(record.id).delete(),
    20000,
    "Afspraak verwijderen duurde te lang"
  );
  void writeChangeLog("agenda","delete",record,null);
  setSyncStatus("✓ Agenda bijgewerkt");
}

function subscribeSharedCollections(){
  if(!db || !currentUser) return;
  if(weekMenusUnsubscribe) weekMenusUnsubscribe();
  if(sharedAgendaUnsubscribe) sharedAgendaUnsubscribe();
  let weekLoaded=false, agendaLoaded=false;
  const markReady=()=>{ if(weekLoaded&&agendaLoaded){ sharedCollectionsReady=true; setSyncStatus("✓ Alles is gesynchroniseerd"); } };
  weekMenusUnsubscribe=db.collection(WEEK_MENUS_COLLECTION).onSnapshot(async snap=>{
    const rows=snap.docs.map(doc=>({id:doc.id,...doc.data()}));
    if(snap.empty && Array.isArray(data.weekMenus) && data.weekMenus.length){
      const batch=db.batch(); data.weekMenus.forEach(row=>batch.set(db.collection(WEEK_MENUS_COLLECTION).doc(row.id),row));
      await batch.commit();
    }else{
      data.weekMenus=rows; localStorage.setItem(KEY,JSON.stringify(data)); renderWeekmenu(); renderHome();
    }
    weekLoaded=true; markReady();
  },error=>{ console.error(error); setSyncStatus("Weekmenu kon niet worden geladen",true); });
  sharedAgendaUnsubscribe=db.collection(SHARED_AGENDA_COLLECTION).onSnapshot(async snap=>{
    const rows=snap.docs.map(doc=>({id:doc.id,...doc.data()}));
    if(snap.empty && Array.isArray(data.events) && data.events.length){
      const batch=db.batch(); data.events.forEach(row=>batch.set(db.collection(SHARED_AGENDA_COLLECTION).doc(row.id),row));
      await batch.commit();
    }else{
      data.events=rows; localStorage.setItem(KEY,JSON.stringify(data)); renderAgenda(); renderHome();
    }
    agendaLoaded=true; markReady();
  },error=>{ console.error(error); setSyncStatus("Agenda kon niet worden geladen",true); });
}

function setSyncStatus(text,isError=false){
  const el=document.getElementById("syncStatus");
  if(el) el.textContent=text;
  if(firebaseStatus){
    firebaseStatus.textContent=isError ? "Firebase-fout" : (currentUser ? "Firebase online" : "Firebase gekoppeld");
    firebaseStatus.classList.toggle("online",!isError && !!currentUser);
    firebaseStatus.classList.toggle("error",isError);
  }
}

function subscribeToCloudData(){
  if(!db || !currentUser) return;
  if(cloudUnsubscribe) cloudUnsubscribe();

  setSyncStatus("Gegevens laden…");
  cloudUnsubscribe=db.doc(SHARED_DATA_DOC).onSnapshot(async snap=>{
    try{
      if(snap.exists){
        const remote=snap.data();
        applyingRemote=true;
        data={
          family:Array.isArray(remote.family)?remote.family:cloneDefaults().family,
          households:Array.isArray(remote.households)?remote.households:cloneDefaults().households,
          recipes:Array.isArray(remote.recipes)?remote.recipes:[],
          groceries:Array.isArray(remote.groceries)?remote.groceries:[],
          wishes:Array.isArray(remote.wishes)?remote.wishes:[],
          giftEvents:Array.isArray(remote.giftEvents)?remote.giftEvents:[],
          events:Array.isArray(data.events)?data.events:(Array.isArray(remote.events)?remote.events:[]),
          weekMenus:Array.isArray(data.weekMenus)?data.weekMenus:(Array.isArray(remote.weekMenus)?remote.weekMenus:[]),
          notifications:Array.isArray(remote.notifications)?remote.notifications:[],
          products:Array.isArray(remote.products)?remote.products:[],
          stores:Array.isArray(remote.stores)&&remote.stores.length?remote.stores:data.stores
        };
        localStorage.setItem(KEY,JSON.stringify(data));
        renderAll();
        applyingRemote=false;
        cloudReady=true;
        setSyncStatus("Alles is gesynchroniseerd");
      }else{
        cloudReady=true;
        await pushDataToCloud();
      }
    }catch(error){
      applyingRemote=false;
      console.error(error);
      setSyncStatus("Gegevens laden mislukt",true);
    }
  },error=>{
    console.error(error);
    setSyncStatus("Geen toegang tot Firestore",true);
  });
}
function fmtDate(iso){ return new Intl.DateTimeFormat("nl-NL",{day:"numeric",month:"long",year:"numeric"}).format(new Date(iso+"T12:00:00")); }
function ageFor(iso){
  const b=new Date(iso+"T12:00:00"), n=new Date(); let a=n.getFullYear()-b.getFullYear();
  if(n < new Date(n.getFullYear(),b.getMonth(),b.getDate())) a--; return a;
}
function getNextBirthday(){
  const now=new Date(); now.setHours(0,0,0,0);
  return data.family.map(p=>{
    const b=new Date(p.birth+"T12:00:00");
    let next=new Date(now.getFullYear(),b.getMonth(),b.getDate());
    if(next<now) next.setFullYear(next.getFullYear()+1);
    return {...p,next,days:Math.round((next-now)/86400000)};
  }).sort((a,b)=>a.days-b.days)[0];
}
function initials(name=""){ return name.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase() || "?"; }

function currentPersonName(){
  const name=currentUser?.displayName || currentUser?.name || "";
  const exact=data.family.find(p=>p.name.toLowerCase()===name.toLowerCase());
  if(exact) return exact.name;

  const email=(currentUser?.email || "").toLowerCase();
  const byEmail=data.family.find(p=>(p.email || "").toLowerCase()===email);
  return byEmail?.name || name;
}

function isDiaryOwner(){
  return (currentUser?.email || "").toLowerCase()===DIARY_OWNER_EMAIL;
}

function updateDiaryAccess(){
  const allowed=isDiaryOwner();
  const menu=document.getElementById("diaryMenuBtn");
  const page=document.querySelector('[data-page="dagboek"]');
  const homeCard=document.getElementById("dashboardDiaryCard");
  if(menu) menu.classList.toggle("hidden",!allowed);
  if(homeCard) homeCard.classList.toggle("hidden",!allowed);
  if(page) page.classList.toggle("diary-denied",!allowed);
  if(!allowed && page?.classList.contains("active")) navigate("home");
}

function canManageWish(wish){
  return wish.person===currentPersonName();
}

function householdById(id){ return data.households.find(h=>h.id===id); }
function mealAttendees(meal){
  const household=householdById(meal?.householdId || currentWeekmenuHousehold);
  if(Array.isArray(meal?.attendees)) return meal.attendees;
  return (household?.members || []).map(name=>({type:"family",name}));
}
function attendeeCount(meal){ return Math.max(1,mealAttendees(meal).length); }
function addNotification({householdId="",text="",type="info"}){
  data.notifications=data.notifications || [];
  data.notifications.unshift({id:crypto.randomUUID(),householdId,text,type,createdBy:currentPersonName(),createdAt:new Date().toISOString(),readBy:[]});
  data.notifications=data.notifications.slice(0,150);
}
function visibleNotifications(){
  const ids=userHouseholdIds();
  return (data.notifications || []).filter(n=>!n.householdId || ids.includes(n.householdId));
}
function renderNotifications(){
  if(!window.notificationList) return;
  const email=(currentUser?.email || "").toLowerCase();
  const rows=visibleNotifications();
  notificationList.innerHTML=rows.length?rows.map(n=>`<article class="item-card notification-item ${n.readBy?.includes(email)?"is-read":""}">
    <div><strong>${escapeHtml(n.text)}</strong><div class="meta">${new Intl.DateTimeFormat("nl-NL",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(n.createdAt))}${n.createdBy?` · door ${escapeHtml(n.createdBy)}`:""}</div></div>
    <button class="mini-btn" onclick="markNotificationRead('${n.id}')">${n.readBy?.includes(email)?"Gelezen":"Markeer gelezen"}</button>
  </article>`).join(""):`<div class="card muted">Nog geen meldingen.</div>`;
  const unread=rows.filter(n=>!n.readBy?.includes(email)).length;
  if(window.notificationBadge){ notificationBadge.textContent=unread; notificationBadge.classList.toggle("hidden",!unread); }
}
window.markNotificationRead=id=>{
  const n=(data.notifications || []).find(x=>x.id===id); if(!n)return;
  const email=(currentUser?.email || "").toLowerCase(); n.readBy=Array.from(new Set([...(n.readBy||[]),email])); saveData();
};



const WEEK_DAYS=["Vrijdag","Zaterdag","Zondag","Maandag","Dinsdag","Woensdag","Donderdag"];

function getMonday(value){
  const date=new Date(value);
  date.setHours(12,0,0,0);
  const day=date.getDay();
  const diff=day===0 ? -6 : 1-day;
  date.setDate(date.getDate()+diff);
  return date;
}

function getFriday(value){
  const date=new Date(value);
  date.setHours(12,0,0,0);
  const day=date.getDay();
  const diff=(day-5+7)%7;
  date.setDate(date.getDate()-diff);
  return date;
}

function isoDate(date){
  const d=new Date(date);
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function addDays(date,days){
  const d=new Date(date);
  d.setDate(d.getDate()+days);
  return d;
}

function getIsoWeek(date){
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  const dayNum=d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate()+4-dayNum);
  const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d-yearStart)/86400000)+1)/7);
}

function accessibleHouseholds(){
  const ids=userHouseholdIds();
  return data.households.filter(h=>ids.includes(h.id));
}

function weekMenuKey(){
  return isoDate(currentWeekStart);
}

function getWeekMeals(householdId=currentWeekmenuHousehold,weekStart=weekMenuKey()){
  return (data.weekMenus || []).filter(m=>m.householdId===householdId && m.weekStart===weekStart);
}

function getMealForDay(dayIndex){
  return getWeekMeals().find(m=>Number(m.dayIndex)===Number(dayIndex));
}

function recipeMealName(meal){
  if(meal.recipeId){
    return data.recipes.find(r=>r.id===meal.recipeId)?.name || meal.name || "Onbekend recept";
  }
  return meal.name || "Gerecht";
}

function formatWeekRange(){
  const end=addDays(currentWeekStart,6);
  const formatter=new Intl.DateTimeFormat("nl-NL",{day:"numeric",month:"short"});
  return `${formatter.format(currentWeekStart)} t/m ${formatter.format(end)}`;
}

function fillWeekmenuHouseholds(){
  if(!window.weekmenuHousehold) return;
  const allowed=accessibleHouseholds();

  if(!allowed.some(h=>h.id===currentWeekmenuHousehold)){
    currentWeekmenuHousehold=allowed[0]?.id || "";
  }

  weekmenuHousehold.innerHTML=allowed.length
    ? allowed.map(h=>`<option value="${h.id}">${h.name}</option>`).join("")
    : `<option value="">Geen huishouden gekoppeld</option>`;
  weekmenuHousehold.value=currentWeekmenuHousehold;

  addWeekMealBtn.disabled=!currentWeekmenuHousehold;
  copyWeekmenuBtn.disabled=!currentWeekmenuHousehold;
  weekmenuGroceriesBtn.disabled=!currentWeekmenuHousehold;
}

function renderWeekmenu(){
  if(!window.weekmenuList) return;
  fillWeekmenuHouseholds();

  const weekNumber=getIsoWeek(currentWeekStart);
  weekmenuWeekLabel.textContent=`Week ${weekNumber}`;
  weekmenuDateRange.textContent=formatWeekRange();

  if(!currentWeekmenuHousehold){
    weekmenuList.innerHTML=`<div class="card muted">Je account is nog niet gekoppeld aan een huishouden.</div>`;
    return;
  }

  weekmenuList.innerHTML=WEEK_DAYS.map((day,index)=>{
    const meal=getMealForDay(index);
    const actualDate=addDays(currentWeekStart,index);
    const dateLabel=new Intl.DateTimeFormat("nl-NL",{day:"numeric",month:"short"}).format(actualDate);

    return `<article class="card weekmenu-day ${meal?"has-meal":""}">
      <div class="weekmenu-day-head">
        <div><span>${dateLabel}</span><h3>${day}</h3></div>
        ${meal?`<button class="mini-btn danger-mini" type="button" onclick="deleteWeekMeal('${meal.id}')">Verwijder</button>`:""}
      </div>
      ${meal?`
        <button class="weekmenu-meal" type="button" onclick="editWeekMeal('${meal.id}')">
          <strong>${meal.recipeId?"📖":"🍽️"} ${recipeMealName(meal)}</strong>
          ${meal.note?`<span>${escapeHtml(meal.note)}</span>`:""}
          <small>Tik om te wijzigen</small>
        </button>
        <div class="eaters-block">
          <div class="eaters-title"><strong>👥 Wie eet mee? (${attendeeCount(meal)})</strong><button class="mini-btn" type="button" onclick="openAttendees('${meal.id}')">Aanpassen</button></div>
          <div class="chips">${mealAttendees(meal).map(a=>`<span class="chip">${a.type==="guest"?"Gast: ":""}${escapeHtml(a.name)}</span>`).join("") || `<span class="muted">Niemand geselecteerd</span>`}</div>
        </div>
      `:`
        <button class="weekmenu-empty" type="button" onclick="openWeekMealForDay(${index})">+ Gerecht toevoegen</button>
      `}
    </article>`;
  }).join("");
}

function showWeekMealFields(){
  const manual=weekMealType.value==="manual";
  weekMealManualLabel.classList.toggle("hidden",!manual);
  weekMealRecipeLabel.classList.toggle("hidden",manual);
  weekMealManual.required=manual;
  weekMealRecipe.required=!manual;
}

function fillWeekMealRecipes(){
  weekMealRecipe.innerHTML=data.recipes.length
    ? data.recipes.map(r=>`<option value="${r.id}">${r.name}</option>`).join("")
    : `<option value="">Nog geen recepten beschikbaar</option>`;
}

function openWeekMealDialog(dayIndex=0,meal=null){
  if(!currentWeekmenuHousehold) return;
  weekMealForm.reset();
  fillWeekMealRecipes();
  weekMealDay.value=String(dayIndex);
  weekMealEditId.value=meal?.id || "";

  if(meal){
    weekMealType.value=meal.recipeId ? "recipe" : "manual";
    weekMealRecipe.value=meal.recipeId || "";
    weekMealManual.value=meal.name || "";
    weekMealForm.elements.note.value=meal.note || "";
  }else{
    weekMealType.value=data.recipes.length ? "recipe" : "manual";
  }

  showWeekMealFields();
  weekMealDialog.showModal();
}

function scaledIngredientText(ingredient,recipeServings,householdSize){
  const i=normalizeIngredient(ingredient);
  const factor=householdSize/Math.max(1,Number(recipeServings)||1);
  const amount=formatScaledAmount(i.amount,factor);
  return [amount,i.unit,i.name].filter(Boolean).join(" ");
}

function loadPrivateEvents(){
  try{
    const all=JSON.parse(localStorage.getItem(PRIVATE_AGENDA_KEY) || "{}");
    return Array.isArray(all[currentUser?.uid]) ? all[currentUser.uid] : [];
  }catch(e){
    return [];
  }
}

function savePrivateEvents(events){
  try{
    const all=JSON.parse(localStorage.getItem(PRIVATE_AGENDA_KEY) || "{}");
    if(currentUser?.uid) all[currentUser.uid]=events;
    localStorage.setItem(PRIVATE_AGENDA_KEY,JSON.stringify(all));
  }catch(e){
    console.warn("Privé-agenda opslaan mislukt",e);
  }
}

function userHouseholdIds(){
  const person=currentPersonName();
  return data.households.filter(h=>h.members.includes(person)).map(h=>h.id);
}

function canSeeSharedEvent(event){
  if(event.visibility==="family") return true;
  if(event.visibility==="household") return userHouseholdIds().includes(event.householdId);
  if(event.visibility==="selected") return Array.isArray(event.visibleTo) && event.visibleTo.includes(currentPersonName());
  return false;
}

function formatAgendaDate(event){
  const date=new Date(event.date+"T12:00:00");
  const dateText=new Intl.DateTimeFormat("nl-NL",{
    weekday:"short",day:"numeric",month:"short",year:"numeric"
  }).format(date);
  const times=[event.startTime,event.endTime].filter(Boolean).join(" – ");
  return times ? `${dateText} · ${times}` : dateText;
}

function agendaScopeLabel(event){
  if(event.visibility==="private") return "🔒 Privé";
  if(event.visibility==="family") return "👨‍👩‍👧‍👦 Familie";
  if(event.visibility==="selected") return `👥 ${Array.isArray(event.visibleTo)?event.visibleTo.join(", "):"Gekozen personen"}`;
  const household=data.households.find(h=>h.id===event.householdId);
  return `🏡 ${household?.name || "Huishouden"}`;
}

function getVisibleAgendaEvents(){
  const privateEvents=loadPrivateEvents().map(e=>({...e,visibility:"private"}));
  const sharedEvents=(data.events || []).filter(canSeeSharedEvent);
  return [...privateEvents,...sharedEvents];
}

function agendaEventHasPassed(event){
  const now=new Date();
  const endTime=event.endTime || event.startTime || "23:59";
  return new Date(`${event.date}T${endTime}:00`) < now;
}
function agendaDayLabel(dateIso){
  const today=new Date(); today.setHours(0,0,0,0);
  const date=new Date(dateIso+"T12:00:00"); date.setHours(0,0,0,0);
  const diff=Math.round((date-today)/86400000);
  if(diff===0) return "Vandaag";
  if(diff===1) return "Morgen";
  if(diff===-1) return "Gisteren";
  return new Intl.DateTimeFormat("nl-NL",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(date);
}
function renderAgenda(){
  if(!window.agendaList) return;
  const type=agendaTypeFilter.value || "";
  const householdId=agendaHouseholdFilter.value || "";
  agendaHouseholdFilter.innerHTML=`<option value="">Alle huishoudens</option>`+data.households.filter(h=>userHouseholdIds().includes(h.id)).map(h=>`<option value="${h.id}">${h.name}</option>`).join("");
  agendaHouseholdFilter.value=householdId;
  let rows=getVisibleAgendaEvents().filter(e=>(!type||e.visibility===type)&&(!householdId||e.householdId===householdId));
  rows=rows.filter(e=>showPastAgenda ? agendaEventHasPassed(e) : !agendaEventHasPassed(e));
  rows.sort((a,b)=>(a.date+" "+(a.startTime||"")).localeCompare(b.date+" "+(b.startTime||"")));
  if(showPastAgenda) rows.reverse();
  if(window.togglePastAgendaBtn) togglePastAgendaBtn.textContent=showPastAgenda?"Toekomstige afspraken":"Eerdere afspraken";
  const groups={}; rows.forEach(e=>(groups[e.date]||=[]).push(e));
  agendaList.innerHTML=rows.length?Object.entries(groups).map(([date,events])=>`<section class="agenda-day-group"><h3 class="agenda-day-title">${agendaDayLabel(date)}</h3>${events.map(e=>`<article class="item-card agenda-card agenda-card-clickable" role="button" tabindex="0" onclick="openAgendaDetails('${e.id}','${e.visibility}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openAgendaDetails('${e.id}','${e.visibility}')}" aria-label="Open afspraak ${escapeHtml(e.title)}">
    <div class="agenda-card-head"><div><span class="agenda-scope">${agendaScopeLabel(e)}</span><h3>${escapeHtml(e.title)}</h3><div class="meta">${formatAgendaDate(e)}</div></div><div class="agenda-card-actions"><button class="mini-btn" type="button" onclick="event.stopPropagation();addToCalendar('${e.id}','${e.visibility}')">📅 Toevoegen</button><button class="mini-btn danger-mini" type="button" onclick="event.stopPropagation();deleteAgendaEvent('${e.id}','${e.visibility}')">Verwijderen</button></div></div>
    ${e.location?`<p>📍 ${escapeHtml(e.location)}</p>`:""}${e.photo?`<img class="agenda-card-photo" src="${e.photo}" alt="Foto bij ${escapeHtml(e.title)}">`:""}${e.note?`<p>${escapeHtml(e.note).replaceAll("\\n","<br>")}</p>`:""}<small class="agenda-tap-hint">Tik om te bekijken of wijzigen</small></article>`).join("")}</section>`).join(""):`<div class="card muted">${showPastAgenda?"Geen eerdere afspraken.":"Geen komende afspraken."}</div>`;
}
function fillAgendaHouseholds(){
  const allowed=data.households.filter(h=>userHouseholdIds().includes(h.id));
  agendaHousehold.innerHTML=allowed.map(h=>`<option value="${h.id}">${h.name}</option>`).join("");
  agendaHouseholdLabel.classList.toggle("hidden",agendaVisibility.value!=="household");
  if(window.agendaSelectedPeopleField){
    agendaSelectedPeopleField.classList.toggle("hidden",agendaVisibility.value!=="selected");
    if(agendaVisibility.value==="selected" && !agendaSelectedPeopleChecks.children.length){
      agendaSelectedPeopleChecks.innerHTML=data.family.map(p=>`<label class="member-check"><input type="checkbox" name="visibleTo" value="${escapeHtml(p.name)}"><span>${escapeHtml(p.name)}</span></label>`).join("");
    }
  }
}

function navigate(page){
  if(page==="dagboek" && !isDiaryOwner()){ alert("Het dagboek is alleen beschikbaar voor Rinze."); return; }
  if(page==="meer"){ document.querySelector("#moreDialog").showModal(); return; }
  document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  document.querySelectorAll(".bottom-nav button").forEach(x=>x.classList.toggle("active",x.dataset.nav===page));
  window.scrollTo({top:0,behavior:"smooth"});
}
function bindNav(){
  document.addEventListener("click",e=>{
    const nav=e.target.closest("[data-nav]"); if(nav) navigate(nav.dataset.nav);
    const go=e.target.closest("[data-go]"); if(go){ closeDialogs(); navigate(go.dataset.go); }
    const close=e.target.closest("[data-close]"); if(close) close.closest("dialog").close();
  });
}
function closeDialogs(){ document.querySelectorAll("dialog[open]").forEach(d=>d.close()); }

function renderFamily(){
  const admin=isAdmin();
  familyList.innerHTML=data.family.map(p=>`<article class="item-card">
    <div class="family-card-head">
      <div><h3>${p.name}</h3><div class="meta">${fmtDate(p.birth)} · ${ageFor(p.birth)} jaar${p.email?`<br>${p.email}`:""}</div></div>
      ${admin?`<button class="mini-btn" type="button" onclick="openFamilyEditor('${p.name.replaceAll("'","\\'")}')">Bewerken</button>`:""}
    </div>
  </article>`).join("");
}
function renderHouseholds(){
  const admin=isAdmin();
  const visibleHouseholds=admin ? data.households : accessibleHouseholds();

  householdList.innerHTML=visibleHouseholds.length ? visibleHouseholds.map(h=>`<article class="item-card">
    <div class="family-card-head">
      <div>
        <h3>🏡 ${h.name}</h3>
        <div class="chips">${h.members.map(m=>`<span class="chip">${m}</span>`).join("")}</div>
      </div>
      ${admin?`<button class="mini-btn" type="button" onclick="openHouseholdEditor('${h.id}')">Bewerken</button>`:""}
    </div>
  </article>`).join("") : `<div class="card muted">Je bent nog niet aan een huishouden gekoppeld.</div>`;

  addHouseholdBtn.classList.toggle("hidden",!admin);
  groceryHousehold.innerHTML=accessibleHouseholds().map(h=>`<option value="${h.id}">${h.name}</option>`).join("");

  if(!accessibleHouseholds().some(h=>h.id===currentHousehold)){
    currentHousehold=accessibleHouseholds()[0]?.id||"";
  }
  groceryHousehold.value=currentHousehold;
  fillWeekmenuHouseholds();
}

function resetRecipePhoto(){
  recipePhotoData.value="";
  recipeCameraInput.value="";
  recipeGalleryInput.value="";
  recipePhotoPreview.removeAttribute("src");
  recipePhotoPreviewWrap.classList.add("hidden");
}

function setRecipePhoto(dataUrl){
  recipePhotoData.value=dataUrl;
  recipePhotoPreview.src=dataUrl;
  recipePhotoPreviewWrap.classList.remove("hidden");
}

function processRecipePhoto(file){
  if(!file) return;
  if(!file.type.startsWith("image/")){
    alert("Kies een geldige afbeelding.");
    return;
  }
  if(file.size>10*1024*1024){
    alert("Kies een foto kleiner dan 10 MB.");
    return;
  }

  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const max=1200;
      const scale=Math.min(1,max/Math.max(img.width,img.height));
      const canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(img.width*scale));
      canvas.height=Math.max(1,Math.round(img.height*scale));
      const ctx=canvas.getContext("2d");
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      setRecipePhoto(canvas.toDataURL("image/jpeg",0.82));
    };
    img.onerror=()=>alert("Deze foto kon niet worden geopend.");
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
}

recipeCameraInput.onchange=()=>processRecipePhoto(recipeCameraInput.files?.[0]);
recipeGalleryInput.onchange=()=>processRecipePhoto(recipeGalleryInput.files?.[0]);
removeRecipePhotoBtn.onclick=resetRecipePhoto;

function renderRecipes(){
  const q=recipeSearch.value?.toLowerCase()||"";
  const rows=data.recipes
    .filter(r=>(r.name+" "+r.ingredients.map(i=>normalizeIngredient(i).name).join(" ")).toLowerCase().includes(q))
    .sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"nl",{sensitivity:"base"}));
  recipeList.innerHTML=rows.length?rows.map(r=>`<article class="item-card">
    ${r.photo?`<img class="recipe-photo" src="${r.photo}" alt="">`:""}
    <h3>${escapeHtml(r.name)}</h3><div class="meta">Voor ${r.servings} personen · door ${escapeHtml(r.author||"Onbekend")}${r.updatedAt?`<br>Laatst gewijzigd ${new Intl.DateTimeFormat("nl-NL",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(r.updatedAt))}${r.updatedBy?` door ${escapeHtml(r.updatedBy)}`:""}`:""}</div>
    <div class="recipe-actions"><button class="secondary-btn" onclick="openRecipe('${r.id}')">Bekijken</button><button class="secondary-btn" onclick="editRecipe('${r.id}')">Bewerken</button><button class="secondary-btn" onclick="addRecipeToGroceries('${r.id}')">Naar lijst</button></div>
  </article>`).join(""):`<div class="card muted">Nog geen recepten. Voeg je eerste recept toe.</div>`;
}
function productLabel(p){
  return [p.brand,p.name,p.amount,p.unit].filter(Boolean).join(" ");
}
function productStores(p){
  return [p.store,...String(p.otherStores||"").split(",").map(x=>x.trim())].filter(Boolean);
}
function renderGroceries(){
  const rows=data.groceries.filter(g=>g.householdId===currentHousehold && !g.done);
  const grouped={};
  rows.forEach(g=>{
    const store=(g.store||"Geen winkel opgegeven").trim();
    (grouped[store] ||= []).push(g);
  });
  const stores=Object.keys(grouped).sort((a,b)=>a.localeCompare(b,"nl"));
  groceryList.innerHTML=rows.length?stores.map(store=>`<section class="grocery-store-group">
    <h3 class="grocery-store-title">🏪 ${escapeHtml(store)} <small>${grouped[store].filter(g=>!g.done).length} open</small></h3>
    ${grouped[store].sort((a,b)=>Number(a.done)-Number(b.done)).map(g=>`<div class="check-row ${g.done?"done":""}">
      <input type="checkbox" ${g.done?"checked":""} onchange="toggleGrocery('${g.id}')">
      <span><strong>${escapeHtml(g.text)}</strong>${g.addedBy||g.source||g.note?`<small class="grocery-meta">${[g.source,g.note,g.addedBy?`door ${g.addedBy}`:""].filter(Boolean).map(escapeHtml).join(" · ")}</small>`:""}</span>
      <div class="row-actions"><button onclick="editGrocery('${g.id}')" aria-label="Bewerken">✏️</button><button onclick="deleteGrocery('${g.id}')" aria-label="Verwijderen">🗑️</button></div>
    </div>`).join("")}
  </section>`).join(""):`<div class="muted" style="padding:18px 2px">Nog niets op deze boodschappenlijst.</div>`;
}
function renderProducts(){
  if(!window.productList) return;
  data.products=Array.isArray(data.products)?data.products:[];
  const q=(productSearch.value||"").toLowerCase();
  const store=productStoreFilter.value||"";
  const category=productCategoryFilter.value||"";
  const stores=[...new Set([...data.stores,...data.products.flatMap(productStores)])].filter(Boolean).sort((a,b)=>a.localeCompare(b,"nl"));
  const categories=[...new Set(data.products.map(p=>p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"nl"));
  const oldStore=productStoreFilter.value, oldCat=productCategoryFilter.value;
  productStoreFilter.innerHTML='<option value="">Alle winkels</option>'+stores.map(x=>`<option>${escapeHtml(x)}</option>`).join("");
  productCategoryFilter.innerHTML='<option value="">Alle categorieën</option>'+categories.map(x=>`<option>${escapeHtml(x)}</option>`).join("");
  productStoreFilter.value=stores.includes(oldStore)?oldStore:"";
  productCategoryFilter.value=categories.includes(oldCat)?oldCat:"";
  refreshStoreOptions();
  const rows=data.products.filter(p=>{
    const hay=[p.name,p.brand,p.category,p.store,p.otherStores,p.note].join(" ").toLowerCase();
    return (!q||hay.includes(q)) && (!store||productStores(p).includes(store)) && (!category||p.category===category);
  }).sort((a,b)=>(Number(b.favorite)-Number(a.favorite)) || (Number(b.timesUsed||0)-Number(a.timesUsed||0)) || String(a.name).localeCompare(String(b.name),"nl"));
  const fav=data.products.filter(p=>p.favorite).slice().sort((a,b)=>Number(b.timesUsed||0)-Number(a.timesUsed||0)).slice(0,6);
  const frequent=data.products.filter(p=>Number(p.timesUsed||0)>0).slice().sort((a,b)=>Number(b.timesUsed||0)-Number(a.timesUsed||0)).slice(0,6);
  const recent=data.products.filter(p=>p.lastUsedAt).slice().sort((a,b)=>String(b.lastUsedAt).localeCompare(String(a.lastUsedAt))).slice(0,6);
  const quick=(title,items)=>items.length?`<section class="quick-products"><h3>${title}</h3><div class="quick-product-row">${items.map(p=>`<button onclick="addProductToGroceries('${p.id}')">${escapeHtml(p.name)}</button>`).join("")}</div></section>`:"";
  productQuickSections.innerHTML=!q&&!store&&!category?quick("⭐ Favorieten",fav)+quick("🕘 Recent gebruikt",recent)+quick("📈 Vaak gekocht",frequent):"";
  productList.innerHTML=rows.length?rows.map(p=>`<article class="item-card product-card">
    ${p.photo?`<img class="product-card-photo" src="${p.photo}" alt="">`:""}
    <div class="product-card-head"><div><h3>${p.favorite?"⭐ ":""}${escapeHtml(p.name)}</h3><div class="meta">${[p.brand,p.amount&&p.unit?`${p.amount} ${p.unit}`:p.amount||p.unit,p.category].filter(Boolean).map(escapeHtml).join(" · ")}</div></div><button class="mini-btn" onclick="editProduct('${p.id}')">Bewerk</button></div>
    ${p.store?`<p class="product-store">🏪 Meestal bij <strong>${escapeHtml(p.store)}</strong>${p.otherStores?`<br><small>Ook: ${escapeHtml(p.otherStores)}</small>`:""}</p>`:""}
    <p class="product-stock ${Number(p.stock||0)<=Number(p.minStock||0)?"stock-low":""}">📦 Voorraad: <strong>${Number(p.stock||0)}</strong>${Number(p.minStock||0)>0?` · minimum ${Number(p.minStock)}`:""}${Number(p.stock||0)<=Number(p.minStock||0)?" · bijna op":""}</p>
    ${p.price?`<p>€ ${Number(p.price).toLocaleString("nl-NL",{minimumFractionDigits:2,maximumFractionDigits:2})}</p>`:""}
    ${p.note?`<p class="muted">${escapeHtml(p.note)}</p>`:""}
    <button class="primary-btn wide" onclick="addProductToGroceries('${p.id}')">+ Naar boodschappenlijst</button>
  </article>`).join(""):`<div class="card muted">Nog geen producten gevonden. Voeg een product toe.</div>`;
}

function resetWishPhoto(){
  wishPhotoData.value="";
  wishCameraInput.value="";
  wishGalleryInput.value="";
  wishPhotoPreview.removeAttribute("src");
  wishPhotoPreviewWrap.classList.add("hidden");
}

function setWishPhoto(dataUrl){
  wishPhotoData.value=dataUrl;
  wishPhotoPreview.src=dataUrl;
  wishPhotoPreviewWrap.classList.remove("hidden");
}

function processWishPhoto(file){
  if(!file) return;
  if(!file.type.startsWith("image/")){
    alert("Kies een geldige foto of screenshot.");
    return;
  }
  if(file.size>10*1024*1024){
    alert("Kies een afbeelding kleiner dan 10 MB.");
    return;
  }

  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const max=1200;
      const scale=Math.min(1,max/Math.max(img.width,img.height));
      const canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(img.width*scale));
      canvas.height=Math.max(1,Math.round(img.height*scale));
      const ctx=canvas.getContext("2d");
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      setWishPhoto(canvas.toDataURL("image/jpeg",0.82));
    };
    img.onerror=()=>alert("Deze afbeelding kon niet worden geopend.");
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
}

wishCameraInput.onchange=()=>processWishPhoto(wishCameraInput.files?.[0]);
wishGalleryInput.onchange=()=>processWishPhoto(wishGalleryInput.files?.[0]);
removeWishPhotoBtn.onclick=resetWishPhoto;

function renderWishes(){
  const selected=wishPersonFilter.value||"";
  const occasion=wishOccasionFilter.value||"";
  const rows=data.wishes.filter(w=>(!selected||w.person===selected)&&(!occasion||w.occasion===occasion));
  wishPageTitle.textContent=selected?`Wensen van ${selected}`:"Alle wensen";
  wishPrivacyNote.textContent="Iedereen binnen Hogeterpjes kan alle wensen bekijken. Alleen de eigenaar kan een wens wijzigen of verwijderen.";
  wishPersonFilter.classList.remove("hidden");
  wishList.innerHTML=rows.length?rows.map(w=>{const own=w.person===currentPersonName();return `<article class="item-card"><div class="wish-card-head"><div><h3>${escapeHtml(w.person)} · ${escapeHtml(w.title)}</h3><div class="meta">${escapeHtml(w.occasion||"")}${w.price?` · € ${Number(w.price).toLocaleString("nl-NL",{minimumFractionDigits:2})}`:""}</div></div>${own?`<div class="wish-owner-actions"><button class="mini-btn" type="button" onclick="openWishDialog('${w.id}')">Bewerken</button><button class="mini-btn danger-mini" type="button" onclick="deleteWish('${w.id}')">Verwijderen</button></div>`:""}</div>${w.photo?`<img class="wish-photo" src="${w.photo}" alt="${escapeHtml(w.title)}">`:""}${w.note?`<p>${escapeHtml(w.note)}</p>`:""}${w.link?`<a href="${w.link}" target="_blank" rel="noopener">Bekijk winkel</a>`:""}</article>`}).join(""):`<div class="card muted">Geen wensen gevonden.</div>`;
}

function privateGiftIdeasCollection(){
  return db && currentUser ? db.collection("privateGiftIdeas").doc(currentUser.uid).collection("ideas") : null;
}
function subscribePrivateGiftIdeas(){
  if(privateGiftIdeasUnsubscribe){ privateGiftIdeasUnsubscribe(); privateGiftIdeasUnsubscribe=null; }
  privateGiftIdeas=[];
  const collection=privateGiftIdeasCollection();
  if(!collection) return;
  privateGiftIdeasUnsubscribe=collection.orderBy("createdAt","desc").onSnapshot(snap=>{
    privateGiftIdeas=snap.docs.map(doc=>({id:doc.id,...doc.data()}));
    renderGiftEvents();
    renderPrivateGiftIdeasPage();
  },err=>{ console.error("Cadeautjes voor anderen laden mislukt",err); });
}

function privateIdeaRecipients(idea){
  if(Array.isArray(idea?.recipients)) return idea.recipients;
  return idea?.person ? [idea.person] : [];
}
function privateIdeaStatusLabel(status){
  return ({idea:"💡 Idee",reserved:"🛒 Gereserveerd",bought:"✅ Gekocht",wrapped:"🎁 Ingepakt"})[status] || "💡 Idee";
}
function renderPrivateGiftIdeasPage(){
  if(!window.privateGiftIdeaList) return;
  const q=(privateGiftIdeaSearch?.value||"").trim().toLowerCase();
  const filtered=(privateGiftIdeas||[]).filter(i=>[i.title,i.note,i.link,...privateIdeaRecipients(i)].join(" ").toLowerCase().includes(q));
  const groups=data.family.map(p=>({person:p.name,ideas:filtered.filter(i=>privateIdeaRecipients(i).includes(p.name))})).filter(g=>g.ideas.length);
  privateGiftIdeaList.innerHTML=groups.length?groups.map(g=>`<section class="card private-person-group">
    <button class="private-person-summary" type="button" onclick="this.nextElementSibling.classList.toggle('hidden')"><strong>🎁 Cadeaus ${escapeHtml(g.person)}</strong><span>${g.ideas.length} idee${g.ideas.length===1?'':'ën'} ▾</span></button>
    <div class="private-person-ideas">${g.ideas.sort((a,b)=>Number(b.favorite)-Number(a.favorite)).map(i=>`<article class="private-idea-card">
      <div class="private-idea-head"><div><h3>${i.favorite?'⭐ ':''}${escapeHtml(i.title)}</h3><div class="private-idea-people">${privateIdeaRecipients(i).map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join('')}</div></div><span class="private-idea-status">${privateIdeaStatusLabel(i.status)}</span></div>
      ${i.price?`<div class="meta">€ ${Number(i.price).toLocaleString('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>`:''}
      ${i.photo?`<img class="private-idea-photo" src="${i.photo}" alt="${escapeHtml(i.title)}">`:''}
      ${i.note?`<p>${escapeHtml(i.note)}</p>`:''}${i.link?`<a href="${escapeHtml(i.link)}" target="_blank" rel="noopener">Bekijk winkel</a>`:''}
      <div class="private-idea-actions"><button class="secondary-btn" type="button" onclick="openGiftIdeaDialog('', '${i.id}')">Bewerken</button><button class="secondary-btn" type="button" onclick="deletePrivateGiftIdea('${i.id}')">Verwijderen</button></div>
    </article>`).join('')}</div>
  </section>`).join(''):`<div class="card muted private-idea-empty">${q?'Geen cadeautjes gevonden.':'Je hebt nog geen cadeautjes voor anderen.'}</div>`;
}
function privateTodosCollection(){
  return db && currentUser ? db.collection("privateTodos").doc(currentUser.uid).collection("items") : null;
}
function subscribePrivateTodos(){
  if(privateTodosUnsubscribe){ privateTodosUnsubscribe(); privateTodosUnsubscribe=null; }
  privateTodos=[];
  const collection=privateTodosCollection();
  if(!collection){ renderPrivateTodos(); return; }
  privateTodosUnsubscribe=collection.orderBy("createdAt","desc").onSnapshot(snap=>{
    privateTodos=snap.docs.map(doc=>({id:doc.id,...doc.data()}));
    renderPrivateTodos();
    renderHome();
  },err=>{ console.error("Privé to-do's laden mislukt",err); showSaveWarning("Je to-do's konden niet worden geladen."); });
}
function todoPriorityLabel(priority){ return ({urgent:"🚨 Dringend",high:"🔴 Hoog",normal:"🟡 Normaal",low:"🟢 Laag"})[priority]||"🟡 Normaal"; }
function todoPriorityRank(priority){ return ({urgent:0,high:1,normal:2,low:3})[priority] ?? 2; }
function renderPrivateTodos(){
  if(!window.todoList) return;
  const showCompleted=window.todoShowCompleted?.checked ?? true;
  const rows=(privateTodos||[]).filter(t=>showCompleted || !t.completed).sort((a,b)=>{
    if(Boolean(a.completed)!==Boolean(b.completed)) return Number(a.completed)-Number(b.completed);
    const priorityOrder=todoPriorityRank(a.priority)-todoPriorityRank(b.priority);
    if(priorityOrder!==0) return priorityOrder;
    const ad=(a.date||"9999-12-31")+" "+(a.time||"");
    const bd=(b.date||"9999-12-31")+" "+(b.time||"");
    return ad.localeCompare(bd);
  });
  todoList.innerHTML=rows.length?rows.map(t=>`<article class="item-card todo-card ${t.completed?"todo-done":""}">
    <label class="todo-check"><input type="checkbox" ${t.completed?"checked":""} onchange="togglePrivateTodo('${t.id}',this.checked)"><span><strong>${escapeHtml(t.title)}</strong><small>${todoPriorityLabel(t.priority)}${t.date?` · ${fmtDate(t.date)}`:""}${t.time?` · ${escapeHtml(t.time)}`:""}</small></span></label>
    ${t.note?`<p>${escapeHtml(t.note).replaceAll("\n","<br>")}</p>`:""}
    <div class="todo-actions"><button class="secondary-btn" type="button" onclick="openTodoDialog('${t.id}')">Bewerken</button><button class="secondary-btn" type="button" onclick="deletePrivateTodo('${t.id}')">Verwijderen</button></div>
  </article>`).join(""):`<div class="card muted">Je hebt nog geen persoonlijke taken.</div>`;
}
window.openTodoDialog=(id="")=>{
  todoForm.reset(); todoEditId.value=id; todoDialogTitle.textContent=id?"Taak wijzigen":"Taak toevoegen";
  const item=(privateTodos||[]).find(t=>t.id===id);
  if(item){ todoTitle.value=item.title||""; todoNote.value=item.note||""; todoDate.value=item.date||""; todoTime.value=item.time||""; todoPriority.value=item.priority||"normal"; }
  else todoPriority.value="normal";
  todoDialog.showModal();
};
window.togglePrivateTodo=async(id,completed)=>{
  const item=(privateTodos||[]).find(t=>t.id===id); if(!item)return;
  try{ await privateTodosCollection().doc(id).set({...item,completed,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); }
  catch(error){ console.error(error); showSaveWarning(`Taak aanpassen mislukt${error?.message?`: ${error.message}`:""}.`); }
};
window.deletePrivateTodo=async id=>{
  if(!confirm("Deze taak verwijderen?"))return;
  try{ await privateTodosCollection().doc(id).delete(); showSaveWarning("✓ Taak verwijderd"); }
  catch(error){ console.error(error); showSaveWarning(`Taak verwijderen mislukt${error?.message?`: ${error.message}`:""}.`); }
};

function giftEventCanManage(event){
  return isAdmin() || event.createdByUid===currentUser?.uid;
}
function giftEventVisible(event){
  const person=currentPersonName();
  return giftEventCanManage(event) || (event.recipients||[]).includes(person) || (event.buyers||[]).includes(person);
}
function giftWishStatus(event,wish){
  return (event.claims||{})[wish.id] || null;
}
function giftStatusLabel(status){
  if(status==="wrapped") return "🎁 Ingepakt";
  if(status==="bought") return "✅ Gekocht";
  return "🛒 Gereserveerd";
}
function renderGiftEvents(){
  if(!window.giftEventList) return;
  const person=currentPersonName();
  const events=(data.giftEvents||[]).filter(giftEventVisible).slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
  giftEventList.innerHTML=events.length?events.map(event=>{
    const canBuy=(event.buyers||[]).includes(person);
    const recipients=event.recipients||[];
    const personalWishes=(data.wishes||[]).filter(w=>recipients.includes(w.person) && (!event.occasion || event.occasion==="Overig" || w.occasion===event.occasion));
    const myPrivateIdeas=(privateGiftIdeas||[]).filter(i=>privateIdeaRecipients(i).some(x=>recipients.includes(x)) && (!i.eventId || i.eventId===event.id));
    const publicCard=w=>{
      const ownWish=w.person===person, claim=giftWishStatus(event,w); let actions="";
      if(canBuy&&!ownWish){ if(!claim) actions=`<button class="primary-btn" onclick="claimGiftWish('${event.id}','${w.id}','reserved')">Ik koop deze</button>`; else if(claim.byUid===currentUser?.uid) actions=`<button class="secondary-btn" onclick="claimGiftWish('${event.id}','${w.id}','bought')">Gekocht</button><button class="secondary-btn" onclick="claimGiftWish('${event.id}','${w.id}','wrapped')">Ingepakt</button><button class="text-btn" onclick="releaseGiftWish('${event.id}','${w.id}')">Vrijgeven</button>`; }
      return `<article class="gift-wish-card ${claim&&!ownWish?'claimed':''}"><div><strong>${escapeHtml(w.person)} · ${escapeHtml(w.title)}</strong><div class="meta">${escapeHtml(w.occasion||'')}${w.price?` · € ${Number(w.price).toLocaleString('nl-NL',{minimumFractionDigits:2})}`:''}</div></div>${w.note?`<p>${escapeHtml(w.note)}</p>`:''}${w.link?`<a href="${escapeHtml(w.link)}" target="_blank" rel="noopener">Bekijk winkel</a>`:''}${!ownWish&&claim?`<div class="gift-claim-status">${giftStatusLabel(claim.status)}${claim.byName?` · door ${escapeHtml(claim.byName)}`:''}</div>`:ownWish?`<div class="gift-secret-note">🔒 Aankoopinformatie is voor jou verborgen.</div>`:''}${actions?`<div class="gift-actions">${actions}</div>`:''}</article>`;
    };
    const privateCard=i=>`<article class="gift-wish-card private-gift-idea"><div><strong>${i.favorite?'⭐ ':''}${escapeHtml(privateIdeaRecipients(i).join(', '))} · ${escapeHtml(i.title)}</strong><div class="meta">Alleen voor jou zichtbaar${i.price?` · € ${Number(i.price).toLocaleString('nl-NL',{minimumFractionDigits:2})}`:''}</div></div><div class="gift-secret-note">🔒 ${privateIdeaStatusLabel(i.status)}</div>${i.photo?`<img class="private-idea-photo" src="${i.photo}" alt="${escapeHtml(i.title)}">`:''}${i.note?`<p>${escapeHtml(i.note)}</p>`:''}${i.link?`<a href="${escapeHtml(i.link)}" target="_blank" rel="noopener">Bekijk winkel</a>`:''}<div class="gift-private-toolbar"><button class="secondary-btn" type="button" onclick="openGiftIdeaDialog('${event.id}','${i.id}')">Bewerken</button><button class="text-btn" type="button" onclick="deletePrivateGiftIdea('${i.id}')">Verwijderen</button></div></article>`;
    const publicCards=personalWishes.length?personalWishes.map(publicCard).join(''):(event.occasion==='Verjaardag'?`<p class="muted">Nog geen openbare wensen gevonden voor de verjaardag van ${escapeHtml(recipients[0]||'de jarige')}.</p>`:`<p class="muted">Er zijn nog geen openbare wensen toegevoegd voor de gekozen personen.</p>`);
    const privateCards=myPrivateIdeas.length?myPrivateIdeas.map(privateCard).join(''):`<p class="muted">Je hebt nog geen cadeautjes voor anderen voor dit evenement.</p>`;
    const peopleLabel=event.occasion==='Verjaardag'?`<span class="chip">🎂 Jarige: ${escapeHtml(recipients[0]||'')}</span>`:`<span class="chip">🎁 Voor: ${recipients.map(escapeHtml).join(', ')}</span>`;
    return `<section class="item-card gift-event-card"><div class="gift-event-head"><div><h3>${escapeHtml(event.name)}</h3><div class="meta">${fmtDate(event.date)} · ${escapeHtml(event.occasion||'Overig')}${event.budget?` · budget € ${Number(event.budget).toLocaleString('nl-NL',{minimumFractionDigits:2})}`:''}</div></div>${giftEventCanManage(event)?`<button class="mini-btn" onclick="openGiftEventDialog('${event.id}')">Bewerken</button>`:''}</div><div class="chips">${peopleLabel}</div><section class="gift-section"><h4>🎁 Openbare wensen</h4><div class="gift-wishes">${publicCards}</div></section>${canBuy?`<section class="gift-section private-gift-section"><h4>🎁 Mijn cadeautjes voor anderen</h4><p class="muted private-gift-help">Alleen jij kunt deze ideeën zien.</p><div class="gift-wishes">${privateCards}</div><button class="secondary-btn wide" type="button" onclick="openGiftIdeaDialog('${event.id}')">+ Cadeautje toevoegen</button></section>`:''}</section>`;
  }).join(''):`<div class="card muted">Nog geen cadeau-evenementen. Iedere gebruiker kan er één aanmaken.</div>`;
}
function fillGiftMemberChecks(container,selected=[]){
  container.innerHTML=data.family.map(p=>`<label class="member-check"><input type="checkbox" value="${escapeHtml(p.name)}" ${selected.includes(p.name)?"checked":""}><span>${escapeHtml(p.name)}</span></label>`).join("");
}
function updateGiftRecipientMode(){
  const birthday=giftEventOccasion.value==="Verjaardag";
  giftBirthdayRecipientLabel.classList.toggle("hidden",!birthday);
  giftMultipleRecipients.classList.toggle("hidden",birthday);
  if(birthday){
    giftBirthdayRecipient.innerHTML=data.family.map(p=>`<option value="${p.name}">${p.name}</option>`).join("");
  }
}
window.openGiftEventDialog=id=>{
  const event=(data.giftEvents||[]).find(x=>x.id===id);
  if(event && !giftEventCanManage(event)) return;
  giftEventForm.reset(); giftEventEditId.value=event?.id||""; giftEventDialogTitle.textContent=event?"Cadeau-evenement bewerken":"Cadeau-evenement maken";
  giftEventName.value=event?.name||""; giftEventOccasion.value=event?.occasion||"Verjaardag"; giftEventDate.value=event?.date||new Date().toISOString().slice(0,10); giftEventBudget.value=event?.budget||""; updateGiftRecipientMode(); giftBirthdayRecipient.value=event?.recipients?.[0]||data.family[0]?.name||"";
  fillGiftMemberChecks(giftRecipientChecks,event?.recipients||[]); fillGiftMemberChecks(giftBuyerChecks,event?.buyers||data.family.map(p=>p.name));
  giftEventMessage.textContent=""; deleteGiftEventBtn.classList.toggle("hidden",!event); giftEventDialog.showModal();
};
window.claimGiftWish=(eventId,wishId,status)=>{
  const event=(data.giftEvents||[]).find(x=>x.id===eventId); if(!event)return;
  const person=currentPersonName(); if(!(event.buyers||[]).includes(person))return;
  event.claims=event.claims||{}; const current=event.claims[wishId];
  if(current && current.byUid!==currentUser?.uid){ alert("Deze wens is al door iemand anders gereserveerd."); return; }
  event.claims[wishId]={byUid:currentUser?.uid||"",byName:person,status,updatedAt:new Date().toISOString()}; saveData();
};
window.releaseGiftWish=(eventId,wishId)=>{
  const event=(data.giftEvents||[]).find(x=>x.id===eventId); const claim=event?.claims?.[wishId];
  if(!claim || (claim.byUid!==currentUser?.uid && !isAdmin()))return; delete event.claims[wishId]; saveData();
};

function renderHome(){
  statFamily.textContent=data.family.length;
  statHouseholds.textContent=data.households.length;
  statRecipes.textContent=data.recipes.length;
  statWishes.textContent=data.wishes.filter(w=>w.person===currentPersonName()).length;

  const now=new Date();
  const todayIso=isoDate(now);
  const person=currentPersonName() || "familielid";
  dashboardWelcome.textContent=`Hallo ${person}`;
  dashboardDate.textContent=new Intl.DateTimeFormat("nl-NL",{
    weekday:"long",day:"numeric",month:"long",year:"numeric"
  }).format(now);

  const b=getNextBirthday();
  document.getElementById("nextBirthday").innerHTML=b
    ? `<div class="birthday-icon">🎂</div><div><strong>${b.name}</strong><div class="muted">${b.days===0?"Vandaag jarig!":`over ${b.days} dagen`} · wordt ${ageFor(b.birth)+1}</div></div>`
    : `<div class="muted">Geen verjaardag gevonden.</div>`;

  const houses=accessibleHouseholds();
  const friday=isoDate(getFriday(now));
  const dayIndex=(now.getDay()-5+7)%7;
  const meals=(data.weekMenus || []).filter(m=>
    houses.some(h=>h.id===m.householdId) &&
    m.weekStart===friday &&
    Number(m.dayIndex)===dayIndex
  );

  dashboardMeals.innerHTML=meals.length ? meals.map(meal=>{
    const house=data.households.find(h=>h.id===meal.householdId);
    return `<div class="dashboard-row"><div><strong>${recipeMealName(meal)}</strong><span>${house?.name || ""}</span></div></div>`;
  }).join("") : `<p class="muted">Voor vandaag staat nog niets gepland.</p>`;

  const visibleAgenda=getVisibleAgendaEvents()
    .filter(e=>e.date>=todayIso)
    .sort((a,b)=>(a.date+" "+(a.startTime||"")).localeCompare(b.date+" "+(b.startTime||"")))
    .slice(0,4);

  dashboardAgenda.innerHTML=visibleAgenda.length ? visibleAgenda.map(e=>`
    <div class="dashboard-row">
      <div><strong>${e.title}</strong><span>${formatAgendaDate(e)} · ${agendaScopeLabel(e)}</span></div>
    </div>
  `).join("") : `<p class="muted">Geen komende afspraken.</p>`;

  const groceryRows=(data.groceries || []).filter(g=>
    houses.some(h=>h.id===g.householdId) && !g.done
  );
  const groceryByHouse=houses.map(h=>({
    house:h,
    count:groceryRows.filter(g=>g.householdId===h.id).length
  })).filter(x=>x.count>0);

  dashboardGroceries.innerHTML=groceryByHouse.length ? groceryByHouse.map(x=>`
    <div class="dashboard-row">
      <div><strong>${x.count} ${x.count===1?"product":"producten"}</strong><span>${x.house.name}</span></div>
    </div>
  `).join("") : `<p class="muted">Alle boodschappen zijn afgevinkt.</p>`;

  if(window.dashboardTodos){
    const upcoming=(privateTodos||[]).filter(t=>!t.completed).sort((a,b)=>{
      const priorityOrder=todoPriorityRank(a.priority)-todoPriorityRank(b.priority);
      if(priorityOrder!==0) return priorityOrder;
      const ad=(a.date||"9999-12-31")+" "+(a.time||"");
      const bd=(b.date||"9999-12-31")+" "+(b.time||"");
      return ad.localeCompare(bd);
    }).slice(0,5);
    dashboardTodos.innerHTML=upcoming.length ? upcoming.map(t=>`<div class="dashboard-row"><div><strong>${escapeHtml(t.title)}</strong><span>${todoPriorityLabel(t.priority)}${t.date?` · ${fmtDate(t.date)}`:""}${t.time?` · ${escapeHtml(t.time)}`:""}</span></div></div>`).join("") : `<p class="muted">Geen openstaande taken.</p>`;
  }

  if(window.dashboardDiarySummary && isDiaryOwner()){
    const latest=diaryEntries.slice().sort((a,b)=>String(b.date||b.createdAt||"").localeCompare(String(a.date||a.createdAt||"")))[0];
    dashboardDiarySummary.textContent=latest ? `Laatste notitie: ${diaryDateLabel(latest.date)}` : "Open je dagboek om een notitie toe te voegen.";
  }
}
function fillSelects(){
  const opts=data.family.map(p=>`<option>${p.name}</option>`).join("");
  recipeAuthor.innerHTML=opts;

  const safeName=currentPersonName() || "Familielid";
  wishPerson.innerHTML=`<option>${safeName}</option>`;
  wishPerson.value=safeName;
  wishPerson.disabled=true;
  wishPersonFilter.innerHTML=`<option value="">Alle familieleden</option>`+data.family.map(p=>`<option value="${p.name}">${p.name}</option>`).join("");
  if(!wishPersonFilter.value) wishPersonFilter.value=safeName;
}
function renderProfile(){
  const name=currentUser?.displayName || currentUser?.name || "Niet ingelogd";
  const email=currentUser?.email || "";
  profileName.textContent=name;
  profileEmail.textContent=email;

  const savedPhoto=localStorage.getItem(PROFILE_PHOTO_KEY);
  if(savedPhoto && currentUser){
    profileAvatar.textContent="";
    profileAvatar.style.backgroundImage=`url("${savedPhoto}")`;
    profileAvatar.classList.add("has-photo");
  }else{
    profileAvatar.style.backgroundImage="";
    profileAvatar.classList.remove("has-photo");
    profileAvatar.textContent=initials(name);
  }

  profileBtn.textContent=initials(name);
  topGreeting.textContent=currentUser ? `Hallo ${name}` : "Familie-app";
  const houses=data.households.filter(h=>h.members.includes(currentPersonName()));
  profileHouseholds.innerHTML=houses.map(h=>`<span class="chip">${h.name}</span>`).join("") || `<span class="muted">Nog niet aan een huishouden gekoppeld</span>`;
}
function renderAll(){
  renderNotifications(); renderHome(); renderFamily(); renderHouseholds(); renderRecipes(); renderGroceries(); renderProducts(); renderWishes(); renderGiftEvents(); renderPrivateGiftIdeasPage(); renderPrivateTodos(); renderAgenda(); renderWeekmenu(); fillSelects(); renderProfile(); renderAccountManagement(); renderVault(); renderDiary(); }

function parseNumberValue(value){
  const raw=String(value||"").trim().replace(",",".");
  if(!raw) return null;

  // Ondersteunt gehele getallen, decimalen en eenvoudige breuken zoals 1/2.
  if(/^\d+\s*\/\s*\d+$/.test(raw)){
    const [a,b]=raw.split("/").map(Number);
    return b ? a/b : null;
  }
  if(/^\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  return null;
}


function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

const INGREDIENT_UNITS=[
  ["","Geen eenheid"],
  ["g","g"],
  ["kg","kg"],
  ["ml","ml"],
  ["l","liter"],
  ["tl","tl"],
  ["el","el"],
  ["stuk","stuk"],
  ["stuks","stuks"],
  ["blik","blik"],
  ["pak","pak"],
  ["zakje","zakje"],
  ["snufje","snufje"],
  ["teen","teen"],
  ["tenen","tenen"],
  ["bosje","bosje"],
  ["kopje","kopje"]
];

function ingredientUnitOptions(selected=""){
  return INGREDIENT_UNITS.map(([value,label])=>
    `<option value="${value}" ${value===selected?"selected":""}>${label}</option>`
  ).join("");
}

function addIngredientRow(ingredient={amount:"",unit:"",name:""}){
  const row=document.createElement("div");
  row.className="ingredient-entry";
  row.innerHTML=`
    <div class="ingredient-entry-top">
      <span>Ingrediënt</span>
      <button class="ingredient-remove" type="button" aria-label="Ingrediënt verwijderen">🗑️</button>
    </div>
    <input class="ingredient-name" type="text" placeholder="Bijvoorbeeld: slagroom" value="${escapeHtml(ingredient.name||"")}">
    <div class="ingredient-amount-row">
      <label>
        <span>Hoeveelheid</span>
        <input class="ingredient-amount" type="text" inputmode="decimal" placeholder="Bijv. 0,5" value="${escapeHtml(String(ingredient.amount||""))}">
      </label>
      <label>
        <span>Eenheid</span>
        <select class="ingredient-unit">${ingredientUnitOptions(ingredient.unit||"")}</select>
      </label>
    </div>
  `;

  row.querySelector(".ingredient-remove").onclick=()=>{
    row.remove();
    if(!ingredientRows.children.length) addIngredientRow();
    updateIngredientRemoveButtons();
  };

  ingredientRows.appendChild(row);
  updateIngredientRemoveButtons();
}

function updateIngredientRemoveButtons(){
  const buttons=[...ingredientRows.querySelectorAll(".ingredient-remove")];
  buttons.forEach(button=>{
    button.disabled=buttons.length===1;
    button.title=buttons.length===1 ? "Minimaal één ingrediënt nodig" : "Ingrediënt verwijderen";
  });
}

function resetIngredientEditor(ingredients=[]){
  ingredientRows.innerHTML="";
  const rows=ingredients.length ? ingredients : [{amount:"",unit:"",name:""}];
  rows.forEach(addIngredientRow);
  ingredientError.textContent="";
}

function collectIngredientRows(){
  const rows=[...ingredientRows.querySelectorAll(".ingredient-entry")].map(row=>({
    name:row.querySelector(".ingredient-name").value.trim(),
    amount:row.querySelector(".ingredient-amount").value.trim().replace(".",","),
    unit:row.querySelector(".ingredient-unit").value
  }));

  return rows.filter(item=>item.name || item.amount || item.unit);
}

function validateIngredientRows(ingredients){
  if(!ingredients.length){
    ingredientError.textContent="Voeg minimaal één ingrediënt toe.";
    return false;
  }

  if(ingredients.some(item=>!item.name)){
    ingredientError.textContent="Vul bij ieder ingrediënt een naam in.";
    return false;
  }

  const invalidAmount=ingredients.find(item=>
    item.amount && parseNumberValue(item.amount)===null
  );
  if(invalidAmount){
    ingredientError.textContent=`"${invalidAmount.amount}" is geen geldige hoeveelheid. Gebruik bijvoorbeeld 0,5 of 1/2.`;
    return false;
  }

  ingredientError.textContent="";
  return true;
}

function parseIngredientLine(line){
  const clean=String(line||"").trim();
  if(!clean) return null;

  // Oude/instructie-indeling: 250 | gram | bloem
  if(clean.includes("|")){
    const parts=clean.split("|").map(x=>x.trim());
    return {
      amount:parts[0]||"",
      unit:parts[1]||"",
      name:parts.slice(2).join(" | ")||parts[1]||parts[0]
    };
  }

  // Eenvoudige invoer werkt nu ook: 250 gram bloem
  // of: 1/2 theelepel zout
  const match=clean.match(/^(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s+(\S+)\s+(.+)$/);
  if(match){
    return {amount:match[1],unit:match[2],name:match[3]};
  }

  // Zonder hoeveelheid blijft de tekst gewoon staan.
  return {amount:"",unit:"",name:clean};
}

function normalizeIngredient(ingredient){
  if(!ingredient) return {amount:"",unit:"",name:""};

  // Herstel recepten die in een oudere versie als één hele regel zijn opgeslagen.
  if(ingredient.amount && !ingredient.unit && ingredient.name===ingredient.amount){
    return parseIngredientLine(ingredient.amount) || ingredient;
  }
  return ingredient;
}

function formatScaledAmount(value, factor){
  const number=parseNumberValue(value);
  if(number===null) return value || "";

  const scaled=number*factor;
  return scaled.toLocaleString("nl-NL",{
    maximumFractionDigits:2
  });
}

function parseIngredients(text){
  return text.split("\\n")
    .map(parseIngredientLine)
    .filter(Boolean);
}



addWeekMealBtn.onclick=()=>openWeekMealDialog(0);
weekMealType.onchange=showWeekMealFields;
weekmenuHousehold.onchange=()=>{
  currentWeekmenuHousehold=weekmenuHousehold.value;
  renderWeekmenu();
};

previousWeekBtn.onclick=()=>{
  currentWeekStart=addDays(currentWeekStart,-7);
  renderWeekmenu();
};

nextWeekBtn.onclick=()=>{
  currentWeekStart=addDays(currentWeekStart,7);
  renderWeekmenu();
};

weekMealForm.onsubmit=async e=>{
  e.preventDefault();
  if(!currentWeekmenuHousehold) return;

  const f=new FormData(weekMealForm);
  const dayIndex=Number(f.get("day"));
  const mealType=f.get("mealType");
  const recipeId=mealType==="recipe" ? String(f.get("recipeId")||"") : "";
  const manualName=mealType==="manual" ? String(f.get("manualName")||"").trim() : "";

  if(mealType==="recipe" && !recipeId){
    alert("Voeg eerst een recept toe of kies 'Zelf gerecht typen'.");
    return;
  }
  if(mealType==="manual" && !manualName){
    alert("Vul een gerecht in.");
    return;
  }

  data.weekMenus=data.weekMenus || [];
  const editId=String(f.get("editId")||"");
  const existing=data.weekMenus.find(m=>m.id===editId);
  const sameDay=data.weekMenus.find(m=>
    m.householdId===currentWeekmenuHousehold &&
    m.weekStart===weekMenuKey() &&
    Number(m.dayIndex)===dayIndex &&
    m.id!==editId
  );

  if(sameDay){
    data.weekMenus=data.weekMenus.filter(m=>m.id!==sameDay.id);
  }

  const stableWeekMenuId=`${currentWeekmenuHousehold}__${weekMenuKey()}__${dayIndex}`.replaceAll("/","-");
  const record={
    id:existing?.id || stableWeekMenuId,
    householdId:currentWeekmenuHousehold,
    weekStart:weekMenuKey(),
    dayIndex,
    recipeId,
    name:manualName,
    note:String(f.get("note")||"").trim(),
    updatedBy:currentPersonName(),
    updatedAt:new Date().toISOString(),
    attendees: existing?.attendees || (householdById(currentWeekmenuHousehold)?.members || []).map(name=>({type:"family",name}))
  };

  const beforeValue=existing?{...existing}:null;
  if(existing){ Object.assign(existing,record); }else{ data.weekMenus.push(record); }
  renderWeekmenu();
  try{
    if(sameDay) await deleteWeekMenuRecord(sameDay);
    await saveWeekMenuRecord(record,beforeValue);
    addNotification({householdId:currentWeekmenuHousehold,text:`${currentPersonName()} heeft het weekmenu voor ${WEEK_DAYS[dayIndex].toLowerCase()} aangepast.`});
    saveData();
    weekMealDialog.close();
  }catch(error){
    console.error(error); showSaveWarning("Het weekmenu is niet opgeslagen. Probeer opnieuw en sluit de app nog niet af.");
    if(existing&&beforeValue) Object.assign(existing,beforeValue); else data.weekMenus=data.weekMenus.filter(x=>x.id!==record.id);
    renderWeekmenu();
  }
};


window.openAttendees=id=>{
  const meal=(data.weekMenus||[]).find(m=>m.id===id);
  if(!meal || !userHouseholdIds().includes(meal.householdId)) return;
  attendeesMealId.value=id;
  const selected=mealAttendees(meal);
  attendeeFamilyChecks.innerHTML=data.family.map(p=>`<label class="member-check"><input type="checkbox" value="${escapeHtml(p.name)}" ${selected.some(a=>a.type==="family"&&a.name===p.name)?"checked":""}><span>${escapeHtml(p.name)}</span></label>`).join("");
  attendeeGuests.value=selected.filter(a=>a.type==="guest").map(a=>a.name).join("\n");
  attendeesDialog.showModal();
};
attendeesForm.onsubmit=async e=>{
  e.preventDefault();
  const meal=(data.weekMenus||[]).find(m=>m.id===attendeesMealId.value); if(!meal)return;
  const family=[...attendeeFamilyChecks.querySelectorAll('input:checked')].map(x=>({type:"family",name:x.value}));
  const guests=attendeeGuests.value.split("\n").map(x=>x.trim()).filter(Boolean).map(name=>({type:"guest",name}));
  const beforeValue={...meal,attendees:[...(meal.attendees||[])]};
  meal.attendees=[...family,...guests]; meal.updatedBy=currentPersonName(); meal.updatedAt=new Date().toISOString();
  try{
    await saveWeekMenuRecord(meal,beforeValue);
    addNotification({householdId:meal.householdId,text:`${currentPersonName()} heeft de mee-eters voor ${WEEK_DAYS[meal.dayIndex].toLowerCase()} aangepast (${meal.attendees.length} eters).`});
    attendeesDialog.close(); saveData();
  }catch(error){ Object.assign(meal,beforeValue); renderWeekmenu(); showSaveWarning("De mee-eters zijn niet opgeslagen."); }
};

window.openWeekMealForDay=dayIndex=>openWeekMealDialog(dayIndex);

window.editWeekMeal=id=>{
  const meal=(data.weekMenus || []).find(m=>m.id===id);
  if(!meal || !userHouseholdIds().includes(meal.householdId)) return;
  openWeekMealDialog(meal.dayIndex,meal);
};

window.deleteWeekMeal=async id=>{
  const meal=(data.weekMenus || []).find(m=>m.id===id);
  if(!meal || !userHouseholdIds().includes(meal.householdId)) return;
  if(!confirm(`"${recipeMealName(meal)}" uit het weekmenu verwijderen?`)) return;
  data.weekMenus=data.weekMenus.filter(m=>m.id!==id); renderWeekmenu();
  try{ await deleteWeekMenuRecord(meal); }
  catch(error){ data.weekMenus.push(meal); renderWeekmenu(); showSaveWarning("Verwijderen mislukt. Het gerecht is teruggezet."); }
};

copyWeekmenuBtn.onclick=async ()=>{
  const source=getWeekMeals();
  if(!source.length){
    alert("Deze week bevat nog geen gerechten.");
    return;
  }

  const nextStart=isoDate(addDays(currentWeekStart,7));
  const existingNext=(data.weekMenus || []).filter(m=>
    m.householdId===currentWeekmenuHousehold && m.weekStart===nextStart
  );

  if(existingNext.length && !confirm("De volgende week bevat al gerechten. Deze vervangen?")){
    return;
  }

  const previous=[...existingNext];
  const copies=source.map(meal=>({
    ...meal,id:`${currentWeekmenuHousehold}__${nextStart}__${meal.dayIndex}`.replaceAll("/","-"),weekStart:nextStart,
    updatedBy:currentPersonName(),updatedAt:new Date().toISOString()
  }));
  try{
    setSyncStatus("Weekmenu kopiëren…");
    const batch=db.batch();
    previous.forEach(row=>batch.delete(db.collection(WEEK_MENUS_COLLECTION).doc(row.id)));
    copies.forEach(row=>batch.set(db.collection(WEEK_MENUS_COLLECTION).doc(row.id),row));
    await batch.commit();
    data.weekMenus=(data.weekMenus||[]).filter(m=>!(m.householdId===currentWeekmenuHousehold&&m.weekStart===nextStart)).concat(copies);
    renderWeekmenu(); setSyncStatus("✓ Weekmenu gekopieerd en opgeslagen");
    alert("Het weekmenu is naar de volgende week gekopieerd en opgeslagen.");
  }catch(error){ console.error(error); showSaveWarning("Kopiëren is niet opgeslagen. Probeer opnieuw."); }
};

weekmenuGroceriesBtn.onclick=()=>{
  const household=data.households.find(h=>h.id===currentWeekmenuHousehold);
  const meals=getWeekMeals();
  const recipeMeals=meals.filter(m=>m.recipeId);

  if(!meals.length){
    alert("Deze week bevat nog geen gerechten.");
    return;
  }
  if(!recipeMeals.length){
    alert("Er zijn alleen handmatig ingevulde gerechten. Daarvan zijn geen ingrediënten bekend.");
    return;
  }

  let added=0;
  const householdSize=Math.max(1,household?.members?.length || 1);

  recipeMeals.forEach(meal=>{
    const recipe=data.recipes.find(r=>r.id===meal.recipeId);
    if(!recipe) return;

    recipe.ingredients.forEach(ingredient=>{
      data.groceries.push({
        id:crypto.randomUUID(),
        householdId:currentWeekmenuHousehold,
        text:scaledIngredientText(ingredient,recipe.servings,attendeeCount(meal)),
        done:false,
        source:`Weekmenu ${weekMenuKey()}`,
        addedBy:currentPersonName(),
        addedAt:new Date().toISOString()
      });
      added++;
    });
  });

  addNotification({householdId:currentWeekmenuHousehold,text:`${currentPersonName()} heeft ${added} ingrediënten uit het weekmenu toegevoegd aan de boodschappenlijst.`});
  currentHousehold=currentWeekmenuHousehold;
  saveData();
  navigate("boodschappen");
  alert(`${added} ingrediënten zijn toegevoegd aan de boodschappenlijst van ${household?.name || "het huishouden"}.`);
};

function icsEscape(value=""){
  return String(value).replaceAll("\\","\\\\").replaceAll(";","\\;").replaceAll(",","\\,").replaceAll("\n","\\n");
}
function icsDatePart(date,time=""){
  const day=String(date||"").replaceAll("-","");
  return time ? `${day}T${String(time).replace(":","")}00` : day;
}
function agendaEventById(id,visibility){
  return getVisibleAgendaEvents().find(x=>x.id===id && x.visibility===visibility);
}
function calendarEnd(event){
  if(event.endTime) return icsDatePart(event.date,event.endTime);
  if(event.startTime){
    const d=new Date(`${event.date}T${event.startTime}:00`); d.setHours(d.getHours()+1);
    return `${String(d.getFullYear())}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}00`;
  }
  const d=new Date(`${event.date}T12:00:00`); d.setDate(d.getDate()+1);
  return `${String(d.getFullYear())}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
}
function getCalendarPreference(){
  try{return localStorage.getItem(CALENDAR_PREF_KEY)||"";}catch(_){return "";}
}
function setCalendarPreference(value){
  try{localStorage.setItem(CALENDAR_PREF_KEY,value||"");}catch(_){}
  updateCalendarPreferenceUi();
}
function calendarPreferenceLabel(value){
  return value==="apple"?"Apple Agenda":value==="google"?"Google Agenda":value==="ics"?"ICS-bestand":"Nog niet gekozen";
}
function updateCalendarPreferenceUi(){
  if(window.defaultCalendarSelect) defaultCalendarSelect.value=getCalendarPreference();
  if(window.defaultCalendarHelp){
    const pref=getCalendarPreference();
    defaultCalendarHelp.textContent=pref==="google"
      ? "Google Agenda gebruikt zijn eigen standaardherinnering; Hogeterpjes toont daarvoor geen herinneringskeuze."
      : pref ? `Gekozen: ${calendarPreferenceLabel(pref)}. Bij Apple en ICS kun je per afspraak maximaal twee herinneringen kiezen.` : "Bij de eerste afspraak vraagt Hogeterpjes welke agenda je gebruikt.";
  }
}
function selectedReminderMinutes(){
  return [Number(calendarReminder1.value),Number(calendarReminder2.value)].filter((x,i,a)=>x>=0&&a.indexOf(x)===i);
}
function createIcs(event,reminders=[]){
  const start=icsDatePart(event.date,event.startTime);
  const end=calendarEnd(event);
  const allDay=!event.startTime;
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Hogeterpjes//NL","CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT",`UID:${event.id}@hogeterpjes`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z")}`,`${allDay?"DTSTART;VALUE=DATE":"DTSTART"}:${start}`,`${allDay?"DTEND;VALUE=DATE":"DTEND"}:${end}`,`SUMMARY:${icsEscape(event.title||"Afspraak")}`,`DESCRIPTION:${icsEscape(event.note||"")}`,`LOCATION:${icsEscape(event.location||"")}`];
  reminders.forEach(reminder=>lines.push("BEGIN:VALARM",`TRIGGER:${reminder===0?"PT0M":`-PT${reminder}M`}`,"ACTION:DISPLAY",`DESCRIPTION:${icsEscape(event.title||"Afspraak")}`,"END:VALARM"));
  lines.push("END:VEVENT","END:VCALENDAR");
  return lines.join("\r\n");
}
function downloadIcs(event,openInstead=false,reminders=[]){
  const blob=new Blob([createIcs(event,reminders)],{type:"text/calendar;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  if(openInstead){ window.location.href=url; }
  else{
    const a=document.createElement("a"); a.href=url; a.download=`${safeFileName(event.title||"afspraak")}.ics`; document.body.appendChild(a); a.click(); a.remove();
  }
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function openGoogleCalendar(event){
  const allDay=!event.startTime;
  const dates=allDay ? `${icsDatePart(event.date)}/${calendarEnd(event)}` : `${icsDatePart(event.date,event.startTime)}/${calendarEnd(event)}`;
  const params=new URLSearchParams({action:"TEMPLATE",text:event.title||"Afspraak",dates,details:event.note||"",location:event.location||""});
  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`,"_blank","noopener");
}
let calendarEventId="",calendarEventVisibility="",calendarReminderMode="";
function continueAddToCalendar(preference){
  const event=agendaEventById(calendarEventId,calendarEventVisibility); if(!event)return;
  if(preference==="google"){ openGoogleCalendar(event); return; }
  calendarReminderMode=preference;
  calendarEventTitle.textContent=event.title||"Afspraak";
  calendarReminder1.value="30"; calendarReminder2.value="-1";
  calendarReminderConfirmBtn.textContent=preference==="apple"?"Toevoegen aan Apple Agenda":"ICS-bestand maken";
  calendarReminderDialog.showModal();
}
window.addToCalendar=(id,visibility)=>{
  const event=agendaEventById(id,visibility); if(!event) return;
  calendarEventId=id; calendarEventVisibility=visibility;
  const pref=getCalendarPreference();
  if(!pref){ calendarChoiceDialog.showModal(); return; }
  continueAddToCalendar(pref);
};
window.chooseCalendarPreference=preference=>{
  setCalendarPreference(preference);
  calendarChoiceDialog.close();
  continueAddToCalendar(preference);
};
calendarReminderConfirmBtn.onclick=()=>{
  const event=agendaEventById(calendarEventId,calendarEventVisibility); if(!event)return;
  downloadIcs(event,calendarReminderMode==="apple",selectedReminderMinutes());
  calendarReminderDialog.close();
};
let agendaPhotoObjectUrl="";
function resetAgendaPhoto(){
  agendaPhotoData.value=""; agendaCameraInput.value=""; agendaGalleryInput.value="";
  agendaPhotoPreview.removeAttribute("src"); agendaPhotoPreviewWrap.classList.add("hidden");
  if(agendaPhotoObjectUrl){URL.revokeObjectURL(agendaPhotoObjectUrl);agendaPhotoObjectUrl="";}
}
function setAgendaPhoto(dataUrl){
  agendaPhotoData.value=dataUrl||"";
  if(dataUrl){agendaPhotoPreview.src=dataUrl;agendaPhotoPreviewWrap.classList.remove("hidden");}
  else resetAgendaPhoto();
}
function processAgendaPhoto(file){
  if(!file)return;
  if(!file.type.startsWith("image/")){alert("Kies een geldige foto of screenshot.");return;}
  if(file.size>12*1024*1024){alert("Kies een afbeelding kleiner dan 12 MB.");return;}
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const max=900,scale=Math.min(1,max/Math.max(img.width,img.height));
      const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
      canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
      setAgendaPhoto(canvas.toDataURL("image/jpeg",0.68));
    };
    img.onerror=()=>alert("Deze afbeelding kon niet worden geopend.");img.src=reader.result;
  };
  reader.readAsDataURL(file);
}
agendaCameraInput.onchange=()=>processAgendaPhoto(agendaCameraInput.files?.[0]);
agendaGalleryInput.onchange=()=>processAgendaPhoto(agendaGalleryInput.files?.[0]);
removeAgendaPhotoBtn.onclick=resetAgendaPhoto;

let agendaDetailId="",agendaDetailVisibility="";
window.openAgendaDetails=(id,visibility)=>{
  const event=agendaEventById(id,visibility); if(!event)return;
  agendaDetailId=id; agendaDetailVisibility=visibility;
  agendaDetailScope.textContent=agendaScopeLabel(event);
  agendaDetailTitle.textContent=event.title||"Afspraak";
  agendaDetailDate.textContent=formatAgendaDate(event);
  agendaDetailLocation.textContent=event.location?`📍 ${event.location}`:"";
  agendaDetailLocation.classList.toggle("hidden",!event.location);
  if(event.photo){agendaDetailPhoto.src=event.photo;agendaDetailPhoto.classList.remove("hidden");}else{agendaDetailPhoto.removeAttribute("src");agendaDetailPhoto.classList.add("hidden");}
  agendaDetailNote.textContent=event.note||"";
  agendaDetailNote.classList.toggle("hidden",!event.note);
  agendaDetailDialog.showModal();
};
window.editAgendaFromDetails=()=>{
  const event=agendaEventById(agendaDetailId,agendaDetailVisibility); if(!event)return;
  agendaDetailDialog.close();
  agendaForm.reset();
  agendaEditId.value=event.id;
  agendaEditVisibility.value=event.visibility;
  agendaDialogTitle.textContent="Afspraak wijzigen";
  agendaForm.elements.title.value=event.title||"";
  agendaForm.elements.date.value=event.date||"";
  agendaForm.elements.startTime.value=event.startTime||"";
  agendaForm.elements.endTime.value=event.endTime||"";
  agendaForm.elements.visibility.value=event.visibility||"private";
  fillAgendaHouseholds();
  agendaForm.elements.householdId.value=event.householdId||"";
  if(window.agendaSelectedPeopleChecks){
    const selected=new Set(Array.isArray(event.visibleTo)?event.visibleTo:[]);
    agendaSelectedPeopleChecks.querySelectorAll('input[name="visibleTo"]').forEach(input=>input.checked=selected.has(input.value));
  }
  agendaForm.elements.location.value=event.location||"";
  setAgendaPhoto(event.photo||"");
  agendaForm.elements.note.value=event.note||"";
  agendaDialog.showModal();
};

addAgendaBtn.onclick=()=>{
  agendaForm.reset();
  agendaEditId.value="";
  agendaEditVisibility.value="";
  agendaDialogTitle.textContent="Afspraak toevoegen";
  resetAgendaPhoto();
  agendaForm.elements.date.value=new Date().toISOString().slice(0,10);
  fillAgendaHouseholds();
  agendaDialog.showModal();
};

agendaVisibility.onchange=()=>{
  fillAgendaHouseholds();
  if(agendaVisibility.value==="selected"){
    const checks=[...agendaSelectedPeopleChecks.querySelectorAll('input[name="visibleTo"]')];
    if(!checks.some(x=>x.checked)){
      const own=checks.find(x=>x.value===currentPersonName()); if(own) own.checked=true;
    }
  }
};
if(window.defaultCalendarSelect){defaultCalendarSelect.onchange=()=>setCalendarPreference(defaultCalendarSelect.value);}
agendaTypeFilter.onchange=renderAgenda;
agendaHouseholdFilter.onchange=renderAgenda;
if(window.togglePastAgendaBtn) togglePastAgendaBtn.onclick=()=>{showPastAgenda=!showPastAgenda;renderAgenda();};

agendaForm.onsubmit=async e=>{
  e.preventDefault();
  if(agendaSaveInProgress) return;
  agendaSaveInProgress=true;
  const submitBtn=agendaForm.querySelector('button[type="submit"]');
  const originalSubmitText=submitBtn?.textContent || "Opslaan";
  if(submitBtn){ submitBtn.disabled=true; submitBtn.textContent="Bezig met opslaan…"; }
  const f=new FormData(agendaForm);
  const visibility=f.get("visibility");
  const visibleTo=visibility==="selected" ? f.getAll("visibleTo").map(String) : [];
  if(visibility==="selected" && !visibleTo.length){
    agendaSaveInProgress=false;
    if(submitBtn){ submitBtn.disabled=false; submitBtn.textContent=originalSubmitText; }
    showSaveWarning("Kies minimaal één persoon die deze afspraak mag zien.");
    return;
  }

  const editId=agendaEditId.value;
  const originalVisibility=agendaEditVisibility.value;
  const original=editId ? agendaEventById(editId,originalVisibility) : null;
  const event={
    id:editId || crypto.randomUUID(),
    title:String(f.get("title")||"").trim(),
    date:f.get("date"),
    startTime:f.get("startTime"),
    endTime:f.get("endTime"),
    visibility,
    householdId:visibility==="household" ? f.get("householdId") : "",
    visibleTo,
    location:String(f.get("location")||"").trim(),
    photo:agendaPhotoData.value||"",
    note:String(f.get("note")||"").trim(),
    createdBy:original?.createdBy || currentUser?.uid || "",
    createdByName:original?.createdByName || currentPersonName(),
    createdAt:original?.createdAt || new Date().toISOString(),
    updatedAt:new Date().toISOString(),
    updatedByName:currentPersonName()
  };

  try{
    if(visibility==="private"){
      if(editId && originalVisibility!=="private" && original) await deleteSharedAgendaRecord(original);
      const privateEvents=loadPrivateEvents().filter(x=>x.id!==editId); privateEvents.push(event); savePrivateEvents(privateEvents); renderAgenda();
      setSyncStatus("✓ Privé-afspraak opgeslagen op dit toestel");
    }else{
      if(editId && originalVisibility==="private") savePrivateEvents(loadPrivateEvents().filter(x=>x.id!==editId));
      if(editId && originalVisibility!=="private" && originalVisibility!==visibility && original) await deleteSharedAgendaRecord(original);
      await saveSharedAgendaRecord(event,originalVisibility!=="private"?original:null);
      data.events=(data.events||[]).filter(x=>x.id!==event.id); data.events.push(event); renderAgenda(); renderHome();
    }
    agendaDialog.close(); resetAgendaPhoto();
    showSaveWarning("✓ Afspraak opgeslagen");
  }catch(error){
    console.error(error);
    showSaveWarning(`De afspraak is niet opgeslagen${error?.message?`: ${error.message}`:""}. Probeer opnieuw.`);
  }finally{
    agendaSaveInProgress=false;
    if(submitBtn){ submitBtn.disabled=false; submitBtn.textContent=originalSubmitText; }
  }
};

window.deleteAgendaEvent=async (id,visibility)=>{
  if(agendaDeleteInProgress.has(id)) return;
  if(!confirm("Deze afspraak verwijderen?")) return;

  if(visibility==="private"){
    savePrivateEvents(loadPrivateEvents().filter(e=>e.id!==id));
    renderAgenda();
    renderHome();
    showSaveWarning("✓ Afspraak verwijderd");
    return;
  }

  const record=(data.events||[]).find(e=>e.id===id); if(!record)return;
  agendaDeleteInProgress.add(id);
  try{
    await deleteSharedAgendaRecord(record);
    data.events=(data.events||[]).filter(e=>e.id!==id);
    localStorage.setItem(KEY,JSON.stringify(data));
    renderAgenda();
    renderHome();
    showSaveWarning("✓ Afspraak verwijderd");
  }catch(error){
    console.error("Afspraak verwijderen mislukt",error);
    showSaveWarning(`Verwijderen mislukt${error?.message?`: ${error.message}`:""}. De afspraak is niet verwijderd.`);
  }finally{
    agendaDeleteInProgress.delete(id);
  }
};

if(window.addTodoBtn) addTodoBtn.onclick=()=>openTodoDialog();
if(window.todoShowCompleted) todoShowCompleted.onchange=renderPrivateTodos;
if(window.todoForm) todoForm.onsubmit=async e=>{
  e.preventDefault();
  const id=todoEditId.value || crypto.randomUUID();
  const original=(privateTodos||[]).find(t=>t.id===id);
  const record={
    id,title:todoTitle.value.trim(),note:todoNote.value.trim(),date:todoDate.value,time:todoTime.value,
    priority:todoPriority.value||"normal",completed:original?.completed||false,
    createdAt:original?.createdAt||firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  const button=todoForm.querySelector('button[type="submit"]'); const label=button.textContent;
  button.disabled=true; button.textContent="Bezig met opslaan…";
  try{ await privateTodosCollection().doc(id).set(record,{merge:true}); todoDialog.close(); showSaveWarning("✓ Taak opgeslagen"); }
  catch(error){ console.error(error); showSaveWarning(`Taak opslaan mislukt${error?.message?`: ${error.message}`:""}.`); }
  finally{ button.disabled=false; button.textContent=label; }
};

function openNewRecipeDialog(){
  recipeForm.reset();
  recipeEditId.value="";
  recipeDialogTitle.textContent="Recept toevoegen";
  recipeSaveBtn.textContent="Recept opslaan";
  deleteRecipeBtn.classList.add("hidden");
  resetRecipePhoto();
  resetIngredientEditor();
  fillSelects();
  recipeAuthor.value=currentPersonName() || recipeAuthor.value;
  recipeDialog.showModal();
}

addRecipeBtn.onclick=openNewRecipeDialog;
function openWishDialog(id=""){
  fillSelects(); wishForm.reset(); resetWishPhoto();
  const wish=id ? data.wishes.find(w=>w.id===id) : null;
  wishEditId.value=wish?.id || ""; wishDialogTitle.textContent=wish ? "Wens bewerken" : "Wens toevoegen"; wishPerson.value=currentPersonName();
  if(wish && canManageWish(wish)){ wishForm.elements.occasion.value=wish.occasion||"Verjaardag"; wishForm.elements.title.value=wish.title||""; wishForm.elements.price.value=wish.price||""; wishForm.elements.link.value=wish.link||""; wishForm.elements.note.value=wish.note||""; if(wish.photo) setWishPhoto(wish.photo); }
  wishDialog.showModal();
}
window.openWishDialog=openWishDialog;
addWishBtn.onclick=openWishDialog;
document.querySelector('[data-action="add-recipe"]').onclick=()=>setTimeout(openNewRecipeDialog,150);
document.querySelector('[data-action="add-wish"]').onclick=()=>setTimeout(openWishDialog,150);

addIngredientRowBtn.onclick=()=>{
  addIngredientRow();
  const newest=ingredientRows.lastElementChild;
  newest?.scrollIntoView({behavior:"smooth",block:"center"});
  newest?.querySelector(".ingredient-name")?.focus();
};

recipeForm.onsubmit=e=>{
  e.preventDefault();
  const f=new FormData(recipeForm);
  const ingredients=collectIngredientRows();

  if(!validateIngredientRows(ingredients)) return;

  const editId=recipeEditId.value;
  const existing=editId ? data.recipes.find(r=>r.id===editId) : null;
  const now=new Date().toISOString();
  const recipe={
    id:existing?.id || crypto.randomUUID(),
    name:String(f.get("name")||"").trim(),
    servings:Number(f.get("servings")),
    photo:recipePhotoData.value,
    ingredients,
    steps:String(f.get("steps")||"").split("\n").map(x=>x.trim()).filter(Boolean),
    author:f.get("author"),
    createdAt:existing?.createdAt || now,
    createdBy:existing?.createdBy || currentPersonName(),
    updatedAt:now,
    updatedBy:currentPersonName()
  };

  if(existing){
    Object.assign(existing,recipe);
  }else{
    data.recipes.unshift(recipe);
  }

  recipeForm.reset();
  recipeEditId.value="";
  resetRecipePhoto();
  resetIngredientEditor();
  recipeDialog.close();
  saveData();
};

window.editRecipe=id=>{
  const r=data.recipes.find(x=>x.id===id); if(!r)return;
  recipeForm.reset();
  fillSelects();
  recipeEditId.value=r.id;
  recipeDialogTitle.textContent="Recept bewerken";
  recipeSaveBtn.textContent="Wijzigingen opslaan";
  deleteRecipeBtn.classList.remove("hidden");
  recipeForm.elements.name.value=r.name || "";
  recipeForm.elements.servings.value=Number(r.servings)||4;
  recipeForm.elements.steps.value=(r.steps||[]).join("\n");
  recipeForm.elements.author.value=r.author || currentPersonName();
  if(r.photo) setRecipePhoto(r.photo); else resetRecipePhoto();
  resetIngredientEditor((r.ingredients||[]).map(normalizeIngredient));
  if(recipeViewDialog.open) recipeViewDialog.close();
  recipeDialog.showModal();
};

deleteRecipeBtn.onclick=()=>{
  const id=recipeEditId.value;
  const r=data.recipes.find(x=>x.id===id); if(!r)return;
  if(!confirm(`Recept “${r.name}” definitief verwijderen?`)) return;
  data.recipes=data.recipes.filter(x=>x.id!==id);
  recipeDialog.close();
  recipeForm.reset();
  recipeEditId.value="";
  resetRecipePhoto();
  resetIngredientEditor();
  saveData();
};
wishForm.onsubmit=e=>{
  e.preventDefault(); const f=new FormData(wishForm); const person=wishPerson.value || currentPersonName();
  if(!person){ alert("Je account is nog niet aan een familielid gekoppeld."); return; }
  const editId=wishEditId.value; const existing=editId ? data.wishes.find(w=>w.id===editId) : null; if(existing && !canManageWish(existing)) return;
  const record={id:existing?.id||crypto.randomUUID(),person,occasion:f.get("occasion"),title:f.get("title"),price:f.get("price"),link:f.get("link"),note:f.get("note"),photo:wishPhotoData.value,createdBy:existing?.createdBy||currentUser?.uid||"",addedByName:existing?.addedByName||currentPersonName(),createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(existing) Object.assign(existing,record); else data.wishes.unshift(record);
  wishForm.reset(); wishEditId.value=""; resetWishPhoto(); wishDialog.close(); saveData();
};



if(window.addGiftEventBtn) addGiftEventBtn.onclick=()=>openGiftEventDialog();
if(window.giftEventOccasion) giftEventOccasion.onchange=updateGiftRecipientMode;
if(window.giftEventForm) giftEventForm.onsubmit=e=>{
  e.preventDefault();
  const recipients=giftEventOccasion.value==='Verjaardag'?[giftBirthdayRecipient.value]:[...giftRecipientChecks.querySelectorAll('input:checked')].map(x=>x.value);
  const buyers=[...giftBuyerChecks.querySelectorAll('input:checked')].map(x=>x.value);
  if(!recipients.length){giftEventMessage.textContent="Kies minimaal één persoon voor wie de cadeaus zijn.";return;}
  const filteredBuyers=buyers.filter(x=>!recipients.includes(x)); if(!filteredBuyers.length){giftEventMessage.textContent="Kies minimaal één koper die zelf geen cadeau krijgt.";return;}
  data.giftEvents=data.giftEvents||[]; const id=giftEventEditId.value; const existing=data.giftEvents.find(x=>x.id===id);
  const record={id:existing?.id||crypto.randomUUID(),name:giftEventName.value.trim(),occasion:giftEventOccasion.value,date:giftEventDate.value,budget:giftEventBudget.value,recipients,buyers:filteredBuyers,claims:existing?.claims||{},ideas:existing?.ideas||[],createdByUid:existing?.createdByUid||currentUser?.uid||"",createdByName:existing?.createdByName||currentPersonName(),createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(existing) Object.assign(existing,record); else data.giftEvents.push(record);
  giftEventDialog.close(); saveData();
};
if(window.deleteGiftEventBtn) deleteGiftEventBtn.onclick=()=>{
  const event=(data.giftEvents||[]).find(x=>x.id===giftEventEditId.value); if(!event||!giftEventCanManage(event))return;
  if(!confirm(`Cadeau-evenement “${event.name}” verwijderen?`))return; data.giftEvents=data.giftEvents.filter(x=>x.id!==event.id); giftEventDialog.close(); saveData();
};


function setGiftIdeaPhoto(value=""){
  giftIdeaPhotoData.value=value;
  if(value){ giftIdeaPhotoPreview.src=value; giftIdeaPhotoPreviewWrap.classList.remove("hidden"); }
  else{ giftIdeaPhotoPreview.removeAttribute("src"); giftIdeaPhotoPreviewWrap.classList.add("hidden"); }
}
function processGiftIdeaPhoto(file){
  if(!file) return;
  if(!file.type.startsWith("image/")){ giftIdeaMessage.textContent="Kies een geldige foto of screenshot."; return; }
  if(file.size>10*1024*1024){ giftIdeaMessage.textContent="Kies een afbeelding kleiner dan 10 MB."; return; }
  const reader=new FileReader();
  reader.onload=()=>{ const img=new Image(); img.onload=()=>{ const max=700,scale=Math.min(1,max/Math.max(img.width,img.height)); const canvas=document.createElement("canvas"); canvas.width=Math.max(1,Math.round(img.width*scale)); canvas.height=Math.max(1,Math.round(img.height*scale)); canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height); setGiftIdeaPhoto(canvas.toDataURL("image/jpeg",0.76)); }; img.src=reader.result; };
  reader.readAsDataURL(file);
}

let giftIdeaEventId="";
window.openGiftIdeaDialog=(eventId="",ideaId="",presetPerson="")=>{
  const event=eventId?(data.giftEvents||[]).find(x=>x.id===eventId):null;
  const idea=ideaId?(privateGiftIdeas||[]).find(x=>x.id===ideaId):null;
  giftIdeaEventId=eventId||idea?.eventId||""; giftIdeaForm.reset(); giftIdeaEditId.value=idea?.id||"";
  const allowedPeople=event?.recipients?.length?event.recipients:data.family.map(p=>p.name);
  const selected=idea?privateIdeaRecipients(idea):(presetPerson?[presetPerson]:[]);
  giftIdeaRecipientChecks.innerHTML=allowedPeople.map(name=>`<label class="member-check"><input type="checkbox" value="${escapeHtml(name)}" ${selected.includes(name)?'checked':''}><span>${escapeHtml(name)}</span></label>`).join('');
  giftIdeaTitle.value=idea?.title||""; giftIdeaPrice.value=idea?.price||""; giftIdeaLink.value=idea?.link||""; giftIdeaNote.value=idea?.note||""; giftIdeaStatus.value=idea?.status||"idea"; giftIdeaFavorite.checked=!!idea?.favorite; setGiftIdeaPhoto(idea?.photo||"");
  giftIdeaMessage.textContent=""; giftIdeaDialog.querySelector('h3').textContent=idea?'Cadeautje voor iemand bewerken':'Cadeautje voor iemand toevoegen'; giftIdeaDialog.showModal();
};
window.deletePrivateGiftIdea=async id=>{ const collection=privateGiftIdeasCollection(); if(!collection)return; if(!confirm("Dit cadeautje verwijderen?"))return; try{await collection.doc(id).delete();}catch(err){alert(err.message||"Verwijderen mislukt.");} };
window.setPrivateGiftIdeaStatus=async(id,status)=>{const c=privateGiftIdeasCollection();if(!c)return;try{await c.doc(id).update({status,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});}catch(err){alert(err.message||'Status aanpassen mislukt.');}};
if(window.giftIdeaForm) giftIdeaForm.onsubmit=async e=>{
  e.preventDefault(); const collection=privateGiftIdeasCollection(); if(!collection){giftIdeaMessage.textContent="Log opnieuw in om een privé-idee op te slaan.";return;}
  const recipients=[...giftIdeaRecipientChecks.querySelectorAll('input:checked')].map(x=>x.value); if(!recipients.length){giftIdeaMessage.textContent='Kies minimaal één familielid.';return;}
  const payload={eventId:giftIdeaEventId||"",recipients,person:recipients[0],title:giftIdeaTitle.value.trim(),price:giftIdeaPrice.value,link:giftIdeaLink.value.trim(),photo:giftIdeaPhotoData.value||"",note:giftIdeaNote.value.trim(),status:giftIdeaStatus.value,favorite:giftIdeaFavorite.checked,ownerUid:currentUser.uid,ownerName:currentPersonName(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
  try{ if(giftIdeaEditId.value) await collection.doc(giftIdeaEditId.value).update(payload); else await collection.add({...payload,createdAt:firebase.firestore.FieldValue.serverTimestamp()}); giftIdeaDialog.close(); }catch(err){console.error(err);giftIdeaMessage.textContent=err.message||"Opslaan mislukt.";}
};
if(window.giftIdeaCameraInput) giftIdeaCameraInput.onchange=()=>processGiftIdeaPhoto(giftIdeaCameraInput.files?.[0]);
if(window.giftIdeaGalleryInput) giftIdeaGalleryInput.onchange=()=>processGiftIdeaPhoto(giftIdeaGalleryInput.files?.[0]);
if(window.removeGiftIdeaPhotoBtn) removeGiftIdeaPhotoBtn.onclick=()=>setGiftIdeaPhoto("");
if(window.addPrivateGiftIdeaBtn) addPrivateGiftIdeaBtn.onclick=()=>openGiftIdeaDialog();
if(window.privateGiftIdeaSearch) privateGiftIdeaSearch.oninput=renderPrivateGiftIdeasPage;

function normalizeProductKey(p){
  return [p.name,p.brand,p.amount,p.unit].map(x=>String(x||"").trim().toLowerCase()).join("|");
}
function refreshStoreOptions(){
  if(!window.storeOptions) return;
  storeOptions.innerHTML=(data.stores||[]).map(s=>`<option value="${escapeHtml(s)}"></option>`).join("");
}
function setProductPhoto(value=""){
  productPhotoData.value=value;
  if(value){ productPhotoPreview.src=value; productPhotoPreviewWrap.classList.remove("hidden"); }
  else { productPhotoPreview.removeAttribute("src"); productPhotoPreviewWrap.classList.add("hidden"); }
}
function compressProductPhoto(file){
  if(!file||!file.type.startsWith("image/")) return;
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const max=500, scale=Math.min(1,max/Math.max(img.width,img.height));
      const canvas=document.createElement("canvas");
      canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale);
      canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
      setProductPhoto(canvas.toDataURL("image/jpeg",0.72));
    };
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
}
function renderStores(){
  storesList.innerHTML=(data.stores||[]).map((s,i)=>`<div class="store-row"><span>${escapeHtml(s)}</span><button type="button" onclick="removeStore(${i})">🗑️</button></div>`).join("");
}
window.removeStore=i=>{
  const s=data.stores[i];
  if(!confirm(`Winkel "${s}" uit de keuzelijst verwijderen?`)) return;
  data.stores.splice(i,1); renderStores(); saveData();
};
manageStoresBtn.onclick=()=>{renderStores();newStoreName.value="";storesDialog.showModal();};
addStoreBtn.onclick=()=>{
  const s=newStoreName.value.trim();
  if(!s) return;
  if(data.stores.some(x=>x.toLowerCase()===s.toLowerCase())){alert("Deze winkel bestaat al.");return;}
  data.stores.push(s);data.stores.sort((a,b)=>a.localeCompare(b,"nl"));newStoreName.value="";renderStores();saveData();
};
productPhotoInput.onchange=()=>compressProductPhoto(productPhotoInput.files[0]);
removeProductPhotoBtn.onclick=()=>setProductPhoto("");

function openProductDialog(id=""){
  const p=(data.products||[]).find(x=>x.id===id);
  productEditId.value=p?.id||"";
  productDialogTitle.textContent=p?"Product bewerken":"Product toevoegen";
  productName.value=p?.name||"";
  productBrand.value=p?.brand||"";
  productAmount.value=p?.amount||"";
  productUnit.value=p?.unit||"";
  productCategory.value=p?.category||"Overig";
  productStore.value=p?.store||"";
  productOtherStores.value=p?.otherStores||"";
  productPrice.value=p?.price||"";
  productNote.value=p?.note||"";
  productFavorite.checked=!!p?.favorite;
  productStock.value=Number(p?.stock||0);
  productMinStock.value=Number(p?.minStock||0);
  productPhotoInput.value="";
  setProductPhoto(p?.photo||"");
  deleteProductBtn.classList.toggle("hidden",!p);
  productDialog.showModal();
}
addProductBtn.onclick=()=>openProductDialog("");
window.editProduct=id=>openProductDialog(id);
productForm.onsubmit=e=>{
  e.preventDefault();
  const id=productEditId.value;
  const existing=(data.products||[]).find(p=>p.id===id);
  const record={
    id:id||crypto.randomUUID(),
    name:productName.value.trim(),
    brand:productBrand.value.trim(),
    amount:productAmount.value.trim(),
    unit:productUnit.value,
    category:productCategory.value,
    store:productStore.value.trim(),
    otherStores:productOtherStores.value.trim(),
    price:productPrice.value,
    note:productNote.value.trim(),
    favorite:productFavorite.checked,
    stock:Number(productStock.value||0),
    minStock:Number(productMinStock.value||0),
    photo:productPhotoData.value||"",
    timesUsed:existing?.timesUsed||0,
    lastUsedAt:existing?.lastUsedAt||"",
    updatedBy:currentPersonName(),
    updatedAt:new Date().toISOString()
  };
  if(!record.name) return;
  data.products=data.products||[];
  const duplicate=data.products.find(p=>p.id!==id && normalizeProductKey(p)===normalizeProductKey(record));
  if(duplicate){
    const useExisting=confirm(`Dit product bestaat mogelijk al als "${productLabel(duplicate)}".\n\nDruk op OK om het bestaande product te openen, of Annuleren om toch apart op te slaan.`);
    if(useExisting){ openProductDialog(duplicate.id); return; }
  }
  const pos=data.products.findIndex(p=>p.id===id);
  if(pos>=0) data.products[pos]=record; else data.products.unshift(record);
  if(record.store && !data.stores.some(s=>s.toLowerCase()===record.store.toLowerCase())) data.stores.push(record.store);
  productDialog.close();
  addNotification({text:`${currentPersonName()} heeft product “${record.name}” ${pos>=0?"aangepast":"toegevoegd"}.`});
  saveData();
};
deleteProductBtn.onclick=()=>{
  const id=productEditId.value;
  const p=(data.products||[]).find(x=>x.id===id);
  if(!p||!confirm(`Product "${p.name}" verwijderen?`)) return;
  data.products=data.products.filter(x=>x.id!==id);
  productDialog.close();
  saveData();
};
window.addProductToGroceries=id=>{
  const p=(data.products||[]).find(x=>x.id===id);
  if(!p||!currentHousehold) return;
  p.timesUsed=Number(p.timesUsed||0)+1;
  p.lastUsedAt=new Date().toISOString();
  data.groceries.push({id:crypto.randomUUID(),householdId:currentHousehold,text:productLabel(p),store:p.store||"",productId:p.id,done:false,addedBy:currentPersonName(),addedAt:new Date().toISOString()});
  addNotification({householdId:currentHousehold,text:`${currentPersonName()} heeft “${productLabel(p)}” toegevoegd aan de boodschappenlijst${p.store?` voor ${p.store}`:""}.`});
  saveData();
};
productSearch.oninput=renderProducts;
productStoreFilter.onchange=renderProducts;
productCategoryFilter.onchange=renderProducts;

recipeSearch.oninput=renderRecipes; wishPersonFilter.onchange=renderWishes; wishOccasionFilter.onchange=renderWishes;
groceryHousehold.onchange=()=>{currentHousehold=groceryHousehold.value;renderGroceries();};

function openSimple(title, fields, mode){
  simpleTitle.textContent=title; simpleMode=mode;
  simpleFields.innerHTML=fields; simpleDialog.showModal();
}
addGroceryBtn.onclick=()=>{
  const options=(data.products||[]).sort((a,b)=>(Number(b.favorite)-Number(a.favorite))||(Number(b.timesUsed||0)-Number(a.timesUsed||0))).map(p=>`<option value="${p.id}">${escapeHtml(productLabel(p))}${p.store?` — ${escapeHtml(p.store)}`:""}</option>`).join("");
  openSimple("Product toevoegen",`<label>Zoek of kies product<select name="productId"><option value="">Zelf invoeren</option>${options}</select></label><label>Of typ product<input name="text" list="productNameSuggestions" placeholder="Begin met typen..."></label><datalist id="productNameSuggestions">${(data.products||[]).map(p=>`<option value="${escapeHtml(productLabel(p))}"></option>`).join("")}</datalist><label>Winkel<input name="store" list="storeOptions" placeholder="Bijv. Jumbo"></label>`,"grocery");
};
addHouseholdBtn.onclick=()=>openHouseholdEditor("");
simpleForm.onsubmit=e=>{
  e.preventDefault(); const f=new FormData(simpleForm);
  if(simpleMode==="editGrocery"){
    const g=data.groceries.find(x=>x.id===String(f.get("id")||""));
    if(g){
      g.text=String(f.get("text")||"").trim();
      g.store=String(f.get("store")||"").trim();
      g.note=String(f.get("note")||"").trim();
      addNotification({householdId:g.householdId,text:`${currentPersonName()} heeft “${g.text}” aangepast op de boodschappenlijst.`});
    }
  } else if(simpleMode==="grocery"){
    const selected=String(f.get("productId")||"");
    const product=(data.products||[]).find(p=>p.id===selected);
    const text=(product?productLabel(product):String(f.get("text")||"").trim());
    if(!text){ alert("Kies of typ eerst een product."); return; }
    const store=String(f.get("store")||product?.store||"").trim();
    if(product){ product.timesUsed=Number(product.timesUsed||0)+1; product.lastUsedAt=new Date().toISOString(); }
    data.groceries.push({id:crypto.randomUUID(),householdId:currentHousehold,text,store,productId:product?.id||"",done:false,addedBy:currentPersonName(),addedAt:new Date().toISOString()});
    addNotification({householdId:currentHousehold,text:`${currentPersonName()} heeft “${text}” toegevoegd aan de boodschappenlijst${store?` voor ${store}`:""}.`});
  }
  simpleForm.reset(); simpleDialog.close(); saveData();
};

window.deleteWish=id=>{
  const wish=data.wishes.find(w=>w.id===id);
  if(!wish || !canManageWish(wish)) return;
  if(!confirm(`Wens "${wish.title}" verwijderen?`)) return;
  data.wishes=data.wishes.filter(w=>w.id!==id);
  saveData();
};

window.toggleGrocery=id=>{
  const g=data.groceries.find(x=>x.id===id);
  if(!g) return;
  const p=(data.products||[]).find(x=>x.id===g.productId);
  if(p && !g.stockProcessed){ p.stock=Number(p.stock||0)+1; g.stockProcessed=true; }
  addNotification({householdId:g.householdId,text:`${currentPersonName()} heeft “${g.text}” afgevinkt.`});
  data.groceries=data.groceries.filter(x=>x.id!==id);
  saveData();
};
window.deleteGrocery=id=>{const g=data.groceries.find(x=>x.id===id); if(g)addNotification({householdId:g.householdId,text:`${currentPersonName()} heeft “${g.text}” verwijderd van de boodschappenlijst.`}); data.groceries=data.groceries.filter(x=>x.id!==id);saveData();};
window.editGrocery=id=>{
  const g=data.groceries.find(x=>x.id===id); if(!g)return;
  const stores=(data.stores||[]).map(s=>`<option value="${escapeHtml(s)}"></option>`).join("");
  openSimple("Boodschap bewerken",`<input type="hidden" name="id" value="${g.id}"><label>Product<input name="text" required value="${escapeHtml(g.text)}"></label><label>Winkel<input name="store" list="groceryStoreOptions" value="${escapeHtml(g.store||"")}"></label><datalist id="groceryStoreOptions">${stores}</datalist><label>Notitie<input name="note" value="${escapeHtml(g.note||"")}" placeholder="Bijv. 2 pakken"></label>`,"editGrocery");
};

let pendingRecipeGroceriesId="";
window.addRecipeToGroceries=id=>{
  const r=data.recipes.find(x=>x.id===id);
  if(!r) return;
  const households=accessibleHouseholds();
  if(!households.length){ alert("Je account is nog niet aan een huishouden gekoppeld."); return; }
  pendingRecipeGroceriesId=id;
  recipeGroceriesTitle.textContent=`Producten kiezen voor ${r.name}`;
  recipeGroceriesHousehold.innerHTML=households.map(h=>`<option value="${h.id}">${escapeHtml(h.name)}</option>`).join("");
  recipeGroceriesHousehold.value=households.some(h=>h.id===currentHousehold)?currentHousehold:households[0].id;
  recipeGroceriesIngredients.innerHTML=r.ingredients.map((raw,index)=>{
    const i=normalizeIngredient(raw);
    const text=[i.amount,i.unit,i.name].filter(Boolean).join(" ");
    return `<label class="recipe-grocery-choice"><input type="checkbox" name="ingredient" value="${index}" checked><span>${escapeHtml(text)}</span></label>`;
  }).join("");
  recipeGroceriesError.textContent="";
  recipeGroceriesDialog.showModal();
};
selectAllRecipeIngredients.onclick=()=>recipeGroceriesIngredients.querySelectorAll('input[type="checkbox"]').forEach(x=>x.checked=true);
selectNoRecipeIngredients.onclick=()=>recipeGroceriesIngredients.querySelectorAll('input[type="checkbox"]').forEach(x=>x.checked=false);
recipeGroceriesForm.onsubmit=e=>{
  e.preventDefault();
  const r=data.recipes.find(x=>x.id===pendingRecipeGroceriesId);
  const householdId=recipeGroceriesHousehold.value;
  const selected=[...recipeGroceriesIngredients.querySelectorAll('input[type="checkbox"]:checked')].map(x=>Number(x.value));
  if(!r || !householdId) return;
  if(!selected.length){ recipeGroceriesError.textContent="Kies minimaal één product."; return; }
  selected.forEach(index=>{
    const i=normalizeIngredient(r.ingredients[index]);
    const text=[i.amount,i.unit,i.name].filter(Boolean).join(" ");
    const match=(data.products||[]).find(p=>String(p.name).toLowerCase()===String(i.name).toLowerCase());
    data.groceries.push({id:crypto.randomUUID(),householdId,text,store:match?.store||"",productId:match?.id||"",done:false,source:`Recept ${r.name}`,addedBy:currentPersonName(),addedAt:new Date().toISOString()});
  });
  currentHousehold=householdId;
  addNotification({householdId,text:`${currentPersonName()} heeft ${selected.length} product${selected.length===1?"":"en"} van ${r.name} toegevoegd aan de boodschappenlijst.`});
  recipeGroceriesDialog.close();
  pendingRecipeGroceriesId="";
  saveData();
  navigate("boodschappen");
};
window.openRecipe=id=>{
  const r=data.recipes.find(x=>x.id===id); if(!r)return;
  let portions=r.servings;
  const render=()=>{
    viewRecipeTitle.textContent=r.name;
    viewRecipeBody.innerHTML=`${r.photo?`<img class="recipe-photo" src="${r.photo}" alt="">`:""}
      <div class="portion-control"><button id="minusPortion">−</button><strong>Voor ${portions} personen</strong><button id="plusPortion">+</button></div>
      <div class="recipe-view-actions"><button class="secondary-btn wide" type="button" onclick="editRecipe('${r.id}')">✏️ Recept bewerken</button></div>
      ${r.updatedAt?`<p class="meta">Laatst gewijzigd ${new Intl.DateTimeFormat("nl-NL",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(r.updatedAt))}${r.updatedBy?` door ${escapeHtml(r.updatedBy)}`:""}</p>`:""}
      <h3>Ingrediënten</h3><ul class="ingredient-list">${r.ingredients.map(rawIngredient=>{
        const i=normalizeIngredient(rawIngredient);
        const factor=portions/Math.max(1,Number(r.servings)||1);
        const amount=formatScaledAmount(i.amount,factor);
        const quantity=[amount,i.unit].filter(Boolean).join(" ");
        return `<li><input type="checkbox"><span>${quantity?`<strong>${quantity}</strong> `:""}${i.name}</span></li>`;
      }).join("")}</ul><h3>Bereiding</h3><ol class="steps">${r.steps.map(s=>`<li>${s}</li>`).join("")}</ol>`;
    minusPortion.onclick=()=>{if(portions>1){portions--;render();}}; plusPortion.onclick=()=>{portions++;render();};
  }; render(); recipeViewDialog.showModal();
};


function isAdmin(){ return (currentUser?.email || "").toLowerCase()===ADMIN_EMAIL; }

async function loadAdminSettings(){
  if(!db || !firebase.auth().currentUser) return;
  try{
    const ref=db.doc(ADMIN_DOC);
    const snap=await ref.get();
    if(snap.exists){
      const remote=snap.data();
      const accounts=Array.isArray(remote.accounts)?remote.accounts:[];
      const emailsFromAccounts=accounts
        .filter(a=>a && a.active!==false && a.email)
        .map(a=>String(a.email).trim().toLowerCase());
      const allowedEmails=Array.isArray(remote.allowedEmails)
        ? remote.allowedEmails.map(x=>String(x).trim().toLowerCase())
        : emailsFromAccounts;
      if(!allowedEmails.includes(ADMIN_EMAIL)) allowedEmails.push(ADMIN_EMAIL);
      adminSettings={allowedEmails:Array.from(new Set(allowedEmails)),accounts};
      // v1.3.14: oudere settings-documenten automatisch aanvullen vanuit accounts.
      // Daardoor blijven Firebase-regels en accountbeheer dezelfde bron gebruiken.
      const needsMigration=!Array.isArray(remote.allowedEmails)
        || adminSettings.allowedEmails.length!==remote.allowedEmails.length;
      if(isAdmin() && needsMigration){
        await ref.set(adminSettings,{merge:true});
      }
    }else if((firebase.auth().currentUser.email||"").toLowerCase()===ADMIN_EMAIL){
      await ref.set(adminSettings);
    }
    const mapped=adminSettings.accounts?.find(a=>(a.email||"").toLowerCase()===(firebase.auth().currentUser.email||"").toLowerCase());
    if(mapped && currentUser){ currentUser.displayName=mapped.name; }
    renderProfile();
    renderAccountManagement();
  }catch(err){ console.warn("Accountinstellingen laden mislukt",err); }
}

async function saveAdminSettings(){
  if(!db || !isAdmin()) throw new Error("Alleen de beheerder kan dit wijzigen.");
  adminSettings.allowedEmails=adminSettings.accounts.filter(a=>a.active!==false && a.email).map(a=>a.email.toLowerCase());
  if(!adminSettings.allowedEmails.includes(ADMIN_EMAIL)) adminSettings.allowedEmails.push(ADMIN_EMAIL);
  await db.doc(ADMIN_DOC).set(adminSettings,{merge:false});
  renderAccountManagement();
}

function renderAccountManagement(){
  const adminVisible=isAdmin();
  document.querySelectorAll('.admin-only').forEach(el=>el.classList.toggle('visible',adminVisible));
  if(!window.inviteName || !window.accountList) return;
  inviteName.innerHTML=data.family.map(p=>`<option>${p.name}</option>`).join('');
  accountList.innerHTML=adminVisible ? (adminSettings.accounts||[]).map(a=>`<div class="account-row"><div><strong>${a.name}</strong><span>${a.email}</span><span class="status-invite">${a.active===false?'Toegang geblokkeerd':'Mag zelf een account maken'}</span></div><div class="account-actions">${a.email.toLowerCase()===ADMIN_EMAIL?'👑':`<button class="mini-btn" onclick="toggleAccountAccess('${a.email.replaceAll("'","\\'")}')">${a.active===false?'Activeren':'Blokkeren'}</button><button class="mini-btn" onclick="removeInvite('${a.email.replaceAll("'","\\'")}')">Verwijder</button>`}</div></div>`).join('') : '<p class="muted">Alleen Rinze kan accounts beheren.</p>';
}



window.openHouseholdEditor=id=>{
  if(!isAdmin()) return;

  const household=id ? data.households.find(h=>h.id===id) : null;
  householdEditId.value=household?.id || "";
  householdEditTitle.textContent=household ? "Huishouden bewerken" : "Huishouden toevoegen";
  householdEditName.value=household?.name || "";
  householdEditMessage.textContent="";

  householdMemberChecks.innerHTML=data.family.map(person=>`
    <label class="member-check">
      <input type="checkbox" value="${person.name}" ${household?.members?.includes(person.name)?"checked":""}>
      <span>${person.name}</span>
    </label>
  `).join("");

  deleteHouseholdBtn.classList.toggle("hidden",!household);
  householdEditDialog.showModal();
};

householdEditForm.onsubmit=e=>{
  e.preventDefault();
  if(!isAdmin()) return;

  const id=householdEditId.value;
  const name=householdEditName.value.trim();
  const members=[...householdMemberChecks.querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value);

  if(!name){
    householdEditMessage.textContent="Vul een naam in.";
    return;
  }
  if(!members.length){
    householdEditMessage.textContent="Kies minimaal één lid.";
    return;
  }
  if(data.households.some(h=>h.id!==id && h.name.toLowerCase()===name.toLowerCase())){
    householdEditMessage.textContent="Er bestaat al een huishouden met deze naam.";
    return;
  }

  if(id){
    const household=data.households.find(h=>h.id===id);
    if(!household) return;
    household.name=name;
    household.members=members;
  }else{
    data.households.push({
      id:crypto.randomUUID(),
      name,
      members
    });
  }

  householdEditDialog.close();
  saveData();
};

deleteHouseholdBtn.onclick=()=>{
  if(!isAdmin()) return;
  const id=householdEditId.value;
  const household=data.households.find(h=>h.id===id);
  if(!household) return;

  if(!confirm(`Huishouden "${household.name}" verwijderen? Weekmenu's, afspraken en boodschappen van dit huishouden worden ook verwijderd.`)){
    return;
  }

  data.households=data.households.filter(h=>h.id!==id);
  data.weekMenus=(data.weekMenus || []).filter(m=>m.householdId!==id);
  data.events=(data.events || []).filter(e=>e.householdId!==id);
  data.groceries=(data.groceries || []).filter(g=>g.householdId!==id);

  householdEditDialog.close();
  saveData();
};

window.openFamilyEditor=name=>{
  if(!isAdmin()) return;
  const member=data.family.find(p=>p.name===name);
  if(!member) return;
  familyEditOriginalName.value=member.name;
  familyEditName.value=member.name;
  familyEditBirth.value=member.birth;
  familyEditEmail.value=member.email||"";
  familyEditMessage.textContent="";
  familyEditDialog.showModal();
};

familyEditForm.onsubmit=e=>{
  e.preventDefault();
  if(!isAdmin()){
    familyEditMessage.textContent="Alleen Rinze kan familiegegevens aanpassen.";
    return;
  }
  const original=familyEditOriginalName.value;
  const member=data.family.find(p=>p.name===original);
  if(!member) return;

  const newName=familyEditName.value.trim();
  if(!newName){
    familyEditMessage.textContent="Vul een naam in.";
    return;
  }
  if(data.family.some(p=>p!==member && p.name.toLowerCase()===newName.toLowerCase())){
    familyEditMessage.textContent="Deze naam bestaat al.";
    return;
  }

  data.households.forEach(h=>{
    h.members=h.members.map(m=>m===original?newName:m);
  });
  if(adminSettings.accounts){
    adminSettings.accounts.forEach(a=>{
      if(a.name===original) a.name=newName;
    });
  }

  member.name=newName;
  member.birth=familyEditBirth.value;
  member.email=familyEditEmail.value.trim().toLowerCase();

  saveData();
  if(db && isAdmin()) saveAdminSettings().catch(err=>console.warn(err));
  familyEditDialog.close();
};

window.toggleAccountAccess=async email=>{
  const a=adminSettings.accounts.find(x=>x.email===email); if(!a)return;
  a.active=a.active===false?true:false;
  try{await saveAdminSettings();}catch(e){alert(e.message);}
};
window.removeInvite=async email=>{
  if(!confirm('Uitnodiging verwijderen?'))return;
  adminSettings.accounts=adminSettings.accounts.filter(x=>x.email!==email);
  try{await saveAdminSettings();}catch(e){alert(e.message);}
};

inviteForm.onsubmit=async e=>{
  e.preventDefault();
  const name=inviteName.value, email=inviteEmail.value.trim().toLowerCase();
  inviteMessage.textContent='Uitnodiging opslaan…';
  const existing=adminSettings.accounts.find(a=>a.email.toLowerCase()===email);
  if(existing){ existing.name=name; existing.active=true; }
  else adminSettings.accounts.push({name,email,active:true});
  const member=data.family.find(p=>p.name===name); if(member) member.email=email;
  try{
    await saveAdminSettings();
    saveData();
    inviteMessage.textContent=`Klaar. Stuur ${name} nu de link van Hogeterpjes. ${name} kiest zelf een wachtwoord.`;
    inviteForm.reset();
  }catch(err){ inviteMessage.textContent=err.message; }
};

showSignupBtn.onclick=()=>{ signupMessage.textContent=''; signupDialog.showModal(); };
forgotPasswordBtn.onclick=async()=>{
  const email=loginEmail.value.trim();
  if(!email){ loginMessage.textContent='Vul eerst je e-mailadres in.'; return; }
  try{ await auth.sendPasswordResetEmail(email); loginMessage.textContent='Er is een e-mail verstuurd waarmee je zelf een nieuw wachtwoord kiest.'; }
  catch(err){ loginMessage.textContent='De resetmail kon niet worden verstuurd. Controleer het e-mailadres.'; }
};
signupForm.onsubmit=async e=>{
  e.preventDefault();
  const email=signupEmail.value.trim().toLowerCase(), p1=signupPassword.value, p2=signupPassword2.value;
  if(p1!==p2){ signupMessage.textContent='De wachtwoorden zijn niet hetzelfde.'; return; }
  signupMessage.textContent='Uitnodiging controleren…'; let result=null; signupVerificationInProgress=true;
  try{
    result=await auth.createUserWithEmailAndPassword(email,p1);
    const allowed=await verifyInvitedUser(result.user);
    if(!allowed){
      try{await result.user.delete();}catch(_){await auth.signOut();}
      signupVerificationInProgress=false;
      signupMessage.textContent='Je bent nog niet uitgenodigd voor deze familie. Vraag Rinze om jouw e-mailadres eerst bij Beheer toe te voegen.';
      return;
    }
    signupVerificationInProgress=false;
    signupDialog.close(); loginMessage.textContent='Account gemaakt. Je bent nu ingelogd.';
    showLoggedIn(provisionalProfile(result.user));
    loadAdminSettings().then(()=>loadUserProfile(result.user)).then(profile=>{currentUser=profile;renderAll();});
  }catch(err){
    signupVerificationInProgress=false;
    if(result?.user){try{await result.user.delete();}catch(_){try{await auth.signOut();}catch(__){}}}
    const msgs={"auth/email-already-in-use":"Voor dit e-mailadres bestaat al een account. Log hiermee in.","auth/weak-password":"Kies een wachtwoord van minimaal 6 tekens.","auth/invalid-email":"Dit e-mailadres is niet geldig."};
    signupMessage.textContent=msgs[err.code]||'Account aanmaken lukt niet. Controleer of Rinze dit e-mailadres heeft uitgenodigd.';
  }
};

profilePhotoInput.onchange=()=>{
  const file=profilePhotoInput.files?.[0];
  if(!file) return;
  if(file.size>3*1024*1024){
    alert("Kies een foto kleiner dan 3 MB.");
    profilePhotoInput.value="";
    return;
  }
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement("canvas");
      const size=320;
      canvas.width=size;
      canvas.height=size;
      const ctx=canvas.getContext("2d");
      const scale=Math.max(size/img.width,size/img.height);
      const w=img.width*scale,h=img.height*scale;
      ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
      localStorage.setItem(PROFILE_PHOTO_KEY,canvas.toDataURL("image/jpeg",0.82));
      renderProfile();
    };
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
};

removeProfilePhotoBtn.onclick=()=>{
  localStorage.removeItem(PROFILE_PHOTO_KEY);
  profilePhotoInput.value="";
  renderProfile();
};

themeBtn.onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("hogeterpjes-theme",document.body.classList.contains("dark")?"dark":"light");themeBtn.textContent=document.body.classList.contains("dark")?"☀️":"🌙";};
if(localStorage.getItem("hogeterpjes-theme")==="dark"){document.body.classList.add("dark");themeBtn.textContent="☀️";}
resetDataBtn.onclick=()=>{if(confirm("Standaardgegevens herstellen? Eigen recepten en wensen worden verwijderd.")){data=cloneDefaults();saveData();}};

profileBtn.onclick=()=>navigate("profiel");
logoutBtn.onclick=async()=>{
  if(auth){ await auth.signOut(); }
  if(cloudUnsubscribe){ cloudUnsubscribe(); cloudUnsubscribe=null; }
  if(vaultFilesUnsubscribe){ vaultFilesUnsubscribe(); vaultFilesUnsubscribe=null; }
  if(diaryUnsubscribe){ diaryUnsubscribe(); diaryUnsubscribe=null; }
  if(privateGiftIdeasUnsubscribe){ privateGiftIdeasUnsubscribe(); privateGiftIdeasUnsubscribe=null; }
  if(privateTodosUnsubscribe){ privateTodosUnsubscribe(); privateTodosUnsubscribe=null; }
  diaryEntries=[];
  privateGiftIdeas=[];
  privateTodos=[];
  cloudReady=false;
  currentUser=null;
  loginScreen.classList.remove("hidden");
  setSyncStatus("Nog niet ingelogd");
  renderProfile();
};

async function verifyInvitedUser(user){
  const email=(user?.email||"").trim().toLowerCase();
  if(email===ADMIN_EMAIL) return true;
  try{
    const snap=await db.doc(ADMIN_DOC).get();
    if(!snap.exists) return false;
    const settings=snap.data()||{};
    return (settings.accounts||[]).some(a=>a&&a.active!==false&&String(a.email||"").trim().toLowerCase()===email)
      || (settings.allowedEmails||[]).some(x=>String(x).trim().toLowerCase()===email);
  }catch(err){
    return false;
  }
}
function showLoggedIn(user){
  const firstOpen=!currentUser;
  currentUser=user;
  loginScreen.classList.add("hidden");
  loginMessage.textContent="";
  fillSelects();
  renderProfile();
  if(!accessibleHouseholds().some(h=>h.id===currentHousehold)) currentHousehold=accessibleHouseholds()[0]?.id || "";
  renderWishes();
  renderAgenda();
  renderWeekmenu();
  updateDiaryAccess();
  updateCalendarPreferenceUi();

  if(firstOpen){
    loadAdminSettings().finally(()=>{ subscribeToCloudData(); subscribeSharedCollections(); subscribePrivateGiftIdeas(); subscribePrivateTodos(); initVaultForCurrentUser(); initDiaryForCurrentUser(); });
  }
}

loginForm.onsubmit=async e=>{
  e.preventDefault();
  loginMessage.textContent="Bezig met inloggen…";

  if(!auth){
    loginMessage.textContent="Firebase kon niet worden gestart.";
    return;
  }

  try{
    const result=await withTimeout(
      auth.signInWithEmailAndPassword(
        loginEmail.value.trim(),
        loginPassword.value
      ),
      12000,
      "Firebase reageert niet op tijd"
    );

    loginMessage.textContent="Toegang controleren…";
  }catch(err){
    console.error("Firebase login error:", err.code, err.message);

    const messages={
      "auth/invalid-credential":"E-mailadres of wachtwoord is niet juist.",
      "auth/wrong-password":"Het wachtwoord is niet juist.",
      "auth/user-not-found":"Er bestaat geen account met dit e-mailadres.",
      "auth/invalid-email":"Dit is geen geldig e-mailadres.",
      "auth/user-disabled":"Dit account is uitgeschakeld.",
      "auth/too-many-requests":"Te vaak geprobeerd. Wacht even en probeer later opnieuw.",
      "auth/network-request-failed":"Geen goede internetverbinding. Probeer opnieuw.",
      "auth/unauthorized-domain":"Dit webadres is nog niet toegestaan in Firebase.",
    };

    loginMessage.textContent=
      messages[err.code] ||
      (err.message==="Firebase reageert niet op tijd"
        ? "Firebase reageert niet. Controleer internet en probeer opnieuw."
        : `Inloggen lukt niet (${err.code || "onbekende fout"}).`);
  }
};

async function loadUserProfile(user){
  const fallback=provisionalProfile(user);

  if(!db) return fallback;

  try{
    const ref=db.collection("profielen").doc(user.uid);
    const snap=await withTimeout(ref.get(),8000,"Profiel laden duurde te lang");

    if(snap.exists){
      return {uid:user.uid,email:user.email,...snap.data()};
    }

    const displayName=fallback.displayName;
    await withTimeout(ref.set({
      displayName,
      email:user.email || "",
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    }),8000,"Profiel opslaan duurde te lang");

    return {...fallback,displayName};
  }catch(err){
    console.warn("Profiel laden overgeslagen:",err);
    return fallback;
  }
}


// ===== Gezinskluis Rinze & Christa (v1.3.14) =====
const VAULT_ID="rinze-christa";
const VAULT_LIMIT_BYTES=5*1024*1024*1024;
const VAULT_MAX_FILE_BYTES=100*1024*1024;
const VAULT_CATEGORIES=[
  {name:"Documenten",icon:"📄",hint:"Algemene documenten"},
  {name:"Huis",icon:"🏠",hint:"Woning, energie en onderhoud"},
  {name:"Auto",icon:"🚗",hint:"APK, verzekering en onderhoud"},
  {name:"Caravan",icon:"🚐",hint:"Papieren en handleidingen"},
  {name:"Verzekeringen",icon:"🛡️",hint:"Polissen en correspondentie"},
  {name:"Garanties & bonnen",icon:"🧾",hint:"Aankoopbonnen en garanties"},
  {name:"Vakantie",icon:"✈️",hint:"Boekingen en reisdocumenten"},
  {name:"Overig",icon:"📂",hint:"Alles wat nergens anders past"}
];
let vaultFiles=[];
let vaultConfig=null;
let currentVaultCategory="";
let currentVaultSpecial="";
let selectedVaultUploadFile=null;

function normalizeEmail(value){ return String(value||"").trim().toLowerCase(); }
function isVaultPerson(){
  const name=(currentPersonName()||"").trim().toLowerCase();
  return isAdmin() || name==="rinze" || name==="christa";
}
function formatBytes(bytes){
  const n=Number(bytes)||0;
  if(n<1024) return `${n} B`;
  if(n<1024**2) return `${(n/1024).toLocaleString("nl-NL",{maximumFractionDigits:1})} KB`;
  if(n<1024**3) return `${(n/1024**2).toLocaleString("nl-NL",{maximumFractionDigits:2})} MB`;
  return `${(n/1024**3).toLocaleString("nl-NL",{minimumFractionDigits:2,maximumFractionDigits:2})} GB`;
}
function vaultIcon(file){
  const t=String(file.contentType||"");
  if(t.startsWith("image/")) return "🖼️";
  if(t.includes("pdf")) return "📕";
  if(t.includes("word")||t.includes("document")) return "📘";
  if(t.includes("sheet")||t.includes("excel")) return "📗";
  return "📄";
}
function categoryInfo(name){ return VAULT_CATEGORIES.find(c=>c.name===name)||VAULT_CATEGORIES.at(-1); }
async function ensureVaultConfig(){
  if(!db||!currentUser||!isAdmin()) return;
  const ref=db.collection("vaults").doc(VAULT_ID);
  const snap=await ref.get();
  const payload={name:"Kluis Rinze & Christa",members:["Rinze","Christa"],updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
  if(!snap.exists) await ref.set({...payload,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  else await ref.set(payload,{merge:true});
}
async function initVaultForCurrentUser(){
  if(!db||!currentUser||!isVaultPerson()){
    vaultConfig=null;
    vaultFiles=[];
    renderVault();
    return;
  }

  // Toon de kluis direct. Een ontbrekende configuratie of nog niet gepubliceerde
  // Firebase-regel mag de tegelweergave en uploadknop niet meer blokkeren.
  vaultConfig={name:"Kluis Rinze & Christa"};
  vaultFiles=[];
  renderVault();

  try{
    await ensureVaultConfig();
    const configRef=db.collection("vaults").doc(VAULT_ID);
    if(vaultFilesUnsubscribe) vaultFilesUnsubscribe();
    vaultFilesUnsubscribe=configRef.collection("files").orderBy("createdAt","desc").onSnapshot(q=>{
      vaultFiles=q.docs.map(d=>({id:d.id,...d.data()}));
      if(window.vaultAccessMessage) vaultAccessMessage.classList.add("hidden");
      renderVault();
    },err=>{
      console.error("Kluisbestanden laden mislukt",err);
      vaultFiles=[];
      renderVault();
      if(window.vaultAccessMessage){
        vaultAccessMessage.innerHTML="⚠️ De mappen zijn klaar, maar Firebase weigert het laden van bestanden. Publiceer de meegeleverde Firestore- en Storage-regels. Je kunt de uploadknop alvast gebruiken; bij een weigering krijg je daar een duidelijke melding.";
        vaultAccessMessage.classList.remove("hidden");
      }
    });
  }catch(err){
    console.error("Kluis initialiseren mislukt",err);
    renderVault();
    if(window.vaultAccessMessage){
      vaultAccessMessage.innerHTML="⚠️ De kluis is geopend, maar de Firebase-verbinding is nog niet volledig. Publiceer de regels uit FIREBASE-STAPPEN.txt. De tegelweergave blijft wel beschikbaar.";
      vaultAccessMessage.classList.remove("hidden");
    }
  }
}
function hasVaultAccess(){ return !!(currentUser&&isVaultPerson()); }
function fillVaultCategories(){
  if(!window.vaultCategory) return;
  const selected=vaultCategory.value;
  vaultCategory.innerHTML=VAULT_CATEGORIES.map(c=>`<option>${escapeHtml(c.name)}</option>`).join("");
  if(VAULT_CATEGORIES.some(c=>c.name===selected)) vaultCategory.value=selected;
}
function vaultRows(){
  const q=(vaultSearch.value||"").trim().toLowerCase();
  let rows=vaultFiles.slice();
  if(currentVaultSpecial==="trash") rows=rows.filter(f=>f.deletedAt);
  else rows=rows.filter(f=>!f.deletedAt);
  if(currentVaultCategory) rows=rows.filter(f=>f.category===currentVaultCategory);
  if(currentVaultSpecial==="favorites") rows=rows.filter(f=>f.favorite);
  if(currentVaultSpecial==="recent") rows=rows.slice().sort((a,b)=>Number(b.createdAt?.seconds||0)-Number(a.createdAt?.seconds||0)).slice(0,20);
  if(q) rows=rows.filter(f=>[f.title,f.description,f.originalName,f.uploadedBy,f.category].join(" ").toLowerCase().includes(q));
  const sort=window.vaultSort?.value||"newest";
  const stamp=f=>Number((f.deletedAt||f.createdAt)?.seconds||0);
  if(sort==="oldest") rows.sort((a,b)=>stamp(a)-stamp(b));
  else if(sort==="name") rows.sort((a,b)=>String(a.title||a.originalName||"").localeCompare(String(b.title||b.originalName||""),"nl"));
  else if(sort==="size") rows.sort((a,b)=>(Number(b.size)||0)-(Number(a.size)||0));
  else rows.sort((a,b)=>stamp(b)-stamp(a));
  return rows;
}
function renderVaultFolders(){
  const folderCards=VAULT_CATEGORIES.map(c=>{
    const files=vaultFiles.filter(f=>!f.deletedAt&&(f.category||"Overig")===c.name);
    const bytes=files.reduce((sum,f)=>sum+(Number(f.size)||0),0);
    return `<button class="vault-folder-card" type="button" onclick="openVaultCategory('${c.name.replaceAll("'","\\'")}')">
      <span class="vault-folder-icon">${c.icon}</span><strong>${escapeHtml(c.name)}</strong>
      <small>${files.length} ${files.length===1?"bestand":"bestanden"} · ${formatBytes(bytes)}</small>
      <em>${escapeHtml(c.hint)}</em>
    </button>`;
  }).join("");
  const activeFiles=vaultFiles.filter(f=>!f.deletedAt);
  const favoriteCount=activeFiles.filter(f=>f.favorite).length;
  const trashCount=vaultFiles.filter(f=>f.deletedAt).length;
  vaultFolderGrid.innerHTML=`
    <button class="vault-folder-card vault-special-card" type="button" onclick="openVaultSpecial('favorites')"><span class="vault-folder-icon">⭐</span><strong>Favorieten</strong><small>${favoriteCount} ${favoriteCount===1?"bestand":"bestanden"}</small><em>Snel terugvinden</em></button>
    <button class="vault-folder-card vault-special-card" type="button" onclick="openVaultSpecial('recent')"><span class="vault-folder-icon">🕒</span><strong>Recent</strong><small>Laatste 20 bestanden</small><em>Nieuw toegevoegd</em></button>
    ${folderCards}
    <button class="vault-folder-card vault-trash-card" type="button" onclick="openVaultSpecial('trash')"><span class="vault-folder-icon">🗑️</span><strong>Prullenbak</strong><small>${trashCount} ${trashCount===1?"bestand":"bestanden"}</small><em>Herstellen of definitief verwijderen</em></button>`;
}
function formatVaultDate(value){
  const date=value?.toDate?value.toDate():value?new Date(value):null;
  if(!date||Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("nl-NL",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);
}
function renderVault(){
  if(!window.vaultMenuBtn) return;
  const visible=isVaultPerson();
  vaultMenuBtn.classList.toggle("hidden",!visible);
  if(!visible){ if(document.querySelector('.page.active')?.dataset.page==="kluis") navigate("home"); return; }
  fillVaultCategories();
  const access=hasVaultAccess();
  vaultContent.classList.toggle("hidden",!access);
  vaultUploadBtn.classList.toggle("hidden",!access);
  if(!access){
    vaultAccessMessage.innerHTML="Je hebt geen toegang tot deze kluis.";
    vaultAccessMessage.classList.remove("hidden");
    return;
  }
  const total=vaultFiles.reduce((sum,f)=>sum+(Number(f.size)||0),0);
  const pct=Math.min(100,total/VAULT_LIMIT_BYTES*100);
  vaultStorageText.textContent=`${formatBytes(total)} / 5,00 GB`;
  vaultStoragePercent.textContent=`${pct.toLocaleString("nl-NL",{maximumFractionDigits:1})}% gebruikt`;
  vaultStorageRemaining.textContent=`${formatBytes(Math.max(0,VAULT_LIMIT_BYTES-total))} beschikbaar`;
  vaultStorageBar.style.width=`${pct}%`;
  vaultStorageBar.className=pct>=95?"danger":pct>=80?"warning":"";
  vaultStorageWarning.classList.toggle("hidden",pct<90);
  vaultStorageWarning.textContent=pct>=100?"De ingestelde limiet van 5,00 GB is bereikt. Verwijder eerst bestanden.":"Let op: de kluis is bijna vol.";

  const inFolder=!!currentVaultCategory||!!currentVaultSpecial||!!(vaultSearch.value||"").trim();
  vaultFolderGrid.classList.toggle("hidden",inFolder);
  vaultHomeBtn.classList.toggle("hidden",!inFolder);
  vaultViewTitle.classList.toggle("hidden",!inFolder);
  if(!inFolder){
    vaultViewTitle.textContent="";
    renderVaultFolders();
    vaultList.innerHTML="";
    return;
  }
  const title=currentVaultCategory?`${categoryInfo(currentVaultCategory).icon} ${currentVaultCategory}`:currentVaultSpecial==="favorites"?"⭐ Favorieten":currentVaultSpecial==="recent"?"🕒 Recent toegevoegd":currentVaultSpecial==="trash"?"🗑️ Prullenbak":"🔎 Zoekresultaten";
  vaultViewTitle.innerHTML=`<strong>${escapeHtml(title)}</strong><span>${vaultRows().length} gevonden</span>`;
  const rows=vaultRows();
  vaultList.innerHTML=rows.length?rows.map(f=>{
    const isTrash=!!f.deletedAt;
    const imagePreview=String(f.contentType||"").startsWith("image/")&&!isTrash
      ? `<div class="vault-thumb-wrap"><div class="vault-thumb-placeholder">🖼️</div><img class="vault-thumb" data-vault-thumb="${f.id}" alt=""></div>`:"";
    const actions=isTrash
      ? `<button class="secondary-btn" onclick="restoreVaultFile('${f.id}')">Herstellen</button><button class="secondary-btn danger-mini" onclick="purgeVaultFile('${f.id}')">Definitief verwijderen</button>`
      : `<button class="secondary-btn" onclick="openVaultFile('${f.id}')">Openen</button><button class="secondary-btn" onclick="downloadVaultFile('${f.id}')">Download</button><button class="secondary-btn danger-mini" onclick="deleteVaultFile('${f.id}')">Naar prullenbak</button>`;
    return `<article class="item-card vault-file-card ${isTrash?"is-trash":""}">
      ${imagePreview}
      <div class="vault-file-head"><div><span class="vault-icon">${vaultIcon(f)}</span><h3>${f.favorite&&!isTrash?"⭐ ":""}${escapeHtml(f.title||f.originalName)}</h3><div class="meta">${escapeHtml(f.category||"Overig")} · ${formatBytes(f.size)}${f.uploadedBy?` · door ${escapeHtml(f.uploadedBy)}`:""}${formatVaultDate(isTrash?f.deletedAt:f.createdAt)?` · ${isTrash?"verwijderd ":""}${formatVaultDate(isTrash?f.deletedAt:f.createdAt)}`:""}</div></div>${isTrash?"":`<button class="mini-btn" onclick="toggleVaultFavorite('${f.id}')">${f.favorite?"★":"☆"}</button>`}</div>
      ${f.description?`<p>${escapeHtml(f.description)}</p>`:""}<div class="meta">Bestand: ${escapeHtml(f.originalName||"")}</div>
      <div class="vault-file-actions">${actions}</div>
    </article>`;
  }).join(""):'<div class="card muted">Nog geen bestanden gevonden.</div>';
  hydrateVaultThumbnails(rows);
}
window.openVaultCategory=name=>{currentVaultCategory=name;currentVaultSpecial="";vaultSearch.value="";renderVault();};
window.openVaultSpecial=type=>{currentVaultCategory="";currentVaultSpecial=type;vaultSearch.value="";renderVault();};
function resetVaultView(){currentVaultCategory="";currentVaultSpecial="";vaultSearch.value="";renderVault();}
function safeFileName(name){ return String(name||"bestand").replace(/[^a-zA-Z0-9._-]+/g,"_").slice(-120); }
async function getVaultDownloadUrl(file){ if(!storage||!file?.storagePath) throw new Error("Bestandspad ontbreekt."); return storage.ref(file.storagePath).getDownloadURL(); }
window.openVaultFile=async id=>{ try{const f=vaultFiles.find(x=>x.id===id);const url=await getVaultDownloadUrl(f);window.open(url,"_blank","noopener");}catch(e){alert("Bestand openen mislukt: "+e.message);} };
window.downloadVaultFile=async id=>{ try{const f=vaultFiles.find(x=>x.id===id);const url=await getVaultDownloadUrl(f);const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener";a.download=f.originalName||"bestand";a.click();}catch(e){alert("Downloaden mislukt: "+e.message);} };
window.toggleVaultFavorite=async id=>{ try{const f=vaultFiles.find(x=>x.id===id);await db.collection("vaults").doc(VAULT_ID).collection("files").doc(id).update({favorite:!f.favorite,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});}catch(e){alert("Favoriet wijzigen mislukt: "+e.message);} };
window.deleteVaultFile=async id=>{
  const f=vaultFiles.find(x=>x.id===id);
  if(!f||!confirm(`“${f.title||f.originalName}” naar de prullenbak verplaatsen?`)) return;
  try{await db.collection("vaults").doc(VAULT_ID).collection("files").doc(id).update({deletedAt:firebase.firestore.FieldValue.serverTimestamp(),deletedBy:currentPersonName(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});}
  catch(e){alert("Verplaatsen naar prullenbak mislukt: "+e.message);}
};
window.restoreVaultFile=async id=>{
  try{await db.collection("vaults").doc(VAULT_ID).collection("files").doc(id).update({deletedAt:firebase.firestore.FieldValue.delete(),deletedBy:firebase.firestore.FieldValue.delete(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});}
  catch(e){alert("Herstellen mislukt: "+e.message);}
};
window.purgeVaultFile=async id=>{
  const f=vaultFiles.find(x=>x.id===id);
  if(!f||!confirm(`“${f.title||f.originalName}” definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
  try{await storage.ref(f.storagePath).delete();await db.collection("vaults").doc(VAULT_ID).collection("files").doc(id).delete();}
  catch(e){alert("Definitief verwijderen mislukt: "+e.message);}
};
async function hydrateVaultThumbnails(rows){
  const images=rows.filter(f=>!f.deletedAt&&String(f.contentType||"").startsWith("image/"));
  await Promise.all(images.map(async f=>{
    const img=document.querySelector(`[data-vault-thumb="${CSS.escape(f.id)}"]`);
    if(!img||img.src) return;
    try{img.src=await getVaultDownloadUrl(f);img.onload=()=>img.closest(".vault-thumb-wrap")?.classList.add("loaded");}
    catch(_){ }
  }));
}


function setSelectedVaultFile(file){
  selectedVaultUploadFile=file||null;
  vaultChosenFile.textContent=file?`${file.name} · ${formatBytes(file.size)}`:"Nog geen bestand gekozen.";
  if(file&&!vaultTitle.value) vaultTitle.value=file.name.replace(/\.[^.]+$/," ").trim();
}
if(window.vaultUploadBtn) vaultUploadBtn.onclick=()=>{
  vaultUploadForm.reset(); selectedVaultUploadFile=null; setSelectedVaultFile(null);
  vaultUploadMessage.textContent=""; fillVaultCategories();
  if(currentVaultCategory) vaultCategory.value=currentVaultCategory;
  vaultUploadDialog.showModal();
};
if(window.vaultFileInput) vaultFileInput.onchange=()=>{
  const f=vaultFileInput.files?.[0];
  if(f&&window.vaultCameraInput) vaultCameraInput.value="";
  setSelectedVaultFile(f);
};
if(window.vaultCameraInput) vaultCameraInput.onchange=()=>{
  const f=vaultCameraInput.files?.[0];
  if(f&&window.vaultFileInput) vaultFileInput.value="";
  setSelectedVaultFile(f);
};
if(window.vaultSearch) vaultSearch.oninput=()=>{if(vaultSearch.value.trim()){currentVaultCategory="";currentVaultSpecial="";}renderVault();};
if(window.vaultSort) vaultSort.onchange=renderVault;
if(window.vaultHomeBtn) vaultHomeBtn.onclick=resetVaultView;
if(window.vaultUploadForm) vaultUploadForm.onsubmit=async e=>{
  e.preventDefault();
  const file=selectedVaultUploadFile||vaultFileInput.files?.[0]||window.vaultCameraInput?.files?.[0]; if(!file){vaultUploadMessage.textContent="Kies eerst een bestand of maak een foto.";return;}
  const used=vaultFiles.reduce((sum,f)=>sum+(Number(f.size)||0),0);
  if(file.size>VAULT_MAX_FILE_BYTES){vaultUploadMessage.textContent="Een bestand mag maximaal 100 MB zijn.";return;}
  if(used+file.size>VAULT_LIMIT_BYTES){vaultUploadMessage.textContent="Dit bestand past niet meer binnen de ingestelde limiet van 5,00 GB.";return;}
  vaultUploadSubmit.disabled=true;vaultUploadMessage.textContent="Uploaden…";
  const ref=db.collection("vaults").doc(VAULT_ID).collection("files").doc();
  const storagePath=`vaults/${VAULT_ID}/${ref.id}/${safeFileName(file.name)}`;
  try{
    await storage.ref(storagePath).put(file,{contentType:file.type||"application/octet-stream",customMetadata:{vaultId:VAULT_ID,documentId:ref.id}});
    await ref.set({title:vaultTitle.value.trim(),description:vaultDescription.value.trim(),category:vaultCategory.value,originalName:file.name,storagePath,size:file.size,contentType:file.type||"application/octet-stream",favorite:vaultFavorite.checked,deletedAt:null,uploadedBy:currentPersonName(),uploadedByEmail:normalizeEmail(currentUser.email),createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    vaultUploadDialog.close(); currentVaultCategory=vaultCategory.value; currentVaultSpecial="";
  }catch(err){
    console.error(err);
    try{await storage.ref(storagePath).delete();}catch(_){ }
    const code=String(err?.code||"");
    vaultUploadMessage.textContent=code.includes("unauthorized")||code.includes("permission-denied")
      ? "Upload geweigerd door Firebase. Publiceer eerst firestore.rules en storage.rules volgens FIREBASE-STAPPEN.txt."
      : "Uploaden mislukt: "+(err?.message||"onbekende fout");
  }
  finally{vaultUploadSubmit.disabled=false;}
};


function diaryCollection(){
  return db && currentUser && isDiaryOwner() ? db.collection("diaries").doc(currentUser.uid).collection("entries") : null;
}
function diaryDateLabel(value){
  if(!value) return "";
  return new Intl.DateTimeFormat("nl-NL",{day:"numeric",month:"long",year:"numeric"}).format(new Date(value+"T12:00:00"));
}
function diaryPhotoPaths(entry){
  if(Array.isArray(entry?.photoPaths)) return entry.photoPaths.filter(Boolean);
  return entry?.photoPath ? [entry.photoPath] : [];
}
function cleanupDiaryPreviewUrls(){
  diaryPreviewObjectUrls.forEach(url=>URL.revokeObjectURL(url));
  diaryPreviewObjectUrls=[];
}
function renderDiaryPhotoEditor(){
  if(!window.diaryPhotoPreview) return;
  cleanupDiaryPreviewUrls();
  const existing=diaryExistingPhotoPaths.map((path,index)=>({kind:"existing",path,index}));
  const added=selectedDiaryPhotos.map((file,index)=>({kind:"new",file,index}));
  const items=[...existing,...added];
  diaryPhotoPreview.innerHTML=items.length?items.map(item=>{
    if(item.kind==="existing") return `<div class="diary-edit-photo"><div class="diary-edit-photo-image" data-existing-diary-photo="${escapeHtml(item.path)}">🖼️</div><button type="button" onclick="removeExistingDiaryPhoto(${item.index})" aria-label="Foto verwijderen">✕</button></div>`;
    const url=URL.createObjectURL(item.file); diaryPreviewObjectUrls.push(url);
    return `<div class="diary-edit-photo"><img src="${url}" alt="Voorbeeld"><button type="button" onclick="removeNewDiaryPhoto(${item.index})" aria-label="Foto verwijderen">✕</button><small>${escapeHtml(item.file.name)} · ${formatBytes(item.file.size)}</small></div>`;
  }).join(""):`<p class="muted">Nog geen foto's toegevoegd.</p>`;
  document.querySelectorAll("[data-existing-diary-photo]").forEach(async el=>{try{const url=await storage.ref(el.dataset.existingDiaryPhoto).getDownloadURL();el.innerHTML=`<img src="${url}" alt="Bestaande foto">`;}catch(_){el.textContent="Foto niet beschikbaar";}});
  diaryPhotoInfo.textContent=`${items.length} ${items.length===1?"foto":"foto's"} toegevoegd`;
}
window.removeExistingDiaryPhoto=index=>{diaryExistingPhotoPaths.splice(index,1);renderDiaryPhotoEditor();};
window.removeNewDiaryPhoto=index=>{selectedDiaryPhotos.splice(index,1);renderDiaryPhotoEditor();};
function addDiarySelectedFiles(fileList){
  const files=Array.from(fileList||[]).filter(f=>f.type.startsWith("image/"));
  const tooLarge=files.find(f=>f.size>10*1024*1024);
  if(tooLarge){diaryMessage.textContent=`${tooLarge.name} is groter dan 10 MB.`;return;}
  selectedDiaryPhotos.push(...files); renderDiaryPhotoEditor();
}
function renderDiary(){
  if(!window.diaryList) return;
  if(!currentUser){ diaryList.innerHTML='<div class="card muted">Log in om het dagboek te openen.</div>'; return; }
  if(!isDiaryOwner()){ diaryList.innerHTML='<div class="card muted">Het dagboek is alleen beschikbaar voor Rinze.</div>'; return; }
  const q=(diarySearch?.value||"").trim().toLowerCase();
  const sort=diarySort?.value||"newest";
  let rows=diaryEntries.filter(x=>!q||`${x.title||""} ${x.text||""}`.toLowerCase().includes(q));
  rows=rows.slice().sort((a,b)=>{
    if(sort==="oldest") return String(a.date||a.createdAt||"").localeCompare(String(b.date||b.createdAt||""));
    if(sort==="name") return String(a.title||"").localeCompare(String(b.title||""),"nl",{sensitivity:"base"});
    if(sort==="favorites") return Number(b.favorite)-Number(a.favorite)||String(b.date||"").localeCompare(String(a.date||""));
    return String(b.date||b.createdAt||"").localeCompare(String(a.date||a.createdAt||""));
  });
  diaryList.innerHTML=rows.length?rows.map(x=>{
    const paths=diaryPhotoPaths(x);
    return `<article class="item-card diary-card diary-timeline-card">
      <div class="diary-date-badge"><span>${new Intl.DateTimeFormat("nl-NL",{day:"2-digit"}).format(new Date((x.date||new Date().toISOString().slice(0,10))+"T12:00:00"))}</span><small>${new Intl.DateTimeFormat("nl-NL",{month:"short",year:"numeric"}).format(new Date((x.date||new Date().toISOString().slice(0,10))+"T12:00:00"))}</small></div>
      <div class="diary-card-content">
        <div class="diary-card-head"><div><h3>${x.favorite?"⭐ ":""}${escapeHtml(x.title||"Zonder titel")}</h3><div class="meta">${diaryDateLabel(x.date)}${paths.length?` · 📷 ${paths.length}`:""}</div></div><button class="mini-btn" onclick="editDiaryEntry('${x.id}')">Bewerken</button></div>
        ${paths.length?`<div class="diary-gallery">${paths.map((path,i)=>`<button type="button" class="diary-gallery-item" data-diary-photo="${escapeHtml(path)}" data-diary-title="${escapeHtml(x.title||"Dagboekfoto")}" data-diary-index="${i}"><span>🖼️</span></button>`).join("")}</div>`:""}
        <p class="diary-preview">${escapeHtml(x.text||"").replaceAll("\n","<br>")}</p>
      </div>
    </article>`;
  }).join(""):'<div class="card muted">Nog geen dagboeknotities. Tik op <strong>+ Notitie</strong> om te beginnen.</div>';
  document.querySelectorAll("[data-diary-photo]").forEach(async el=>{try{const url=await storage.ref(el.dataset.diaryPhoto).getDownloadURL();el.innerHTML=`<img src="${url}" alt="${escapeHtml(el.dataset.diaryTitle)}">`;el.onclick=()=>openDiaryLightbox(url,el.dataset.diaryTitle);}catch(_){el.remove();}});
}
function openDiaryLightbox(url,title="Dagboekfoto"){
  diaryLightboxImage.src=url; diaryLightboxImage.alt=title; diaryLightboxTitle.textContent=title; diaryLightbox.showModal();
}
function initDiaryForCurrentUser(){
  if(diaryUnsubscribe){diaryUnsubscribe();diaryUnsubscribe=null;}
  diaryEntries=[]; renderDiary();
  updateDiaryAccess();
  const col=diaryCollection(); if(!col) return;
  diaryUnsubscribe=col.onSnapshot(snap=>{
    diaryEntries=snap.docs.map(d=>({id:d.id,...d.data(),createdAt:d.data().createdAt?.toDate?.()?.toISOString?.()||d.data().createdAt||""}));
    renderDiary();
    renderHome();
  },err=>{console.error(err);diaryList.innerHTML='<div class="card muted">Dagboek kon niet worden geladen. Controleer de Firebase-regels.</div>';});
}
function openDiaryDialog(entry=null){
  if(!isDiaryOwner()){ alert("Het dagboek is alleen beschikbaar voor Rinze."); return; }
  diaryForm.reset(); selectedDiaryPhotos=[]; diaryExistingPhotoPaths=diaryPhotoPaths(entry); diaryPhotoCameraInput.value=""; diaryPhotoGalleryInput.value=""; diaryMessage.textContent="";
  diaryEditId.value=entry?.id||""; diaryDialogTitle.textContent=entry?"Dagboeknotitie bewerken":"Nieuwe dagboeknotitie";
  diaryTitle.value=entry?.title||""; diaryDate.value=entry?.date||new Date().toISOString().slice(0,10); diaryText.value=entry?.text||""; diaryFavorite.checked=!!entry?.favorite;
  renderDiaryPhotoEditor();
  diaryDeleteBtn.classList.toggle("hidden",!entry); diaryDialog.showModal();
}
window.editDiaryEntry=id=>openDiaryDialog(diaryEntries.find(x=>x.id===id));
if(window.addDiaryBtn) addDiaryBtn.onclick=()=>openDiaryDialog();
if(window.diarySearch) diarySearch.oninput=renderDiary;
if(window.diarySort) diarySort.onchange=renderDiary;
if(window.diaryPhotoCameraInput) diaryPhotoCameraInput.onchange=()=>addDiarySelectedFiles(diaryPhotoCameraInput.files);
if(window.diaryPhotoGalleryInput) diaryPhotoGalleryInput.onchange=()=>addDiarySelectedFiles(diaryPhotoGalleryInput.files);
if(window.diaryForm) diaryForm.onsubmit=async e=>{
  e.preventDefault(); if(!currentUser||!db||!isDiaryOwner()){ diaryMessage.textContent="Alleen Rinze kan het dagboek gebruiken."; return; }
  const id=diaryEditId.value||diaryCollection().doc().id; const existing=diaryEntries.find(x=>x.id===id); let photoPaths=[...diaryExistingPhotoPaths];
  diarySaveBtn.disabled=true; diaryMessage.textContent="Opslaan…";
  try{
    for(let i=0;i<selectedDiaryPhotos.length;i++){
      const file=selectedDiaryPhotos[i];
      const path=`diaries/${currentUser.uid}/${id}/${Date.now()}-${i}-${safeFileName(file.name)}`;
      await storage.ref(path).put(file,{contentType:file.type||"image/jpeg"}); photoPaths.push(path);
    }
    const removed=diaryPhotoPaths(existing).filter(path=>!diaryExistingPhotoPaths.includes(path));
    await Promise.all(removed.map(async path=>{try{await storage.ref(path).delete();}catch(_){}}));
    await diaryCollection().doc(id).set({title:diaryTitle.value.trim(),date:diaryDate.value,text:diaryText.value.trim(),favorite:diaryFavorite.checked,photoPaths,photoPath:firebase.firestore.FieldValue.delete(),updatedAt:firebase.firestore.FieldValue.serverTimestamp(),createdAt:existing?.createdAt||firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    diaryDialog.close(); cleanupDiaryPreviewUrls();
  }catch(err){console.error(err);
    const code=String(err?.code||"");
    diaryMessage.textContent=(code.includes("permission-denied")||String(err?.message||"").toLowerCase().includes("insufficient permissions"))
      ? "Firebase weigert toegang. Publiceer de nieuwe Firestore- en Storage-regels uit v1.3.21."
      : (err.message||"Opslaan mislukt.");
  }
  finally{diarySaveBtn.disabled=false;}
};
if(window.diaryDeleteBtn) diaryDeleteBtn.onclick=async()=>{
  if(!isDiaryOwner()) return;
  const id=diaryEditId.value, entry=diaryEntries.find(x=>x.id===id); if(!id||!confirm("Deze dagboeknotitie verwijderen?"))return;
  await Promise.all(diaryPhotoPaths(entry).map(async path=>{try{await storage.ref(path).delete();}catch(_){}}));
  await diaryCollection().doc(id).delete(); diaryDialog.close(); cleanupDiaryPreviewUrls();
};

function initFirebase(){
  const settings=window.HOGETERPJES_FIREBASE;
  if(!settings?.useFirebase) return false;
  try{
    firebase.initializeApp(settings.config);
    auth=firebase.auth();
    db=firebase.firestore();
    storage=firebase.storage();
    auth.onAuthStateChanged(async user=>{
      if(signupVerificationInProgress) return;
      if(!user){ currentUser=null; loginScreen.classList.remove("hidden"); return; }
      loginScreen.classList.remove("hidden"); loginMessage.textContent="Toegang controleren…";
      const allowed=await verifyInvitedUser(user);
      if(!allowed){
        await auth.signOut();
        loginMessage.textContent="Dit account is niet uitgenodigd voor Hogeterpjes. Vraag Rinze om toegang.";
        return;
      }
      showLoggedIn(provisionalProfile(user));
      loadAdminSettings().then(()=>loadUserProfile(user)).then(profile=>{currentUser=profile;renderProfile();fillSelects();renderAll();}).catch(err=>console.warn("Profiel bijwerken mislukt:",err));
    });
    firebaseStatus.textContent="Firebase gekoppeld";
    loginMessage.textContent="";
    setSyncStatus("Wachten op inloggen");
    return true;
  }catch(e){
    firebaseStatus.textContent="Firebase-configuratie bevat een fout";
    firebaseStatus.classList.add("error");
    return false;
  }
}

bindNav();

try{
  resetIngredientEditor();
  renderAll();
}catch(error){
  console.error("Scherm initialiseren mislukt:",error);
}

const firebaseActive=initFirebase();
if(!firebaseActive){
  loginMessage.textContent="Firebase kon niet worden gestart.";
}
if("serviceWorker" in navigator){
  window.addEventListener("load", async ()=>{
    try{
      const registration=await navigator.serviceWorker.register("service-worker.js?v=1.3.32");
      await registration.update();
      let refreshing=false;
      navigator.serviceWorker.addEventListener("controllerchange",()=>{
        if(refreshing)return;
        refreshing=true;
        window.location.reload();
      });
      if(registration.waiting) registration.waiting.postMessage({type:"SKIP_WAITING"});
    }catch(e){
      console.warn("Service worker kon niet worden bijgewerkt.",e);
    }
  });
}
