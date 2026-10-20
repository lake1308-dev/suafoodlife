const fs=require('fs'),vm=require('vm'),zlib=require('zlib'),assert=require('assert');
const app=fs.readFileSync('app.js','utf8');const files=['recipes.json','recipes-creator-20261008.json','recipes-epis-20261012.json.gz','recipes-kfi-rice-20261012.json.gz','recipes-rda-cooking-20261013.json.gz','recipes-epis-master-20261014.json.gz','recipes-public-20261008.json.gz'];
const recipes=files.flatMap(f=>JSON.parse(f.endsWith('.gz')?zlib.gunzipSync(fs.readFileSync('data/'+f)):fs.readFileSync('data/'+f)).recipes);
class El{constructor(){this.children=[];this.textContent=''}set innerHTML(x){this.children=[];this.html=x}get innerHTML(){return this.html||''}appendChild(x){this.children.push(x);x.parent=this}setAttribute(){}remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}focus(){this.focused=true}}
const host=new El(),input=new El();const ctx=vm.createContext({DB_RECIPES:recipes,DISHES:[],lang:'ko',recipeLoadState:'ready',normalize:s=>s.trim().toLowerCase(),compactSearch:s=>s.toLowerCase().replace(/[\s_,·()%]/g,''),tr:(en,ko)=>ko,$:id=>id==='recipeSearchResults'?host:input,document:{createElement:()=>new El()},renderDBRecipeCard:(r,h)=>{const e=new El();e.recipe=r;e.textContent=r.names.ko;h.appendChild(e)},renderDishCards(){}});
vm.runInContext(app.slice(app.indexOf('function recipeMatchScore'),app.indexOf('$("recipeSearchForm").addEventListener')),ctx);
function ids(){return host.children.filter(x=>x.recipe).map(x=>x.recipe.id)}
ctx.recipeSearch('두부');const tofuTotal=recipes.filter(r=>Number.isFinite(ctx.recipeSearchScore(r,'두부'))).length;assert(tofuTotal>18);assert.equal(ids().length,18);assert(host.children[0].textContent.includes(String(tofuTotal)));
while(host.children.some(x=>x.onclick))host.children.find(x=>x.onclick).onclick();assert.equal(ids().length,tofuTotal);assert.equal(new Set(ids()).size,tofuTotal);
const dish={names:{ko:'김치찌개 · 출처 참고',en:'Kimchi stew'}},tagOnly={names:{ko:'참치무침'},tags:['김치찌개']};assert(ctx.recipeSearchScore(dish,'김치찌개')<ctx.recipeSearchScore(tagOnly,'김치찌개'));
ctx.recipeSearch('김치찌개');const first=ids()[0];ctx.recipeSearch('김치 찌개');assert.equal(ids()[0],first);assert(host.children.filter(x=>x.recipe).every(x=>x.recipe.names.ko.includes('김치찌개')));
ctx.recipeSearch('두부');const button=host.children.find(x=>x.onclick);button.onclick();assert(host.children.filter(x=>x.recipe)[18].focused);
ctx.recipeSearch('zzzz-no-recipe');assert.equal(ids().length,0);assert(host.innerHTML.includes('일치하는 레시피'));
ctx.recipeSearch('');assert(input.focused);ctx.recipeLoadState='loading';ctx.recipeSearch('두부');assert(host.children[0].textContent.includes('추가 자료 준비 중'));
console.log('PASS '+recipes.length+' source recipes: tofu search '+tofuTotal+' results remain accessible beyond 18, no duplicates, exact titles before tags, spaced Korean query, next-page focus, fresh-search reset, empty/loading states.');
