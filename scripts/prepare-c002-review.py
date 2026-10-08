"""Prepare offline C002 data for review; this does not publish allergen labels.

Accepts a saved official C002 JSON response or UTF-8 CSV export. Input rows
are grouped by manufacturing-report number, never counted as distinct products.
Download pages must be assembled before this stage; partial ingredient pages
do not prove a complete composition. No API key is required or stored here.
"""
import argparse
import csv
import json
from pathlib import Path

SOURCE_URL = 'https://www.foodsafetykorea.go.kr/api/openApiInfo.do?svc_no=C002'


def load_rows(path):
    text = path.read_text(encoding='utf-8-sig')
    if path.suffix.lower() == '.csv':
        return list(csv.DictReader(text.splitlines()))
    data = json.loads(text)
    if isinstance(data, list):
        return data
    payload = data.get('C002', data)
    result = payload.get('RESULT', {})
    if result.get('CODE') not in (None, 'INFO-000'):
        raise ValueError('C002 response is not a successful data response: ' + result['CODE'])
    rows = payload.get('row')
    if not isinstance(rows, list):
        raise ValueError('C002 JSON must contain a row array')
    return rows


def value(row, key, label):
    return str(row.get(key) or row.get(label) or '').strip()


def prepare(rows):
    groups = {}
    rejected = []
    for index, row in enumerate(rows):
        report = value(row, 'PRDLST_REPORT_NO', '품목제조번호')
        name = value(row, 'PRDLST_NM', '품목명')
        maker = value(row, 'BSSH_NM', '업소명')
        raw = value(row, 'RAWMTRL_NM', '원재료명')
        if not all((report, name, maker, raw)):
            rejected.append({'input_row': index + 1, 'reason': 'missing_product_identity_or_raw_material'})
            continue
        group = groups.setdefault(report, {
            'manufacturing_report_no': report,
            'product_name': name,
            'manufacturer': maker,
            'raw_materials': [],
            'identity_conflict': False,
            'source_url': SOURCE_URL,
            'allergen_declaration_status': 'unverified',
            'cross_contact_status': 'unverified',
            'nutrition_status': 'not_imported',
            'publication_status': 'held_for_product_label_and_exact_catalogue_match',
            'composition_completeness': 'unverified',
        })
        if (name, maker) != (group['product_name'], group['manufacturer']):
            group['identity_conflict'] = True
        item = {'name': raw, 'display_order': value(row, 'RAWMTRL_ORDNO', '원재료표시순서'), 'changed_on': value(row, 'CHNG_DT', '변경일자(YYYYMMDD)')}
        if item not in group['raw_materials']:
            group['raw_materials'].append(item)
    products = list(groups.values())
    return {
        'source': 'Food Safety Korea C002 manufacturing-report ingredients',
        'source_url': SOURCE_URL,
        'input_row_count': len(rows),
        'distinct_product_count': len(products),
        'rejected_row_count': len(rejected),
        'identity_conflict_count': sum(p['identity_conflict'] for p in products),
        'verified_allergen_declaration_count': 0,
        'verified_recipe_count': 0,
        'publication_count': 0,
        'products': products,
        'rejected_rows': rejected,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    result = prepare(load_rows(args.input))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: result[k] for k in ('input_row_count', 'distinct_product_count', 'rejected_row_count', 'verified_allergen_declaration_count', 'publication_count')}, ensure_ascii=False))
