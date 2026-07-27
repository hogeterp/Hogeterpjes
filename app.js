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
    {id:crypto.randomUUID(), name:"Rinze & Christa", members:["Rinze","Christa","Lisa"]},
    {id:crypto.randomUUID(), name:"Tessa & Rivaldo", members:["Tessa","Rivaldo"]},
    {id:crypto.randomUUID(), name:"Maaike", members:["Maaike"]},
    {id:crypto.randomUUID(), name:"Jasmijn", members:["Jasmijn"]}
  ],
  recipes: [],
  groceries: [],
  wishes: [],
  events: [],
  weekMenus: []
};

const KEY="hogeterpjes-data-v1";
const PROFILE_KEY="hogeterpjes-demo-profile";
const PROFILE_PHOTO_KEY="hogeterpjes-profile-photo-v1";
const PRIVATE_AGENDA_KEY="hogeterpjes-private-agenda-v1";
let data=loadData();
let currentHousehold=data.households[0]?.id || "";
let currentWeekmenuHousehold="";
let currentWeekStart=getMonday(new Date());
let simpleMode="";
let currentUser=null;
let auth=null;
let db=null;
let cloudUnsubscribe=null;
let cloudReady=false;
let applyingRemote=false;
let saveTimer=null;
const SHARED_DATA_DOC="appData/hogeterpjes";
const ADMIN_DOC="appAdmin/settings";
const ADMIN_EMAIL="rohogeterp@gmail.com";
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
    await db.doc(SHARED_DATA_DOC).set({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: currentUser.uid
    });
    setSyncStatus("Alles is gesynchroniseerd");
  }catch(error){
    console.error(error);
    setSyncStatus("Synchroniseren mislukt",true);
  }
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
          events:Array.isArray(remote.events)?remote.events:[],
          weekMenus:Array.isArray(remote.weekMenus)?remote.weekMenus:[]
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

function canManageWish(wish){
  return wish.person===currentPersonName();
}



const WEEK_DAYS=["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"];

function getMonday(value){
  const date=new Date(value);
  date.setHours(12,0,0,0);
  const day=date.getDay();
  const diff=day===0 ? -6 : 1-day;
  date.setDate(date.getDate()+diff);
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
          ${meal.note?`<span>${meal.note}</span>`:""}
          <small>Tik om te wijzigen</small>
        </button>
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
  const household=data.households.find(h=>h.id===event.householdId);
  return `🏡 ${household?.name || "Huishouden"}`;
}

function getVisibleAgendaEvents(){
  const privateEvents=loadPrivateEvents().map(e=>({...e,visibility:"private"}));
  const sharedEvents=(data.events || []).filter(canSeeSharedEvent);
  return [...privateEvents,...sharedEvents];
}

function renderAgenda(){
  if(!window.agendaList) return;

  const type=agendaTypeFilter.value || "";
  const householdId=agendaHouseholdFilter.value || "";

  agendaHouseholdFilter.innerHTML=
    `<option value="">Alle huishoudens</option>`+
    data.households
      .filter(h=>userHouseholdIds().includes(h.id))
      .map(h=>`<option value="${h.id}">${h.name}</option>`).join("");
  agendaHouseholdFilter.value=householdId;

  let rows=getVisibleAgendaEvents();
  rows=rows.filter(e=>!type || e.visibility===type);
  rows=rows.filter(e=>!householdId || e.householdId===householdId);
  rows.sort((a,b)=>(a.date+" "+(a.startTime||"")).localeCompare(b.date+" "+(b.startTime||"")));

  agendaList.innerHTML=rows.length?rows.map(e=>`<article class="item-card agenda-card">
    <div class="agenda-card-head">
      <div>
        <span class="agenda-scope">${agendaScopeLabel(e)}</span>
        <h3>${e.title}</h3>
        <div class="meta">${formatAgendaDate(e)}</div>
      </div>
      <button class="mini-btn danger-mini" type="button" onclick="deleteAgendaEvent('${e.id}','${e.visibility}')">Verwijderen</button>
    </div>
    ${e.location?`<p>📍 ${e.location}</p>`:""}
    ${e.note?`<p>${e.note}</p>`:""}
  </article>`).join(""):`<div class="card muted">Nog geen afspraken zichtbaar.</div>`;
}

function fillAgendaHouseholds(){
  const allowed=data.households.filter(h=>userHouseholdIds().includes(h.id));
  agendaHousehold.innerHTML=allowed.map(h=>`<option value="${h.id}">${h.name}</option>`).join("");
  agendaHouseholdLabel.classList.toggle("hidden",agendaVisibility.value!=="household");
}

function navigate(page){
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
  householdList.innerHTML=data.households.map(h=>`<article class="item-card"><h3>🏡 ${h.name}</h3><div class="chips">${h.members.map(m=>`<span class="chip">${m}</span>`).join("")}</div></article>`).join("") || `<div class="card muted">Nog geen huishoudens.</div>`;
  groceryHousehold.innerHTML=data.households.map(h=>`<option value="${h.id}">${h.name}</option>`).join("");
  if(!data.households.some(h=>h.id===currentHousehold)) currentHousehold=data.households[0]?.id||"";
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
  const rows=data.recipes.filter(r=>(r.name+" "+r.ingredients.map(i=>i.name).join(" ")).toLowerCase().includes(q));
  recipeList.innerHTML=rows.length?rows.map(r=>`<article class="item-card">
    ${r.photo?`<img class="recipe-photo" src="${r.photo}" alt="">`:""}
    <h3>${r.name}</h3><div class="meta">Voor ${r.servings} personen · door ${r.author}</div>
    <div class="recipe-actions"><button class="secondary-btn" onclick="openRecipe('${r.id}')">Bekijken</button><button class="secondary-btn" onclick="addRecipeToGroceries('${r.id}')">Naar lijst</button></div>
  </article>`).join(""):`<div class="card muted">Nog geen recepten. Voeg je eerste recept toe.</div>`;
}
function renderGroceries(){
  const rows=data.groceries.filter(g=>g.householdId===currentHousehold);
  groceryList.innerHTML=rows.length?rows.map(g=>`<div class="check-row ${g.done?"done":""}">
    <input type="checkbox" ${g.done?"checked":""} onchange="toggleGrocery('${g.id}')">
    <span>${g.text}</span><button onclick="deleteGrocery('${g.id}')">🗑️</button>
  </div>`).join(""):`<div class="muted" style="padding:18px 2px">Nog niets op deze boodschappenlijst.</div>`;
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
  const ownName=currentPersonName();
  const occasion=wishOccasionFilter.value||"";
  const rows=data.wishes.filter(w=>w.person===ownName && (!occasion||w.occasion===occasion));

  wishPageTitle.textContent="Mijn wensen";
  wishPrivacyNote.textContent=`Ingelogd als ${ownName || "familielid"}. Alleen jouw eigen wensen worden hier getoond.`;
  wishPersonFilter.classList.add("hidden");

  wishList.innerHTML=rows.length?rows.map(w=>`<article class="item-card">
    <div class="wish-card-head">
      <div>
        <h3>${w.title}</h3>
        <div class="meta">${w.occasion}${w.price?` · € ${Number(w.price).toLocaleString("nl-NL",{minimumFractionDigits:2})}`:""}</div>
      </div>
      <button class="mini-btn danger-mini" type="button" onclick="deleteWish('${w.id}')">Verwijderen</button>
    </div>
    ${w.photo?`<img class="wish-photo" src="${w.photo}" alt="${w.title}">`:""}
    ${w.note?`<p>${w.note}</p>`:""}${w.link?`<a href="${w.link}" target="_blank" rel="noopener">Bekijk winkel</a>`:""}
  </article>`).join(""):`<div class="card muted">Je hebt nog geen wensen toegevoegd.</div>`;
}
function renderHome(){
  statFamily.textContent=data.family.length; statHouseholds.textContent=data.households.length; statRecipes.textContent=data.recipes.length; statWishes.textContent=data.wishes.length;
  const b=getNextBirthday();
  document.getElementById("nextBirthday").innerHTML=b?`<div class="birthday-icon">🎂</div><div><strong>${b.name}</strong><div class="muted">${b.days===0?"Vandaag jarig!":`over ${b.days} dagen`} · wordt ${ageFor(b.birth)+1}</div></div>`:"";
}
function fillSelects(){
  const opts=data.family.map(p=>`<option>${p.name}</option>`).join("");
  recipeAuthor.innerHTML=opts;

  const safeName=currentPersonName() || "Familielid";
  wishPerson.innerHTML=`<option>${safeName}</option>`;
  wishPerson.value=safeName;
  wishPerson.disabled=true;
  wishPersonFilter.innerHTML=`<option value="${safeName}">${safeName}</option>`;
  wishPersonFilter.value=safeName;
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
  const houses=data.households.filter(h=>h.members.includes(name));
  profileHouseholds.innerHTML=houses.map(h=>`<span class="chip">${h.name}</span>`).join("") || `<span class="muted">Nog niet aan een huishouden gekoppeld</span>`;
}
function renderAll(){ renderHome(); renderFamily(); renderHouseholds(); renderRecipes(); renderGroceries(); renderWishes(); renderAgenda(); renderWeekmenu(); fillSelects(); renderProfile(); renderAccountManagement(); }

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

weekMealForm.onsubmit=e=>{
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

  const record={
    id:existing?.id || crypto.randomUUID(),
    householdId:currentWeekmenuHousehold,
    weekStart:weekMenuKey(),
    dayIndex,
    recipeId,
    name:manualName,
    note:String(f.get("note")||"").trim(),
    updatedBy:currentPersonName(),
    updatedAt:new Date().toISOString()
  };

  if(existing){
    Object.assign(existing,record);
  }else{
    data.weekMenus.push(record);
  }

  weekMealDialog.close();
  saveData();
};

window.openWeekMealForDay=dayIndex=>openWeekMealDialog(dayIndex);

window.editWeekMeal=id=>{
  const meal=(data.weekMenus || []).find(m=>m.id===id);
  if(!meal || !userHouseholdIds().includes(meal.householdId)) return;
  openWeekMealDialog(meal.dayIndex,meal);
};

window.deleteWeekMeal=id=>{
  const meal=(data.weekMenus || []).find(m=>m.id===id);
  if(!meal || !userHouseholdIds().includes(meal.householdId)) return;
  if(!confirm(`"${recipeMealName(meal)}" uit het weekmenu verwijderen?`)) return;
  data.weekMenus=data.weekMenus.filter(m=>m.id!==id);
  saveData();
};

copyWeekmenuBtn.onclick=()=>{
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

  data.weekMenus=(data.weekMenus || []).filter(m=>
    !(m.householdId===currentWeekmenuHousehold && m.weekStart===nextStart)
  );

  source.forEach(meal=>{
    data.weekMenus.push({
      ...meal,
      id:crypto.randomUUID(),
      weekStart:nextStart,
      updatedBy:currentPersonName(),
      updatedAt:new Date().toISOString()
    });
  });

  saveData();
  alert("Het weekmenu is naar de volgende week gekopieerd.");
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
        text:scaledIngredientText(ingredient,recipe.servings,householdSize),
        done:false,
        source:`Weekmenu ${weekMenuKey()}`
      });
      added++;
    });
  });

  currentHousehold=currentWeekmenuHousehold;
  saveData();
  navigate("boodschappen");
  alert(`${added} ingrediënten zijn toegevoegd aan de boodschappenlijst van ${household?.name || "het huishouden"}.`);
};

addAgendaBtn.onclick=()=>{
  agendaForm.reset();
  agendaForm.elements.date.value=new Date().toISOString().slice(0,10);
  fillAgendaHouseholds();
  agendaDialog.showModal();
};

agendaVisibility.onchange=fillAgendaHouseholds;
agendaTypeFilter.onchange=renderAgenda;
agendaHouseholdFilter.onchange=renderAgenda;

agendaForm.onsubmit=e=>{
  e.preventDefault();
  const f=new FormData(agendaForm);
  const visibility=f.get("visibility");

  const event={
    id:crypto.randomUUID(),
    title:String(f.get("title")||"").trim(),
    date:f.get("date"),
    startTime:f.get("startTime"),
    endTime:f.get("endTime"),
    visibility,
    householdId:visibility==="household" ? f.get("householdId") : "",
    location:String(f.get("location")||"").trim(),
    note:String(f.get("note")||"").trim(),
    createdBy:currentUser?.uid || "",
    createdByName:currentPersonName(),
    createdAt:new Date().toISOString()
  };

  if(visibility==="private"){
    const privateEvents=loadPrivateEvents();
    privateEvents.push(event);
    savePrivateEvents(privateEvents);
    renderAgenda();
  }else{
    data.events=data.events || [];
    data.events.push(event);
    saveData();
  }

  agendaDialog.close();
};

window.deleteAgendaEvent=(id,visibility)=>{
  if(!confirm("Deze afspraak verwijderen?")) return;

  if(visibility==="private"){
    savePrivateEvents(loadPrivateEvents().filter(e=>e.id!==id));
    renderAgenda();
    return;
  }

  data.events=(data.events || []).filter(e=>e.id!==id);
  saveData();
};

addRecipeBtn.onclick=()=>{ resetRecipePhoto(); recipeDialog.showModal(); };
function openWishDialog(){
  fillSelects();
  resetWishPhoto();
  wishPerson.value=currentPersonName();
  wishDialog.showModal();
}
addWishBtn.onclick=openWishDialog;
document.querySelector('[data-action="add-recipe"]').onclick=()=>setTimeout(()=>{ resetRecipePhoto(); recipeDialog.showModal(); },150);
document.querySelector('[data-action="add-wish"]').onclick=()=>setTimeout(openWishDialog,150);

recipeForm.onsubmit=e=>{
  e.preventDefault(); const f=new FormData(recipeForm);
  data.recipes.unshift({id:crypto.randomUUID(),name:f.get("name"),servings:Number(f.get("servings")),photo:recipePhotoData.value,ingredients:parseIngredients(f.get("ingredients")),steps:f.get("steps").split("\n").filter(Boolean),author:f.get("author")});
  recipeForm.reset();
  resetRecipePhoto();
  recipeDialog.close();
  saveData();
};
wishForm.onsubmit=e=>{
  e.preventDefault(); const f=new FormData(wishForm);
  const person=currentPersonName();
  if(!person){
    alert("Je account is nog niet aan een familielid gekoppeld.");
    return;
  }
  data.wishes.unshift({
    id:crypto.randomUUID(),
    person,
    occasion:f.get("occasion"),
    title:f.get("title"),
    price:f.get("price"),
    link:f.get("link"),
    note:f.get("note"),
    photo:wishPhotoData.value,
    createdBy:currentUser?.uid || "",
    createdAt:new Date().toISOString()
  });
  wishForm.reset();
  resetWishPhoto();
  wishDialog.close();
  saveData();
};

recipeSearch.oninput=renderRecipes; wishPersonFilter.onchange=renderWishes; wishOccasionFilter.onchange=renderWishes;
groceryHousehold.onchange=()=>{currentHousehold=groceryHousehold.value;renderGroceries();};

function openSimple(title, fields, mode){
  simpleTitle.textContent=title; simpleMode=mode;
  simpleFields.innerHTML=fields; simpleDialog.showModal();
}
addGroceryBtn.onclick=()=>openSimple("Product toevoegen",`<label>Product<input name="text" required></label>`,"grocery");
addHouseholdBtn.onclick=()=>openSimple("Huishouden toevoegen",`
  <label>Naam<input name="name" required></label>
  <label>Leden <small>Meerdere kiezen is mogelijk</small><select name="members" multiple size="7">${data.family.map(p=>`<option>${p.name}</option>`).join("")}</select></label>`,"household");
simpleForm.onsubmit=e=>{
  e.preventDefault(); const f=new FormData(simpleForm);
  if(simpleMode==="grocery") data.groceries.push({id:crypto.randomUUID(),householdId:currentHousehold,text:f.get("text"),done:false});
  if(simpleMode==="household") data.households.push({id:crypto.randomUUID(),name:f.get("name"),members:f.getAll("members")});
  simpleForm.reset(); simpleDialog.close(); saveData();
};

window.deleteWish=id=>{
  const wish=data.wishes.find(w=>w.id===id);
  if(!wish || !canManageWish(wish)) return;
  if(!confirm(`Wens "${wish.title}" verwijderen?`)) return;
  data.wishes=data.wishes.filter(w=>w.id!==id);
  saveData();
};

window.toggleGrocery=id=>{const g=data.groceries.find(x=>x.id===id);if(g){g.done=!g.done;saveData();}};
window.deleteGrocery=id=>{data.groceries=data.groceries.filter(x=>x.id!==id);saveData();};
window.addRecipeToGroceries=id=>{
  const r=data.recipes.find(x=>x.id===id); if(!r||!currentHousehold)return;
  r.ingredients.forEach(i=>data.groceries.push({id:crypto.randomUUID(),householdId:currentHousehold,text:[i.amount,i.unit,i.name].filter(Boolean).join(" "),done:false}));
  saveData(); navigate("boodschappen");
};
window.openRecipe=id=>{
  const r=data.recipes.find(x=>x.id===id); if(!r)return;
  let portions=r.servings;
  const render=()=>{
    viewRecipeTitle.textContent=r.name;
    viewRecipeBody.innerHTML=`${r.photo?`<img class="recipe-photo" src="${r.photo}" alt="">`:""}
      <div class="portion-control"><button id="minusPortion">−</button><strong>Voor ${portions} personen</strong><button id="plusPortion">+</button></div>
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
      adminSettings={
        allowedEmails:Array.isArray(remote.allowedEmails)?remote.allowedEmails.map(x=>String(x).toLowerCase()):[ADMIN_EMAIL],
        accounts:Array.isArray(remote.accounts)?remote.accounts:[]
      };
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
  signupMessage.textContent='Account aanmaken…';
  try{
    const result=await auth.createUserWithEmailAndPassword(email,p1);
    const snap=await db.doc(ADMIN_DOC).get();
    const allowed=snap.exists && (snap.data().allowedEmails||[]).map(x=>String(x).toLowerCase()).includes(email);
    if(!allowed){ await result.user.delete(); signupMessage.textContent='Dit e-mailadres is nog niet door Rinze uitgenodigd.'; return; }
    signupDialog.close();
    loginMessage.textContent='Account gemaakt. Je bent nu ingelogd.';
  }catch(err){
    const msgs={"auth/email-already-in-use":"Voor dit e-mailadres bestaat al een account.","auth/weak-password":"Kies een wachtwoord van minimaal 6 tekens.","auth/invalid-email":"Dit e-mailadres is niet geldig."};
    signupMessage.textContent=msgs[err.code]||'Account aanmaken lukt niet.';
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
  cloudReady=false;
  currentUser=null;
  loginScreen.classList.remove("hidden");
  setSyncStatus("Nog niet ingelogd");
  renderProfile();
};

function showLoggedIn(user){
  const firstOpen=!currentUser;
  currentUser=user;
  loginScreen.classList.add("hidden");
  loginMessage.textContent="";
  fillSelects();
  renderProfile();
  renderWishes();
  renderAgenda();
  renderWeekmenu();

  if(firstOpen){
    loadAdminSettings().finally(()=>subscribeToCloudData());
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

    // Open de app direct. Het profiel wordt daarna op de achtergrond geladen.
    showLoggedIn(provisionalProfile(result.user));
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

function initFirebase(){
  const settings=window.HOGETERPJES_FIREBASE;
  if(!settings?.useFirebase) return false;
  try{
    firebase.initializeApp(settings.config);
    auth=firebase.auth();
    db=firebase.firestore();
    auth.onAuthStateChanged(user=>{
      if(!user){
        currentUser=null;
        loginScreen.classList.remove("hidden");
        return;
      }

      // Meteen openen met een voorlopig profiel.
      showLoggedIn(provisionalProfile(user));

      // Daarna uitnodigingen en het echte profiel op de achtergrond laden.
      loadAdminSettings().then(()=>loadUserProfile(user))
        .then(profile=>{
          currentUser=profile;
          renderProfile();
        })
        .catch(err=>console.warn("Profiel bijwerken mislukt:",err));
    });
    firebaseStatus.textContent="Firebase gekoppeld";
    setSyncStatus("Wachten op inloggen");
    return true;
  }catch(e){
    firebaseStatus.textContent="Firebase-configuratie bevat een fout";
    firebaseStatus.classList.add("error");
    return false;
  }
}

bindNav();
renderAll();
const firebaseActive=initFirebase();
if(!firebaseActive){
  loginMessage.textContent="Firebase kon niet worden gestart.";
}
if("serviceWorker" in navigator){
  window.addEventListener("load", async ()=>{
    try{
      const registration=await navigator.serviceWorker.register("service-worker.js?v=1.2.8");
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
