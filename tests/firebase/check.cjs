const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc,updateDoc,deleteDoc}=require('firebase/firestore');
const {ref,uploadBytes,getBytes,deleteObject,listAll}=require('firebase/storage');
const fs=require('node:fs');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-hogeterpjes',firestore:{host:'127.0.0.1',port:8085,rules:fs.readFileSync('firestore.rules','utf8')},storage:{host:'127.0.0.1',port:9199,rules:fs.readFileSync('storage.rules','utf8')}});
 let count=0;
 const ok=async(name,action)=>{await assertSucceeds(action());console.log('PASS '+name);count++};
 const no=async(name,action)=>{await assertFails(action());console.log('PASS '+name);count++};
 const contexts={admin:env.authenticatedContext('admin',{email:'rohogeterp@gmail.com'}),member:env.authenticatedContext('member',{email:'member@example.test'}),other:env.authenticatedContext('other',{email:'other@example.test'}),christa:env.authenticatedContext('christa',{email:'christa@example.test'}),anon:env.unauthenticatedContext()};
 const db=Object.fromEntries(Object.entries(contexts).map(([k,c])=>[k,c.firestore()]));
 const put=(who,path,value={test:true})=>()=>setDoc(doc(db[who],path),value);
 const read=(who,path)=>()=>getDoc(doc(db[who],path));
 const remove=(who,path)=>()=>deleteDoc(doc(db[who],path));
 try{
 await env.withSecurityRulesDisabled(async c=>{
   const d=c.firestore();
   await setDoc(doc(d,'appAdmin/settings'),{allowedEmails:['member@example.test','christa@example.test']});
   await setDoc(doc(d,'profielen/christa'),{displayName:'Christa'});
   await setDoc(doc(d,'profielen/member'),{displayName:'Familielid'});
   for(const p of ['appData/hogeterpjes','privateCoupleIdeas/rinze-christa','vaults/rinze-christa/files/file','vaults/rinze-christa/folders/folder','diaries/admin/entries/test','privateTodos/member/items/test','privateGiftIdeas/member/ideas/test'])await setDoc(doc(d,p),{test:true});
 });
 for(const path of ['appData/hogeterpjes','sharedWeekMenus/test','sharedAgendaEvents/test']){
   await ok('admin writes '+path,put('admin',path));
   await ok('invited writes '+path,put('member',path));
   await ok('invited reads '+path,read('member',path));
   await no('uninvited cannot write '+path,put('other',path));
   await no('anonymous cannot read '+path,read('anon',path));
 }
 await no('member cannot manage invitations',put('member','appAdmin/settings'));
 await ok('member can read invitations',read('member','appAdmin/settings'));
 await no('uninvited cannot read invitations',read('other','appAdmin/settings'));
 await ok('own profile writable',put('member','profielen/member',{displayName:'Familielid'}));
 await no('other profile private',read('other','profielen/member'));
 await no('member cannot overwrite other profile',put('member','profielen/christa'));
 await ok('admin reads profile',read('admin','profielen/member'));
 for(const path of ['privateCoupleIdeas/rinze-christa','vaults/rinze-christa/files/file','vaults/rinze-christa/folders/folder']){
   await ok('Christa reads '+path,read('christa',path));
   await ok('Christa writes '+path,put('christa',path));
   await no('ordinary member cannot read '+path,read('member',path));
   await no('ordinary member cannot write '+path,put('member',path));
 }
 await no('Christa cannot change vault metadata',put('christa','vaults/rinze-christa'));
 await ok('admin diary accessible',read('admin','diaries/admin/entries/test'));
 await no('Christa cannot read admin diary',read('christa','diaries/admin/entries/test'));
 await no('admin cannot use another diary',put('admin','diaries/member/entries/test'));
 await ok('own todo accessible',read('member','privateTodos/member/items/test'));
 await no('other todo private',read('other','privateTodos/member/items/test'));
 await no('admin cannot read member todo',read('admin','privateTodos/member/items/test'));
 await ok('own gift idea accessible',read('member','privateGiftIdeas/member/ideas/test'));
 await no('other gift idea private',read('other','privateGiftIdeas/member/ideas/test'));
 await ok('member can append change log',put('member','appChangeLog/test'));
 await no('member cannot read change log',read('member','appChangeLog/test'));
 await no('admin cannot alter change log',()=>updateDoc(doc(db.admin,'appChangeLog/test'),{test:false}));
 await no('admin cannot delete change log',remove('admin','appChangeLog/test'));
 await no('unknown path denied to admin',put('admin','unknown/test'));
 // Personal todos deliberately remain accessible without invitation settings.
 await ok('uninvited owns their todo',put('other','privateTodos/other/items/test'));
 await env.withSecurityRulesDisabled(c=>deleteDoc(doc(c.firestore(),'appAdmin/settings')));
 await ok('own todos work without settings',put('member','privateTodos/member/items/offline'));
 await ok('admin works without settings',put('admin','appData/hogeterpjes'));
 await no('ordinary member denied without settings',put('member','appData/hogeterpjes'));
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'appAdmin/settings'),{allowedEmails:['member@example.test','christa@example.test']}));
 const bytes=new Uint8Array([1,2,3]);
 const obj=(who,path)=>ref(contexts[who].storage(),path);
 await ok('admin uploads shared photo',()=>uploadBytes(obj('admin','shared-media/test.jpg'),bytes));
 await no('anonymous cannot read photo',()=>getBytes(obj('anon','shared-media/test.jpg')));
 await no('anonymous cannot upload photo',()=>uploadBytes(obj('anon','shared-media/anon.jpg'),bytes));
 await ok('invited can read shared photo',()=>getBytes(obj('member','shared-media/test.jpg')));
 await no('uninvited cannot read photo',()=>getBytes(obj('other','shared-media/test.jpg')));
 await ok('Christa uploads vault file',()=>uploadBytes(obj('christa','vaults/rinze-christa/test'),bytes));
 await no('ordinary member cannot read vault file',()=>getBytes(obj('member','vaults/rinze-christa/test')));
 await no('vault files cannot be overwritten',()=>uploadBytes(obj('christa','vaults/rinze-christa/test'),bytes));
 await ok('Christa deletes vault file',()=>deleteObject(obj('christa','vaults/rinze-christa/test')));
 await ok('admin uploads own diary photo',()=>uploadBytes(obj('admin','diaries/admin/test'),bytes));
 await no('admin cannot upload other diary',()=>uploadBytes(obj('admin','diaries/member/test'),bytes));
 await no('Christa cannot read admin diary photo',()=>getBytes(obj('christa','diaries/admin/test')));
 await no('member cannot upload unknown storage path',()=>uploadBytes(obj('member','unknown/test'),bytes));
 await no('member cannot list bucket root',()=>listAll(obj('member','')));
 console.log(`${count} emulator checks passed; only synthetic demo data used.`);
 }finally{await env.cleanup()}
})().catch(e=>{console.error(e);process.exitCode=1});
