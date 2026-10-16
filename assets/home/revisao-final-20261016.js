/* Homepage only. Existing public catalog and WhatsApp destinations; no database writes. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const form = $('home-search');
const provided = Array.isArray(window.HARPIA_EXISTING_PROPERTIES) ? window.HARPIA_EXISTING_PROPERTIES : [];
let records = provided.map(item => ({...item, _legacy:true}));
const key = value => String(value || '').trim().toLocaleLowerCase('pt-BR');
const array = value => Array.isArray(value) ? value : [];
const money = value => Number.isFinite(value) ? new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(value) : 'Sob consulta';
const el = (tag,cls,value) => { const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node; };
const safeURL = value => { try{const u=new URL(value,location.origin);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';} };
const locationOf = item => item.location && typeof item.location==='object' ? item.location : {};
const cityOf = item => locationOf(item).city || item.city || '';
const areaOf = item => item.private_area_m2 ?? item.privateAreaM2;
const neighborhood = item => locationOf(item).neighborhood || item.neighborhood || '';
const purpose = item => item.purpose==='rent' ? 'Locação' : item.purpose==='sale' || item._legacy ? 'Venda' : '';
const cover = item => { const media=array(item.media);return safeURL((media.find(m=>m.type!=='video'&&m.isCover)||media.find(m=>m.type==='image'||!m.type)||{}).url); };
const href = item => '/imoveis/?codigo='+encodeURIComponent(item.code||item.id);
function fieldSpecs(item){
 const values=[], area=areaOf(item), suites=item.suites, parking=item.parking_spaces??item.parkingSpaces??(item._legacy&&item.code==='BOT-EASY-95'?1:null);
 if(area)values.push(area+' m²');if(suites)values.push(suites+' suíte'+(suites===1?'':'s'));
 if(parking!=null)values.push(parking+' vaga'+(parking===1?'':'s'));
 return values;
}
function displayTitle(item){return item._legacy&&/^BOT-EASY-/.test(item.code)?'Apartamento Botafogo Easy':item._legacy&&item.code==='BAR-ORYGEM-151'?'Venice Orygem Acqua Home':item.name||item.title||'Imóvel Hárpia';}
function action(){const span=el('span','text-link','Ver imóvel');span.append(el('span','', '→'));return span;}
function image(item){const source=cover(item);if(!source)return el('span','property-empty','Imagem não cadastrada');const img=el('img');img.src=source;img.alt=item.name||item.title||'Imóvel Hárpia';img.loading='lazy';return img;}
function render(items){
 const grid=$('home-properties'),rows=$('home-property-rows');grid.replaceChildren();rows.replaceChildren();
 $('catalog-status').textContent=items.length+' imóvel'+(items.length===1?' encontrado.':'s encontrados.');
 if(!items.length){grid.append(el('p','property-empty','Nenhum imóvel encontrado para estes filtros.'));return;}
 items.forEach((item,index)=>{
  const a=el('a',index<2?'property-card':'property-row');a.href=href(item);a.setAttribute('aria-label','Ver imóvel: '+displayTitle(item));
  if(index<2){const photo=el('div','property-photo');photo.append(image(item));const badge=[item.typology||item.propertyType||'Apartamento',purpose(item)].filter(Boolean).join(' · ');photo.append(el('span','property-badge',badge));const body=el('div','property-body');body.append(el('p','property-place',[neighborhood(item),cityOf(item)].filter(Boolean).join(' · ')),el('h3','',displayTitle(item)));const specs=el('p','property-specs');fieldSpecs(item).forEach(s=>specs.append(el('span','',s)));body.append(specs);const price=el('div','property-price');price.append(el('span','',money(item.price)),action());body.append(price);a.append(photo,body);grid.append(a);}
  else{const copy=el('div');copy.append(el('p','property-place',neighborhood(item)),el('h3','',displayTitle(item)));a.append(image(item),copy,action());rows.append(a);}
 });
}
function options(select,values,emptyLabel){const before=select.value;select.replaceChildren(new Option(emptyLabel,''));[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')).forEach(value=>select.append(new Option(value,value)));if([...select.options].some(o=>o.value===before))select.value=before;}
function syncOptions(){options(form.elements.cidade,records.map(cityOf),'Todas');syncNeighborhoods();}
function syncNeighborhoods(){const city=form.elements.cidade.value;options(form.elements.bairro,records.filter(x=>!city||cityOf(x)===city).map(neighborhood),'Todos');}
function filtered(){const data=new FormData(form);const city=data.get('cidade'),district=data.get('bairro'),wantedPurpose=data.get('finalidade'),launch=data.get('lancamento');const [min,max]=String(data.get('faixa')||':').split(':').map(x=>x===''?null:Number(x));return records.filter(item=>{
 if(city&&cityOf(item)!==city||district&&neighborhood(item)!==district)return false;
 if(wantedPurpose&&(item.purpose||(item._legacy?'sale':''))!==wantedPurpose)return false;
 const isLaunch=item.is_launch??item.isLaunch??item.launch;
 if(launch==='sim'&&isLaunch!==true||launch==='nao'&&isLaunch!==false)return false;
 if(item.price!=null&&(min!==null&&item.price<min||max!==null&&item.price>max))return false;
 return true;
});}
form.addEventListener('submit',event=>{event.preventDefault();render(filtered());});
form.elements.cidade.addEventListener('change',syncNeighborhoods);
$('show-all').addEventListener('click',()=>{form.reset();form.elements.cidade.value='';form.elements.finalidade.value='';form.elements.lancamento.value='';form.elements.faixa.value=':';syncNeighborhoods();render(records);form.elements.finalidade.focus({preventScroll:true});});
function whatsapp(message,action){const u=new URL('https://wa.me/5521990135757');const incoming=new URLSearchParams(location.search);const tracking=['Origem: site Harpia','Página: landing','Ação: '+action];for(const n of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']){const v=incoming.get(n);if(v)tracking.push(n+': '+v.slice(0,200));}u.searchParams.set('text',message+'\n\n['+tracking.join(' | ')+']');return u.href;}
const contactMessages={juridico:'Olá, quero atendimento sobre assessoria jurídica imobiliária.',arquitetura:'Olá, quero ativar meu benefício de arquitetura, reformas e obras.'};
document.querySelectorAll('[data-contact]').forEach(a=>{a.href=whatsapp(contactMessages[a.dataset.contact]||'Olá, vim pelo site da Hárpia Patrimonial e quero atendimento.',a.dataset.contact);});
$('lead-form').addEventListener('submit',event=>{event.preventDefault();const f=event.currentTarget;if(!f.reportValidity())return;const data=new FormData(f),phone=String(data.get('whatsapp')||'').replace(/\D/g,'');if(phone.length<10||phone.length>15){f.elements.whatsapp.setCustomValidity('Informe o WhatsApp com DDD.');f.elements.whatsapp.reportValidity();return;}const message=`Olá, vim pelo site da Hárpia. Meu nome é ${String(data.get('nome')).trim()}. Meu WhatsApp é ${data.get('whatsapp')}. Tenho interesse em ${data.get('interesse')} na região: ${data.get('bairro')}.`;$('lead-status').textContent='Abrindo o WhatsApp com as informações preenchidas.';window.location.assign(whatsapp(message,'receber-curadoria'));});
$('lead-form').elements.whatsapp.addEventListener('input',event=>event.currentTarget.setCustomValidity(''));
syncOptions();render(records);
(async()=>{try{const response=await fetch('https://desxomqvtjaymwwxivwq.supabase.co/rest/v1/catalog_items?select=*&status=eq.published&deleted_at=is.null&item_type=eq.property&order=updated_at.desc',{headers:{apikey:'sb_publishable_wWUVxjkMDMXLOrzE0y3Y_w_k9jXf88B',Authorization:'Bearer sb_publishable_wWUVxjkMDMXLOrzE0y3Y_w_k9jXf88B'},cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Catálogo HTTP '+response.status);const live=await response.json();if(!Array.isArray(live))throw new Error('Resposta inválida do catálogo');const known=new Set(live.flatMap(i=>[key(i.code),key(i.id)]).filter(Boolean));records=[...live,...provided.filter(i=>!known.has(key(i.code))&&!known.has(key(i.id))).map(i=>({...i,_legacy:true}))];syncOptions();render(filtered());}catch(error){console.warn('Catálogo online indisponível. Preservados os imóveis anteriormente publicados.',error);}})();
})();
