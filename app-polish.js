(function(){
  if(typeof window.draw!=="function") return;
  const baseDraw=window.draw;
  function polishMobileChart(){
    if(window.innerWidth>=700) return;
    const svg=document.getElementById("chart");
    if(!svg) return;
    svg.querySelectorAll("text").forEach(t=>{
      const txt=(t.textContent||"").trim();
      const x=parseFloat(t.getAttribute("x")||"0");
      const y=parseFloat(t.getAttribute("y")||"0");
      const vb=svg.viewBox&&svg.viewBox.baseVal?svg.viewBox.baseVal:null;
      const w=vb?vb.width:700;
      if(/^-?\d+°$/.test(txt) && x<24){ t.remove(); return; }
      if(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/.test(txt) && y<70){ t.remove(); return; }
      if(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/.test(txt) && x>w-70){ t.remove(); return; }
    });
  }
  window.draw=function(){
    const out=baseDraw.apply(this,arguments);
    requestAnimationFrame(polishMobileChart);
    return out;
  };
  window.addEventListener("resize",()=>requestAnimationFrame(polishMobileChart));
})();
