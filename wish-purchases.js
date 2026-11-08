/* Purchase identities never belong in shared app data, logs or localStorage. */
(function(root){
  "use strict";
  const key=(person,id)=>`${person}|${id}`;
  function visible(person,userPerson,state){
    if(person===userPerson)return true;
    // Wait for both listeners; never briefly show a claimed wish while loading.
    return !!state?.ready && !state.error && (state.mine || !state.status);
  }
  function references(db,uid,person,id){
    if(!person || !id || [person,id].some(x=>/[\/|]/.test(x))) throw new Error("Ongeldige wens.");
    return {
      status:db.collection("wishPurchases").doc(person).collection("statuses").doc(id),
      lock:db.collection("wishPurchases").doc(person).collection("locks").doc(id),
      mine:db.collection("wishPurchaseClaims").doc(uid).collection("items").doc(key(person,id))
    };
  }
  async function change(db,user,person,id,status){
    if(!user?.uid || !db) throw new Error("Log opnieuw in om deze wens te reserveren.");
    if(person===user.person) throw new Error("Je kunt je eigen wens niet reserveren.");
    if(!["reserved","bought",null].includes(status)) throw new Error("Ongeldige aankoopstatus.");
    const refs=references(db,user.uid,person,id);
    await db.runTransaction(async transaction=>{
      const snapshot=await transaction.get(refs.status);
      if(snapshot.exists){
        const mine=await transaction.get(refs.mine);
        if(!mine.exists) throw new Error("Deze wens is al door iemand anders gereserveerd of gekocht.");
      }else if(status===null){
        return;
      }
      if(status===null){
        transaction.delete(refs.status);
        transaction.delete(refs.lock);
        transaction.delete(refs.mine);
      }else{
        transaction.set(refs.status,{status});
        transaction.set(refs.lock,{buyerUid:user.uid});
        transaction.set(refs.mine,{person,wishId:id,status});
      }
    });
  }
  function create(db,user,render){
    const statuses=new Map(), mine=new Map(), ready=new Set(), errors=new Set();
    const listeners=new Map();
    let active=true, myReady=false, myError=false;
    const changed=()=>{if(active)render();};
    const unsubscribe=db.collection("wishPurchaseClaims").doc(user.uid).collection("items").onSnapshot(snapshot=>{
      if(!active)return;
      mine.clear();
      snapshot.docs.forEach(doc=>{const item=doc.data();mine.set(key(item.person,item.wishId),item);});
      myReady=true;myError=false;changed();
    },()=>{if(!active)return;myReady=false;myError=true;changed();});
    return {
      watch(people){
        for(const person of people){
          if(!person || person===user.person || listeners.has(person) || /[\/|]/.test(person))continue;
          // Install before subscribing: some test adapters deliver synchronously.
          listeners.set(person,()=>{});
          const stop=db.collection("wishPurchases").doc(person).collection("statuses").onSnapshot(snapshot=>{
            if(!active)return;
            for(const id of statuses.keys())if(id.startsWith(person+"|"))statuses.delete(id);
            snapshot.docs.forEach(doc=>statuses.set(key(person,doc.id),doc.data().status));
            ready.add(person);errors.delete(person);changed();
          },()=>{if(!active)return;ready.delete(person);errors.add(person);changed();});
          listeners.set(person,stop);
        }
      },
      state(person,id){
        if(person===user.person)return {hidden:true};
        return {ready:myReady&&ready.has(person),error:myError||errors.has(person),status:statuses.get(key(person,id))||null,mine:mine.has(key(person,id))};
      },
      change:(person,id,status)=>change(db,user,person,id,status),
      stop(){active=false;unsubscribe();listeners.forEach(stop=>stop());listeners.clear();statuses.clear();mine.clear();ready.clear();errors.clear();}
    };
  }
  const api={key,references,change,create,visible};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else root.WishPurchases=api;
})(typeof window!=="undefined"?window:globalThis);
