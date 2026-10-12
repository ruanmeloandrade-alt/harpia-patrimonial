/* Hárpia: detalhes de imóveis publicados.
   Compatível com dados reais Supabase e imóveis que já existiam no site.
   Sem mocks, sem autogravação, sem dependências de terceiros. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const base = 'https://desxomqvtjaymwwxivwq.supabase.co';
  const publishableKey = 'sb_publishable_wWUVxjkMDMXLOrzE0y3Y_w_k9jXf88B';
  const legacy = Array.isArray(window.HARPIA_EXISTING_PROPERTIES) ? window.HARPIA_EXISTING_PROPERTIES : [];
  const mediaManifest = window.HARPIA_EXISTING_MEDIA || {};
  const wantedCode = new URLSearchParams(location.search).get('codigo') || '';
  const sameKey = (a, b) => String(a || '').trim().toLocaleLowerCase('pt-BR') === String(b || '').trim().toLocaleLowerCase('pt-BR');
  const money = (amount, cents = true) => new Intl.NumberFormat('pt-BR', {
    style:'currency',currency:'BRL',minimumFractionDigits:cents?2:0,maximumFractionDigits:2,
  }).format(amount);
  const text = (tag, content, className) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined && content !== null) node.textContent = String(content);
    return node;
  };
  const number = input => {
    if (input === null || input === undefined || input === '') return null;
    const n = typeof input === 'number' ? input : Number(String(input).trim().replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const unique = values => [...new Set(values.filter(Boolean))];
  function safeUrl(input) {
    try {
      const url = new URL(input, location.origin);
      return /^https?:$/.test(url.protocol) ? url.href : null;
    } catch { return null; }
  }
  function videoSource(input) {
    const href = safeUrl(input);
    if (!href) return null;
    const u = new URL(href);
    const hostname = u.hostname.replace(/^www\./, '').replace(/^m\./, '').toLowerCase();
    const parts = u.pathname.split('/').filter(Boolean);
    let id;
    if (hostname === 'youtube.com' || hostname === 'youtu.be' || hostname === 'youtube-nocookie.com') {
      id = hostname === 'youtu.be' ? parts[0] : parts[0] === 'watch' ? u.searchParams.get('v') : ['embed','shorts','live'].includes(parts[0]) ? parts[1] : null;
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? { type: 'embed', url: 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0', name: 'YouTube' } : null;
    }
    if (hostname === 'vimeo.com' || hostname === 'player.vimeo.com') {
      id = hostname === 'player.vimeo.com' && parts[0] === 'video' ? parts[1] : parts[0];
      if (id && /^\d+$/.test(id)) {
        const hash = u.searchParams.get('h') || (hostname === 'vimeo.com' ? parts[1] : null);
        const suffix = hash && /^[a-zA-Z0-9]+$/.test(hash) ? '?h=' + hash : '';
        return { type: 'embed', url:'https://player.vimeo.com/video/' + id + suffix, name:'Vimeo' };
      }
      return null;
    }
    return { type: 'file', url: href, name:'Vídeo' };
  }
  function getImages(item) {
    const collection = item.source === 'legacy' ? mediaManifest[item.code] || [] : [];
    const asMedia = typeof item.media === 'string' ? (()=>{try{return JSON.parse(item.media)}catch{return []}})() : item.media;
    const current = Array.isArray(asMedia) ? asMedia : [];
    const incoming = current.filter(m => m && (m.type === 'image' || m.type === 'video' || (!m.type && m.url)) && safeUrl(m.url))
      .map(m => ({type: m.type === 'video' ? 'video' : 'image', url: safeUrl(m.url), label: m.label || m.alt || ''}));
    const legacyMainVideo = item.source === 'legacy' ? (window.HARPIA_PROPERTY_VIDEO_URLS || {})[item.code] : null;
    if (typeof legacyMainVideo === 'string' && videoSource(legacyMainVideo) && !incoming.some(m => m.url === safeUrl(legacyMainVideo))) {
      incoming.unshift({type:'video',url:safeUrl(legacyMainVideo),label:'Vídeo principal'});
    }
    const published = collection.map(url => ({type:'image',url:safeUrl(url),label:''})).filter(m => m.url);
    const existingUrls = new Set(incoming.map(m => m.url));
    for (const m of published) if (!existingUrls.has(m.url)) incoming.push(m);
    return incoming;
  }
  function readProperty(item) {
    const features = Array.isArray(item.features) ? item.features : [];
    const location = item.location && typeof item.location === 'object' ? item.location : {};
    const getNumeric = (key, fallback) => {
      const line = features.find(value => typeof value === 'string' && value.toLowerCase().startsWith('@'+key+':'));
      return line ? number(line.slice(key.length+2)) : number(fallback);
    };
    const legacyMetric = (words, raw) => {
      const direct = number(raw);
      if (direct !== null) return direct;
      const pattern = new RegExp('^\\s*(\\d+(?:[.,]\\d+)?)\\s*('+words+')\\s*$','i');
      const f = features.find(value => pattern.test(String(value)));
      return f ? number(String(f).match(pattern)[1]) : null;
    };
    const services = [], outdoors = [], others = [], wellness = [];
    let address = String(location.address || item.address || '').trim();
    for (const entry of features) {
      const value = String(entry || '').trim();
      if (!value) continue;
      const lower = value.toLocaleLowerCase('pt-BR');
      if (lower.startsWith('@servico:')) { services.push(value.slice(9).trim()); continue; }
      if (lower.startsWith('@area_externa:')) { outdoors.push(value.slice(14).trim()); continue; }
      if (lower.startsWith('@wellness:')) {
        const [label, rating] = value.slice(10).split('|');
        if (label?.trim() && rating?.trim()) wellness.push([label.trim(),rating.trim()]);
        continue;
      }
      if (lower.startsWith('@endereco:')) { address = value.slice(10).trim(); continue; }
      if (lower.startsWith('@') || /^\d+(?:[.,]\d+)?\s*(m²|m2|quartos?|dormitórios?|suítes?|banheiros?|vagas?)$/i.test(value)) continue;
      if (/portaria|concierge|lavanderia|encomenda|fast market|pay-per-use/i.test(value)) services.push(value);
      else if (/piscina|coworking|parque|jogos|academia|churrasqueira|segurança|sauna|brinquedoteca|festas|recarga/i.test(value)) outdoors.push(value);
      else others.push(value);
    }
    return {
      id:item.id, code:item.code || '', title:item.name || item.title || 'Imóvel Hárpia',
      description:item.description || '',
      type:item.typology || item.propertyType || 'Imóvel',
      purpose: item.purpose === 'rent' ? 'Locação' : item.purpose === 'sale' ? 'Venda' : String(item.purpose || 'Imóvel'),
      location: String(location.neighborhood || item.neighborhood || item.locationLabel || ''),
      city: String(location.city || item.city || ''),
      address, price:number(item.price),
      area:getNumeric('area_m2',legacyMetric('m²|m2',item.private_area_m2 ?? item.privateAreaM2)),
      bedrooms:getNumeric('dormitorios',legacyMetric('quartos?|dormitórios?',item.bedrooms)),
      suites:getNumeric('suites',legacyMetric('suítes?',item.suites)),
      bathrooms:getNumeric('banheiros',legacyMetric('banheiros?',item.bathrooms)),
      parking:getNumeric('vagas',legacyMetric('vagas?',item.parking_spaces ?? item.parkingSpaces)),
      iptu:getNumeric('iptu_mensal',null),
      condominium:getNumeric('condominio_mensal',null),
      services:unique(services), outdoors:unique(outdoors), others:unique(others),
      wellness, media:getImages(item),
    };
  }
  function match(item, code) { return sameKey(item.code,code) || sameKey(item.id,code); }
  async function listProperties() {
    try {
      const response = await fetch(base+'/rest/v1/catalog_items?select=*&status=eq.published&deleted_at=is.null&item_type=eq.property&order=updated_at.desc',{
        headers:{apikey:publishableKey,Authorization:'Bearer '+publishableKey},cache:'no-store',
      });
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result)) {
          const fromDatabase = result.map(item => ({...item,source:'database'}));
          const seen = new Set(fromDatabase.flatMap(item => [item.code,item.id].filter(Boolean).map(x=>String(x).toLowerCase())));
          return [...fromDatabase,...legacy.filter(item => !seen.has(String(item.code || item.id).toLowerCase())).map(item=>({...item,source:'legacy'}))];
        }
      }
    } catch(error) { console.warn('Consulta de catálogo indisponível.',error); }
    return legacy.map(item => ({...item,source:'legacy'}));
  }
  function listInto(root, heading, items) {
    const section = text('section');
    section.append(text('h3',heading));
    if (items.length) {
      const ul = text('ul');
      items.forEach(item => ul.append(text('li',item)));
      section.append(ul);
    } else section.append(text('p','Ainda não informado.'));
    root.append(section);
  }
  function renderFacts(item) {
    $('hp-property-title').textContent = item.title;
    $('hp-breadcrumb').textContent = [item.type,item.location,item.city].filter(Boolean).join(' / ');
    $('hp-location').textContent = [item.location,item.city].filter(Boolean).join(' · ');
    $('hp-code').textContent = item.code ? 'Código do Imóvel '+item.code : '';
    $('hp-price').textContent = item.price === null ? 'Valor sob consulta' : money(item.price);
    $('hp-purpose').textContent = item.purpose;
    document.title = item.title+' | Hárpia Patrimonial & Co.';
    const specs = [
      item.area !== null ? item.area+' m²' : null,
      item.bedrooms !== null ? item.bedrooms+' Dormitório'+(item.bedrooms===1?'':'s') : null,
      item.suites !== null ? item.suites+' Suíte'+(item.suites===1?'':'s') : null,
      item.bathrooms !== null ? item.bathrooms+' Banheiro'+(item.bathrooms===1?'':'s') : null,
      item.parking !== null ? item.parking+' Vaga'+(item.parking===1?'':'s') : null,
    ].filter(Boolean);
    $('hp-specs').replaceChildren(...specs.map(v=>text('span',v)));
    $('hp-specs').hidden = specs.length===0;
    const feeData = [
      item.iptu!==null ? ['IPTU (mensal)',money(item.iptu)] : null,
      item.condominium!==null ? ['Condomínio',money(item.condominium)] : null,
      item.price!==null && item.area>0 ? ['Valor m²',money(item.price/item.area)] : null,
    ].filter(Boolean);
    $('hp-fees').replaceChildren(...feeData.map(([title,value])=>{
      const div=text('div');div.append(text('dt',title),text('dd',value));return div;
    }));
    $('hp-fees').hidden = !feeData.length;
    const features = $('hp-features');
    features.replaceChildren(text('h2','Características'));
    listInto(features,'Serviços e Facilidades',item.services);
    listInto(features,'Área Externa',item.outdoors);
    if (item.others.length) listInto(features,'Outras características',item.others);
    const wellness=$('hp-wellness');
    if (item.wellness.length) wellness.replaceChildren(...item.wellness.map(([label,rating])=>{
      const div=text('div');div.append(text('dt',label+':'),text('dd',rating));return div;
    }));
    else {
      const note = text('p','Índice Wellness ainda não informado para este imóvel.');
      wellness.replaceWith(note);note.id='hp-wellness';
    }
    const description=$('hp-description');
    const paragraphs = item.description.split(/\n\s*\n/).filter(Boolean);
    description.replaceChildren(...(paragraphs.length ? paragraphs.map(p=>text('p',p.trim())) : [text('p','Descrição detalhada ainda não cadastrada. Nossa equipe pode orientar sua avaliação.')]));
    $('hp-address').textContent = item.address || [item.location,item.city].filter(Boolean).join(' · ');
    const wa = (prefix) => 'https://wa.me/5521990135757?text='+encodeURIComponent(prefix+' '+(item.code || item.title));
    $('hp-visit').href=wa('Olá, quero agendar uma visita ao imóvel');
    $('hp-contact').href=wa('Olá, quero receber informações sobre o imóvel');
  }
  function renderMedia(item) {
    const container = $('hp-stage'), gallery=$('hp-gallery');
    const media=item.media;
    let active=Math.max(0,media.findIndex(m=>m.type==='video'));
    function choose(index) {
      if (!media.length) return;
      active=(index+media.length)%media.length;
      container.replaceChildren();
      const value=media[active];
      if (value.type==='video') {
        const source=videoSource(value.url);
        if (source && source.type==='embed') {
          const iframe=text('iframe');
          iframe.title='Vídeo do imóvel no '+source.name;
          iframe.src=source.url;
          iframe.allow='autoplay; encrypted-media; picture-in-picture; web-share';
          iframe.referrerPolicy='strict-origin-when-cross-origin';
          iframe.allowFullscreen=true;
          iframe.loading='lazy';
          container.append(iframe);
        } else if(source) {
          const video=text('video');video.controls=true;video.playsInline=true;video.preload='metadata';video.src=source.url;container.append(video);
        } else container.append(text('div','Vídeo indisponível para reprodução.','hp-property__no-media'));
      } else {
        const image=text('img');image.src=value.url;image.alt=value.label || 'Foto de '+item.title;container.append(image);
      }
      if(media.length>1){
        const nav=text('div',null,'hp-property__stage-nav');
        const prev=text('button','‹'),next=text('button','›'),indicator=text('span',(active+1)+' / '+media.length);
        prev.type=next.type='button';prev.setAttribute('aria-label','Mídia anterior');next.setAttribute('aria-label','Próxima mídia');
        prev.addEventListener('click',()=>choose(active-1));next.addEventListener('click',()=>choose(active+1));
        nav.append(prev,indicator,next);container.append(nav);
      }
      gallery.querySelectorAll('button').forEach((button,i)=>{
        button.classList.toggle('hp-property__thumb--active',i===active);
        button.setAttribute('aria-pressed',String(i===active));
      });
    }
    gallery.replaceChildren();
    if(!media.length) {
      const message=text('div',null,'hp-property__no-media');
      const emblem=text('img');emblem.src='/assets/brand/harpia-crest-dark-green-cropped.png';emblem.alt='';
      message.append(emblem,text('span','Imagens e vídeo ainda não cadastrados.'));
      container.append(message);gallery.append(text('p','A galeria será exibida quando a equipe cadastrar fotos ou vídeos.','hp-property__gallery-empty'));
      $('hp-gallery-hint').hidden=true;return;
    }
    for(let i=0;i<media.length;i++) {
      const value=media[i],button=text('button',null,'hp-property__thumb');
      button.type='button';button.setAttribute('aria-label',(value.type==='video'?'Exibir vídeo ':'Exibir foto ')+(i+1));
      button.addEventListener('click',()=>choose(i));
      if(value.type==='image'){
        const image=text('img');image.src=value.url;image.alt=value.label || 'Foto '+(i+1)+' do imóvel';image.loading='lazy';button.append(image);
      }else{
        const videoTile=text('span',null,'hp-property__thumb-video');
        videoTile.append(text('span','▶'),text('span','Vídeo '+(i+1)));button.append(videoTile);
      }
      gallery.append(button);
    }
    $('hp-gallery-hint').hidden=media.length<=3;
    choose(active);
  }
  function renderRelated(item,all) {
    const root=$('hp-related');root.replaceChildren();
    const related=all.filter(other=>!sameKey(other.id,item.id)&&!sameKey(other.code,item.code)&&other.item_type!=='product')
      .map(readProperty)
      .sort((a,b)=>Number(b.location===item.location)-Number(a.location===item.location)).slice(0,3);
    if (!related.length) {
      root.replaceWith(text('p','Não há outros imóveis publicados para apresentar.','hp-property__related-empty'));
      return;
    }
    for(const other of related){
      const card=text('article',null,'hp-property__related-card'),anchor=text('a');
      anchor.href='/imoveis/?codigo='+encodeURIComponent(other.code || other.id);
      const image=other.media.find(m=>m.type==='image');
      if(image){
        const photo=text('img');photo.src=image.url;photo.alt='Imagem de '+other.title;photo.loading='lazy';anchor.append(photo);
      }else anchor.append(text('span','Sem imagem publicada','hp-property__related-no-photo'));
      const cardText=text('div',null,'hp-property__related-text');
      cardText.append(text('span',other.type),text('strong',other.title),text('small',other.code||other.location));
      const spec=[other.area!==null?other.area+' m²':'',other.suites!==null?other.suites+' suítes':'',other.parking!==null?other.parking+' vagas':''].filter(Boolean).join(' · ');
      if(spec)cardText.append(text('p',spec));
      const row=text('div');row.append(text('b',other.price===null?'Sob consulta':money(other.price,false)),text('span','VER IMÓVEL →'));cardText.append(row);anchor.append(cardText);card.append(anchor);root.append(card);
    }
  }
  async function main() {
    const status=$('property-loading');
    const code=wantedCode.trim();
    if(!code){status.replaceChildren(text('p','Selecione um imóvel no catálogo para visualizar seus detalhes.'),(()=>{const link=text('a','Voltar ao catálogo');link.href='/#imoveis';return link})());return}
    const all=await listProperties(),record=all.find(item=>match(item,code));
    if(!record){status.replaceChildren(text('p','Imóvel não encontrado ou não publicado.'),(()=>{const link=text('a','Voltar aos imóveis');link.href='/#imoveis';return link})());return}
    const item=readProperty(record);
    renderFacts(item);renderMedia(item);renderRelated(item,all);
    $('property-details').hidden=false;status.hidden=true;
  }
  void main().catch(error=>{
    console.error('Falha ao renderizar imóvel publicado.',error);
    $('property-loading').textContent='Não foi possível carregar o imóvel agora. Atualize a página ou retorne ao catálogo.';
  });
})();
