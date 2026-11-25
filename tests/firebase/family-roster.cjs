const assert=require('node:assert/strict');
const {doc,getDoc,setDoc,updateDoc,runTransaction}=require('firebase/firestore');
const {assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const roster=require('../../family-roster.js');
function adapter(db){return {doc:path=>({native:doc(db,path)}),runTransaction:fn=>runTransaction(db,tx=>fn({get:ref=>tx.get(ref.native),set:(ref,data,options)=>tx.set(ref.native,data,options)}))};}
module.exports=async env=>{
 let count=0;
 const ok=async(name,action)=>{await assertSucceeds(action());console.log('PASS '+name);count++;};
 const no=async(name,action)=>{await assertFails(action());console.log('PASS '+name);count++;};
 const admin=env.authenticatedContext('admin-family',{email:'rohogeterp@gmail.com'}).firestore();
 const member=env.authenticatedContext('member-family',{email:'member@example.test',name:'Rinze'}).firestore();
 const anon=env.unauthenticatedContext().firestore();
 const initial=[{name:'Rinze',birth:'1966-01-01',email:'rohogeterp@gmail.com'},{name:'Tessa',birth:'2000-01-01',email:'member@example.test'}];
 await env.withSecurityRulesDisabled(async c=>{
  await setDoc(doc(c.firestore(),'appAdmin/settings'),{allowedEmails:['rohogeterp@gmail.com','member@example.test'],accounts:[{name:'Rinze',email:'rohogeterp@gmail.com',active:true},{name:'Tessa',email:'member@example.test',active:true}],untouched:'keep'});
  await setDoc(doc(c.firestore(),'appData/hogeterpjes'),{family:initial,wishes:[{id:'keep'}]});
 });
 const newMember={name:'Niels',birth:'2001-02-03',email:'niels@example.test'};
 await ok('admin creates protected roster using legacy members',()=>roster.save(adapter(admin),newMember));
 let saved=(await getDoc(doc(admin,'appAdmin/settings'))).data();
 assert.equal(saved.familyMembers.length,3);assert.equal(saved.untouched,'keep');assert.equal(saved.accounts.length,2);count++;
 await ok('invited member can read canonical roster',()=>getDoc(doc(member,'appAdmin/settings')));
 await no('invited member cannot add even when named Rinze',()=>roster.save(adapter(member),{name:'NotAllowed',birth:'2000-01-01'}));
 await no('invited member cannot alter roster directly',()=>updateDoc(doc(member,'appAdmin/settings'),{familyMembers:[]}));
 await no('anonymous cannot add a member',()=>roster.save(adapter(anon),{name:'Anonymous',birth:'2000-01-01'}));
 await assert.rejects(roster.save(adapter(admin),{...newMember,name:' nIELS '}),/bestaat al/);count++;
 await ok('admin edits protected member',()=>roster.save(adapter(admin),{...newMember,birth:'2001-02-04'},'Niels'));
 const racing=await Promise.allSettled([roster.save(adapter(admin),{name:'Concurrent',birth:'2000-01-01'}),roster.save(adapter(admin),{name:'Concurrent',birth:'2000-01-01'})]);
 assert.equal(racing.filter(x=>x.status==='fulfilled').length,1);count++;
 // Updating invite fields must preserve the canonical list.
 await ok('admin can update invitations without removing roster',()=>setDoc(doc(admin,'appAdmin/settings'),{accounts:[...saved.accounts,{name:'Niels',email:'niels@example.test',active:true}]},{merge:true}));
 saved=(await getDoc(doc(admin,'appAdmin/settings'))).data();assert.equal(saved.familyMembers.length,4);count++;
 await ok('unrelated legacy shared updates remain possible',()=>setDoc(doc(member,'appData/hogeterpjes'),{groceries:[{id:'normal-update'}]},{merge:true}));
 assert.equal((await getDoc(doc(admin,'appAdmin/settings'))).data().familyMembers.length,4);count++;
 console.log(`${count} protected family roster checks passed.`);return count;
};
