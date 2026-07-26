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
  wishes: []
};

const KEY="hogeterpjes-data-v1";
const PROFILE_KEY="hogeterpjes-demo-profile";
let data=loadData();
let currentHousehold=data.households[0]?.id || "";
let simpleMode="";
let currentUser=null;
let auth=null;
let db=null;
let cloudUnsubscribe=null;
let cloudReady=false;
let applyingRemote=false;
let saveTimer=null;
const SHARED_DATA_DOC="appData/hogeterpjes";
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
  const displayName=
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
          wishes:Array.isArray(remote.wishes)?remote.wishes:[]
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
  familyList.innerHTML=data.family.map(p=>`<article class="item-card"><h3>${p.name}</h3><div class="meta">${fmtDate(p.birth)} · ${ageFor(p.birth)} jaar</div></article>`).join("");
}
function renderHouseholds(){
  householdList.innerHTML=data.households.map(h=>`<article class="item-card"><h3>🏡 ${h.name}</h3><div class="chips">${h.members.map(m=>`<span class="chip">${m}</span>`).join("")}</div></article>`).join("") || `<div class="card muted">Nog geen huishoudens.</div>`;
  groceryHousehold.innerHTML=data.households.map(h=>`<option value="${h.id}">${h.name}</option>`).join("");
  if(!data.households.some(h=>h.id===currentHousehold)) currentHousehold=data.households[0]?.id||"";
  groceryHousehold.value=currentHousehold;
}
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
function renderWishes(){
  const person=wishPersonFilter.value||"", occasion=wishOccasionFilter.value||"";
  const rows=data.wishes.filter(w=>(!person||w.person===person)&&(!occasion||w.occasion===occasion));
  wishList.innerHTML=rows.length?rows.map(w=>`<article class="item-card"><h3>${w.title}</h3>
    <div class="meta">${w.person} · ${w.occasion}${w.price?` · € ${Number(w.price).toLocaleString("nl-NL",{minimumFractionDigits:2})}`:""}</div>
    ${w.note?`<p>${w.note}</p>`:""}${w.link?`<a href="${w.link}" target="_blank" rel="noopener">Bekijk winkel</a>`:""}
  </article>`).join(""):`<div class="card muted">Nog geen wensen.</div>`;
}
function renderHome(){
  statFamily.textContent=data.family.length; statHouseholds.textContent=data.households.length; statRecipes.textContent=data.recipes.length; statWishes.textContent=data.wishes.length;
  const b=getNextBirthday();
  document.getElementById("nextBirthday").innerHTML=b?`<div class="birthday-icon">🎂</div><div><strong>${b.name}</strong><div class="muted">${b.days===0?"Vandaag jarig!":`over ${b.days} dagen`} · wordt ${ageFor(b.birth)+1}</div></div>`:"";
}
function fillSelects(){
  const opts=data.family.map(p=>`<option>${p.name}</option>`).join("");
  recipeAuthor.innerHTML=opts; wishPerson.innerHTML=opts; wishPersonFilter.innerHTML=`<option value="">Iedereen</option>${opts}`;
}
function renderProfile(){
  const name=currentUser?.displayName || currentUser?.name || "Niet ingelogd";
  const email=currentUser?.email || "";
  profileName.textContent=name;
  profileEmail.textContent=email;
  profileAvatar.textContent=initials(name);
  profileBtn.textContent=initials(name);
  topGreeting.textContent=currentUser ? `Hallo ${name}` : "Familie-app";
  const houses=data.households.filter(h=>h.members.includes(name));
  profileHouseholds.innerHTML=houses.map(h=>`<span class="chip">${h.name}</span>`).join("") || `<span class="muted">Nog niet aan een huishouden gekoppeld</span>`;
}
function renderAll(){ renderHome(); renderFamily(); renderHouseholds(); renderRecipes(); renderGroceries(); renderWishes(); fillSelects(); renderProfile(); }

function parseIngredients(text){
  return text.split("\n").map(x=>x.trim()).filter(Boolean).map(line=>{
    const parts=line.split("|").map(x=>x.trim());
    return {amount:parts[0]||"",unit:parts[1]||"",name:parts.slice(2).join(" | ")||parts[1]||parts[0]};
  });
}

addRecipeBtn.onclick=()=>recipeDialog.showModal();
addWishBtn.onclick=()=>wishDialog.showModal();
document.querySelector('[data-action="add-recipe"]').onclick=()=>setTimeout(()=>recipeDialog.showModal(),150);
document.querySelector('[data-action="add-wish"]').onclick=()=>setTimeout(()=>wishDialog.showModal(),150);

recipeForm.onsubmit=e=>{
  e.preventDefault(); const f=new FormData(recipeForm);
  data.recipes.unshift({id:crypto.randomUUID(),name:f.get("name"),servings:Number(f.get("servings")),photo:f.get("photo"),ingredients:parseIngredients(f.get("ingredients")),steps:f.get("steps").split("\n").filter(Boolean),author:f.get("author")});
  recipeForm.reset(); recipeDialog.close(); saveData();
};
wishForm.onsubmit=e=>{
  e.preventDefault(); const f=new FormData(wishForm);
  data.wishes.unshift({id:crypto.randomUUID(),person:f.get("person"),occasion:f.get("occasion"),title:f.get("title"),price:f.get("price"),link:f.get("link"),note:f.get("note")});
  wishForm.reset(); wishDialog.close(); saveData();
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
      <h3>Ingrediënten</h3><ul class="ingredient-list">${r.ingredients.map(i=>{
        const amount=i.amount && !isNaN(String(i.amount).replace(",",".")) ? (Number(String(i.amount).replace(",","."))*portions/r.servings).toLocaleString("nl-NL",{maximumFractionDigits:2}) : i.amount;
        return `<li><input type="checkbox"><span><strong>${amount} ${i.unit}</strong> ${i.name}</span></li>`;
      }).join("")}</ul><h3>Bereiding</h3><ol class="steps">${r.steps.map(s=>`<li>${s}</li>`).join("")}</ol>`;
    minusPortion.onclick=()=>{if(portions>1){portions--;render();}}; plusPortion.onclick=()=>{portions++;render();};
  }; render(); recipeViewDialog.showModal();
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
  renderProfile();

  if(firstOpen){
    subscribeToCloudData();
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

      // Daarna het echte profiel op de achtergrond laden.
      loadUserProfile(user)
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
      const registration=await navigator.serviceWorker.register("service-worker.js?v=1.1.4");
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
