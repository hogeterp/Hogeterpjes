// Run with Playwright available and a local HTTP server: APP_BASE_URL=http://127.0.0.1:8765 node tests/app/delegated-wishes-browser.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});
 try{
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APP_BASE_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>typeof firebaseActive==='boolean');
 await page.evaluate(()=>new Promise(resolve=>{const stop=firebase.auth().onAuthStateChanged(()=>{stop();resolve();});}));
 await page.evaluate(()=>{
  currentUser={uid:'tessa',displayName:'Tessa',email:'tessa@example.test'};
  adminSettings.accounts=[{name:'Tessa',email:'tessa@example.test',active:true},{name:'Rivaldo',email:'rivaldo@example.test',active:true},{name:'Christa',email:'christa@example.test',active:true}];
  data.family=[{name:'Tessa'},{name:'Rivaldo'},{name:'Christa'}];
  data.wishes=[{id:'existing-rivaldo',person:'Rivaldo',title:'Rivaldo origineel',createdBy:'rivaldo'},{id:'other',person:'Christa',title:'Andermans wens'}];
  window.testBusy=false;
  wishPurchases={state:()=>({ready:true,status:window.testBusy?'bought':null,mine:false}),stop:()=>{}};
  window.testSaves=0;saveData=()=>{window.testSaves++;};
  loginScreen.classList.add('hidden');navigate('verlanglijstjes');fillSelects();wishPersonFilter.value='Rivaldo';renderWishes();
 });
 await page.locator('#addWishBtn').click();
 assert.deepEqual(await page.locator('#wishPerson option').allTextContents(),['Tessa','Rivaldo']);
 assert.equal(await page.locator('#wishPerson').inputValue(),'Rivaldo');
 assert.equal(await page.locator('#wishPerson').isEnabled(),true);
 await page.locator('#wishForm input[name=title]').fill('Nieuwe wens voor Rivaldo');
 await page.locator('#wishForm button[type=submit]').click();
 await page.waitForFunction(()=>data.wishes.some(w=>w.title==='Nieuwe wens voor Rivaldo'));
 const record=await page.evaluate(()=>data.wishes.find(w=>w.title==='Nieuwe wens voor Rivaldo'));
 assert.equal(record.person,'Rivaldo');assert.equal(record.createdBy,'tessa');
 const existing=page.locator('#wishList article').filter({hasText:'Rivaldo origineel'});
 assert.equal(await existing.getByRole('button',{name:'Verwijderen',exact:true}).count(),0);
 await existing.getByRole('button',{name:'Bewerken',exact:true}).click();
 assert.equal(await page.locator('#wishPerson').inputValue(),'Rivaldo');
 assert.equal(await page.locator('#wishPerson').isDisabled(),true);
 await page.locator('#wishForm input[name=title]').fill('Rivaldo aangepast');
 await page.locator('#wishForm button[type=submit]').click();
 assert.equal(await page.evaluate(()=>data.wishes.find(w=>w.id==='existing-rivaldo').person),'Rivaldo');
 assert.equal(await page.evaluate(()=>data.wishes.find(w=>w.id==='existing-rivaldo').createdBy),'rivaldo');
 // Editing a wish never changes the current login or purchase identity.
 assert.equal(await page.evaluate(()=>purchasePersonName()),'Tessa');
 await page.evaluate(()=>{window.testBusy=true;renderWishes();});
 assert.equal(await page.locator('#wishList article').count(),0,'another buyer still hides Rivaldo wishes from Tessa');
 await page.evaluate(()=>{window.testBusy=false;renderWishes();deleteWish('existing-rivaldo');openWishDialog('other');});
 assert.equal(await page.locator('#wishDialog').evaluate(e=>e.open),false,'Tessa cannot edit a third person');
 assert.equal(await page.evaluate(()=>data.wishes.some(w=>w.id==='existing-rivaldo')),true,'delegate cannot delete');
 // Changing a disabled select through developer tools must not move the wish.
 await page.evaluate(()=>{openWishDialog('existing-rivaldo');wishPerson.innerHTML='<option value="Tessa">Tessa</option>';wishPerson.value='Tessa';});
 await page.locator('#wishForm button[type=submit]').click();
 assert.equal(await page.evaluate(()=>data.wishes.find(w=>w.id==='existing-rivaldo').person),'Rivaldo');
 await page.evaluate(()=>{wishDialog.close();currentUser={uid:'christa',displayName:'Christa',email:'christa@example.test'};openWishDialog();});
 assert.deepEqual(await page.locator('#wishPerson option').allTextContents(),['Christa']);
 assert.equal(await page.locator('#wishPerson').isDisabled(),true);
 assert.deepEqual(errors,[]);
 console.log('PASS Tessa adds/edits Rivaldo wishes; original owner preserved; cannot delete/reassign/edit third person; own purchase identity and hidden gifts preserved; other users remain restricted; no JS errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
