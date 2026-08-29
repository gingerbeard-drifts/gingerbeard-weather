let chartCenterTime=null;
const VIEW_MS=24*60*60*1000;
const chartDrag={active:false,id:null,startX:0,startCenter:0};
let chartRaf=0;

function nearestIndex(ms){
  let best=0, diff=Infinity;
  for(let i=0;i<data.hourly.time.length;i++){
    const d=Math.abs(new Date(data.hourly.time[i]).getTime()-ms);
    if(d<diff){diff=d;best=i}
  }
  return best;
}

function sampleHourly(ms, key){
  const times=data.hourly.time;
  const first=new Date(times[0]).getTime(), last=new Date(times[times.length-1]).getTime();
  ms=Math.max(first,Math.min(last,ms));
  let lo=0, hi=times.length-1;
  while(lo<hi-1){
    const mid=(lo+hi)>>1;
    if(new Date(times[mid]).getTime()<=ms) lo=mid; else hi=mid;
  }
  const t0=new Date(times[lo]).getTime(), t1=new Date(times[hi]).getTime();
  const f=t1===t0?0:(ms-t0)/(t1-t0);
  return lerp(Number(data.hourly[key][lo]||0),Number(data.hourly[key][hi]||0),f);
}

function daySun(ms){
  const d=new Date(ms), key=d.toDateString();
  let di=0;
  if(data.daily.time){
    const hit=data.daily.time.findIndex(v=>new Date(v+"T12:00:00").toDateString()===key);
    if(hit>=0) di=hit;
  }
  return {
    sunrise:new Date(data.daily.sunrise[di]||data.daily.sunrise[0]),
    sunset:new Date(data.daily.sunset[di]||data.daily.sunset[0])
  };
}

function draw(nowIdx){
 const actualNow=Date.now();
 if(chartCenterTime==null) chartCenterTime=actualNow;

 const firstData=new Date(data.hourly.time[0]).getTime();
 const lastData=new Date(data.hourly.time[data.hourly.time.length-1]).getTime();
 const dataMin=firstData+VIEW_MS/2;
 const dataMax=lastData-VIEW_MS/2;
 chartCenterTime=Math.max(dataMin,Math.min(dataMax,chartCenterTime));

 const windowStart=chartCenterTime-VIEW_MS/2, windowEnd=chartCenterTime+VIEW_MS/2;
 const renderStart=windowStart-VIEW_MS, renderEnd=windowEnd+VIEW_MS;
 const H=440, rect=$("chartwrap").getBoundingClientRect(), W=Math.max(320,H*(rect.width/Math.max(rect.height,1))), left=window.innerWidth<700?48:68,right=window.innerWidth<700?16:24,top=34,bottom=68, plotW=W-left-right;
 $("chart").setAttribute("viewBox",`0 0 ${W} ${H}`);

 const samples=[];
 for(let k=0;k<=144;k++){
   const ms=renderStart+(k/144)*(renderEnd-renderStart);
   samples.push({ms,temp:F(sampleHourly(ms,"temperature_2m")),feel:F(sampleHourly(ms,"apparent_temperature")),pop:sampleHourly(ms,"precipitation_probability"),amt:sampleHourly(ms,"precipitation"),hum:sampleHourly(ms,"relative_humidity_2m"),uv:sampleHourly(ms,"uv_index")});
 }

 const visibleSamples=samples.filter(o=>o.ms>=windowStart&&o.ms<=windowEnd);
 const uvVals=samples.map(o=>o.uv);
 const visibleTemps=visibleSamples.map(o=>o.temp), visibleFeels=visibleSamples.map(o=>o.feel);
 const uvMax=Math.max(1,...visibleSamples.map(o=>o.uv));
 const min=Math.floor(Math.min(...visibleTemps,...visibleFeels)-3), max=Math.ceil(Math.max(...visibleTemps,...visibleFeels)+3);
 const xMs=ms=>left+((ms-windowStart)/VIEW_MS)*plotW;
 const x=j=>xMs(samples[j].ms);
 const yt=t=>top+(max-t)/(max-min)*(H-top-bottom);
 const yRain=p=>top+((100-Math.max(0,Math.min(100,p)))/100)*(H-top-bottom);
 const amountMax=Math.max(0.08,...visibleSamples.map(o=>o.amt));

 let s=`<defs><linearGradient id="tempgrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff5a1f"/><stop offset="1" stop-color="#111"/></linearGradient><linearGradient id="uvgrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff3a0" stop-opacity=".52"/><stop offset=".55" stop-color="#ffd24a" stop-opacity=".26"/><stop offset="1" stop-color="#ffd24a" stop-opacity=".04"/></linearGradient><linearGradient id="feelgrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffb28f" stop-opacity=".40"/><stop offset="1" stop-color="#ff5a1f" stop-opacity=".10"/></linearGradient><linearGradient id="raingrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#bdefff" stop-opacity=".50"/><stop offset="1" stop-color="#00b7ef" stop-opacity=".08"/></linearGradient></defs>`;

 for(let j=0;j<=4;j++){const y=top+j*(H-top-bottom)/4, t=Math.round(max-j*(max-min)/4);s+=`<line class="axis" x1="${left}" x2="${W-right}" y1="${y}" y2="${y}"/><text x="5" y="${y+5}">${t}°</text>`}
 s+=`<g id="timelineGroup">`;
 const firstGrid=Math.ceil(renderStart/(2*3600000))*(2*3600000);
 for(let ms=firstGrid;ms<=renderEnd;ms+=2*3600000){
   const d=new Date(ms), xx=xMs(ms), h=d.getHours();
   s+=`<line class="minor" x1="${xx}" x2="${xx}" y1="${top}" y2="${H-bottom}"/>`;
   const compact=window.innerWidth<700;
   if(!compact || h%6===0){const label=h===0?"12A":h===12?"12P":h<12?h+"A":(h-12)+"P";s+=`<text x="${xx}" y="${H-14}" text-anchor="middle">${label}</text>`}
   if(h===0){const dl=compact ? d.toLocaleDateString([], {weekday:"short",day:"numeric"}) : d.toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"});s+=`<text x="${xx+5}" y="${top+15}" fill="#8f8f8f">${dl}</text>`}
 }

 const synodic=29.530588853, knownNewMoon=Date.UTC(2000,0,6,18,14,0);
 const ageDays=((actualNow-knownNewMoon)/86400000%synodic+synodic)%synodic;
 const phaseAngle=(ageDays/synodic)*2*Math.PI;
 const illumination=(1-Math.cos(phaseAngle))/2, mi=moonInfo();
 const sky=samples.map(o=>{
   const ms=o.ms;
   const {sunrise,sunset}=daySun(ms);
   if(ms>=sunrise.getTime() && ms<=sunset.getTime()){
     const q=(ms-sunrise.getTime())/(sunset.getTime()-sunrise.getTime());
     return {v:Math.sin(Math.PI*q),mode:"sun"};
   }
   let nightStart, nightEnd;
   if(ms<sunrise.getTime()){const prev=daySun(ms-12*60*60*1000);nightStart=prev.sunset.getTime();nightEnd=sunrise.getTime();}
   else {const next=daySun(ms+18*60*60*1000);nightStart=sunset.getTime();nightEnd=next.sunrise.getTime();}
   const q=Math.max(0,Math.min(1,(ms-nightStart)/(nightEnd-nightStart)));
   return {v:-Math.sin(Math.PI*q)*0.42,mode:"moon"};
 });
 const skyY=v=>(H-bottom)-v*(H-top-bottom)*.46;
 const uvBandTop=sky.map((o,j)=>{if(o.mode!=="sun") return null;const offset=(uvVals[j]/uvMax)*(H-top-bottom)*.13;return {x:x(j),y:skyY(o.v)-offset,base:skyY(o.v)}});
 const tempXY=samples.map((o,j)=>[x(j),yt(o.temp)]), feelsXY=samples.map((o,j)=>[x(j),yt(o.feel)]), rainXY=samples.map((o,j)=>[x(j),yRain(o.pop)]);
 const tempPts=tempXY.map(p=>p.join(",")).join(" ");
 const tempArea=`${x(0)},${H-bottom} ${tempPts} ${x(samples.length-1)},${H-bottom}`;
 const feelBandTop=samples.map((o,j)=>({x:x(j),y:yt(Math.max(o.temp,o.feel))}));
 const feelBandBottom=samples.map((o,j)=>({x:x(j),y:yt(Math.min(o.temp,o.feel))}));
 const feelPoly=feelBandTop.map(o=>`${o.x},${o.y}`).join(" ")+" "+[...feelBandBottom].reverse().map(o=>`${o.x},${o.y}`).join(" ");
 s+=`<polygon points="${feelPoly}" fill="url(#feelgrad)"/><polygon class="tempFill" points="${tempArea}"/>`;
 const rainBandTop=samples.map((o,j)=>{const extra=(Math.min(o.amt,amountMax)/amountMax)*(H-top-bottom)*.14;return {x:x(j),y:Math.max(top,yRain(o.pop)-extra)}});
 const rainBandBottom=samples.map((o,j)=>({x:x(j),y:yRain(o.pop)}));
 const rainBandPoly=rainBandTop.map(o=>`${o.x},${o.y}`).join(" ")+" "+[...rainBandBottom].reverse().map(o=>`${o.x},${o.y}`).join(" ");
 s+=`<polygon class="rainArea" points="${x(0)},${H-bottom} ${rainXY.map(p=>p.join(",")).join(" ")} ${x(samples.length-1)},${H-bottom}"/><polygon points="${rainBandPoly}" fill="url(#raingrad)"/>`;
 s+=`<path class="tempLine" d="${monotonePath(tempXY)}"/><path d="${monotonePath(feelsXY)}" fill="none" stroke="#ffb28f" stroke-width="1.8" stroke-dasharray="4 4" opacity=".65" stroke-linecap="round"/><path d="${monotonePath(rainXY)}" fill="none" stroke="#00b7ef" stroke-width="2.2" opacity=".92" stroke-linecap="round"/>`;

 let uvSeg=[];
 function flushUV(){if(uvSeg.length<2)return;const topPts=uvSeg.map(o=>`${o.x},${o.y}`).join(" ");const basePts=[...uvSeg].reverse().map(o=>`${o.x},${o.base}`).join(" ");s+=`<polygon points="${topPts} ${basePts}" fill="url(#uvgrad)"/>`}
 uvBandTop.forEach(o=>{if(o)uvSeg.push(o);else if(uvSeg.length){flushUV();uvSeg=[]}});if(uvSeg.length)flushUV();
 let seg=[],segMode=sky[0]?.mode;
 function flushSky(){if(seg.length<2)return;const stroke=segMode==="sun"?"#ffd24a":"#b8b8c8";const dash=segMode==="sun"?"":' stroke-dasharray="5 4"';s+=`<path d="${monotonePath(seg)}" fill="none" stroke="${stroke}" stroke-width="${segMode==="sun"?3:2.4}" stroke-linecap="round" opacity="${segMode==="sun"?.84:.72}"${dash}/>`}
 sky.forEach((o,j)=>{const pt=[x(j),skyY(o.v)];if(o.mode!==segMode){flushSky();seg=[[x(j-1),skyY(sky[j-1].v)],pt];segMode=o.mode}else seg.push(pt)});flushSky();

 const marked=new Set();
 samples.forEach(o=>{const {sunrise,sunset}=daySun(o.ms);[sunrise,sunset].forEach((d,n)=>{const key=d.getTime();if(marked.has(key)||key<renderStart||key>renderEnd)return;marked.add(key);const xx=xMs(key), sun=n===0;s+=`<line x1="${xx}" x2="${xx}" y1="${top}" y2="${H-bottom}" stroke="${sun?"#ffd24a":"#b8b8c8"}" stroke-dasharray="3 5" opacity=".55"/>`;const skyMark=window.innerWidth<700 ? (sun?"☀":mi.icon) : `${sun?"☀":mi.icon} ${fmtTime(d)}`;s+=`<text x="${xx+(sun?5:-5)}" y="${H-bottom-10}" text-anchor="${sun?"start":"end"}" fill="${sun?"#ffd24a":"#b8b8c8"}">${skyMark}</text>`})});
 s+=`</g>`;
 const compactGraph=window.innerWidth<700;
 s+=`<text x="${left}" y="18" fill="#00b7ef">${compactGraph?"RAIN %":"PRECIPITATION · 0–100%"}</text>`;
 if(!compactGraph) s+=`<text x="${W-right}" y="18" text-anchor="end" fill="#78dfff">DRAG TIMELINE</text>`;
 (compactGraph?[100,50,0]:[100,75,50,25,0]).forEach(p=>{const yy=yRain(p);s+=`<text x="${W-right-4}" y="${yy-4}" text-anchor="end" fill="#00b7ef" opacity=".62">${p}%</text>`});

 const cx=left+plotW/2;
 const isNow=Math.abs(chartCenterTime-actualNow)<5*60*1000;
 s+=`<g id="svgCenterMarker"><line x1="${cx}" x2="${cx}" y1="${top}" y2="${H-bottom}" stroke="#fff" stroke-width="8" opacity=".09"/><line class="cursor" x1="${cx}" x2="${cx}" y1="${top}" y2="${H-bottom}"/>`;
 const pillText=isNow?"NOW":new Date(chartCenterTime).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
 const pillW=isNow?48:76;
 s+=`<rect x="${cx-pillW/2}" y="${top-7}" width="${pillW}" height="22" rx="11" fill="#f2f2f2"/><text x="${cx}" y="${top+8}" text-anchor="middle" fill="#111" font-size="10" font-weight="900">${pillText}</text>`;
 const cTemp=F(sampleHourly(chartCenterTime,"temperature_2m")), cPop=sampleHourly(chartCenterTime,"precipitation_probability");
 s+=`<circle class="touchHalo" cx="${cx}" cy="${yt(cTemp)}" r="14"/><circle class="touchTemp" cx="${cx}" cy="${yt(cTemp)}" r="6"/><circle class="touchRain" cx="${cx}" cy="${yRain(cPop)}" r="5"/></g>`;
 $("chart").innerHTML=s;

 const cFeel=F(sampleHourly(chartCenterTime,"apparent_temperature")), cAmt=sampleHourly(chartCenterTime,"precipitation"), cHum=sampleHourly(chartCenterTime,"relative_humidity_2m"), cUv=sampleHourly(chartCenterTime,"uv_index");
 const intensity=cAmt>=0.20?"HEAVY":cAmt>=0.08?"MODERATE":cAmt>=0.02?"LIGHT":cAmt>0.005?"TRACE":"NONE";
 const selectedDate=new Date(chartCenterTime);
 $("tip").innerHTML=`<b>${selectedDate.toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"})} · ${selectedDate.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</b><span>🌡️ ${Math.round(cTemp)}° · Feels ${Math.round(cFeel)}°</span><span>🌧️ ${Math.round(cPop)}% · ${cAmt.toFixed(2)}" · ${intensity}</span><span>💧 ${Math.round(cHum)}% · UV ${Math.round(cUv*10)/10}</span>`;

 const wrap=$("chartwrap"), fixed=$("fixedScrubber"), fixedBadge=$("fixedBadge"), timeline=$("timelineGroup");
 wrap.style.touchAction="none";
 function previewCenter(ms){
   const d=new Date(ms);fixedBadge.textContent=Math.abs(ms-Date.now())<5*60*1000 ? "NOW" : d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
   const pt=F(sampleHourly(ms,"temperature_2m")),pf=F(sampleHourly(ms,"apparent_temperature")),pp=sampleHourly(ms,"precipitation_probability"),pa=sampleHourly(ms,"precipitation"),ph=sampleHourly(ms,"relative_humidity_2m"),pu=sampleHourly(ms,"uv_index");
   const intensity=pa>=0.20?"HEAVY":pa>=0.08?"MODERATE":pa>=0.02?"LIGHT":pa>0.005?"TRACE":"NONE";
   $("tip").innerHTML=`<b>${d.toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"})} · ${d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</b><span>🌡️ ${Math.round(pt)}° · Feels ${Math.round(pf)}°</span><span>🌧️ ${Math.round(pp)}% · ${pa.toFixed(2)}" · ${intensity}</span><span>💧 ${Math.round(ph)}% · UV ${Math.round(pu*10)/10}</span>`;
 }
 wrap.onpointerdown=e=>{chartDrag.active=true;chartDrag.id=e.pointerId;chartDrag.startX=e.clientX;chartDrag.startCenter=chartCenterTime;fixed.style.display="block";const marker=$("svgCenterMarker"); if(marker) marker.style.opacity="0";try{wrap.setPointerCapture(e.pointerId)}catch(_e){}e.preventDefault()};
 wrap.onpointermove=e=>{if(!chartDrag.active || chartDrag.id!==e.pointerId)return;const rect=wrap.getBoundingClientRect();const dx=e.clientX-chartDrag.startX;const requested=chartDrag.startCenter-(dx/Math.max(1,rect.width))*VIEW_MS;const gestureMin=Math.max(dataMin,chartDrag.startCenter-VIEW_MS);const gestureMax=Math.min(dataMax,chartDrag.startCenter+VIEW_MS);const next=Math.max(gestureMin,Math.min(gestureMax,requested));chartCenterTime=next;const shiftSvg=-(next-chartDrag.startCenter)/VIEW_MS*plotW;if(timeline) timeline.setAttribute("transform",`translate(${shiftSvg} 0)`);previewCenter(next);e.preventDefault()};
 const stop=e=>{if(!chartDrag.active || chartDrag.id!==e.pointerId)return;try{wrap.releasePointerCapture(e.pointerId)}catch(_e){}chartDrag.active=false;chartDrag.id=null;fixed.style.display="none";draw(nearestIndex(chartCenterTime))};
 wrap.onpointerup=stop;wrap.onpointercancel=stop;wrap.onlostpointercapture=()=>{if(!chartDrag.active)return;chartDrag.active=false;chartDrag.id=null;fixed.style.display="none";draw(nearestIndex(chartCenterTime))};
 const reset=$("nowReset");if(reset) reset.onclick=()=>{chartDrag.active=false;chartDrag.id=null;fixed.style.display="none";chartCenterTime=Date.now();draw(nearestIndex(chartCenterTime))};
}
