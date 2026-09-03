import json, math, re
from pathlib import Path
D=json.loads(Path('/mnt/data/problems_upgraded.json').read_text())

# This verifier independently recomputes each quantitative problem from the numerical givens.
# It does not read the explanation text to obtain the answer.  For conceptual questions,
# it returns None and the structural validator still checks the record.

def nums(s): return [float(v.replace(',','')) for v in re.findall(r'(?<![A-Za-z])\d+(?:\.\d+)?', s)]
def nfloat(pattern,s,default=None):
 m=re.search(pattern,s,re.I); return float(m.group(1).replace(',','')) if m else default

def calc(x):
 id=x['id']; q=x['question']
 if id=='b-gas-e1': return 2/32*0.08206*293
 if id=='b-gas-e2': return (12.5/44)*0.08206*308/1.5
 if id=='b-gas-m1': return 3.2*0.08206*298/8.5
 if id=='b-gas-m2': return 1.2*0.5/(0.08206*295)*28*1000
 if id=='b-gas-h1': return (5/2)*0.08206*((80.3-32)/1.8+273.15)/1
 if id=='b-gas-h2': return (8/44)*0.08206*(15+273.15)/2
 if id=='b-ph-e1': return -math.log10(4e-4)
 if id=='b-ph-e2': return 14-5.3
 if id=='b-ph-m1': return (0.5*0.2)/0.3
 if id=='b-ph-m2': return 10**(-9.1)
 if id=='b-ph-h1': return (0.2*0.5+0.4*0.1)/(0.2+0.4)
 if id=='b-ph-h2': return 1e-14/(10**(-4.5))
 if id=='b-kin-e1': return 100*math.exp(-0.25*6)
 if id=='b-kin-e2': return math.log(2)/5
 if id=='b-kin-m1': return math.log(4)/0.15
 if id=='b-kin-m2': return (1-math.exp(-0.4*6))*100
 if id=='b-kin-h1': return 50*math.exp(-(math.log(50/18.4)/2)*5)
 if id=='b-kin-h2': return 25*(1-math.exp(-0.6*3))
 if id=='aw-eff-e1': return 4*(1-.72)
 if id=='aw-eff-e2': return (1-.3/1.8)*100
 if id=='aw-eff-m1': return (1-(1-.6)*(1-.5))*100
 if id=='aw-eff-m2': return 5*(1-.94)
 if id=='aw-eff-h1': return (1-(6*(1-.97))/(6*(1-.7)))*100
 if id=='aw-eff-h2': return 15000*2000/1400
 if id=='aw-comb-e1': return (20/16*2*32)/.232
 if id=='aw-comb-e2': return (10/44*5*32)/.232
 if id=='aw-comb-m1': return 172*1.2
 if id=='aw-comb-m2': return (50/16*2*32)/.232*1.15
 if id=='aw-comb-h1': return (650/500-1)*100
 if id=='aw-comb-h2': return ((30/44*5*32)/.232*1.10)*.768
 if id=='aw-lf-e1': return 12000*2000/1100
 if id=='aw-lf-e2': return 30/6
 if id=='aw-lf-m1': return 48/4
 if id=='aw-lf-m2': return 45000*4.5*365/850
 if id=='aw-lf-h1': return (30000*15+800*sum(range(15)))*4*365/1000
 if id=='aw-lf-h2': return 60000*3.8*.65*365/1250
 if id=='wr-cont-e1': return 10/(math.pi*1.5**2/4)
 if id=='wr-cont-e2': return 6*(math.pi*(8/12)**2/4)
 if id=='wr-cont-m1': return 5/(math.pi*(6/12)**2/4)
 if id=='wr-cont-m2': return (900/448.8)/(math.pi*(10/12)**2/4)
 if id=='wr-cont-h1': return 8*(math.pi*(10/12)**2/4+math.pi*(8/12)**2/4)
 if id=='wr-cont-h2':
  v1=15/(math.pi*1**2/4); v2=15/(math.pi*1.25**2/4); return (v1-v2)/v1*100
 if id=='wr-man-e1': return 1.49/.013*1.5**(2/3)*.002**.5
 if id=='wr-man-e2': return 1.49/.025*.8**(2/3)*.0015**.5
 if id=='wr-man-m1': return 1.49/.017*2**(2/3)*.001**.5*25
 if id=='wr-man-m2': return 1.49/.02*1.2**(2/3)*.0015**.5
 if id=='wr-man-h1': return (6*.015/(1.49*1.8**(2/3)))**2
 if id=='wr-man-h2': return 1.49/.022*1.6**(2/3)*.0008**.5*30
 if id=='wr-rat-e1': return .85*2.5*8*1.008
 if id=='wr-rat-e2': return .35*3.2*15*1.008
 if id=='wr-rat-m1': return ((.9*5+.25*10)/15)*2.8*15*1.008
 if id=='wr-rat-m2': return .6*(45/25.4)*12*1.008
 if id=='wr-rat-h1': return (.75-.3)*3*20*1.008
 if id=='wr-rat-h2': return .55*3.4*8.5*1.008
 if id=='wt-det-e1': return 1.5*1.547*25
 if id=='wt-det-e2': return 3*1.547*15*60
 if id=='wt-det-m1': return (30*15*12)/(2.5*1.547) # seconds
 if id=='wt-det-m2': return (2500/448.8)*45*60
 if id=='wt-det-h1': return 4*1.547*(30+20*60)
 if id=='wt-det-h2': return (6*1.547/3)*25*60
 if id=='wt-dose-e1': return 15*3*8.34
 if id=='wt-dose-e2': return 2.5*8*8.34
 if id=='wt-dose-m1': return 250/(5*8.34)
 if id=='wt-dose-m2': return 20*4*8.34/.65
 if id=='wt-dose-h1': return 18*6.5*8.34*.85*365
 if id=='wt-dose-h2': return (12*5.5*8.34*.9*365,22*5.5*8.34*.9*365)
 if id=='wt-hard-e1': return 80*2.5
 if id=='wt-hard-e2': return 15*4.1
 if id=='wt-hard-m1': return 95*2.5+22*4.1
 if id=='wt-hard-m2': return 310-min(310,180)
 if id=='wt-hard-h1': return 280*.74/.9
 if id=='wt-hard-h2': return 250*.40+310*.35+180*.25
 if id=='ww-bod-e1': return 8.2-4
 if id=='ww-bod-e2': return 9-2.3
 if id=='ww-bod-m1': return (8-5.5)*10
 if id=='ww-bod-m2': return (8.5-3)-.4
 if id=='ww-bod-h1': return 180/.68
 if id=='ww-bod-h2': return (210-18)*4.2*8.34
 if id=='ww-fm-e1': return 1200/6000
 if id=='ww-fm-e2': return 800/3200
 if id=='ww-fm-m1': return (190*2.8*8.34)/(2400*.3*8.34)
 if id=='ww-fm-m2': return 8500/1800
 if id=='ww-fm-h1': return 9000/8
 if id=='ww-fm-h2': return (2200/.35)/(2800*8.34)
 if id=='ww-solids-e1': return 260*5*8.34
 if id=='ww-solids-e2': return 180*3.2*8.34
 if id=='ww-solids-m1': return 3.5e6/(math.pi*60**2/4)
 if id=='ww-solids-m2': return (220-140)*6*8.34
 if id=='ww-solids-h1':
  mass=240*7.5*8.34*.62
  return mass/(.045*1.02*62.4)*7.48052
 if id=='ww-solids-h2':
  bod=200*.90*5*8.34; o2=bod*1.2; air=o2/.232; return air/.075/1440
 if id=='site-darcy-e1': return 35*400*.0018
 if id=='site-darcy-e2': return 12*150*.004
 if id=='site-darcy-m1': return 18*300*((142.5-138)/250)
 if id=='site-darcy-m2': return .002*0.0328084*86400*800*.01
 if id=='site-darcy-h1': return 800/(20*.0025/.3)
 if id=='site-darcy-h2': return 600/(15*.003/.25/5)/365
 if id=='site-trans-e1': return 45*30
 if id=='site-trans-e2': return 900/20
 if id=='site-trans-m1': return (40*10+8*15)/(10+15)
 if id=='site-trans-m2': return 650*.002*500
 if id=='site-trans-h1': return 15000/(2*math.pi*1200)*math.log(300/50)
 if id=='site-trans-h2': return 8000/(25*40*.0015)
 if id=='site-retard-e1': return .8/2*100
 if id=='site-retard-e2': return 1.2/3*60
 if id=='site-retard-m1': return 450/(.6/2.5)
 if id=='site-retard-m2': return (1+1.7/.35*1.5, .5/(1+1.7/.35*1.5))
 if id=='site-retard-h1': return (560/(.7/6)-560/(.7/2))/365
 if id=='site-retard-h2':
  t=700/(.9/4); return math.exp(-math.log(2)/800*t)
 if id=='ehs-isq-e1': return 80*(3/6)**2
 if id=='ehs-isq-e2': return 200*(1/5)**2
 if id=='ehs-isq-m1': return 2*math.sqrt(500/20)
 if id=='ehs-isq-m2': return 350*(4/(8*3))**2
 if id=='ehs-isq-h1': return 1000*(2/10)**2*.10
 if id=='ehs-isq-h2': return 650*(1.5/9)**2*3
 if id=='ehs-twa-e1': return (80*5+20*3)/8
 if id=='ehs-ir-e1': return 8*200000/(180*2080)
 if id=='ehs-twa-m1': return (120*3+60*2)/8
 if id=='ehs-ir-m1': return 5*200000/850000
 if id=='ehs-twa-h1': return (250*.25+40*7.75)/8
 if id=='ehs-decay-e1': return 400*.5**3
 if id=='ehs-decay-e2': return 1000*.5**3
 if id=='ehs-decay-m1': return math.log(600/75,2)*8
 if id=='ehs-decay-m2': return 40/3
 if id=='ehs-decay-h1': return (1-50/(2000*.5**3))*100
 if id=='ehs-decay-h2': return (1.2/4.5)*100
 if id=='pm-pw-e1': return 30000/(1.07**8)
 if id=='pm-pw-e2': return 10000*1.05**6
 if id=='pm-pw-m1': return math.log(14000/8000)/math.log(1.08)
 if id=='pm-pw-m2': return 25000/(1+.06/4)**(10*4)
 if id=='pm-pw-h1': return 20000/1.07**5 + 3000*sum(1/1.07**t for t in range(1,6))
 if id=='pm-pw-h2':
  nominal=1.04*1.03-1; return 50000/(1+nominal)**12
 if id=='pm-be-e1': return 40000/(28-12)
 if id=='pm-be-e2': return (60000-5000)/11
 if id=='pm-be-m1': return (75000+30000)/(45-18)
 if id=='pm-be-m2': return 120000-3*(120000-15000)/8
 if id=='pm-be-h1': return (50000-20000)/(25-15)
 if id=='pm-be-h2': return (140000-(200000-4*(200000-20000)/10))*.30
 if id=='pm-idx-e1': return 150000*600/480
 if id=='pm-idx-e2': return (1+.09/12)**12-1
 if id=='pm-idx-m1': return 85000*540/420
 if id=='pm-idx-m2': return 15000*(1+.08/4)**(4*5)
 if id=='pm-idx-h1': return (95000*490/350-8000)/15
 if id=='pm-idx-h2': return 40000*math.exp(.10*6)
 if id=='lc-site-p1': return 1850/78000*24.45/1000*1e6
 if id=='lc-site-p2': return None
 if id=='lc-wr-p1': return .8*.5/1.059e-5
 if id=='lc-wr-p2':
  A=math.pi*(2/12)**2/4; v=math.sqrt(2*32.2*9); return .61*A*v
 if id=='wr-manometer-h1': return 10+846/144-62.4*2/144
 raise KeyError(id)

def extract_values(s):
    # Parse ordinary, scientific-notation, and percent values from a selected choice.
    pat=r'(?<![A-Za-z])\d+(?:,\d{3})*(?:\.\d+)?(?:[eE][-+]?\d+|\s*[x×*]\s*10\^[-+]?\d+)?'
    vals=[]
    for raw in re.findall(pat,s):
        z=raw.replace(',','').replace(' ','')
        if re.search(r'[eE][-+]?\d+$',z): v=float(z)
        elif re.search(r'[x×*]10\^',z):
            a,e=re.split(r'[x×*]10\^',z); v=float(a)*10**int(e)
        else: v=float(z)
        vals.append(v)
    if '%' in s:
        vals += [v/100 for v in vals]
    return vals

errors=[]
qcount=0
for x in D:
    c=calc(x)
    if c is None: continue
    qcount+=1
    expected=c if isinstance(c,tuple) else (c,)
    choice=x['choices'][x['answerIndex']]
    got=extract_values(choice)
    for ev in expected:
        if not got or min(abs(n-ev)/max(abs(ev),1e-12) for n in got)>0.03:
            errors.append((x['id'],ev,choice,got))

print('Quantitative problems independently recomputed:',qcount)
print('Conceptual-only problems:',len(D)-qcount)
if errors:
    print('MISMATCHES')
    for e in errors: print(e)
    raise SystemExit(1)
else:
    print('All recomputed numeric answers match their selected choices within 3%.')
