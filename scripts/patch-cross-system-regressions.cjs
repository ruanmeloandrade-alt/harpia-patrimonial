/** Patch the two deployed builds without replacing newer UI with main's older build. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),ts=require('typescript'),esbuild=require('esbuild');
const root=path.resolve(process.argv[2]||'../harpia-published');
const builds=['index-pipeline-triggers-0f51dcf24a90.js','index-pipeline-triggers-6f25c6a94e12.js'];
const expected=['3335fba47362b9e234c234a49b1ee328397d3e158eae24f7cf166860bd3e3e1c','33bc89c66f37318609d318c73832292a5d80d1f9ba10c8f8ec48fb97b61d21b4'];
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
function patch(source) {
  let s=source;
  const ast=()=>ts.createSourceFile('bundle.js',s,99,true,ts.ScriptKind.JS);
  function enclosing(term,predicate) {
    const a=ast(),p=s.indexOf(term);assert(p>=0,'missing marker '+term);let result;
    const visit=n=>{if(n.getStart(a)<=p&&n.end>p){if(predicate(n))result=n;ts.forEachChild(n,visit)}};visit(a);assert(result,term);return {node:result,text:result.getText(a),a};
  }
  const fn=term=>enclosing(term,n=>ts.isFunctionDeclaration(n));
  const arrow=term=>enclosing(term,n=>ts.isArrowFunction(n));
  const once=(before,after)=>{assert.equal(s.split(before).length-1,1,before.slice(0,100));s=s.replace(before,after)};
  const change=(found,after)=>{try{esbuild.transformSync(after,{loader:'js',logLevel:'silent'});}catch(error){const at=error.errors[0].location;throw new Error('Invalid isolated edit '+found.text.slice(0,60)+' near '+after.split('\n')[at.line-1].slice(Math.max(0,at.column-120),at.column+120));}once(found.text,after);};
  // All five duration units were rejected by the escaped regex literal.
  once(String.raw`/^(\\d+)\\s*(s|m|h|d|w)$/i`,String.raw`/^(\d+)\s*(s|m|h|d|w)$/i`);
  const output=fn('label:"Sim"'),p=output.node.parameters[0].name.getText();
  change(output,output.text.replace(`if(${p}.type==="condition")return`, `if(${p}.type==="condition"&&${p}.config.logic==="any"&&Array.isArray(${p}.config.rules)&&${p}.config.rules.length)return [...${p}.config.rules.map((r,i)=>({branch:"route:"+String(r.id??""),label:"OU "+(i+1),tone:"yes"})),{branch:"false",label:"Nenhuma",tone:"no"}];if(${p}.type==="condition")return`));
  const evaluator=fn('matched:t.config.logic'),ep=evaluator.node.parameters[0].name.getText();
  const push=evaluator.text.match(/const (\w+)=String\((\w+)\.operator\?\?""\);(\w+)\.push\(\1==="not_contains"\?!(\w+)\.matched:\4\.matched\)/);assert(push);
  change(evaluator,evaluator.text.replace(push[0],`const ${push[1]}=String(${push[2]}.operator??"");const __harpiaMatched=${push[1]}==="not_contains"?!${push[4]}.matched:${push[4]}.matched;if(${ep}.config.logic==="any"&&__harpiaMatched)return {ok:true,matched:true,ruleId:String(${push[2]}.id??"")};${push[3]}.push(__harpiaMatched)`));
  const execute=fn('Aguardando o evento configurado na pausa.'),[executionId,botId,block,context]=execute.node.parameters.map(p=>p.name.getText());
  let ex=execute.text;
  ex=ex.replace(/nextId:(\w+)\.matched\?(\w+)\.nextBlockId\?\?null:/,(_m,result,b)=>`nextId:${result}.matched?(${result}.ruleId?${b}.routes?.[${result}.ruleId]??${b}.nextBlockId??null:${b}.nextBlockId??null):`);
  const delayNode=execute.node.body.statements.find(n=>ts.isIfStatement(n)&&n.expression.getText(execute.a)===`${block}.type==="delay"`);
  assert(delayNode);const oldDelay=delayNode.getText(execute.a);
  const mode=oldDelay.match(/const (\w+)=\w+\(\w+,"pauseMode"\)/)[1];
  const data=ex.match(/const (\w+)=\w+\.data\?\?\{\}/)[1];
  const pause=oldDelay.match(/:(\w+)\(\w+,\w+,"Aguardando o evento configurado/)[1];
  const start=oldDelay.indexOf(`if(${mode}!=="timer")`),end=oldDelay.indexOf('const ',oldDelay.indexOf('pausa.',start));assert(start>=0&&end>start);
  const fresh=`if(${mode}!=="timer"){const __event=String(${data}.salesBotEvent??${data}.event??""),__id=String(${data}.messageId??${data}.eventId??${data}.inbound?.id??""),__wait=${data}.salesBotPauseWait??{};if(__wait.blockId!==${block}.id){${data}.salesBotPauseWait={blockId:${block}.id,eventId:__id,startedAt:Date.now()};return ${pause}(${executionId},${block},"Aguardando um novo evento para a pausa.",${data})}if(!__id||__id===__wait.eventId||(Number.isFinite(Date.parse(String(${data}.messageCreatedAt??"")))&&Date.parse(String(${data}.messageCreatedAt))<=Number(__wait.startedAt??0))||!({customer_reply:["customer_reply","message_received"],audio_open:["audio_open"],audio_close:["audio_close","audio_completed"],video_open:["video_open"],video_close:["video_close","video_completed"],during_business:["outside_business"],outside_business:["during_business"]}[${mode}]??[]).includes(__event))return ${pause}(${executionId},${block},"Aguardando o evento configurado na pausa.",${data});delete ${data}.salesBotPauseWait;return {kind:"continue",nextId:${block}.nextBlockId??null}}`;
  ex=ex.replace(oldDelay,oldDelay.slice(0,start)+fresh+oldDelay.slice(end));change(execute,ex);
  const run=fn('SalesBot sem bloco inicial.'),log=run.text.match(/const (\w+)=\w+\(\)\.find/)[1];
  const found=run.text.match(/if\(!\w+\)return\{status:"failed",reason:"Execução não encontrada\."\};/)[0];
  const runList=run.text.match(/const \w+=(\w+)\(\)\.find/)[1],runId=run.node.parameters[0].name.getText();
  let runText=run.text.replace(found,found+`if(${log}.status==="paused"&&${log}.resumeMode==="next_block"&&${log}.resumeAt&&Date.parse(${log}.resumeAt)>Date.now())return {status:"paused",blockId:${log}.currentBlockId??"",reason:"A duração da pausa ainda não terminou."};`);
  const loop=runText.match(/(?:while\((\w+)\)|for\(;([\w]+);\))\{/);assert(loop,'runtime loop');
  const current=loop[1]??loop[2];
  runText=runText.replace(loop[0],loop[0]+`const __latest=${runList}().find(item=>item.id===${runId});if(__latest?.status==="paused")return {status:"paused",blockId:__latest.currentBlockId??${current},reason:"Execução pausada por comando externo."};`);
  change(run,runText);
  const claim=fn('resume-claim'),cl=claim.text.match(/(\w+)\.status!=="paused"/)[1],tm=claim.text.match(/const (\w+)=\([^;]+getTime\(\);/)[1];
  const timeStmt=claim.text.match(/const \w+=\([^;]+getTime\(\);/)[0];
  const confirmed=claim.text.match(/return await (\w+)\(/)[1];
  change(claim,claim.text.replace(timeStmt,timeStmt+`if(${cl}.resumeMode==="next_block"&&${cl}.resumeAt&&Date.parse(${cl}.resumeAt)>${tm})return null;`));
  const validation=fn('Condição: conecte a saída Sim.'),vp=validation.node.parameters[0].name.getText();
  const sim=validation.text.match(/\w+\.nextBlockId\|\|\w+\.push\("Condição: conecte a saída Sim\."\)/)[0];
  change(validation,validation.text.replace(sim,sim.replace(`${vp}.nextBlockId`,`(${vp}.nextBlockId||(${vp}.config.logic==="any"&&Array.isArray(${vp}.config.rules)&&${vp}.config.rules.length&&${vp}.config.rules.every(r=>${vp}.routes?.[String(r.id??"")])))`)));
  // Keep event identity through each pause and prevent draft loss on F05 updates.
  const inbound=s.match(/salesBotEvent:"message_received",\.\.\.(\w+)\.buttonId/);assert(inbound);
  once(inbound[0],`salesBotEvent:"message_received",messageId:L.id,messageCreatedAt:L.created_at,...${inbound[1]}.buttonId`);
  const revision=s.match(/f05Revision:(\w+)/)[1];
  const effect=enclosing('salesBotEvent:"message_received"',n=>ts.isCallExpression(n)&&n.expression.getText().endsWith('.useEffect'));
  const deps=effect.node.arguments[1];assert(ts.isArrayLiteralExpression(deps));
  const depText=deps.elements.filter(n=>n.getText()!==revision).map(n=>n.getText()).join(',');assert.equal(deps.elements.length,depText.split(',').length+1);
  change(effect,effect.text.replace(deps.getText(),`[${depText}]`));
  // Confirm both custom-field creation paths before clearing the form.
  for(const term of ['Campo personalizado criado.','Campo personalizado criado e disponível']) {
    const a=arrow(term),event=a.node.parameters[0].name.getText(),svc=a.text.match(/(\w+)\.createCustomField/)[1];
    let next='async '+a.text;
    next=next.replace(`${event}.preventDefault();`,`${event}.preventDefault();const __harpiaForm=${event}.currentTarget;`);
    next=next.replace(`${event}.currentTarget.reset()`,`await ${svc}.waitForPersistence(),__harpiaForm.reset()`);change(a,next);
  }
  const drawer=fn('Campo personalizado criado.'),drawerSvc=drawer.text.match(/(\w+)\.createCustomField/)[1];let safe;
  function findSafe(n){if(ts.isArrowFunction(n)&&n.getText(drawer.a).includes('Não foi possível concluir a ação.'))safe=n;ts.forEachChild(n,findSafe)}findSafe(drawer.node);assert(safe);
  const action=safe.parameters[0].name.getText(),safeText=safe.getText(drawer.a);
  once(safeText,'async '+safeText.replace(`${action}(),`,`${action}(),await ${drawerSvc}.waitForPersistence(),`));
  const update=arrow('Campo personalizado atualizado pela Inbox.'),usvc=update.text.match(/(\w+)\.setCustomFieldValue/)[1];
  change(update,'async '+update.text.replace(/(\.setCustomFieldValue\([^;]+?\)),/,'$1,await '+usvc+'.waitForPersistence(),'));
  const deletion=fn('Este SalesBot ainda é referenciado por:'),deleteName=deletion.node.name.text;
  const write=deletion.text.match(/;(\w+)\((\w+),\w+\(\)\.filter/);assert(write);
  change(deletion,'async '+deletion.text.replace(`${write[1]}(${write[2]},`,`await ${confirmed}(${write[2]},`));
  const click=arrow('Não foi possível excluir o SalesBot.'),bot=click.text.match(new RegExp(deleteName+'\\((\\w+)\\.id\\)'))[1];
  change(click,'async '+click.text.replace('()=>{','()=>{if(!window.confirm(`Excluir o SalesBot “${'+bot+'.name}”?`))return;').replace(deleteName+'(', 'await '+deleteName+'('));
  // Save/retry remains attached to one automation and one application request.
  const submit=arrow('Não foi possível salvar o gatilho.'),ev=submit.node.parameters[0].name.getText();let sub=submit.text;
  const guard=sub.match(/if\([^;]+\)return;/)[0];
  sub=sub.replace(guard,guard+`const __harpiaForm=${ev}.currentTarget;if(__harpiaForm.dataset.harpiaSaving==="1")return;__harpiaForm.dataset.harpiaSaving="1";__harpiaForm.dataset.harpiaRequestId??=crypto.randomUUID();`);
  const saved=sub.match(/const (\w+)=(\w+)\?await \w+\(\2,\w+\):await \w+\(\w+\);/);assert(saved);
  const owner=fn('Não foi possível salvar o gatilho.'),binding=owner.text.match(new RegExp('\\['+saved[2]+',(\\w+)\\]=_\\.useState\\('));assert(binding);
  sub=sub.replace(saved[0],saved[0]+`${binding[1]}(${saved[1]}.id);`);
  sub=sub.replace(`body:{automationId:${saved[1]}.id}`,`body:{automationId:${saved[1]}.id,requestId:__harpiaForm.dataset.harpiaRequestId}`);
  const result=sub.match(/data:(\w+),error:\w+}=await \w+\.functions\.invoke\("automation-apply-existing"/)[1];
  const errorEnd=sub.indexOf('}me('); // use the end of the application block, independent of local revision names
  const check=sub.match(/if\(\w+&&\w+\.ok===!1\)throw new Error\(String\([^;]+?\)\)/)[0];
  sub=sub.replace(check,check+`;if(Number(${result}?.failed??0)>0)throw new Error("O gatilho foi salvo, mas houve falhas na aplicação. Verifique o histórico antes de repetir.")`);
  sub=sub.slice(0,-1)+'finally{delete __harpiaForm.dataset.harpiaSaving}}';change(submit,sub);
  // Custom time window was selectable but previously executed all day.
  const panel=fn('Deixar mensagem sem resposta'),params=panel.node.parameters[0].name;
  const bindingFor=key=>params.elements.find(n=>(n.propertyName?.getText()??n.name.getText())===key).name.getText();
  const cfg=bindingFor('triggerActionConfig'),setCfg=bindingFor('onConfigChange');
  const box=panel.text.match(/className:(\w+)\.triggerConfigActionBox/)[1];
  const toggle=enclosing('"Deixar mensagem sem resposta"',n=>ts.isConditionalExpression(n));
  const hours=`${cfg}.activeMode==="custom"?s.jsxs("div",{className:${box}.triggerConfigActionBox,children:[s.jsxs("label",{children:["Ativo a partir de",s.jsx("input",{type:"time",required:true,value:${cfg}.activeStart??"",onChange:e=>${setCfg}("activeStart",e.target.value)})]}),s.jsxs("label",{children:["Ativo até",s.jsx("input",{type:"time",required:true,value:${cfg}.activeEnd??"",onChange:e=>${setCfg}("activeEnd",e.target.value)})]})]}):null`;
  change(toggle,`s.jsxs(s.Fragment,{children:[${hours},${toggle.text}]})`);
  // Reuse the existing source editor and its authenticated repository.
  const removeSource=fn('.from("ai_brain_sources").delete().eq('),clientFactory=removeSource.text.match(/const \w+=(\w+)\(\)/)[1];
  const repo=fs.readFileSync('src/features/ai-agents/brainRepository.ts','utf8'),ra=ts.createSourceFile('brain.ts',repo,99,true);
  let edit=ra.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='editAIBrainSource').getText(ra).replace('export ','').replace('editAIBrainSource','__harpiaEditBrain').replaceAll('asUntyped()',clientFactory+'()');
  edit=esbuild.transformSync(edit,{loader:'ts',minify:true}).code;
  const refresh=arrow('Não foi possível carregar o Cérebro da empresa.'),refreshName=refresh.node.parent.name.getText(),setError=refresh.text.match(/catch\(\w+\)\{(\w+)\(/)[1];
  const brain=fn('Não foi possível carregar o Cérebro da empresa.');
  const deleteButton=enclosing('"Excluindo..."',n=>ts.isCallExpression(n)&&n.expression.getText()==='s.jsx');
  const row=deleteButton.text.match(/disabled:\w+===(\w+)\.id/)[1];
  change(deleteButton,`s.jsxs(s.Fragment,{children:[s.jsx("button",{type:"button",disabled:${row}.status==="processing",onClick:async()=>{try{await __harpiaEditBrain(${row});await ${refreshName}()}catch(error){${setError}(error.message??"Não foi possível editar a fonte.")}},children:"Editar"}),${deleteButton.text}]})`);
  s+='\n'+edit;
  esbuild.transformSync(s,{loader:'js'});
  return s;
}
const outputs=[];
for(const file of builds) {
  const source=fs.readFileSync(path.join(root,'assets',file),'utf8');assert(expected.includes(digest(source)),'unrecognized deployed build');
  const next=patch(source),name=`index-cross-system-${digest(next).slice(0,12)}.js`;outputs.push({file,name,next});
}
function htmlFiles(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(n=>n.isDirectory()?htmlFiles(path.join(dir,n.name)):n.name.endsWith('.html')?[path.join(dir,n.name)]:[])}
for(const out of outputs)fs.writeFileSync(path.join(root,'assets',out.name),out.next);
let entrypoints=0;
for(const file of htmlFiles(root)) {let s=fs.readFileSync(file,'utf8'),old=s;for(const out of outputs)s=s.replaceAll('/assets/'+out.file,'/assets/'+out.name);if(s!==old){fs.writeFileSync(file,s);entrypoints++}}
console.log(JSON.stringify({bundles:outputs.map(({file,name,next})=>({file,name,bytes:next.length})),entrypoints},null,2));
