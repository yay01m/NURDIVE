(()=>{
function goHome(){
  document.body.className="";
  $("#resultModal")&&( $("#resultModal").hidden=true );
  $("#gameShell")?.classList.add("game-hidden");
  $("#titleScreen")&&( $("#titleScreen").hidden=false );
  document.body.style.overflow="";
  window.scrollTo({top:0,behavior:"smooth"});
}
$("#endShiftButton")?.addEventListener("click",()=>{if(confirm("現在の夜勤を終了してタイトルへ戻りますか？\n回答済みの成績は保存されます。"))goHome()});
$("#resultHomeButton")?.addEventListener("click",goHome);
})();
