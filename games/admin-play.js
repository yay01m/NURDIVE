(()=>{
const localUser=localStorage.getItem("recare-active-user"),cloudUser=window.RECARE_CLOUD?.session()?.username;
if(localUser!=="test"||(window.RECARE_CLOUD?.enabled()&&cloudUser!=="test"))return;
let visible=true;
function ensure(){
  if(!$("#adminAnswerGuide"))document.querySelector(".question-body")?.insertAdjacentHTML("afterbegin",`<aside class="admin-answer-guide" id="adminAnswerGuide"><header><b>ADMIN ANSWER GUIDE</b><button id="adminGuideToggle" type="button">正答表示 ON</button></header><div id="adminGuideAnswer"></div><p id="adminGuideExplanation"></p></aside>`);
  $("#adminGuideToggle")&&( $("#adminGuideToggle").onclick=()=>{visible=!visible;update()} );
}
function update(){
  ensure();let guide=$("#adminAnswerGuide"),q=QUESTION_BANK[state.index];if(!guide||!q)return;
  guide.classList.toggle("hidden-answer",!visible);$("#adminGuideToggle").textContent=`正答表示 ${visible?"ON":"OFF"}`;
  $("#adminGuideAnswer").innerHTML=visible?`<span>正答 ${q.acceptedAnswerSets.map(set=>set.map(i=>i+1).join("・")).join(" または ")}</span><b>${escapeQuestionText(formatCorrectAnswers(q))}</b>`:"正答を非表示にしています";
  $("#adminGuideExplanation").textContent=visible?q.explanation:"";
  [...el.choices.children].forEach((choice,i)=>choice.classList.toggle("admin-correct-choice",visible&&isCorrectOption(q,i)));
}
const baseRender=render;render=function(){baseRender();update()};
ensure();update();
})();
