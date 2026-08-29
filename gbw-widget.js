class GingerbeardWeather extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root=this.attachShadow({mode:"open"});
    const src=this.getAttribute("src") || "./";
    const height=this.getAttribute("height") || "760";
    const radius=this.getAttribute("radius") || "20";
    root.innerHTML=`
      <style>
        :host{display:block;width:100%;contain:content}
        .frame{width:100%;height:${height}px;border:0;border-radius:${radius}px;background:#111;display:block}
      </style>
      <iframe
        class="frame"
        title="Gingerbeard Weather"
        src="${src}${src.includes("?")?"&":"?"}embed=1"
        loading="lazy"
        allow="geolocation"
        referrerpolicy="strict-origin-when-cross-origin">
      </iframe>`;
  }
}
if(!customElements.get("gingerbeard-weather")){
  customElements.define("gingerbeard-weather", GingerbeardWeather);
}