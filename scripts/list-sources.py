#!/usr/bin/env python3
"""List the job sources the migrations create, with every later UPDATE applied.

Usage (from the repository root):
    python3 scripts/list-sources.py sources.json

Writes a JSON file {slug: {slug, name, adapter, feed_url, config, max_age_days, is_active}} and
prints how many sources are active, by adapter. It reads supabase/migrations/2026*.sql only, so
it shows what the migrations say, not what the live database holds. If the two differ (a
migration was not run, or a source was changed by hand in the SQL Editor), export the live table
instead:  SELECT json_object_agg(slug, row_to_json(job_sources)) FROM job_sources;
UPDATEs of the form  (notes only) are not applied.
"""
import re,glob,json,sys
def strip_comments(t):
    return '\n'.join(l for l in t.split('\n') if not l.lstrip().startswith('--'))
def split_statements(t):
    out=[];cur=[];q=False
    for ch in t:
        if ch=="'": q=not q
        if ch==';' and not q: out.append(''.join(cur));cur=[]
        else: cur.append(ch)
    out.append(''.join(cur)); return out
def tuples(vals):
    res=[];i=0;n=len(vals)
    while i<n:
        if vals[i]=='(':
            i+=1;row=[];tok='';q=False
            while True:
                ch=vals[i]
                if q:
                    if ch=="'":
                        if vals[i+1]=="'": tok+="'";i+=2;continue
                        q=False;row.append(('s',tok));tok='';i+=1;continue
                    tok+=ch;i+=1;continue
                if ch=="'": q=True;tok='';i+=1;continue
                if ch==')':
                    if tok.strip(): row.append(('r',tok.strip()))
                    i+=1;break
                if ch==',':
                    if tok.strip(): row.append(('r',tok.strip()))
                    tok='';i+=1;continue
                tok+=ch;i+=1
            res.append(row)
        else: i+=1
    return res
def clean(row):
    vals=[];
    for k,v in row:
        if k=='r':
            if v.startswith('::'): continue
            vals.append({'true':True,'false':False}.get(v.lower(), int(v) if v.isdigit() else v))
        else: vals.append(v)
    return vals
src={}
for f in sorted(glob.glob('supabase/migrations/2026*.sql')):
    t=strip_comments(open(f).read())
    for st in split_statements(t):
        m=re.search(r'INSERT INTO (?:public\.)?job_sources\s*\(([^)]*)\)\s*VALUES(.*)',st,re.S|re.I)
        if m:
            cols=[c.strip() for c in m.group(1).split(',')]
            body=re.split(r'\bON CONFLICT\b',m.group(2),flags=re.I)[0]
            for row in tuples(body):
                d=dict(zip(cols,clean(row)))
                d.setdefault('is_active',True); d['config']=json.loads(d['config']) if isinstance(d.get('config'),str) else d.get('config',{})
                src.setdefault(d['slug'],d)
        m=re.search(r'UPDATE (?:public\.)?job_sources\s+SET(.*?)WHERE slug = \'([^\']+)\'',st,re.S|re.I)
        if m:
            slug=m.group(2); body=m.group(1)
            if slug in src:
                for col,val in re.findall(r"(\w+)\s*=\s*('(?:[^']|'')*'(?:::jsonb)?|true|false)",body):
                    pass
                mm=re.search(r"adapter\s*=\s*'([^']*)'",body)
                if mm: src[slug]['adapter']=mm.group(1)
                mm=re.search(r"feed_url\s*=\s*'([^']*)'",body)
                if mm: src[slug]['feed_url']=mm.group(1)
                mm=re.search(r"max_age_days\s*=\s*(\d+)",body)
                if mm: src[slug]['max_age_days']=int(mm.group(1))
                mm=re.search(r"is_active\s*=\s*(true|false)",body)
                if mm: src[slug]['is_active']=mm.group(1)=='true'
                mm=re.search(r"config\s*=\s*'((?:[^']|'')*)'::jsonb(\s*\|\|\s*'((?:[^']|'')*)'::jsonb)?",body)
                if mm: src[slug]['config']=json.loads(mm.group(1))
                mm=re.search(r"config\s*=\s*config\s*\|\|\s*'((?:[^']|'')*)'::jsonb",body)
                if mm: src[slug]['config'].update(json.loads(mm.group(1)))
json.dump(src,open(sys.argv[1],'w'),indent=1)
act=[s for s in src.values() if s['is_active']]
print('total',len(src),'active',len(act))
from collections import Counter
print(Counter(s['adapter'] for s in act))
