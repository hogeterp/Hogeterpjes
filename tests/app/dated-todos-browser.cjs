const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});
 try{
 const page=await browser.newPage({serviceWorkers:'block',timezoneId:'Europe/Amsterdam',viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APP_BASE_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>typeof firebaseActive==='boolean');
 await page.evaluate(()=>new Promise(resolve=>{const stop=firebase.auth().onAuthStateChanged(()=>{stop();resolve();});}));
 await page.clock.setFixedTime(new Date('2026-11-13T22:59:30Z'));
 await page.evaluate(()=>{
  currentUser={uid:'test',displayName:'Tessa',email:'tessa@example.test'};
  privateTodos=[
   {id:'urgent',title:'Handmatig dringend',priority:'urgent',completed:false},
   {id:'today',title:'Taak met datum 14 november',date:'2026-11-14',time:'23:00',priority:'low',completed:false},
   {id:'old',title:'Inplannen Zitmax',date:'2026-11-12',priority:'normal',completed:false},
   {id:'done',title:'Al klaar',date:'2026-11-10',priority:'urgent',completed:true},
   {id:'future',title:'Later deze maand',date:'2026-11-20',priority:'normal',completed:false}
  ];
  privateTodosCollection=()=>({doc:id=>({set:async record=>{Object.assign(privateTodos.find(t=>t.id===id),record);renderPrivateTodos();renderHome();}})});
  loginScreen.classList.add('hidden');todoShowCompleted.checked=true;renderPrivateTodos();renderHome();
 });
 const titles=()=>page.locator('#todoList .todo-check strong').allTextContents();
 assert.deepEqual(await titles(),['Inplannen Zitmax','Handmatig dringend','Later deze maand','Taak met datum 14 november','Al klaar']);
 assert.match(await page.locator('#todoList article').filter({hasText:'Inplannen Zitmax'}).textContent(),/Normaal/);
 assert.equal(await page.locator('#dashboardTodos .dashboard-row strong').first().textContent(),'Inplannen Zitmax');
 await page.clock.setFixedTime(new Date('2026-11-13T23:00:30Z'));
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 assert.deepEqual((await titles()).slice(0,3),['Inplannen Zitmax','Taak met datum 14 november','Handmatig dringend']);
 assert.deepEqual((await page.locator('#dashboardTodos .dashboard-row strong').allTextContents()).slice(0,2),['Inplannen Zitmax','Taak met datum 14 november']);
 assert.match(await page.locator('#todoList article').filter({hasText:'Taak met datum 14 november'}).textContent(),/Laag/);
 assert.equal(await page.evaluate(()=>privateTodos.find(t=>t.id==='old').priority),'normal');
 await page.evaluate(()=>togglePrivateTodo('old',true));
 assert.equal((await titles())[0],'Taak met datum 14 november');
 assert.equal((await page.locator('#dashboardTodos').textContent()).includes('Inplannen Zitmax'),false);
 await page.evaluate(()=>togglePrivateTodo('old',false));
 assert.equal((await titles())[0],'Inplannen Zitmax');
 await page.evaluate(()=>{privateTodos.find(t=>t.id==='old').date='2026-11-25';renderPrivateTodos();renderHome();});
 assert.equal((await titles())[0],'Taak met datum 14 november');
 await page.evaluate(()=>{todoShowCompleted.checked=false;renderPrivateTodos();});
 assert.equal((await titles()).includes('Al klaar'),false);
 assert.deepEqual(errors,[]);
 console.log('PASS overdue tasks above urgent on both pages; local midnight advances order; labels unchanged; check/uncheck and reschedule update order; completed hidden; no JS errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
