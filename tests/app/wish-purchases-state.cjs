const assert=require('node:assert/strict');
const {create,visible}=require('../../wish-purchases.js');
const subscriptions=[];
const db={collection:collection=>({doc:person=>({collection:child=>({onSnapshot:(next,error)=>{
 const entry={collection,person,child,next,error,stopped:false};subscriptions.push(entry);return ()=>{entry.stopped=true;};
}})})})};
let changes=0;
const controller=create(db,{uid:'buyer',person:'Tessa'},()=>changes++);
controller.watch(['Tessa','Christa','Christa']);
assert.equal(subscriptions.length,2,'never subscribe to own status or duplicate listeners');
const [mine,status]=subscriptions;
const snapshot=rows=>({docs:rows.map(([id,data])=>({id,data:()=>data}))});
assert.deepEqual(controller.state('Tessa','wish'),{hidden:true});
assert.equal(controller.state('Christa','wish').ready,false);
mine.next(snapshot([['Christa|wish',{person:'Christa',wishId:'wish',status:'reserved'}]]));
status.next(snapshot([['wish',{status:'reserved'}]]));
assert.deepEqual(controller.state('Christa','wish'),{ready:true,error:false,status:'reserved',mine:true});
mine.error(new Error('permission-denied'));
assert.equal(controller.state('Christa','wish').error,true);
assert.equal(controller.state('Christa','wish').ready,false);
controller.stop();
const stoppedChanges=changes;
assert(subscriptions.every(s=>s.stopped));
status.next(snapshot([['wish',{status:'bought'}]]));
mine.next(snapshot([['Christa|wish',{person:'Christa',wishId:'wish',status:'bought'}]]));
assert.equal(changes,stoppedChanges,'late callbacks cannot restore data after logout');
assert.equal(controller.state('Christa','wish').status,null);
assert.equal(controller.state('Christa','wish').mine,false);
console.log('PASS purchase listener isolation, duplicate protection, failure state, logout cleanup and late callbacks');

for(const status of ['reserved','bought']){
 const claimed={ready:true,error:false,status,mine:false};
 assert.equal(visible('Christa','Maaike',claimed),false,'other relatives never see occupied wishes');
 assert.equal(visible('Christa','Tessa',{...claimed,mine:true}),true,'buyer keeps their wish');
 assert.equal(visible('Christa','Christa',{hidden:true}),true,'recipient always keeps own wish');
}
assert.equal(visible('Christa','Maaike',{ready:true,status:null,mine:false}),true,'released wish returns');
assert.equal(visible('Christa','Maaike',undefined),false,'no loading flash');
assert.equal(visible('Christa','Maaike',{ready:false,status:null}),false,'no flash while listeners load');
assert.equal(visible('Christa','Maaike',{ready:true,error:true,status:null}),false,'fail closed on listener errors');
console.log('PASS owner/buyer/other visibility for reserved, bought, released, loading and error states');
