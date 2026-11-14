const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
// Execute the production helpers, rather than a duplicate sorting implementation.
const source=fs.readFileSync(require('node:path').join(__dirname,'../../app.js'),'utf8');
const context=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function isoDate('),source.indexOf('function calendarDay('))+source.slice(source.indexOf('function normalizeTodoPriority('),source.indexOf('function renderPrivateTodos(')),context);
const today='2026-11-14';
const compare=(a,b)=>context.compareTodosByPriorityThenDate(a,b,today);
const tasks=[
 {id:'urgent',title:'Zonder datum',priority:'urgent'},
 {id:'future',date:'2026-11-15',priority:'urgent'},
 {id:'done',date:'2026-11-10',priority:'urgent',completed:true},
 {id:'today',date:today,time:'23:59',priority:'low'},
 {id:'old',date:'2026-11-12',priority:'normal'},
 {id:'normal',priority:'normal'}
];
const before=JSON.stringify(tasks);
assert.deepEqual([...tasks].sort(compare).map(t=>t.id),['old','today','future','urgent','normal','done']);
assert.equal(JSON.stringify(tasks),before,'sorting never changes stored tasks or priority');
assert.equal(context.todoDateReached(tasks.find(t=>t.id==='old'),today),true);
assert.equal(context.todoDateReached(tasks.find(t=>t.id==='today'),today),true,'due from start of day, regardless of optional time');
assert.equal(context.todoDateReached(tasks.find(t=>t.id==='done'),today),false);
assert.equal(context.todoDateReached(tasks.find(t=>t.id==='future'),today),false);
assert.equal(context.todoDateReached({date:'',priority:'urgent'},today),false);
assert.equal(context.todoDateReached({date:'invalid'},today),false);
assert.equal(context.todoDateReached({date:'2026-11-15'},'2026-11-15'),true,'tomorrow becomes due at local day change');
assert.equal(context.todoPriorityLabel(tasks.find(t=>t.id==='old').priority),'🟡 Normaal','no automatic urgent label');
assert.equal(compare({date:today,time:'09:00',priority:'low'},{date:today,time:'14:00',priority:'urgent'})<0,true);
assert.equal(compare({date:'2026-11-12',completed:true,priority:'urgent'},{priority:'low'})>0,true);
assert.equal(context.todoDateReached({...tasks.find(t=>t.id==='old'),date:'2026-11-20'},today),false,'rescheduling removes due placement');
console.log('PASS due/open/completed ordering, chronology, optional times, unchanged labels/data, midnight and rescheduling');
