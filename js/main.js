function bootGame(){
  applyCosmetics();
  buildTechList();
  buildCosmetics();

  el.clickBtn.addEventListener("click", ()=>{ doClick(); render(); });
  el.experimentBtn.addEventListener("click", ()=>{ runExperiment(); render(); });
  el.saveBtn.addEventListener("click", ()=>{ saveToServer(); render(); });

  log("Server connection established.", "ok");
  log("Idle mechanics calculating offline time...", "ok");

  setInterval(tick, TICK_MS);
  setInterval(saveToServer, 10000); 

  document.getElementById("btnNewWorld").addEventListener("click", enterNewWorld);
}
