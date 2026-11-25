const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});
 try{
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APP_BASE_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>typeof firebaseActive==='boolean'&&window.FamilyRoster);
 await page.evaluate(()=>new Promise(resolve=>{const stop=firebase.auth().onAuthStateChanged(()=>{stop();resolve();});}));
 await page.evaluate(()=>{
  currentUser={uid:'admin-test',email:ADMIN_EMAIL,displayName:'Rinze'};
  data=cloneDefaults();
  adminSettings={allowedEmails:[ADMIN_EMAIL,'tessa@example.test'],accounts:[{name:'Rinze',email:ADMIN_EMAIL,active:true},{name:'Tessa',email:'tessa@example.test',active:true}]};
  window.testStore={[ADMIN_DOC]:structuredClone(adminSettings),[SHARED_DATA_DOC]:structuredClone(data)};
  window.testCallbacks={};window.testWrites=0;
  const snapshot=path=>({exists:!!testStore[path],data:()=>structuredClone(testStore[path]),get:key=>structuredClone(testStore[path]?.[key])});
  const publish=path=>testCallbacks[path]?.(snapshot(path));
  db={doc:path=>({path,get:async()=>snapshot(path),set:async(value,options)=>{testStore[path]=options?.merge?{...testStore[path],...structuredClone(value)}:structuredClone(value);testWrites++;publish(path);},onSnapshot:next=>{testCallbacks[path]=next;next(snapshot(path));return ()=>{delete testCallbacks[path];};}}),runTransaction:async fn=>{
   const writes=[];const result=await fn({get:async ref=>snapshot(ref.path),set:(ref,value,options)=>writes.push([ref.path,structuredClone(value),options])});
   for(const[path,value,options]of writes){testStore[path]=options?.merge?{...testStore[path],...value}:value;testWrites++;publish(path);}
   return result;
  }};
  syncWishPurchases=()=>{};refreshStorageUsage=async()=>{};
  saveData=()=>{localStorage.setItem(KEY,JSON.stringify(data));renderAll();};
  subscribeManagedFamily();loginScreen.classList.add('hidden');renderAll();navigate('beheer');
 });
 await page.locator('#addFamilyFromAdminBtn').click();
 await page.locator('#familyEditName').fill('Niels');
 await page.locator('#familyEditBirth').fill('2001-02-03');
 await page.locator('#familyEditEmail').fill('niels@example.test');
 await page.locator('#familyEditSaveBtn').click();
 await page.waitForFunction(()=>!familyEditDialog.open);
 assert.equal(await page.locator('#inviteName').inputValue(),'Niels');
 assert.equal(await page.locator('#inviteEmail').inputValue(),'niels@example.test');
 assert.equal(await page.evaluate(()=>testStore[ADMIN_DOC].familyMembers.length),8);
 assert.equal(await page.evaluate(()=>testStore[ADMIN_DOC].accounts.some(a=>a.name==='Niels')),false,'no invitation until admin submits invite form');
 // Adding the same name again must fail without closing or changing the list.
 await page.locator('#addFamilyFromAdminBtn').click();
 await page.locator('#familyEditName').fill(' nIELS ');await page.locator('#familyEditBirth').fill('2001-02-03');
 await page.locator('#familyEditSaveBtn').click();
 await page.waitForFunction(()=>familyEditMessage.textContent.includes('bestaat al'));
 assert.equal(await page.evaluate(()=>testStore[ADMIN_DOC].familyMembers.length),8);
 await page.evaluate(()=>familyEditDialog.close());
 await page.locator('#inviteForm button[type=submit]').click();
 await page.waitForFunction(()=>inviteMessage.textContent.includes('Klaar.'));
 assert.equal(await page.evaluate(()=>testStore[ADMIN_DOC].familyMembers.some(p=>p.name==='Niels')),true,'inviting must preserve the protected roster');
 assert.equal(await page.evaluate(()=>testStore[ADMIN_DOC].accounts.find(a=>a.name==='Niels').email),'niels@example.test');
 await page.evaluate(()=>{navigate('familie');renderFamily();});
 const card=page.locator('#familyList article').filter({hasText:'Niels'});
 await card.getByRole('button',{name:'Bewerken'}).click();
 await page.locator('#familyEditBirth').fill('2001-02-04');await page.locator('#familyEditSaveBtn').click();
 await page.waitForFunction(()=>!familyEditDialog.open);
 assert.equal(await page.evaluate(()=>testStore[ADMIN_DOC].familyMembers.find(p=>p.name==='Niels').birth),'2001-02-04');
 // Stale/modified shared app data cannot replace the protected roster.
 await page.evaluate(()=>{
  currentUser={uid:'tessa-test',email:'tessa@example.test',displayName:'Rinze'};
  renderAll();subscribeToCloudData();
  testStore[SHARED_DATA_DOC].family=[{name:'Ongewenst',birth:'2000-01-01',email:''}];
  testCallbacks[SHARED_DATA_DOC]({exists:true,data:()=>structuredClone(testStore[SHARED_DATA_DOC])});
 });
 assert.equal(await page.evaluate(()=>data.family.some(p=>p.name==='Niels')),true);
 assert.equal(await page.evaluate(()=>data.family.some(p=>p.name==='Ongewenst')),false);
 assert.equal(await page.locator('#addFamilyBtn').isVisible(),false);
 assert.equal(await page.locator('#addFamilyFromAdminBtn').isVisible(),false);
 const writes=await page.evaluate(()=>testWrites);
 await page.evaluate(async()=>{
  openFamilyEditor();
  familyEditName.value='Verboden';familyEditBirth.value='2000-01-01';
  await familyEditForm.onsubmit({preventDefault(){}});
 });
 assert.equal(await page.evaluate(()=>familyEditDialog.open),false);
 assert.equal(await page.evaluate(()=>testWrites),writes,'ordinary user cannot invoke the save handler even when named Rinze');
 assert.match(await page.locator('#familyEditMessage').textContent(),/Alleen Rinze/);
 await page.evaluate(async()=>{await pushDataToCloud();});
 assert.equal(await page.evaluate(()=>testStore[SHARED_DATA_DOC].family[0].name),'Ongewenst','normal writes omit legacy family instead of overwriting the protected roster');
 assert.deepEqual(errors,[]);
 console.log('PASS admin add/edit/invite, duplicates, preserved roster, stale shared-data isolation, hidden controls and blocked direct member submission, no JS errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
