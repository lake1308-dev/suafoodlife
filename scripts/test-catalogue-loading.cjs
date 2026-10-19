const fs=require('fs'),vm=require('vm'),assert=require('assert'),zlib=require('zlib');
const app=fs.readFileSync('app.js','utf8');
const source=app.slice(app.indexOf('async function fetchCatalogueChunk'),app.indexOf('async function loadIngredientDB'));
const chunk=(path,rows)=>({path,record_count:rows.length,rows});
function body(rows,gzip=false){const b=Buffer.from(JSON.stringify({columns:['id'],record_count:rows.length,rows}));return {ok:true,arrayBuffer:async()=>gzip?zlib.gzipSync(b):b}}
async function run(chunks,respond){
 const calls=[];
 const ctx=vm.createContext({DB_BULK:[],DB_BULK_BY_ID:new Map(),DB_BULK_BY_NAME:new Map(),bulkLoadState:'loading',FOOD_ADVICE_BATCH:{},lang:'ko',Response,Blob,DecompressionStream,TextDecoder,Uint8Array,console:{warn(){}},$:()=>null,updateSearchReadiness(){},bulkToIngredient:row=>({id:row[0],_normalizedName:row[0]}),fetch:async(url,options)=>{
  if(url.startsWith('data/catalog-manifest'))return {ok:true,json:async()=>({record_count:chunks.reduce((n,x)=>n+x.record_count,0),chunks})};
  if(url.startsWith('data/food-advice'))return {ok:false};
  const path=url.split('?')[0];calls.push({path,cache:options.cache});return respond(path,calls.filter(x=>x.path===path).length);
 }});vm.runInContext(source,ctx);await ctx.loadBulkNutritionDB();return {ctx,calls};
}
(async()=>{
 const chunks=[chunk('a',[['a']]),chunk('b',[['b']]),chunk('c',[['c']])];
 let r=await run(chunks,(path,n)=>path==='b'&&n===1?{ok:false,status:503}:body([[path]],path==='c'));
 assert.equal(r.ctx.bulkLoadState,'ready');assert.equal(r.ctx.DB_BULK.length,3);assert.equal(r.calls.filter(x=>x.path==='a').length,1);assert.equal(r.calls.filter(x=>x.path==='b').length,2);assert.equal(r.calls.find(x=>x.path==='b'&&x.cache==='reload').cache,'reload');
 r=await run(chunks,(path,n)=>{if(path==='b'&&n===1)throw Error('connection interrupted');return body([[path]])});assert.equal(r.ctx.bulkLoadState,'ready');
 r=await run(chunks,(path,n)=>path==='b'&&n===1?body([]):body([[path]]));assert.equal(r.ctx.bulkLoadState,'ready');
 r=await run(chunks,path=>path==='b'?{ok:false,status:503}:body([[path]]));assert.equal(r.ctx.bulkLoadState,'partial');assert.equal(r.ctx.DB_BULK.length,2);assert.equal(r.calls.filter(x=>x.path==='b').length,2);
 r=await run(chunks,()=>({ok:false,status:503}));assert.equal(r.ctx.bulkLoadState,'failed');assert.equal(r.calls.length,6);
 // Duplicate batches must not leave a partially committed catalogue behind.
 r=await run([chunk('a',[['same']]),chunk('b',[['b'],['same']])],p=>body(p==='a'?[['same']]:[['b'],['same']]));assert.equal(r.ctx.bulkLoadState,'partial');assert.deepEqual(Array.from(r.ctx.DB_BULK,x=>x.id),['same']);
 r=await run([chunk('a',[['a']]),chunk('b',[['dup'],['dup']])],p=>body(p==='a'?[['a']]:[['dup'],['dup']]));assert.equal(r.ctx.DB_BULK.length,1);assert.equal(r.calls.filter(x=>x.path==='b').length,2);
 console.log('PASS per-file retry after HTTP, network and invalid-count failures; gzip; healthy chunks fetched once; bounded permanent failures retain searchable data; duplicate batches commit no partial rows.');
})().catch(e=>{console.error(e);process.exit(1)});
