/* Curated collections work independently of the large nutrition catalog. */
(()=>{
 const root=document.getElementById('foodDiscovery');if(!root)return;
 const grid=document.getElementById('discoveryCards'),status=document.getElementById('discoveryStatus'),detail=document.getElementById('discoveryDetail');
 const themes={all:'모든 주제',convenience:'편의점 재료',nostalgia:'추억의 음식',world:'세계 음식',occasions:'밥상 메뉴'};
 const situations={all:'모든 메뉴',noheat:'불 없이 만들기',meal:'면·밥 한 끼',sweet:'달콤한 간식',snack:'짭짤한 간식'};
 const situationRecipes={
 meal:new Set(['paik_kR77WlHRZrs','paik_78AQ-ten9lE','paik_-_q9oyOToxs','paik_kj2ZupQ7fts','paik_9Wvd9VL0OpM','paik_6e-IbuuD6ZU','paik_FbApByZGCXg','paik_ohihzV6Z85k','paik_gJDxWPoMHgo','paik_0bnFoRQebq0_cream','paik_zRg4nxIv3j8','paik_llZ1ii59BVs']),
 sweet:new Set(['paik_aXJgN_JjYDg_sweetpotato','paik_-dBPLgpC-tk_basic','paik_X8VEvBHHOjQ']),
 snack:new Set(['paik_rqbhm9hpvp8','paik_zS_o6psOt9g_pan','paik_t4Es8mwdYlE','paik_CVtdTM6gJTY','paik_OSYQHa-vbVU','paik_87zznFb0-us','paik_yI67M3IS4GI_pancake','paik_LojVJnvLb30'])
 };
 const cache=new Map();let selected='all',situation='all',occasion='all',request=0,lastCard=null;
 function matches(c){return situation==='all'||(situation==='noheat'?c.heat_required===false:situationRecipes[situation]?.has(c.recipe_id))}
 async function collection(id){let pack=cache.get(id);if(!pack){const res=await fetch('data/food-exploration-'+id+'-20261017.json?v=2');if(!res.ok)throw Error('HTTP '+res.status);pack=await res.json();if(!Number.isInteger(pack.count)||pack.count<1||pack.cards?.length!==pack.count)throw Error('Invalid collection');cache.set(id,pack)}return pack.cards}
 function occasionConfig(){return cache.get('occasions')?.occasions?.[occasion]}
 function occasionPick(c){return occasionConfig()?.picks.find(p=>p.recipe_id===c.recipe_id)}
 function controls(){root.querySelectorAll('[data-food-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.foodTheme===selected)));root.querySelectorAll('[data-food-situation]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.foodSituation===situation)));root.querySelectorAll('[data-food-occasion]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.foodOccasion===occasion)))}
 function renderCombinations(cards){const host=document.getElementById('discoveryCombinations');host.replaceChildren();const config=occasionConfig();if(!config)return;host.append(node('p',config.description,'discovery-occasion-note'));const byId=new Map(cards.map(c=>[c.recipe_id,c]));for(const combo of config.combinations){if(!combo.recipe_ids.every(id=>byId.has(id)))continue;const box=node('section',null,'discovery-combination');box.append(node('h3',combo.title),node('p',combo.note));for(const id of combo.recipe_ids){const card=byId.get(id),button=node('button',card.title+' →');button.type='button';button.onclick=()=>show(card,button);box.append(button)}host.append(box)}}
 function node(tag,text,className){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(className)n.className=className;return n}
 function groups(host,list){for(const g of list){host.append(node('h4',g.label));const ul=node('ul');for(const line of g.items)ul.append(node('li',line));host.append(ul)}}
 function steps(host,list){const ol=node('ol');for(const step of list)ol.append(node('li',step.replace(/^\d+\.\s*/,'')));host.append(ol)}
 function show(c,button){
  lastCard=button;detail.replaceChildren();detail.hidden=false;
  const back=node('button','← 음식 목록으로','discovery-back');back.type='button';back.onclick=()=>{detail.hidden=true;lastCard?.focus();grid.scrollIntoView({behavior:'smooth',block:'start'})};detail.append(back);
  const title=node('h3',c.title);title.tabIndex=-1;detail.append(title,node('p',c.hook),node('p','분량 기준: '+c.quantity_basis,'discovery-basis'));
  detail.append(node('p','도구: '+c.equipment.join(' · ')),node('h3','필요한 재료'));groups(detail,c.ingredient_groups);
  if(c.beginner_guide){const prep=node('section',null,'beginner-start');prep.append(node('h3','시작 전에 준비해요'));const list=node('ul');for(const line of c.beginner_guide.before_start)list.append(node('li',line));prep.append(list);detail.append(prep)}
  for(const p of c.preparations){const box=node('section',null,'discovery-preparation');box.append(node('h3','먼저 준비: '+p.title),node('p',p.usage));groups(box,p.ingredient_groups);steps(box,p.steps);box.append(node('p',p.source_limit,'data-note'));detail.append(box)}
  detail.append(node('h3','만드는 순서'));
  if(c.beginner_guide){const stages=node('ol',null,'beginner-stages');for(const stage of c.beginner_guide.stages){const item=node('li',null,'beginner-stage');item.append(node('h4',stage.title));steps(item,stage.actions);item.append(node('p','확인: '+stage.checkpoint,'beginner-checkpoint'));stages.append(item)}detail.append(stages);const original=node('details',null,'beginner-original');original.append(node('summary','기존 조리 순서도 보기'));steps(original,c.steps);detail.append(original)}else steps(detail,c.steps);
  detail.append(node('h3','놓치기 쉬운 점'));const ul=node('ul');for(const text of [...c.critical_points,...c.editorial_notes])ul.append(node('li',text));detail.append(ul,node('p',c.source_limits,'data-note'));
  detail.append(node('p','알레르기는 사용하는 재료·제품의 표시사항을 확인하세요. 이 화면에서는 레시피 전체 영양값을 계산하지 않습니다.','data-note'));
  const source=node('a',c.source_label+' · 원본 보기');source.href=c.source_url;source.target='_blank';source.rel='noopener noreferrer';detail.append(source);
  const search=node('button','이 음식의 다른 레시피 찾기 →','discovery-search');search.type='button';search.onclick=()=>{document.getElementById('recipeSearchInput').value=c.title.split('(')[0];document.getElementById('recipeSearchForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));document.getElementById('homeRecipes').scrollIntoView({behavior:'smooth',block:'start'})};detail.append(search);
  title.focus({preventScroll:true});detail.scrollIntoView({behavior:'smooth',block:'start'});
 }
 async function load(id){
  selected=id;const ticket=++request;detail.hidden=true;grid.replaceChildren();document.getElementById('discoveryCombinations').replaceChildren();status.textContent='메뉴를 불러오고 있어요…';grid.setAttribute('aria-busy','true');
  controls();
  try{
   const packs=await Promise.all([...new Set([...(id==='all'?['convenience','nostalgia','world','occasions']:[id]),'occasions'])].map(async key=>({key,cards:await collection(key)})));
   const cards=packs.filter(p=>id==='all'||p.key===id).flatMap(p=>p.cards).filter(c=>matches(c)&&(occasion==='all'||occasionPick(c)));
   if(ticket!==request)return;
   for(const c of cards){const button=node('button',null,'discovery-card');button.type='button';button.append(node('span',c.discovery_tag,'discovery-tag'),node('strong',c.title),node('span',c.hook),node('span',c.quantity_basis,'discovery-quantity'),node('span','재료·조리법 보기 →','discovery-open'));if(occasionPick(c))button.append(node('span',occasionPick(c).reason,'discovery-pick-reason'));button.onclick=()=>show(c,button);grid.append(button)}
   status.textContent=themes[id]+' · '+situations[situation]+(occasionConfig()?' · '+occasionConfig().title:'')+' · '+cards.length+'가지 메뉴';renderCombinations(cards);
   if(!cards.length){const empty=node('div',null,'discovery-empty');empty.append(node('p','이 주제에는 조건에 맞는 메뉴가 아직 없어요.'));const reset=node('button','모든 주제에서 찾기');reset.type='button';reset.onclick=()=>load('all');empty.append(reset);const clear=node('button','모든 조건 지우기');clear.type='button';clear.onclick=()=>{situation='all';occasion='all';return load('all')};empty.append(clear);grid.append(empty)}
  }catch(error){if(ticket!==request)return;status.replaceChildren(node('span','메뉴를 불러오지 못했어요. '));const retry=node('button','다시 불러오기');retry.type='button';retry.onclick=()=>load(selected);status.append(retry)}finally{if(ticket===request)grid.setAttribute('aria-busy','false')}
 }
 root.querySelectorAll('[data-food-occasion]').forEach(b=>b.addEventListener('click',()=>{occasion=b.dataset.foodOccasion;situation='all';return load('all')}));
 root.querySelectorAll('[data-food-situation]').forEach(b=>b.addEventListener('click',()=>{situation=b.dataset.foodSituation;root.querySelectorAll('[data-food-situation]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));load(selected)}));
 root.querySelectorAll('[data-food-theme]').forEach(b=>b.addEventListener('click',()=>load(b.dataset.foodTheme)));
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();if(!request)load(selected)}},{rootMargin:'200px'});observer.observe(root)}else load(selected);
})();
