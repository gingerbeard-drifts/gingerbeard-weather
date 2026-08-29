const FALLBACK_LAT=33.3807, FALLBACK_LON=-84.7999;
let LAT=FALLBACK_LAT, LON=FALLBACK_LON;
let usingLiveLocation=false;
const WMO={0:["☀️","Clear"],1:["🌤️","Mostly clear"],2:["⛅","Partly cloudy"],3:["☁️","Cloudy"],45:["🌫️","Fog"],48:["🌫️","Fog"],51:["🌦️","Light drizzle"],53:["🌦️","Drizzle"],55:["🌧️","Heavy drizzle"],61:["🌦️","Light rain"],63:["🌧️","Rain"],65:["🌧️","Heavy rain"],71:["🌨️","Light snow"],73:["🌨️","Snow"],75:["❄️","Heavy snow"],80:["🌦️","Showers"],81:["🌧️","Showers"],82:["⛈️","Heavy showers"],95:["⛈️","Thunderstorm"],96:["⛈️","Thunderstorm"],99:["⛈️","Thunderstorm"]};
const $=id=>document.getElementById(id); const F=c=>Math.round(c*9/5+32); const mph=k=>Math.round(k*0.621371); const fmtTime=s=>new Date(s).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
let data=[];

function moonInfo(date=new Date()){
  const synodic=29.530588853;
  const knownNewMoon=Date.UTC(2000,0,6,18,14,0);
  const age=((date.getTime()-knownNewMoon)/86400000%synodic+synodic)%synodic;
  const frac=age/synodic;
  const illumination=(1-Math.cos(frac*2*Math.PI))/2;
  let name="New Moon", icon="🌑";
  if(frac<0.03||frac>0.97){name="New Moon";icon="🌑"}
  else if(frac<0.22){name="Waxing Crescent";icon="🌒"}
  else if(frac<0.28){name="First Quarter";icon="🌓"}
  else if(frac<0.47){name="Waxing Gibbous";icon="🌔"}
  else if(frac<0.53){name="Full Moon";icon="🌕"}
  else if(frac<0.72){name="Waning Gibbous";icon="🌖"}
  else if(frac<0.78){name="Last Quarter";icon="🌗"}
  else{name="Waning Crescent";icon="🌘"}
  return {name,icon,illumination,age}
}

function getLocation(){
  return new Promise(resolve=>{
    if(!navigator.geolocation){ resolve(); return; }
    navigator.geolocation.getCurrentPosition(
      pos=>{
        LAT=pos.coords.latitude;
        LON=pos.coords.longitude;
        usingLiveLocation=true;
        $("place").textContent="CURRENT LOCATION";
        resolve();
      },
      _=>{
        $("place").textContent="NEWNAN, GA";
        resolve();
      },
      {enableHighAccuracy:true,timeout:8000,maximumAge:300000}
    );
  });
}

async function load(){
 try{
  await getLocation();
  const u=`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,relative_humidity_2m,uv_index,wind_speed_10m,dew_point_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&temperature_unit=celsius&windspeed_unit=kmh&precipitation_unit=inch&timezone=auto&forecast_days=7&past_days=1`;
  const r=await fetch(u); if(!r.ok)throw Error("Weather service unavailable"); data=await r.json();
  const nowIdx=Math.max(0,data.hourly.time.findIndex(t=>new Date(t)>=new Date())-1);
  const di=todayDailyIndex();
  const day=data.daily.time[di];
  $("date").textContent=new Date(day+"T12:00:00").toLocaleDateString([], {weekday:"long",month:"long",day:"numeric"});
  $("nowTemp").textContent=F(data.hourly.temperature_2m[nowIdx])+"°";
  $("nowFeels").textContent=F(data.hourly.apparent_temperature[nowIdx])+"°";
  $("highlow").textContent=`High ${F(data.daily.temperature_2m_max[di])}° · Low ${F(data.daily.temperature_2m_min[di])}°`;
  $("humidity").textContent=Math.round(data.hourly.relative_humidity_2m[nowIdx])+"%";
  $("uv").textContent=Math.round(data.hourly.uv_index[nowIdx]*10)/10;
  $("wind").textContent=mph(data.hourly.wind_speed_10m[nowIdx])+" mph";
  $("dew").textContent=F(data.hourly.dew_point_2m[nowIdx])+"°";
  const mi=moonInfo();
  $("moonPhase").textContent=mi.icon+" "+mi.name;
  $("moonLight").textContent=Math.round(mi.illumination*100)+"%";
  const wx=WMO[data.hourly.weather_code[nowIdx]]||["🌤️","Conditions"];
  $("conditionText").textContent=wx[0]+" "+wx[1];
  $("sunrise").textContent=fmtTime(data.daily.sunrise[di]); $("sunset").textContent=fmtTime(data.daily.sunset[di]);
  $("status").textContent = `Gingerbeard Weather · GBW 1.0 · Forecast: Open-Meteo · ${usingLiveLocation ? "Live device location" : "Fallback: Newnan, GA"} · Weather data: Open-Meteo · Personal reference apps: Rain Alarm / MyRadar`;
  chartCenterTime=Date.now(); draw(nowIdx); updateSnapshotLabel(); buildDays(); carWatch();
 }catch(e){$("status").innerHTML='<span class="error">Could not load forecast. Check your internet connection.</span>'}
}

function monotonePath(points){
  if(points.length<2) return "";
  const n=points.length;
  const x=points.map(p=>p[0]), y=points.map(p=>p[1]);
  const d=[], m=new Array(n);
  for(let i=0;i<n-1;i++) d[i]=(y[i+1]-y[i])/(x[i+1]-x[i] || 1);
  m[0]=d[0]; m[n-1]=d[n-2];
  for(let i=1;i<n-1;i++){
    if(d[i-1]===0 || d[i]===0 || Math.sign(d[i-1])!==Math.sign(d[i])) m[i]=0;
    else m[i]=(d[i-1]+d[i])/2;
  }
  for(let i=0;i<n-1;i++){
    if(d[i]===0){m[i]=0;m[i+1]=0;continue;}
    const a=m[i]/d[i], b=m[i+1]/d[i], h=Math.hypot(a,b);
    if(h>3){
      const t=3/h;
      m[i]=t*a*d[i]; m[i+1]=t*b*d[i];
    }
  }
  let path=`M ${x[0]} ${y[0]}`;
  for(let i=0;i<n-1;i++){
    const h=x[i+1]-x[i];
    path+=` C ${x[i]+h/3} ${y[i]+m[i]*h/3}, ${x[i+1]-h/3} ${y[i+1]-m[i+1]*h/3}, ${x[i+1]} ${y[i+1]}`;
  }
  return path;
}

function lerp(a,b,t){return a+(b-a)*t;}
