/* The authoritative roster uses the existing admin-only settings document. */
(function(root){
  "use strict";
  function list(value){
    if(Array.isArray(value))return value;
    if(value&&typeof value==="object"){
      const keys=Object.keys(value);
      if(keys.length&&keys.every(k=>/^\d+$/.test(k)))return keys.sort((a,b)=>Number(a)-Number(b)).map(k=>value[k]);
    }
    return null;
  }
  function member(input){
    const name=String(input.name||"").trim();
    const birth=String(input.birth||"");
    const email=String(input.email||"").trim().toLowerCase();
    if(!name||name.length>80||/[\/|<>]/.test(name))throw new Error("Vul een geldige naam in (maximaal 80 tekens, zonder /, |, < of >).");
    const date=new Date(birth+"T12:00:00Z");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(birth)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==birth)throw new Error("Vul een geldige geboortedatum in.");
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("Vul een geldig e-mailadres in, of laat het leeg.");
    return {name,birth,email};
  }
  async function save(db,input,originalName="",fallback=[]){
    const record=member(input);
    return db.runTransaction(async transaction=>{
      const ref=db.doc("appAdmin/settings");
      const settings=(await transaction.get(ref)).data()||{};
      let members=list(settings.familyMembers);
      if(!members){
        const shared=(await transaction.get(db.doc("appData/hogeterpjes"))).data()||{};
        members=list(shared.family)||fallback;
      }
      const existing=originalName?members.find(p=>p.name===originalName):null;
      if(originalName&&!existing)throw new Error("Dit familielid bestaat niet meer. Vernieuw de pagina.");
      if(members.some(p=>p!==existing&&String(p.name).trim().toLowerCase()===record.name.toLowerCase()))throw new Error("Deze naam bestaat al.");
      const family=existing?members.map(p=>p===existing?{...p,...record}:{...p}):[...members.map(p=>({...p})),record];
      const payload={familyMembers:family};
      if(existing&&record.name!==originalName&&Array.isArray(settings.accounts))payload.accounts=settings.accounts.map(a=>a.name===originalName?{...a,name:record.name}:{...a});
      transaction.set(ref,payload,{merge:true});
      return {family,accounts:payload.accounts};
    });
  }
  const api={list,member,save};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else root.FamilyRoster=api;
})(typeof window!=="undefined"?window:globalThis);
