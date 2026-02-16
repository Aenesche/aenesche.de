// /assets/site.js
(function () {
  // Footer automatisch einfügen (wenn ein <footer id="siteFooter"></footer> existiert)
  const footer = document.getElementById("siteFooter");
  if (footer) {
    footer.innerHTML = `
      © Aenesche — coins only — no real money — saved in your browser. •
      <a href="/impressum/">Impressum</a> •
      <a href="/datenschutz/">Datenschutz</a>
    `;
    footer.classList.add("footer", "muted", "small");
  }

  // Optional: Link-Styling (falls du es nicht in CSS hast)
  const style = document.createElement("style");
  style.textContent = `
    .footer a{
      color: inherit;
      text-decoration: none;
      border-bottom: 1px dashed rgba(159,176,208,.35);
    }
    .footer a:hover{
      border-bottom-color: var(--accent);
      color: var(--text);
    }
  `;
  document.head.appendChild(style);
})();
