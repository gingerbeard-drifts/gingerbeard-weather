function updateSnapshotLabel(){
 const el=$("snapshotTime");
 if(!el)return;
 const d=new Date();
 el.textContent=`Static snapshot · ${d.toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"})} at ${d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`;
}

function carWatch(){
 const now=new Date();
 const upcoming=data.hourly.time.map((t,i)=>({
   i,t,
   p:data.hourly.precipitation_probability[i]||0,
   a:Number(data.hourly.precipitation[i]||0)
 })).filter(o=>new Date(o.t)>=now && new Date(o.t).toDateString()===now.toDateString() && new Date(o.t).getHours()<=22);

 if(!upcoming.length){
   $("watchTitle").innerHTML="CAR WATCH";
   $("watchText").textContent="No remaining hourly forecast through 10 PM.";
   return;
 }
 const wet=upcoming.filter(o=>o.a>=0.01);
 const likely=upcoming.filter(o=>o.p>=60);
 const meaningful=upcoming.filter(o=>o.a>=0.05);
 const heavy=upcoming.filter(o=>o.a>=0.15);
 const maxP=Math.max(...upcoming.map(o=>o.p));
 const total=upcoming.reduce((sum,o)=>sum+o.a,0);

 if(heavy.length || total>=0.30){
   const a=(heavy[0]||meaningful[0]||wet[0]), b=(heavy.at(-1)||meaningful.at(-1)||wet.at(-1));
   $("watchTitle").innerHTML="🚨 CAR WATCH · HIGH";
   $("watchTitle").className="warn";
   $("watchText").textContent=`Meaningful rain is forecast ${fmtTime(a.t)}–${fmtTime(b.t)}. About ${total.toFixed(2)}" total remains through 10 PM. Cars/windows should be treated as exposed.`;
 } else if(meaningful.length || (likely.length && wet.length)){
   const a=(meaningful[0]||wet[0]), b=(meaningful.at(-1)||wet.at(-1));
   $("watchTitle").innerHTML="⚠️ CAR WATCH · WATCH";
   $("watchTitle").className="warn";
   $("watchText").textContent=`Rain is possible ${fmtTime(a.t)}–${fmtTime(b.t)}. Peak chance ${maxP}% with roughly ${total.toFixed(2)}" remaining. Worth watching before leaving cars out.`;
 } else if(maxP>=45 && total<0.03){
   const peak=upcoming.reduce((a,b)=>b.p>a.p?b:a);
   $("watchTitle").innerHTML="☁️ CAR WATCH · LOW IMPACT";
   $("watchTitle").className="";
   $("watchText").textContent=`Rain chance reaches ${maxP}% around ${fmtTime(peak.t)}, but forecast amount is only ${total.toFixed(2)}". This currently looks more like a sprinkle/brief shower risk than meaningful rain.`;
 } else {
   $("watchTitle").innerHTML="✓ CAR WATCH · CLEAR";
   $("watchTitle").className="good";
   $("watchText").textContent=`No meaningful rain signal from now through 10 PM. Peak chance ${maxP}% and only ${total.toFixed(2)}" forecast.`;
 }
}
function todayDailyIndex(){
 const today=new Date().toLocaleDateString("en-CA");
 const i=data?.daily?.time?.indexOf(today) ?? -1;
 return i>=0?i:Math.max(0,data.daily.time.findIndex(d=>d>=today));
}
function buildDays(){
 const start=todayDailyIndex();
 const rows=data.daily.time.map((d,i)=>({d,i})).slice(start,start+7);
 $("days").innerHTML=rows.map(({d,i},n)=>{let dt=new Date(d+"T12:00:00"),w=WMO[data.daily.weather_code[i]]||["🌤️",""],rain=Math.max(...data.hourly.precipitation_probability.filter((_,j)=>new Date(data.hourly.time[j]).toDateString()===dt.toDateString()).slice(0,24),0);return `<div class="day ${n===0?"active":""}"><div class="dow">${n===0?"TODAY":dt.toLocaleDateString([], {weekday:"short"}).toUpperCase()}</div><div class="ico">${w[0]}</div><div class="temps">${F(data.daily.temperature_2m_max[i])}° / ${F(data.daily.temperature_2m_min[i])}°</div><small>🌧️ ${Math.round(rain)}%</small></div>`}).join("");
}
load();

if ("serviceWorker" in navigator && (location.protocol==="https:" || location.hostname==="localhost")) {
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
