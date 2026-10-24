const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),ts=require('typescript'),esbuild=require('esbuild');
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
function patchBrainEditor(source) {
  const ast=ts.createSourceFile('bundle.js',source,99,true,ts.ScriptKind.JS);
  const helper=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='__harpiaEditBrain');assert(helper,'existing authenticated editor');
  const factory=helper.getText(ast).match(/await (\w+)\(\)\.from\("ai_brain_sources"\)/)[1];
  const repo=fs.readFileSync('src/features/ai-agents/brainRepository.ts','utf8'),ra=ts.createSourceFile('brain.ts',repo,99,true);
  let nextHelper=ra.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='editAIBrainSource').getText(ra).replace('export ','').replace('editAIBrainSource','__harpiaEditBrain').replaceAll('asUntyped()',factory+'()');
  nextHelper=esbuild.transformSync(nextHelper,{loader:'ts',minify:true}).code;
  let editor=esbuild.transformSync(fs.readFileSync('src/features/ai-agents/BrainSourceEditor.tsx','utf8'),{loader:'tsx',jsx:'automatic'}).code;
  editor=editor.replace(/^import .*;\n/gm,'').replace('export function BrainSourceEditor','function __harpiaBrainSourceEditor').replace(/\buseState\(/g,'_.useState(').replace(/\bjsx\(/g,'s.jsx(').replace(/\bjsxs\(/g,'s.jsxs(').replace(/\beditAIBrainSource\(/g,'__harpiaEditBrain(');
  let button;
  function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='s.jsx'&&n.getText(ast).includes('await __harpiaEditBrain('))button=n;ts.forEachChild(n,visit)}visit(ast);assert(button,'existing edit button');
  const text=button.getText(ast),row=text.match(/await __harpiaEditBrain\((\w+)\)/)[1],refresh=text.match(/await (\w+)\(\)/)[1],error=text.match(/catch\(\w+\)\{(\w+)\(/)[1];
  const replacement=`s.jsx(__harpiaBrainSourceEditor,{source:${row},onSaved:${refresh},onError:${error}})`;
  let next=source.replace(text,replacement).replace(helper.getText(ast),nextHelper)+'\n'+editor;
  esbuild.transformSync(next,{loader:'js'});
  assert(!nextHelper.includes('prompt('));
  return next;
}
module.exports={patchBrainEditor};
if(require.main===module){
  const root=path.resolve(process.argv[2]||'../harpia-published'),files=['index-cross-system-1c01837f4ade.js','index-cross-system-04e53da082e6.js'];
  const outputs=files.map(file=>{const source=fs.readFileSync(path.join(root,'assets',file),'utf8');assert.equal(digest(source).slice(0,12),file.match(/system-(\w+)\.js/)[1]);const next=patchBrainEditor(source);return{file,name:'index-brain-inline-'+digest(next).slice(0,12)+'.js',next}});
  const html=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(n=>n.isDirectory()?html(path.join(dir,n.name)):n.name.endsWith('.html')?[path.join(dir,n.name)]:[]);
  for(const out of outputs)fs.writeFileSync(path.join(root,'assets',out.name),out.next);
  let entrypoints=0;for(const file of html(root)){let s=fs.readFileSync(file,'utf8'),old=s;for(const out of outputs)s=s.replaceAll('/assets/'+out.file,'/assets/'+out.name);if(s!==old){fs.writeFileSync(file,s);entrypoints++}}
  console.log(JSON.stringify({bundles:outputs.map(({file,name})=>({file,name})),entrypoints},null,2));
}
