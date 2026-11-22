"""Local personal-study import of the pinned RangeConverter 40bb cash PDF.

Reads embedded chart pixels, never executes vendor code. The original PDF and
converted data stay in the personal installation, not in Git or the app bundle.
Usage: python scripts/install-shortstack.py INPUT.pdf PREFLOP_DIRECTORY
Requires pypdf and Pillow. The pinned image layout is intentionally fail-closed.
"""
import hashlib,json,sys
from collections import Counter
from pathlib import Path
from pypdf import PdfReader

PDF_SHA='a1723be2a7ac0e61b7a1342e1ebe7e778747bb2197572bf8fb0a877610e18799'
URL='https://rangeconverter.com/downloads/6-max-40bb-Poker-Charts-No-Limit-Texas-Holdem-Cash'
RANKS='AKQJT98765432'
ORDER=[a+b+'s' if i<j else b+a+'o' if i>j else a+a for i,a in enumerate(RANKS) for j,b in enumerate(RANKS)]
PALETTE={'fold':(39,125,161),'raise':(227,130,20),'call':(64,145,108),'allin':(164,22,26)}

def color(rgb):
    distance,key=min((sum((rgb[i]-v[i])**2 for i in range(3)),k) for k,v in PALETTE.items())
    return key if distance<900 else None

def grid(image,index):
    if image.size!=(2048,1313):raise ValueError('Unreviewed source chart dimensions')
    gx=[2,517,1032,1546][index%4]
    candidates=range(30,65) if index<4 else range(680,725)
    gy=next((y for y in candidates if color(image.getpixel((gx+10,y)))),None)
    if gy is None:raise ValueError('Chart origin not found')
    rows=[];coverage=[]
    for row in range(13):
        for col in range(13):
            box=(round(gx+col*38.2)+2,round(gy+row*42)+3,round(gx+(col+1)*38.2)-2,round(gy+(row+1)*42)-3)
            counts=Counter()
            for rgb,count in Counter(image.crop(box).get_flattened_data()).items():
                key=color(rgb)
                if key:counts[key]+=count
            mass=sum(counts.values())
            covered=mass>=24
            mix={k:round(v/mass*2)*5000 for k,v in counts.items()} if covered else {}
            if covered and (sum(mix.values())!=10000 or any(abs(mix[k]/10000-v/mass)>.09 for k,v in counts.items())):
                raise ValueError(f'Ambiguous rendered mix in chart {index}, hand {ORDER[row*13+col]}')
            rows.append(mix);coverage.append(covered)
    return rows,coverage

def convert(pdf):
    raw=Path(pdf).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=PDF_SHA:raise ValueError('PDF is not the reviewed version')
    doc=PdfReader(pdf)
    if len(doc.pages)!=13:raise ValueError('Unexpected page count')
    nodes={};coverage={};origins={}
    def add(page,index,hero,history,contract):
        image=list(doc.pages[page].images)[0].image.convert('RGB')
        mixes,mask=grid(image,index)
        if not history and not all(mask):raise ValueError('Incomplete opening chart')
        for mix in mixes:
            if any(v and k!='fold' and k not in contract for k,v in mix.items()):raise ValueError('Chart has an unbound action')
        key=hero+'|'+history
        nodes[key]=[{'token':token,'bb':bb,'weights':[mix.get(c,0) for mix in mixes]} for c,(token,bb) in contract.items() if any(mix.get(c,0) for mix in mixes)]
        coverage[key]=mask;origins[key]={'page':page+1,'chart':index+1}
    positions=['UTG','MP','CO','BU','SB','BB']
    for i,hero in enumerate(positions[:-1]):
        contract={'raise':('RFI',3 if hero=='SB' else 2)}
        if hero=='SB':contract['call']=('call',1)
        add(2,i,hero,'',contract)
    for page,hero in enumerate(positions[1:],3):
        for i,opener in enumerate(positions[:positions.index(hero)]):
            size=7 if hero=='SB' and opener=='BU' else 8 if hero in ('SB','BB') else 5.5
            contract={'raise':('3bet',size),'call':('call',3 if opener=='SB' else 2)}
            if hero=='BB' and opener=='SB':contract['allin']=('allin',40)
            add(page,i,hero,opener+'_RFI',contract)
    responses={8:('UTG',['CO','MP','BU','SB','BB']),9:('MP',['BB','BU','CO','SB']),10:('CO',['BU','SB','BB']),11:('BU',['SB','BB']),12:('SB',['BB'])}
    for page,(hero,villains) in responses.items():
        for i,villain in enumerate(villains):
            three=7 if villain=='SB' and hero=='BU' else 8 if villain in ('SB','BB') else 5.5
            contract={'call':('call',three),'allin':('allin',40)}
            if hero=='UTG' and villain in ('BU','SB'):contract['raise']=('4bet',12 if villain=='BU' else 14.5)
            add(page,i,hero,f'{hero}_RFI_{villain}_3bet',contract)
    return {'schema':1,'source':'rangeconverter','archiveSha256':PDF_SHA,'nodes':nodes,'coverage':coverage,
            'metadata':{'depthBB':40,'modelPlayers':6,'nodes':len(nodes),'rake':'PokerStars 500z; numeric cap not specified in PDF','license':'Original free PDF, personal study only; no bundled source data'}},origins

def install(pdf,destination):
    data,origins=convert(pdf)
    if len(data['nodes'])!=35:raise ValueError('Unexpected chart count')
    encoded=(json.dumps(data,separators=(',',':'))+'\n').encode()
    manifest={'schema':1,'source':'rangeconverter','archiveSha256':PDF_SHA,'librarySha256':hashlib.sha256(encoded).hexdigest(),'nodes':35,'order':ORDER,'sourceUrl':URL,'origins':origins,'rounding':'Rendered 50-percent mixes, not the original unrounded solver output. Printed aggregate bars may differ.'}
    destination=Path(destination);destination.mkdir(parents=True,exist_ok=True)
    (destination/'shortstack.json').write_bytes(encoded)
    (destination/'shortstack-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    (destination/'RangeConverter-40bb-source.pdf').write_bytes(Path(pdf).read_bytes())
    print(json.dumps({'nodes':35,'librarySha256':manifest['librarySha256']}))
if __name__=='__main__':install(*sys.argv[1:])
