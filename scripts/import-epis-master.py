"""Import manually reviewed structured rows from the official EPIS master CSV.
No images, introduction/health claims, invented quantities, or nutrition imported.
"""
import csv,gzip,hashlib,io,json,re,sys
from pathlib import Path
from lxml import html
root=Path(__file__).resolve().parents[1];raw=Path(sys.argv[1]).read_bytes()
rows=list(csv.DictReader(io.StringIO(raw.decode('cp949'))));assert len(rows)==705 and all(None not in r and all(v is not None for v in r.values()) for r in rows)
APPROVED={113,114,116,117,118,119,135,165,180,195,660,675,
122,125,128,131,134,137,138,139,140,144,145,149,
150,152,164,169,170,171,173,174,178,179,
181,182,184,186,187,188,189,190,196,198,199,207}
APPROVED.update({212,214,218,219,220,222,223,226,228,229,230,
241,243,248,251,253,254,256,262,264,267,
271,272,276,278,279,280,281,282,286,287,288,291,293,295,297,299,300})
APPROVED.update({302,310,315,318,319,324,326,331,339,344,328,340,341,346,350,
353,358,359,365,366,367,369,370,372,373,374,376,377,378,379})
APPROVED.update({381,384,385,386,387,388,389,390,391,393,394,395,396,398,400,401,402,403,404,405,407,408,410,
413,416,417,418,420,421,422,424,427,428,429,431,433,434,436,437,438})
APPROVED.update({442,444,446,447,449,450,451,452,458,459,461,462,463,465,466,467,468,469,470,
471,474,475,476,477,478,479,480,482,484,488,489,490,491,492,499})
APPROVED.update({501,502,505,506,507,509,511,515,518,526,
534,537,540,543,545,547,549,550,552,555,558,560,
561,562,563,565,566,572,574,576,578,579,581,582,583,584,585,586})
APPROVED.update({596,598,599,602,604,606,608,609,610,613,614,617,619,621,622,628,629,
632,634,636,638,640,641,642,644,646,652,656,658,659,661,663,665,668,670,
671,680,681,683,685,686,687,688,690,694,695,699,700,701,702,703})
APPROVED.add(109)
REVIEWED=set(range(705))
FINDINGS={
111:'Cooking method uses topping sugar absent from ingredients',
112:'Cooking method uses butter and oil absent from ingredients',
115:'Ingredient section uses grape seed oil while method uses olive oil',

591:'Prepared onion and shiitake never added to cooking method',
592:'Rice wine, salt and kelp stock absent from ingredient section',
593:'Frying oil quantity inconsistent with commercial batch; finishing stage incomplete',
594:'Pork sweet-and-sour ingredients attached to bamboo shoot soup method',
595:'Listed beef never added to cooking method',
597:'Long room-temperature pickling instruction needs separate review',
600:'Seasoned chili paste composition and quantities absent',
601:'Coarse historic household units and seasoning sequence need review',
603:'Prepared beef never added to hot pot; salt absent from ingredients',
605:'Cooking method uses oil absent from ingredients',
607:'Seasoning quantity incomplete; method omits sauce application',
611:'Sauce mixing text duplicated',
612:'Vegetable preparation and dressing composition incomplete',
615:'Seasoning separator corrupted; cooking text has wording errors',
616:'Three side dishes combined without clear structural boundaries',
618:'Soda unit corrupted; unsupported medical claims appended to method',
620:'Broth seasoning listed only as one set without composition',
623:'Rice and bean quantities have corrupted units',
624:'Cooking method uses oil and salt absent from ingredients',
625:'Cooking method uses frying oil absent from ingredients',
626:'Ingredient quantities absent; final seasonings not listed',
627:'Mushroom quantity 2g conflicts with quartering instruction; sauce quantities missing',
630:'Repeated ingredient block; method adds pear absent from ingredients',
631:'Repeated step number and cooking oil absent from ingredients',
633:'Unrelated kimchi preparation inserted in fish recipe',
635:'Curry powder 4 cups for four servings; curry cooking stage absent',
637:'Method uses crab sticks absent from ingredients',
639:'Unrelated jujube preparation inserted in persimmon juice recipe',
643:'Cooking method uses oil absent from ingredients; initial marinade incomplete',
645:'Prepared chicken never returned to final stir-fry; initial seasoning not specified',
647:'Choux topping ingredient quantities not specified',
648:'Cooking method uses rice wine, garlic powder, jujube and garnishes absent from ingredients',
649:'Cooking method uses oil absent from ingredients',
650:'Duplicate of held source row index 530; seasoning composition incomplete',
651:'HTML-like introductory label and sauce consistency need review',
653:'Pepper 1 tablespoon and frying oil details require confirmation',
654:'Duplicate of accepted source row index 534: same ingredients and method',
655:'Meatball seasoning heading has no ingredient content',
657:'Cooking method uses salt absent from ingredients',
662:'Cooking method ends mid-sentence; original text incomplete',
664:'Cooking method uses frying oil absent from ingredient section',
666:'Named flying fish roe never added in cooking method',
667:'Rice absent from ingredient section despite rice-bowl title; duplicate numbering',
669:'Bell pepper ingredient name corrupted',
672:'Ingredient quantities unspecified',
673:'Rice flour not incorporated explicitly; cream stage refers to itself',
674:'Method requires an unavailable photograph for ingredient preparation',
676:'Two rice dishes combined with repeated numbering',
677:'Title corrupted; cooking method uses oil absent from ingredients',
678:'Method uses seaweed, sesame oil, garlic, rice and shrimp paste absent from ingredients',
679:'Ingredient text and action verbs corrupted; main vegetable names not aligned',
682:'Onion 1.5 in ingredients but 1.25 used in method',
684:'Cooking method uses chili powder absent from ingredients',
689:'Final rolling sentence corrupted; sesame oil never used',
691:'Listed tangerine and walnut never used; cream absent from ingredients',
692:'Preparation wording repeated; requires text confirmation',
693:'Rice seasoning and burdock seasoning compositions missing',
696:'Tomato sauce quantity measured as one-third of an item; ambiguous unit',
697:'Water 8 cups in ingredients but method uses 7 cups',
698:'Unsupported therapeutic claims embedded in method',
704:'Cooking method uses frying oil absent from ingredients; broth name corrupted',

503:'Three kimchi recipes combined with repeated numbering',
504:'Ingredient section lists cooked rice paste while method requires raw rice flour',
508:'Chicken seasoning label names lamb; dipping sauce composition missing',
510:'Duplicate of accepted source row index 506: same ingredients and method',
512:'Two dishes combined with repeated numbering',
513:'Rice dish and soup combined with repeated numbering',
514:'Repeated ingredient block and nested numbering require review',
516:'Title names diced kimchi but cooking method shreds radish',
517:'Two dishes combined with repeated numbered sequences',
519:'Seasoning composition and quantities missing',
520:'Stuffing ingredients mostly absent from ingredient section',
521:'Extended grain soaking requires separate preparation review',
522:'Three kimchi recipes combined with repeated numbering',
523:'Seasoning composition missing and bean sprout quantity corrupted',
524:'Multiple leaf fritters combined with repeated numbering',
525:'Cooking method uses salt absent from ingredients',
527:'Ingredient section lists prepared crab pickle; raw crab fermentation needs review',
528:'Stock composition and quantity absent; onion amount requires confirmation',
529:'Unrelated carrot, cucumber and seaweed preparation appended',
530:'Optional finishing ingredients absent from ingredient section',
531:'Water 7 cups in ingredients but 4 cups in method',
532:'Honey and flour absent from ingredients; fermentation process needs review',
533:'Three preserves combined with repeated numbering',
535:'Outdoor fish drying requires separate preparation review',
536:'Two methods combined and multiple unlisted ingredients used',
538:'Cooking method adds sugar absent from ingredients',
539:'Recipe quantities and seasoning details omitted',
541:'Two dishes combined; quantities and complete method omitted',
542:'Detailed vegetable and meat seasonings omitted',
544:'Three kimchi recipes combined with repeated numbering',
546:'Several dishes combined; seasoning composition omitted',
548:'Rice rinsing broth absent from ingredient section',
551:'Unrelated rice serving instruction inserted into porridge steps',
553:'Vegetable seasoning and cooking oil absent from ingredient section',
554:'Cooking method adds honey absent from ingredients',
556:'Cooking method adds pear absent from ingredients',
557:'Sorghum 5 cups in ingredient section but 4 cups in method',
559:'Cooking method uses sesame oil absent from ingredients',
564:'Two dishes combined; seasoning composition missing',
567:'Listed garlic and scallions never added in cooking method',
568:'Cooking method adds jujubes absent from ingredients',
569:'Cooking procedure stops before rice cakes are cooked',
570:'Three cold dishes combined; quantities and complete seasoning details missing',
571:'Main jelly and seasoning composition absent from ingredient section',
573:'Overnight meat cooling and dipping sauce composition require review',
575:'Three grilled dishes combined; quantities and seasoning details missing',
577:'Recipe quantities, seasoning and cooking stage omitted',
580:'Compound title includes skewers but method only describes braised rice cakes',
587:'Ingredient quantities unspecified',
588:'Ingredient quantities and complete seasoning details omitted',
589:'Cooking method uses onion absent from ingredients; quantities unspecified',
590:'Ingredient quantities and sauce details omitted',

441:'Recipe title and ingredients are pork and octopus; method is cubed radish kimchi',
443:'Large part of preparation and cooking method duplicated',
445:'Bean cooking adequacy requires clarification',
448:'Ingredient name corrupted as burner instead of butter',
453:'Exact duplicate of accepted source row index 452',
454:'Rice wine quantity repeated; total ambiguous',
455:'Salt used for pickling absent from ingredient section',
456:'Fruit never added to syrup in cooking method',
457:'Button mushroom cooking and pickling process requires review',
460:'Cooking method uses oregano absent from ingredient section',
464:'Fish stock preparation and storage details incomplete',
472:'Cooking method uses water parsley absent from ingredient section',
473:'Title says blanched spinach but blanching step omitted',
481:'Cooking method uses vinegar absent from ingredient section',
483:'Ingredient section uses onion but method uses cabbage',
485:'Cooking method uses red pepper absent from ingredient section',
486:'Raw squid fermentation and storage method requires review',
487:'Listed foxtail millet never added to rice in cooking method',
493:'Two dishes and repeated numbered sequences combined',
494:'Ingredient quantities unspecified; additional seasonings absent',
495:'Exact duplicate of source row index 494 with different title',
496:'Cooking method uses garlic absent from ingredient section',
497:'Two distinct dishes with repeated numbering require splitting and separate review',
498:'Two distinct porridges with repeated numbering require splitting and separate review',
500:'Rice described as chestnuts in method; sugar absent from ingredients',

382:'Onion and garlic frying sentence duplicated',
383:'Apparent duplicate of approved source row index 281; verify version before adding',
392:'Initial instruction slices pork but final instruction uses minced pork',
397:'Method adds Japanese soybean paste absent from ingredient section',
399:'Garlic and enoki cooking stage omitted from method',
406:'Sauce mixing sentence duplicated',
409:'Main fish and salt absent from ingredient section',
411:'Anchovy and kelp stock ingredients absent; boiling duration missing unit',
412:'Prepared chives and carrots not incorporated in final method',
414:'Named chestnut ingredient absent from ingredient section',
415:'Shrimp prepared but never added to stew in displayed method',
419:'Egg mixture not incorporated into flour mixture explicitly',
423:'Rice paste water and final paste volume are inconsistent',
425:'Finishing seasonings absent from ingredient section',
426:'Exact duplicate of source row index 425; same missing finishing ingredients',
430:'Finishing seasonings absent from ingredient section',
432:'Duplicate of approved source row index 214: same quantities and cooking method',
435:'Bean variety and sufficient cooking procedure need review',
439:'Sugar unit corrupted as 커브; requires source confirmation',
440:'Ingredient section names prepared cubed kimchi but method uses raw radish',

301:'Broth section specifies 1.5L but method uses 10 cups',
303:'Cooking method uses garlic and soy sauce absent from ingredients',
304:'Apples, mayonnaise and salt missing from ingredient section',
305:'Final step refers to itself; shrimp form unclear',
306:'Dried squid quantity repeated; total ambiguous',
307:'Ingredients use beef; method uses pork',
308:'Broth quantity incomplete and garnishes absent from ingredients',
309:'Method switches from pollock broth to unspecified anchovy broth',
311:'Salt and pepper missing from ingredient section',
312:'Anchovy amount lacks unit',
313:'Pickling and kimchi broth preparation omitted',
314:'Duplicate of approved source row index 262: same quantities and cooking method',
316:'Repeated water, sugar and salt quantities have unclear assignment',
317:'Squash and tangerine quantities lack units',
320:'Ingredient flour amount differs from method grain amount',
321:'Industrial portion size and omitted finish require review',
322:'Ingredient section uses soy sauce 1T; method uses 2T',
323:'Industrial salt quantity requires review',
325:'Malformed HTML break may hide chicken preparation; doneness wording needs review',
327:'Cooking method uses dried herring absent from ingredients',
329:'Anchovy cooking stage omitted',
330:'Method cross-references point at different preparation stages',
332:'Method cross-references point at incorrect stages',
333:'Cooking method uses oil absent from ingredients',
334:'Cooking method uses oil absent from ingredients',
335:'Cooking method uses garlic absent from ingredients',
336:'Cooking method uses oil absent from ingredients',
337:'Named oil differs from finishing sesame oil; raw seafood preparation needs review',
338:'Cooking method uses pepper and oil absent from ingredients',
342:'Ingredients specify anchovies but cooking method uses beef stock',
343:'Cooking method uses lettuce, chicory and fresh cucumber not aligned with ingredients',
345:'Cooking method uses flour absent from ingredients',
347:'Water quantity differs; unnamed ingredient quantity appears as prepared porridge',
348:'Cooking method uses flour absent from ingredients',
349:'Soy sauce quantity disproportionately high; requires confirmation',
351:'Cooking method uses additional flour, salt and oil absent from ingredients',
352:'Cooking method uses vinegar and salt absent from ingredients',
354:'Seasonings for several components not specified',
355:'Two sugar quantities and seasoning application require review',
356:'Cooking method uses onion absent from ingredients; dressing quantities differ',
357:'Cooking method uses salt absent from ingredients',
360:'Cooking method omits listed water when initially boiling eel',
361:'Cooking method uses sunflower oil and flour absent from ingredients; rice missing',
362:'Shrimp paste missing from ingredients',
363:'Olive oil totals differ between ingredient section and method',
364:'Initial numbered stage repeated; method uses unspecified shrimp form',
368:'Ground beef soaking procedure requires review',
371:'Duplicate of approved source row index 137: same quantities and cooking method',
375:'Cooking method uses large scallion absent from ingredients',
380:'Enoki mushroom only added when heat is turned off; cooking instructions need review',

211:'Onion and carrot amounts missing before unit',
213:'Minced garlic half-quantity lacks unit; oil absent from ingredients',
215:'Duplicate preparation step; crab preparation and sauce mixing unclear',
216:'Title says mixed dish but method stir-fries; unspecified garlic count unit',
217:'Cooking steps use perilla powder absent from ingredients',
221:'Broth named as kelp volume; requires clarification',
224:'Ingredient section ends with incomplete rice quantity',
225:'Ingredient quantities unspecified; frying oil absent from ingredient section',
227:'Proprietary seasoned soy sauce composition needs clarification',
231:'Several main seasoning amounts unspecified',
232:'Ingredient quantities unspecified',
233:'Seasoned soy sauce composition needs clarification',
234:'Raw enoki mushroom preparation requires separate review',
235:'Final cooking stage missing; dumpling assembly incomplete',
236:'Prepared broth used but composition absent from ingredients',
237:'Anchovy broth absent from ingredients; quantities unspecified',
238:'Method excludes rice syrup but ingredient section specifies corn syrup; method uses frying oil not listed',
239:'Title-specific leaf ingredient missing; quantities and numbering need review',
240:'Original wording says coat both sides rather than cook; needs clarification',
242:'Pine nut quantity repeated; total ambiguous',
244:'Main ingredient quantities unspecified',
245:'Main fish quantity unspecified; cabbage and frying oil missing',
246:'Burdock preparation uses additional unlisted seasonings',
247:'Dressing mixing stage omitted',
249:'Cooking steps use red paprika absent from ingredient section',
250:'Yuzu dressing recipe incomplete',
252:'Room-temperature fish thawing instruction needs review',
255:'Ingredient quantities unspecified',
257:'Ingredient quantities unspecified',
258:'Ingredient section uses prepared curry sauce but method uses curry powder',
259:'Sweet potato ingredients conflict with squash in method',
260:'Listed dipping sauce preparation omitted',
261:'Broth recipe uses additional unlisted ingredients',
263:'Cooking step uses sesame oil absent from ingredients',
265:'Ingredient quantities unspecified',
266:'Sugar quantities not explicitly assigned to egg white and yolk mixtures',
268:'Onion quantity and some seasoning delimiters incomplete',
269:'Several dishes and repeated step numbering combined',
270:'Ham quantity has no unit; several ingredients unspecified',
273:'Cream and yogurt mixing sentence ambiguous',
274:'Rice cake missing from ingredients',
275:'Seasoning procedure and stock quantities incomplete',
277:'Sun-drying seafood preparation needs separate review',
283:'Ingredient section contains apparent unrelated fruit punch ingredients',
284:'Duplicated final step and wording errors need review',
285:'Method uses lemon juice absent from ingredients',
289:'Onion quantity repeated; total ambiguous',
290:'Method uses sugar and rice syrup absent from ingredients',
292:'Method uses soy sauce and chili paste absent from ingredients',
294:'Method uses salt absent from ingredients',
296:'Commercial pressure cooker instruction lacks appliance model or pressure unit',123:'Patty and soy sauce ingredient sections are incomplete',
124:'Ingredient section uses soybean oil while cooking step uses grape seed oil',
126:'Numbered cooking steps contain unsupported joint-health claims',
129:'Ingredient quantities unspecified',133:'Seasoning numeric units unspecified',
136:'Buckwheat jelly 140kg inconsistent with gram-scale other ingredients; soy sauce missing',
142:'Cooking step uses red pepper absent from ingredient section',
143:'Cooking step uses ginger absent from ingredient section',
146:'Displayed method never returns prepared bean sprouts to the dish; garnish omitted from ingredients',
148:'Ingredient section contains an unnamed 600g quantity',
151:'Pickling and seasoning procedure incomplete',
153:'Ingredients use beef but cooking steps use pork; health commentary mixed into steps',
155:'Ingredient name ambiguity and self-referencing final step',
156:'Broth and seasoning listed as one set without composition',
158:'Vegetable and mushroom preparation omitted',
159:'Cooking steps use green pepper absent from ingredient section',
161:'Cooking steps use scallions absent from ingredient section',
163:'Repeated and nested numbering requires manual segmentation',
166:'Rice cake 180kg inconsistent with gram-scale other ingredients',
167:'Cooking steps use sugar absent from ingredient section',
168:'Repeated and nested numbering; apparent duplicate of row 163',
172:'Cooking step references its own step number; oil missing from ingredient section',
176:'Cooking step uses olive oil absent from ingredient section',
183:'Cooking steps use generic nuts and milk not aligned with ingredient section',
185:'Seasoning quantity 2 tablespoons has no named ingredient',
191:'Ingredient section empty',192:'Named soybean paste missing from method; soy sauce and salt omitted from ingredients',
193:'Cooking steps use radish and onion absent from ingredient section',
194:'Dressing mixing method omitted',197:'Cake steaming stage omitted',
201:'Ingredient quantities unspecified',202:'Named curry powder missing from ingredients',
203:'Cooking steps use additional oil and seasonings absent from ingredient section',
204:'Health claims included in cooking steps; seasoning units unspecified',
205:'Vinegar and sugar quantity text ambiguous',208:'Chili oil quantity repeated; total quantity unclear',
209:'Ingredient quantities unspecified'}
def clean(s):
 s=re.sub(r'<br\s*/?>','\n',s,flags=re.I)
 d=html.fromstring('<div>'+s+'</div>')
 for x in d.xpath('.//script|.//style|.//img'):x.drop_tree()
 return '\n'.join(re.sub(r'\s+',' ',x).strip() for x in d.text_content().splitlines() if x.strip())
recipes=[];review=[]
for i,r in enumerate(rows):
 a=r['내용'].split('||');structured=len(a)==5
 status='accepted_manual_review' if i in APPROVED else 'held_manual_review' if i in REVIEWED and structured else 'pending_manual_review' if structured else 'held_unstructured_text'
 review.append({'csv_row':i+2,'title':r['제목'].strip(),'status':status,'has_separate_ingredients_and_method':structured,'review_note':FINDINGS.get(i,'Additional portion, quantity or completeness review needed' if status=='held_manual_review' else ''),'record_sha256':hashlib.sha256(r['내용'].encode()).hexdigest()})
 if i not in APPROVED:continue
 assert structured
 ing=clean(a[3]);method=clean(a[2])
 method=re.sub(r'(?m)^(\d{1,2}),',r'\1.',method)
 if i==598:
  pieces=re.split(r'(?<!\d)[1-4] (?=[가-힣])',method)
 elif re.match(r'^[①②③④⑤⑥⑦⑧⑨⑩]',method):
  pieces=re.split(r'[①②③④⑤⑥⑦⑧⑨⑩]\s+(?=[가-힣])',method)
 elif re.match(r'^[ㅁ□]',method):
  pieces=re.split(r'\s*[ㅁ□]\s*',method)
 elif re.match(r'^[❶❷❸❹❺❻❼❽❾❿]',method):
  pieces=re.split(r'[❶❷❸❹❺❻❼❽❾❿]',method)
 elif re.match(r'^\d{1,2}\s*[.)](?!\d)',method.lstrip('• ')):
  pieces=re.split(r'(?<!\d)\d{1,2}\s*[.)](?!\d)\s*',method)
 else:
  pieces=re.split(r'(?<=\.)\s*(?=[가-힣])',method)
 steps=[x.strip(' \n•') for x in pieces if x.strip(' \n•')]
 assert ing and 2<=len(steps)<=12,(i,r['제목'],steps)
 title=r['제목'].strip();recipes.append({'id':'epis_master_'+str(i+2),'names':{'ko':title,'en':title},'country':'Korea','region':'','category':'요리','category_ko':'요리','tags':[],'servings':None,'ingredients':[],'ingredients_text':ing,'steps':{'ko':steps,'en':steps},'public_recipe':True,'source_kind':'epis_master_reference','source_label':'농정원 고수요리법','source_nutrition':{'kcal':None,'protein_g':None,'carbs_g':None,'fat_g':None,'sodium_mg':None},'nutrition_status':'not_calculated','source_weight_text':'','source':{'name':'농림수산식품교육문화정보원 고수요리법','url':'https://www.data.go.kr/data/15050910/fileData.do','record_id':str(i+2),'retrieved_on':'2026-10-14','license':'이용허락범위 제한 없음','original_sha256':hashlib.sha256(raw).hexdigest()},'source_original_credit':clean(a[4]),'source_time_text':clean(a[0]),'source_registration_date':r['등록일']})
# Manually reviewed components: boundaries come from explicit source headings.
SPLIT_PARTS=[
 (498,'미역죽','[미역죽]','[전복죽]','[미역죽]','[전복죽]'),
 (498,'전복죽','[전복죽]',None,'[전복죽]',None),
 (533,'연근정과','[연근정과]','[생강정과]','[연근정과]','[생강정과]'),
 (533,'생강정과','[생강정과]','[우엉정과]','[생강정과]','[우엉정과]'),
 (512,'무밥','','[대구탕]','[무밥]','[대구탕]'),
 (512,'대구탕','[대구탕]',None,'[대구탕]',None),
 (517,'도토리묵무침','도토리묵무침 :','감자부침 :','* 도토리묵무침 :','* 감자부침 :'),
 (524,'김부각','[김부각]','[동백잎부각]','[김부각]',None),
 (676,'감자밥','갑자밥 :','메밀밥 :','감자밥','메밀밥'),
 (676,'메밀밥','메밀밥 :',None,'메밀밥',None),
]
def section(text,start,end):
 begin=text.index(start)+len(start) if start else 0
 finish=text.index(end,begin) if end else len(text)
 return text[begin:finish].strip().rstrip(',')
import copy
split_counts={}
for i,title,ing_start,ing_end,method_start,method_end in SPLIT_PARTS:
 a=rows[i]['내용'].split('||')
 ingredients=clean(section(a[3],ing_start,ing_end))
 method=clean(section(a[2],method_start,method_end))
 # The source explicitly numbers later steps 2-5; first marker is corrupted as !).
 if i==512 and title=='무밥':method=re.sub(r'^!\)', '1)',method)
 steps=[x.strip() for x in re.split(r'(?<!\d)\d{1,2}\s*[.)](?!\d)\s*',method) if x.strip()]
 assert ingredients and 2<=len(steps)<=12,(i,title)
 ordinal=split_counts.get(i,0)+1;split_counts[i]=ordinal
 r=copy.deepcopy(recipes[0]);r.update({'id':'epis_master_'+str(i+2)+'_part_'+str(ordinal),'names':{'ko':title,'en':title},'ingredients_text':ingredients,'steps':{'ko':steps,'en':steps},'source_original_credit':clean(a[4]),'source_time_text':'','source_registration_date':rows[i]['등록일']})
 r['source'].update({'record_id':str(i+2),'part_title':title,'part_index':ordinal})
 recipes.append(r)
for item in review:
 i=item['csv_row']-2
 if i in split_counts:
  item.update({'status':'accepted_split_manual_review' if i in {498,512,676} else 'partially_accepted_split','accepted_components':split_counts[i],'review_note':'Only independently verified components imported; original heading boundaries retained'})
assert len(recipes)==289 and len({r['id'] for r in recipes})==289
(root/'data/recipes-epis-master-20261014.json.gz').write_bytes(gzip.compress(json.dumps({'version':'1.8.0','record_count':len(recipes),'recipes':recipes},ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
report={'reviewed_on':'2026-10-14','source_url':'https://www.data.go.kr/data/15050910/fileData.do','source_license':'이용허락범위 제한 없음','source_sha256':hashlib.sha256(raw).hexdigest(),'source_bytes':len(raw),'input_records':len(rows),'structured_records':sum(x['has_separate_ingredients_and_method'] for x in review),'accepted':len(recipes),'accepted_split_components':len(SPLIT_PARTS),'fully_accepted_source_rows':sum(x['status'] in ['accepted_manual_review','accepted_split_manual_review'] for x in review),'partially_accepted_source_rows':sum(x['status']=='partially_accepted_split' for x in review),'pending_structured':sum(x['status']=='pending_manual_review' for x in review),'held_manual_review':sum(x['status']=='held_manual_review' for x in review),'held_unstructured':sum(x['status']=='held_unstructured_text' for x in review),'rules':['Only manually approved rows enter public recipe data','Original ingredient quantities and ordered cooking steps retained','Recipe source versions retained separately; title match alone does not prove duplication','Images, descriptions and health claims excluded','No inferred nutrition, allergens or portions'],'records':review}
(root/'data/recipes-epis-master-review-20261014.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print({k:v for k,v in report.items() if k not in ['records','rules']})
