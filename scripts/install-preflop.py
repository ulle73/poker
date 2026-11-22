"""Import personal ART/GTO range files and CC-BY HoldemMath HU data, not executables.

Usage: python scripts/install-preflop.py ARTGTO.zip HOLD­EMMATH_CHECKOUT DESTINATION
Only the documented numeric tables are read from the supplied HTML; no vendor code runs.
"""
import ast
import hashlib
import json
import re
import sys
import zipfile
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ART_SHA='cc1fc30512a3d05d60a627c7b1c42f90a809e38dc08c3a5974116267fc8f7e79'
HU_SHA='00bc184e6b514888d23a8c2d8e9c3c83af2ac960b441310ba594c06b6cba9bec'
RANKS='AKQJT98765432'
# Standard hand classes always have the larger rank first.
ORDER=[a+b+'s' if i<j else b+a+'o' if i>j else a+a for i,a in enumerate(RANKS) for j,b in enumerate(RANKS)]
SEATS={'UTG','MP','CO','BU','SB','BB'}

def sha(data):return hashlib.sha256(data).hexdigest()
def parse_range(text):
    combos={}
    def add(body,weight):
        for token in re.split(r'[,\s]+',body.strip()):
            if not token:continue
            if not re.fullmatch(r'[2-9TJQKA][shdc][2-9TJQKA][shdc]',token) or token[:2]==token[2:]:raise ValueError('Invalid concrete combination')
            pair=tuple(sorted([token[:2],token[2:]]))
            if pair in combos:raise ValueError('Duplicate combination')
            combos[pair]=weight
    def weighted(match):
        value=Decimal(match[1])
        if not 0<=value<=100:raise ValueError('Invalid percentage')
        add(match[2],value*100)
        return ' '
    remainder=re.sub(r'\[([\d.]+)\]([^\[]*)\[/\1\]',weighted,text)
    if '[' in remainder or ']' in remainder:raise ValueError('Malformed weight block')
    add(remainder,Decimal(10000))
    sums={h:Decimal(0) for h in ORDER}
    for (a,b),weight in combos.items():
        a,b=sorted([a,b],key=lambda c:RANKS.index(c[0]))
        h=a[0]+b[0]+('' if a[0]==b[0] else 's' if a[1]==b[1] else 'o')
        sums[h]+=weight
    return {h:int((v/(6 if len(h)==2 else 4 if h[-1]=='s' else 12)).quantize(Decimal(1),rounding=ROUND_HALF_UP)) for h,v in sums.items()}

def tables(html):
    names=['OPEN_RAISE','THREE_BET','SQUEEZE','FOUR_BET_DEFAULTS','FOUR_BET_OVERRIDES','COLD_FOUR_BET','FOUR_BET_VS_SQUEEZE','FIVE_BET_SMALL','FIVE_BET_VS_COLD4','FIVE_BET_VS_COLD4_OVR','FIVE_BET_VS_SQUEEZE_FOUR']
    result={}
    for name in names:
        match=re.search(r'const '+name+r'\s*=\s*(\{[\s\S]*?\n?\});',html)
        if not match:raise ValueError('Missing source sizing table '+name)
        value=re.sub(r'//[^\n]*','',match[1])
        # Numeric object keys in JS are numeric keys in the literal evaluator too.
        result[name]=ast.literal_eval(value)
    return result

def size(actor,action,line,t):
    if action in ('5bet','6bet'):return 100
    if action=='fold':return 0
    if action=='RFI':return t['OPEN_RAISE'][actor]
    aggressive=[(p,a) for p,a in line if a not in ('fold','call')]
    if action=='call':
        if not aggressive:return 1
        p,a=aggressive[-1];i=max(i for i,v in enumerate(line) if v==(p,a))
        return size(p,a,line[:i],t)
    opener=aggressive[0][0]
    if action=='3bet':
        return t['SQUEEZE'][actor] if any(a=='call' for _,a in line) else t['THREE_BET'][actor][opener]
    three_idx=next(i for i,(_,a) in enumerate(line) if a=='3bet')
    three_actor=line[three_idx][0]
    squeeze=any(a=='call' for _,a in line[:three_idx])
    three_size=size(three_actor,'3bet',line[:three_idx],t)
    if action=='4bet':
        if squeeze:return t['FOUR_BET_VS_SQUEEZE'][three_size]
        if actor!=opener:return t['COLD_FOUR_BET'][actor][three_size]
        return t['FOUR_BET_OVERRIDES'].get(actor,{}).get(three_actor,t['FOUR_BET_DEFAULTS'][actor])
    if action=='5bet_small':
        four_idx=next(i for i,(_,a) in enumerate(line) if a=='4bet')
        four_actor=line[four_idx][0];four_size=size(four_actor,'4bet',line[:four_idx],t)
        if squeeze:
            if actor!=three_actor:raise KeyError('Only squeezer has small 5bet')
            return t['FIVE_BET_VS_SQUEEZE_FOUR'][four_size]
        if four_actor!=opener:return t['FIVE_BET_VS_COLD4_OVR'].get(actor,{}).get(four_size,t['FIVE_BET_VS_COLD4'][four_size])
        return t['FIVE_BET_SMALL'][actor][opener]
    raise ValueError('Unknown action '+action)

def tokens(text):
    parts=text.split('_');result=[];i=0
    while i<len(parts):
        p=parts[i];a=parts[i+1];i+=2
        if a=='5bet' and i<len(parts) and parts[i]=='small':a+='_'+parts[i];i+=1
        if p not in SEATS or a not in ('RFI','call','fold','3bet','4bet','5bet','5bet_small','6bet'):raise ValueError('Unknown source line')
        result.append((p,a))
    return result

def source_line(actor,line):
    if len(line)!=1:return line
    p,a=line[0]
    if a=='RFI':return line
    if a=='3bet':return [(actor,'RFI'),(p,a)]
    if a=='4bet':return [(p,'RFI'),(actor,'3bet'),(p,a)]
    if a in ('5bet','5bet_small'):return [(actor,'RFI'),(p,'3bet'),(actor,'4bet'),(p,a)]
    if a=='6bet':return [(p,'RFI'),(actor,'3bet'),(p,'4bet'),(actor,'5bet_small'),(p,a)]
    raise ValueError('Ambiguous pairwise source alias')

def install(archive,hu_dir,destination):
    archive=Path(archive);hu_dir=Path(hu_dir);destination=Path(destination)
    if sha(archive.read_bytes())!=ART_SHA:raise ValueError('ART/GTO archive is not the reviewed version')
    hu_bytes=(hu_dir/'pushfold/pushfold_charts.json').read_bytes()
    if sha(hu_bytes)!=HU_SHA:raise ValueError('HoldemMath data is not the reviewed version')
    hu=json.loads(hu_bytes)
    with zipfile.ZipFile(archive) as z:
        t=tables(z.read('artgto-viewer/artgto.html').decode('utf-8-sig'))
        rows={};skipped=[];conflicts=set();file_count=0
        for name in z.namelist():
            if '/ranges/' not in name or not name.endswith('.txt') or name.endswith('LICENCE.txt'):continue
            file_count+=1;stem=Path(name).stem;own,_,ctx=stem.partition('_vs_');actor,action=own.split('_',1)
            try:
                raw_line=tokens(ctx) if ctx else [];line=source_line(actor,raw_line)
                bb=size(actor,action,line,t)
                weights=parse_range(z.read(name).decode('utf-8-sig'))
                key=actor+'|'+'_'.join(p+'_'+a for p,a in line)
                row={'token':action,'bb':bb,'weights':[weights[h] for h in ORDER]}
                existing=rows.setdefault(key,{})
                if action in existing and existing[action]!=row:conflicts.add(key)
                else:existing[action]=row
            except (ValueError,KeyError,IndexError) as e:skipped.append({'file':stem,'reason':str(e)})
        if file_count!=2606:raise ValueError('Unexpected source file count')
        nodes={};overfull=[]
        for key,actions in rows.items():
            if key in conflicts:continue
            if any(sum(a['weights'][i] for a in actions.values())>10002 for i in range(169)):
                overfull.append(key);continue
            nodes[key]=sorted(actions.values(),key=lambda a:(a['bb'],a['token']))
        data={'schema':1,'source':'artgto','archiveSha256':ART_SHA,'order':ORDER,'nodes':nodes,
              'hu':{'source':'holdemmath','depths':hu['depths'],'order':hu['order'],'data':hu['data']['hu']},
              'metadata':{'rangeFiles':file_count,'nodes':len(nodes),'depthBB':100,'license':'personal, non-commercial; original notice retained','rake':'not documented in downloaded range package'}}
        encoded=(json.dumps(data,separators=(',',':'),ensure_ascii=False)+'\n').encode()
        manifest={'schema':1,'archiveSha256':ART_SHA,'huSourceSha256':HU_SHA,'librarySha256':sha(encoded),
                  'rangeFiles':file_count,'nodes':len(nodes),'skippedSizingOrFormat':skipped,'conflictingNodes':sorted(conflicts),'overfullNodes':overfull,
                  'sourceUrls':['https://artgto.com/learn/ranges/','https://github.com/Julian-cloud-max/holdemmath-data/tree/7c72b1261f08c63cf8366120dc531631935c21cd'],
                  'model':'ART/GTO 6-max 100bb; HoldemMath HU no-ante push/fold 4–20bb'}
        destination.mkdir(parents=True,exist_ok=True)
        (destination/'ranges.json').write_bytes(encoded)
        (destination/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
        (destination/'ARTGTO-LICENCE.txt').write_bytes(z.read('artgto-viewer/ranges/LICENCE.txt'))
        (destination/'HoldemMath-LICENSE-DATA.txt').write_bytes((hu_dir/'LICENSE-DATA').read_bytes())
        provenance_path=Path(__file__).parents[1]/'docs/solver-provenance.json'
        provenance=json.loads(provenance_path.read_text(encoding='utf-8-sig'))
        provenance['optionalPreflop']={k:manifest[k] for k in ('archiveSha256','huSourceSha256','librarySha256','nodes','rangeFiles','sourceUrls','model')}
        provenance_path.write_text(json.dumps(provenance,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
        print(json.dumps({'installed':str(destination),'nodes':len(nodes),'rangeFiles':file_count,'bytes':len(encoded),'skipped':len(skipped),'conflicts':len(conflicts),'overfull':len(overfull)}))
if __name__=='__main__':
    if len(sys.argv)!=4:raise SystemExit('Usage: install-preflop.py ARTGTO.zip HOLDEMMATH_CHECKOUT DESTINATION')
    install(*sys.argv[1:])
