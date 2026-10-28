const fs=require('fs'),vm=require('vm'),zlib=require('zlib'),assert=require('assert');
const app=fs.readFileSync('app.js','utf8');
class El{
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.className='';this.hidden=false}
 append(...xs){this.children.push(...xs)}appendChild(x){this.children.push(x)}replaceChildren(...xs){this.children=[...xs]}setAttribute(k,v){this.attributes[k]=v}before(x){nodes[x.id]=x}removeAttribute(k){delete this.attributes[k]}scrollIntoView(){this.scrolled=true}focus(){this.focused=true}
}
const nodes={recipeSteps:new El('ol')};const ctx=vm.createContext({Map,lang:'ko',tr:(en,ko)=>ctx.lang==='ko'?ko:en,$:id=>nodes[id],document:{createElement:tag=>new El(tag)}});
vm.runInContext(app.slice(app.indexOf('const RECIPE_COOKING_CHECKS='),app.indexOf('function renderRecipe(d,')),ctx);
const all=n=>[n,...n.children.flatMap(all)],checks=()=>all(nodes.recipeSteps).filter(x=>x.type==='checkbox'),counter=()=>nodes.recipeCookingProgress.children.find(x=>x.attributes.role==='status'),reset=()=>nodes.recipeCookingProgress.children.find(x=>x.tag==='button');
const files=['recipes.json','recipes-creator-20261008.json','recipes-epis-20261012.json.gz','recipes-kfi-rice-20261012.json.gz','recipes-rda-cooking-20261013.json.gz','recipes-epis-master-20261014.json.gz','recipes-public-20261008.json.gz'];
const recipes=files.flatMap(f=>JSON.parse(f.endsWith('.gz')?zlib.gunzipSync(fs.readFileSync('data/'+f)):fs.readFileSync('data/'+f)).recipes);
let tested=0;
for(const r of recipes){
 const steps=r.steps.ko;ctx.renderRecipeCookingSteps('db:'+r.id,steps);
 assert.equal(checks().length,steps.length);assert.deepEqual(all(nodes.recipeSteps).filter(x=>x.tag==='span').map(x=>x.textContent),steps.map(x=>x.replace(/^\d+\.\s*/,'')));
 if(!steps.length){assert(nodes.recipeCookingProgress.hidden);continue}
 assert(reset().disabled);assert(counter().textContent.includes('0 / '+steps.length));
 checks().forEach(x=>{x.checked=true;x.onchange()});assert(counter().textContent.includes(steps.length+' / '+steps.length));assert(!reset().disabled);
 ctx.renderRecipeCookingSteps('db:'+r.id,steps);assert(checks().every(x=>x.checked),'rerender preserves progress');
 checks()[0].checked=false;checks()[0].onchange();assert(counter().textContent.includes((steps.length-1)+' / '+steps.length));
 reset().onclick();assert(checks().every(x=>!x.checked));assert(reset().disabled);tested++;
}
ctx.renderRecipeCookingSteps('db:sample',['<img src=x onerror=alert(1)>']);assert.equal(all(nodes.recipeSteps).find(x=>x.tag==='span').textContent,'<img src=x onerror=alert(1)>');checks()[0].checked=true;checks()[0].onchange();
ctx.renderRecipeCookingSteps('legacy:sample',['Another step']);assert(!checks()[0].checked,'legacy and database IDs do not collide');
ctx.renderRecipeCookingSteps('db:sample',['Translated step']);assert(checks()[0].checked,'same recipe survives text rerender');ctx.lang='en';ctx.renderRecipeCookingSteps('db:sample',['Translated step']);assert(counter().textContent.includes('Cooking steps checked: 1 / 1'));assert.equal(reset().textContent,'Reset cooking checks');
ctx.lang='ko';ctx.renderRecipeCookingSteps('db:navigation',['First','Second','Third']);
const next=()=>nodes.recipeCookingProgress.children.filter(x=>x.tag==='button')[1];
assert.equal(nodes.recipeSteps.children[0].attributes['aria-current'],'step');next().onclick();assert(nodes.recipeSteps.children[0].focused);
checks()[0].checked=true;checks()[0].onchange();assert.equal(nodes.recipeSteps.children[0].attributes['aria-current'],undefined);assert.equal(nodes.recipeSteps.children[1].attributes['aria-current'],'step');next().onclick();assert(nodes.recipeSteps.children[1].focused);
checks().forEach(x=>{x.checked=true;x.onchange()});assert(next().disabled);assert(nodes.recipeSteps.children.every(x=>!x.attributes['aria-current']));
checks()[1].checked=false;checks()[1].onchange();assert(!next().disabled);assert.equal(nodes.recipeSteps.children[1].attributes['aria-current'],'step');reset().onclick();assert.equal(nodes.recipeSteps.children[0].attributes['aria-current'],'step');assert(!next().disabled);
ctx.renderRecipeCookingSteps('empty',[]);assert(nodes.recipeCookingProgress.hidden);assert.equal(nodes.recipeSteps.children.length,0);
for(const fragment of ['renderRecipeCookingSteps("legacy:"+d.id','renderRecipeCookingSteps("db:"+r.id,r.steps.ko)','renderRecipeCookingSteps("db:"+r.id,lang==='])assert(app.includes(fragment),'all render paths use checklists');
console.log('PASS '+tested+' source recipe checklists: original step text, counts, checking/unchecking/reset, rerender persistence, separate IDs, plain-text rendering, English labels and empty-step state.');
