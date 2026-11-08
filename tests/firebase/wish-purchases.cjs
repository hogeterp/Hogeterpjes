const assert=require('node:assert/strict');
const {doc,getDoc,setDoc,getDocs,collection,runTransaction,writeBatch}=require('firebase/firestore');
const {assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const purchases=require('../../wish-purchases.js');
// Exercise the same transaction implementation used by the compat browser SDK.
function adapter(db){
  const collectionAt=path=>({doc:id=>documentAt(path+'/'+id)});
  const documentAt=path=>({native:doc(db,path),collection:name=>collectionAt(path+'/'+name)});
  return {collection:collectionAt,runTransaction:fn=>runTransaction(db,transaction=>fn({
    get:async ref=>{const s=await transaction.get(ref.native);return {exists:s.exists(),data:()=>s.data()};},
    set:(ref,data)=>transaction.set(ref.native,data),delete:ref=>transaction.delete(ref.native)
  }))};
}
module.exports=async function(env){
 let count=0;
 const ok=async(name,fn)=>{await assertSucceeds(fn());console.log('PASS '+name);count++;};
 const no=async(name,fn)=>{await assertFails(fn());console.log('PASS '+name);count++;};
 const names={owner:'Christa',buyer:'Tessa',second:'Maaike',admin:'Rinze'};
 const email={owner:'christa@example.test',buyer:'tessa@example.test',second:'maaike@example.test',admin:'rohogeterp@gmail.com'};
 const contexts=Object.fromEntries(Object.keys(names).map(uid=>[uid,env.authenticatedContext(uid,{email:email[uid]})]));
 contexts.outsider=env.authenticatedContext('outsider',{email:'outsider@example.test'});
 contexts.anon=env.unauthenticatedContext();
 const db=Object.fromEntries(Object.entries(contexts).map(([uid,c])=>[uid,c.firestore()]));
 await env.withSecurityRulesDisabled(async c=>{
  await setDoc(doc(c.firestore(),'appAdmin/settings'),{allowedEmails:Object.values(email),accounts:Object.keys(names).map(uid=>({name:names[uid],email:email[uid],active:true}))});
  for(const uid of Object.keys(names))await setDoc(doc(c.firestore(),'profielen/'+uid),{displayName:names[uid]});
 });
 const status='wishPurchases/Christa/statuses/wish';
 const lock='wishPurchases/Christa/locks/wish';
 const claim='wishPurchaseClaims/buyer/items/Christa|wish';
 const change=(uid,id,state,person='Christa')=>purchases.change(adapter(db[uid]),{uid,person:names[uid]},person,id,state);
 await ok('reserve wish through production transaction',()=>change('buyer','wish','reserved'));
 await ok('another member reads anonymous status',()=>getDoc(doc(db.second,status)));
 assert.deepEqual((await getDoc(doc(db.second,status))).data(),{status:'reserved'});
 await no('recipient cannot read own status directly',()=>getDoc(doc(db.owner,status)));
 await no('recipient cannot query statuses',()=>getDocs(collection(db.owner,'wishPurchases/Christa/statuses')));
 await no('anonymous cannot read status',()=>getDoc(doc(db.anon,status)));
 await no('uninvited cannot read status',()=>getDoc(doc(db.outsider,status)));
 await no('other member cannot read buyer identity',()=>getDoc(doc(db.second,lock)));
 await no('recipient cannot read buyer identity',()=>getDoc(doc(db.owner,lock)));
 await no('admin cannot read another buyer identity',()=>getDoc(doc(db.admin,lock)));
 await no('cannot list buyer locks',()=>getDocs(collection(db.buyer,'wishPurchases/Christa/locks')));
 await no('other member cannot read private claim',()=>getDoc(doc(db.second,claim)));
 await no('admin cannot read private claim',()=>getDoc(doc(db.admin,claim)));
 await ok('buyer reads their own claims',()=>getDocs(collection(db.buyer,'wishPurchaseClaims/buyer/items')));
 await assert.rejects(change('second','wish','bought'),/al door iemand anders/);count++;
 await ok('reserved becomes bought',()=>change('buyer','wish','bought'));
 assert.deepEqual((await getDoc(doc(db.second,status))).data(),{status:'bought'});
 await no('cannot inject buyer identity into status',()=>setDoc(doc(db.buyer,status),{status:'bought',buyerUid:'buyer'}));
 await no('cannot change status without matching private record',()=>setDoc(doc(db.buyer,status),{status:'reserved'}));
 await no('cannot forge private ownership',()=>setDoc(doc(db.second,'wishPurchaseClaims/second/items/Christa|wish'),{person:'Christa',wishId:'wish',status:'bought'}));
 await ok('buyer releases purchase atomically',()=>change('buyer','wish',null));
 assert.equal((await getDoc(doc(db.second,status))).exists(),false);
 await ok('other buyer directly marks bought without reserving',()=>change('second','wish','bought'));
 await ok('buyer can undo bought to reserved',()=>change('second','wish','reserved'));
 await ok('release lets another buyer reserve again',()=>change('second','wish',null));
 await ok('new reservation after release',()=>change('buyer','wish','reserved'));
 // No admin exception for the admin's own wishes.
 await ok('member reserves admin wish',()=>change('buyer','admin-wish','reserved','Rinze'));
 await no('admin recipient cannot read own surprise',()=>getDoc(doc(db.admin,'wishPurchases/Rinze/statuses/admin-wish')));
 // Self-service profile changes cannot bypass the trusted invitation mapping.
 await ok('recipient can change ordinary profile',()=>setDoc(doc(db.owner,'profielen/owner'),{displayName:'Tessa'}));
 await no('renaming profile cannot reveal own surprise',()=>getDoc(doc(db.owner,status)));
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'profielen/owner'),{displayName:'Christa'}));
 await assert.rejects(change('owner','own','reserved'),/eigen wens/);count++;
 await no('recipient cannot create own surprise with forged UI identity',()=>purchases.change(adapter(db.owner),{uid:'owner',person:'Fake'},'Christa','own','reserved'));
 // An attacker cannot set even an anonymous status without its paired lock/claim.
 await no('standalone anonymous status denied',()=>setDoc(doc(db.buyer,'wishPurchases/Christa/statuses/forged'),{status:'bought'}));
 const spoof=writeBatch(db.second);
 spoof.set(doc(db.second,status),{status:'bought'});
 spoof.set(doc(db.second,lock),{buyerUid:'second'});
 spoof.set(doc(db.second,'wishPurchaseClaims/second/items/Christa|wish'),{person:'Christa',wishId:'wish',status:'bought'});
 await no('atomic batch cannot steal another reservation',()=>spoof.commit());
 const racing=await Promise.allSettled([change('buyer','race','reserved'),change('second','race','bought')]);
 assert.equal(racing.filter(r=>r.status==='fulfilled').length,1);count++;
 console.log(`${count} wish purchase privacy/transaction checks passed.`);
 return count;
};
