const fs = require('node:fs');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const ts = require('typescript');
const vm = require('node:vm');
let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log('PASS', name); };
function load(source) {
  const code=esbuild.buildSync({stdin:{contents:source,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs'}).outputFiles[0].text;
  const module={exports:{}}; new Function('module','exports','require',code)(module,module.exports,require); return module.exports;
}
const api = load(`export * from './src/features/salesbot/validation'; export * from './src/features/salesbot/runtime'; export * from './src/features/salesbot/repository'; export * from './src/features/salesbot/executionRepository'; export * from './src/features/automations/f05Storage'; export * from './supabase/functions/_shared/salesbot-flow'; export { salesBotConditionEvaluator } from './src/app/integrations/salesBotConditionEvaluator';`);
function edgeFunctions(path) {
  const source=fs.readFileSync(path,'utf8');
  const ast=ts.createSourceFile(path,source,99,true);
  return load(ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['getPath','evaluateCondition','isPipelineActiveNow','matchesPipeline'].includes(n.name?.text)).map(n=>'export '+n.getText(ast)).join('\n'));
}
async function main() {
  for(const [duration,ms] of [['1s',1000],['2m',120000],['2h',7200000],['3d',259200000],['1w',604800000]]) check('delay '+duration,()=>assert.equal(api.salesBotDelayDurationToMs(duration),ms));
  for(const value of ['0m','-1h','abc','1.5h']) check('invalid delay '+value,()=>assert.equal(api.salesBotDelayDurationToMs(value),null));
  check('condition syntax',()=>assert.equal(api.validateSalesBotConditionExpression('message contains oi'),true));
  const blocks=[{id:'start',type:'trigger',nextBlockId:'end'},{id:'unrelated',type:'finish',nextBlockId:null},{id:'end',type:'finish',nextBlockId:null}];
  check('graph skips unrelated blocks',()=>assert.equal(api.salesBotNextBlock(blocks,blocks[0]),'end'));
  check('graph null ends flow',()=>assert.equal(api.salesBotNextBlock(blocks,blocks[2]),null));
  const legacy=[{id:'one',type:'trigger'},{id:'two',type:'finish'}];
  check('legacy sequential compatibility',()=>assert.equal(api.salesBotNextBlock(legacy,legacy[0]),'two'));
  const condition={id:'condition',type:'condition',config:{logic:'any',rules:[{id:'one',field:'message',operator:'contains',value:'comprar'},{id:'two',field:'message',operator:'contains',value:'alugar'}]},routes:{one:'buy',two:'rent'},falseNextBlockId:'none'};
  for(const path of ['supabase/functions/f05-runtime-worker/index.ts','supabase/functions/f05-delay-worker/index.ts']) {
    const edge=edgeFunctions(path);
    for(const [message,ruleId] of [['quero comprar','one'],['quero ALUGAR','two']]) check(path+' rule '+ruleId,()=>assert.equal(api.salesBotConditionRoute(condition,{message},edge.evaluateCondition).ruleId,ruleId));
    check(path+' unmatched',()=>assert.equal(api.salesBotConditionRoute(condition,{message:'oi'},edge.evaluateCondition).matched,false));
    check(path+' quoted comparison',()=>assert.equal(edge.evaluateCondition('stageId = "stage-1"',{stageId:'stage-1'}),true));
    check(path+' array contains',()=>assert.equal(edge.evaluateCondition('tagIds contains "tag-1"',{tagIds:['tag-1']}),true));
  }
  api.configureF05SharedStorage({values:{},backend:{save:async()=>{}}});
  const bot=await api.createSalesBotConfirmed({name:'QA isolated'});
  const make=(id,type,nextBlockId,config={})=>({id,type,label:id,nextBlockId,config});
  const actions=[];
  const deps={...api.unconfiguredSalesBotRuntimeDependencies,condition:api.salesBotConditionEvaluator,crm:{...api.unconfiguredSalesBotRuntimeDependencies.crm,createTask:async(input)=>{actions.push(input.title);return {status:'accepted'};}},message:{send:async()=>({status:'accepted'})},delay:{schedule:async()=>({status:'accepted'})}};
  api.updateSalesBot(bot.id,{blocks:[make('start','trigger','condition',{event:'manual'}),{...condition},make('buy','create_task',null,{title:'buy'}),make('rent','create_task',null,{title:'rent'}),make('none','finish',null)]});
  const execution=api.startExecution({botId:bot.id,leadId:'isolated'});
  await api.runSalesBotExecution(execution.id,{leadId:'isolated',data:{message:'alugar'}},deps);
  check('browser OU follows second output',()=>assert.deepEqual(actions,['rent']));
  api.updateSalesBot(bot.id,{blocks:[make('start','trigger','pause1',{event:'manual'}),make('pause1','delay','task1',{pauseMode:'customer_reply'}),make('task1','create_task','pause2',{title:'first'}),make('pause2','delay','task2',{pauseMode:'customer_reply'}),make('task2','create_task',null,{title:'second'})]});
  const waiting=api.startExecution({botId:bot.id,leadId:'isolated'});
  const run=async(messageId,messageCreatedAt)=>{const saved=api.listSalesBotExecutions().find(x=>x.id===waiting.id);return api.runSalesBotExecution(waiting.id,{leadId:'isolated',data:{...saved.runtimeContext,salesBotEvent:'message_received',messageId,messageCreatedAt}},deps);};
  await run('initial');
  check('initial inbound cannot release first pause',()=>assert.equal(api.listSalesBotExecutions().find(x=>x.id===waiting.id).currentBlockId,'pause1'));
  await run('initial');
  check('duplicate inbound stays paused',()=>assert.deepEqual(actions,['rent']));
  await run('older-queued-message','2000-01-01T00:00:00Z');
  check('queued older message cannot release pause',()=>assert.deepEqual(actions,['rent']));
  await run('reply-1');
  check('fresh reply releases one pause',()=>assert.deepEqual(actions,['rent','first']));
  check('same reply cannot release next pause',()=>assert.equal(api.listSalesBotExecutions().find(x=>x.id===waiting.id).currentBlockId,'pause2'));
  await run('reply-1');
  check('redelivery cannot release next pause',()=>assert.deepEqual(actions,['rent','first']));
  await run('reply-2');
  check('second fresh reply releases second pause',()=>assert.deepEqual(actions,['rent','first','second']));
  api.updateSalesBot(bot.id,{blocks:[make('start','trigger','timer',{event:'manual'}),make('timer','delay','after',{duration:'1h',pauseMode:'timer'}),make('after','create_task',null,{title:'after timer'})]});
  const timer=api.startExecution({botId:bot.id,leadId:'isolated'});
  await api.runSalesBotExecution(timer.id,{leadId:'isolated'},deps);
  const earlyClaim=await api.claimPausedExecutionForResume(timer.id);
  check('timer claims reject early inbound',()=>assert.equal(earlyClaim,null));
  await api.runSalesBotExecution(timer.id,{leadId:'isolated',data:{messageId:'too-early',salesBotEvent:'message_received'}},deps);
  check('inbound cannot bypass timer duration',()=>assert.deepEqual(actions,['rent','first','second']));
  const pipeline=edgeFunctions('supabase/functions/automation-event-worker/index.ts');
  check('custom window requires configured hours',()=>assert.equal(pipeline.isPipelineActiveNow({actionConfig:{activeMode:'custom'}},{}),false));
  check('custom all-day window',()=>assert.equal(pipeline.isPipelineActiveNow({actionConfig:{activeMode:'custom',activeStart:'00:00',activeEnd:'23:59'}},{}),true));
  check('custom malformed hours rejected',()=>assert.equal(pipeline.isPipelineActiveNow({actionConfig:{activeMode:'custom',activeStart:'99:99',activeEnd:'23:59'}},{}),false));
  const definition={id:'automation',status:'active',pipeline:{pipelineId:'p',stageId:'s',event:'enter',actionConfig:{sourceId:'website'}}};
  const event={event_type:'custom.event'},source={kind:'apply_existing',automationId:'automation',pipelineId:'p',stageId:'s',source:'other'};
  check('apply existing respects source filter',()=>assert.equal(pipeline.matchesPipeline(definition,event,source,{}),false));
  check('apply existing accepts matching source',()=>assert.equal(pipeline.matchesPipeline(definition,event,{...source,source:'website'},{}),true));
  let reject=true;
  api.configureF05SharedStorage({values:{'harpia:f05:salesbots':[bot]},backend:{save:async()=>{if(reject)throw new Error('QA failure');}}});
  await assert.rejects(api.deleteSalesBot(bot.id),/QA failure/); checks++;
  check('failed delete preserves bot',()=>assert.equal(api.listSalesBots().length,1));
  reject=false; await api.deleteSalesBot(bot.id);
  check('confirmed delete persists',()=>assert.equal(api.listSalesBots().length,0));
  console.log(`${checks} checks passed; no production messages or accounts created.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
