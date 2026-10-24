const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const code=fs.readFileSync(process.argv[2],'utf8'),ast=ts.createSourceFile('bundle.js',code,99,true,ts.ScriptKind.JS);
const editor=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='__harpiaBrainSourceEditor');assert(editor);
let state=[],cursor=0,persisted=[],error='',refreshes=0,reject=false;
const jsx=(type,props)=>({type,props});
const context=vm.createContext({Error,_:{useState(initial){const index=cursor++;if(!(index in state))state[index]=initial;return[state[index],value=>{state[index]=value}]}},s:{jsx,jsxs:jsx},__harpiaEditBrain:async(...args)=>{persisted.push(args);if(reject)throw Error('Esta fonte mudou em outra sessão. Recarregue antes de editar.')}});
vm.runInContext(editor.getText(ast)+';globalThis.render=__harpiaBrainSourceEditor;',context);
const source={id:'source',title:'Original',text_content:'Linha 1\nLinha 2',status:'ready',updated_at:'2026-10-24T14:00:00Z'};
const render=()=>{cursor=0;return context.render({source,onSaved:async()=>{refreshes++},onError:value=>{error=value}})};
const inputs=node=>{if(!node||typeof node!=='object')return[];return[node,...(Array.isArray(node.props?.children)?node.props.children:[node.props?.children]).flatMap(inputs)]};
(async()=>{
  let view=render();assert.equal(view.props.children,'Editar');view.props.onClick();view=render();assert.equal(view.type,'form');
  const fields=inputs(view);const title=fields.find(n=>n.type==='input'),body=fields.find(n=>n.type==='textarea');assert.equal(body.props.value,'Linha 1\nLinha 2');
  title.props.onChange({target:{value:'Editado'}});body.props.onChange({target:{value:'Novo\nconteúdo'}});
  reject=true;await render().props.onSubmit({preventDefault(){}});view=render();assert.equal(view.type,'form');assert.equal(inputs(view).find(n=>n.type==='textarea').props.value,'Novo\nconteúdo');assert.match(error,/outra sessão/);assert.equal(refreshes,0);
  reject=false;await view.props.onSubmit({preventDefault(){}});assert.equal(render().type,'button');assert.equal(persisted[1][1],'Editado');assert.equal(persisted[1][2],'Novo\nconteúdo');assert.equal(refreshes,1);
  render().props.onClick();view=render();inputs(view).find(n=>n.type==='button'&&n.props.children==='Cancelar edição').props.onClick();assert.equal(render().type,'button');assert.equal(persisted.length,2);
  console.log('PASS: editor sem prompt, conteúdo multilinha, erro mantém rascunho, sucesso aguarda persistência, cancelamento sem escrita. Teste isolado do componente publicado; não substitui QA visual.');
})().catch(error=>{console.error(error);process.exitCode=1});
