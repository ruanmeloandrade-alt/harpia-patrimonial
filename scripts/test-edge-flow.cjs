/** Runs the actual Edge HTTP handlers against an isolated persistence adapter. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),esbuild=require('esbuild');
const shared=esbuild.transformSync(fs.readFileSync('supabase/functions/_shared/salesbot-flow.ts','utf8'),{loader:'ts',format:'cjs'}).code;
const m={exports:{}};new Function('module','exports',shared)(m,m.exports);
const clone=x=>JSON.parse(JSON.stringify(x));
const rows=new Map(),tasks=[],outbox=[];
const botKey='harpia:f05:salesbots',execKey='harpia:f05:salesbot-executions';
rows.set(execKey,{value:[],revision:0});
const db={rpc:async(name,args)=>{
  if(name==='admin_validate_f05_scheduler_token')return{data:true,error:null};
  if(name==='admin_apply_crm_automation_action'){tasks.push(args.p_config.title);return{data:{},error:null};}
  throw Error('Unexpected RPC '+name);
},from(table){let op='select',payload,filters={};const q={
  select(){return q},eq(k,v){filters[k]=v;return q},update(p){op='update';payload=p;return q},insert(p){op='insert';payload=p;return q},
  maybeSingle(){return execute()},single(){return execute()},then(a,b){return execute().then(a,b)}
};async function execute(){
  if(table==='f05_shared_storage'){
    const row=rows.get(filters.storage_key);
    if(!row)return{data:null,error:null};
    if(op==='update'){
      if(filters.revision!==undefined&&row.revision!==filters.revision)return{data:null,error:null};
      Object.assign(row,clone(payload));
    }
    return{data:clone(row),error:null};
  }
  if(table==='platform_module_state')return{data:{state:{leads:[]}},error:null};
  if(table==='automation_event_outbox'&&op==='insert'){outbox.push(payload);return{data:null,error:null};}
  throw Error('Unexpected query '+table+' '+op);
}return q;}};
function handler(slug){let serve;
  let source=fs.readFileSync(`supabase/functions/${slug}/index.ts`,'utf8');
  source=source.replace(/import \{ createClient \} from [^;]+;/,'const createClient=globalThis.qaCreateClient;');
  source=source.replace(/import \{ salesBotNextBlock, salesBotConditionRoute \} from [^;]+;/,'const {salesBotNextBlock,salesBotConditionRoute}=globalThis.qaFlow;');
  const js=esbuild.transformSync(source,{loader:'ts',format:'cjs'}).code;
  vm.runInNewContext(js,{Deno:{env:{get:key=>key==='SUPABASE_URL'?'https://qa.invalid':key==='SUPABASE_SERVICE_ROLE_KEY'?'qa-key':undefined},serve:fn=>serve=fn},qaCreateClient:()=>db,qaFlow:m.exports,Response,Request,Headers,crypto:globalThis.crypto,console,Date,AbortSignal,fetch:()=>{throw Error('No outbound network allowed in isolated handler tests')},module:{exports:{}},exports:{}});
  return serve;
}
const runtime=handler('f05-runtime-worker'),delay=handler('f05-delay-worker');
const request=(body,headers={Authorization:'Bearer qa-key'})=>new Request('https://qa.invalid',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
const make=(id,type,nextBlockId,config={})=>({id,type,nextBlockId,config});
let n=0;const check=(name,fn)=>{fn();n++;console.log('PASS',name)};
async function main(){
  const blocked=await runtime(request({action:'start_salesbot',botId:'qa'},{}));
  check('runtime requires server authorization',()=>assert.equal(blocked.status,401));
  const blocks=[make('start','trigger','delay',{event:'manual'}),make('trap','create_task',null,{title:'TRAP'}),make('delay','delay','condition',{duration:'1h',pauseMode:'timer'}),{...make('condition','condition',null,{logic:'any',rules:[{id:'buy',field:'message',operator:'contains',value:'comprar'},{id:'rent',field:'message',operator:'contains',value:'alugar'}]}),routes:{buy:'buy',rent:'rent'},falseNextBlockId:'end'},make('buy','create_task',null,{title:'buy'}),make('rent','create_task',null,{title:'rent'}),make('end','finish',null)];
  rows.set(botKey,{value:[{id:'qa',status:'active',blocks}],revision:0});
  const started=await (await runtime(request({action:'start_salesbot',botId:'qa',leadId:'qa-lead',context:{message:'alugar'}}))).json();
  check('actual runtime schedules timer',()=>assert.equal(started.data?.runtimeStatus,'paused'));
  check('actual runtime skips disconnected array entry',()=>assert.deepEqual(tasks,[]));
  const execution=rows.get(execKey).value[0];
  check('actual runtime persisted correct pause block',()=>assert.equal(execution.currentBlockId,'delay'));
  await delay(request({}, {'x-f05-scheduler-token':'qa-token'}));
  check('actual scheduler does not resume early',()=>assert.deepEqual(tasks,[]));
  execution.resumeAt=new Date(Date.now()-1000).toISOString();
  const resumed=await delay(request({}, {'x-f05-scheduler-token':'qa-token'}));
  assert.equal(resumed.status,200);
  check('actual scheduler follows graph and second OU output',()=>assert.deepEqual(tasks,['rent']));
  check('actual scheduler finishes persisted execution',()=>assert.equal(rows.get(execKey).value[0].status,'completed'));
  await delay(request({}, {'x-f05-scheduler-token':'qa-token'}));
  check('actual scheduler does not replay finished execution',()=>assert.deepEqual(tasks,['rent']));
  await runtime(request({action:'start_salesbot',botId:'qa',leadId:'qa-lead',context:{message:'alugar'}}));
  const paused=await(await runtime(request({action:'pause_salesbot',leadId:'qa-lead'}))).json();
  check('manual server pause also cancels timed waits',()=>assert.equal(paused.data.affected,1));
  check('manual server pause clears scheduler deadline',()=>assert.equal(rows.get(execKey).value[0].resumeAt,undefined));
  rows.set(botKey,{value:[{id:'qa',status:'active',blocks:[make('start','trigger','wait',{event:'manual'}),make('wait','delay','after',{pauseMode:'customer_reply',duration:'1m'}),make('after','create_task',null,{title:'incorrect'})]}],revision:0});
  await runtime(request({action:'start_salesbot',botId:'qa',leadId:'qa-lead'}));
  check('server event pause cannot become an accidental timer',()=>assert.equal(rows.get(execKey).value[0].resumeAt,undefined));
  check('server event pause holds the downstream action',()=>assert.deepEqual(tasks,['rent']));
  console.log(JSON.stringify({tests:n,mode:'actual Edge handlers, isolated database adapter; no production network or account changes'}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
