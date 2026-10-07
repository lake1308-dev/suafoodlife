"""Read-only audit of source rows excluded from the domestic import."""
import collections, gzip, hashlib, json, math, sys
from pathlib import Path
import openpyxl

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
manifest = json.loads((root / 'data/catalog-manifest.json').read_text())
catalog = {}
for chunk in manifest['chunks']:
    data = json.load(gzip.open(root / chunk['path']))
    for row in data['rows']:
        item = dict(zip(data['columns'], row))
        assert item['code'] not in catalog
        catalog[item['code']] = item

counts = collections.Counter()
flags = collections.Counter()
pending = []
seen = set()
wb = openpyxl.load_workbook(source, read_only=True, data_only=True)
it = wb.active.iter_rows(values_only=True)
index = {name: pos for pos, name in enumerate(next(it))}
for row_number, row in enumerate(it, 2):
    def get(name):
        value = row[index[name]]
        return '' if value is None else str(value).strip()
    code, name, flag = get('식품코드'), get('식품명'), get('수입여부')
    basis, kind = get('영양성분함량기준량'), get('데이터구분명')
    counts['source_rows'] += 1
    flags[flag or '(blank)'] += 1
    if code in seen:
        counts['duplicate_codes'] += 1
    seen.add(code)
    if code in catalog:
        counts['already_registered'] += 1
        continue
    counts['unregistered'] += 1
    reasons = []
    if not code or not name: reasons.append('missing_identity')
    if kind != '가공식품': reasons.append('unexpected_type')
    if basis not in ('100g', '100ml'): reasons.append('unsupported_basis')
    try:
        kcal = float(get('에너지(kcal)'))
        if not math.isfinite(kcal) or kcal < 0: reasons.append('invalid_energy')
    except ValueError:
        reasons.append('missing_energy')
    if reasons:
        decision = 'hold_source_validation'
    elif flag == 'N':
        decision = 'reprocess'
    elif flag == 'Y':
        decision = 'hold_imported_product_scope'
    else:
        decision = 'hold_unknown_import_status'
    counts[decision] += 1
    pending.append({'source_row': row_number, 'code': code, 'name': name,
                    'import_flag': flag, 'basis': basis, 'decision': decision,
                    'reasons': reasons})
    if counts['source_rows'] % 100000 == 0:
        print('Source rows reviewed:', counts['source_rows'], flush=True)
wb.close()
assert counts['source_rows'] == 323197
assert counts['already_registered'] + counts['unregistered'] == counts['source_rows']
assert len(pending) == counts['unregistered']
report = {'source_filename': source.name,
          'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'counts': dict(counts), 'source_import_flags': dict(flags),
          'policy': 'Exact code match; retain all existing items. Reprocess eligible N rows. Hold imported products for domestic-market scope review; foreign manufacture alone is not grounds for permanent exclusion. Hold uncertain identity, units, or energy for source validation. Do not delete or invent nutrition.',
          'permanent_exclusions': 0, 'records': pending}
out = root / 'data/unregistered-products-review.json.gz'
with gzip.GzipFile(filename='', mode='wb', fileobj=out.open('wb'), mtime=0) as stream:
    stream.write(json.dumps(report, ensure_ascii=False, separators=(',', ':')).encode())
summary = {k: v for k, v in report.items() if k != 'records'}
(root / 'data/unregistered-products-review-summary.json').write_text(
    json.dumps(summary, ensure_ascii=False, indent=2))
print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
