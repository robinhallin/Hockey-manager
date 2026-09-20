"use strict";
// Replace the existing click binding after the application has installed it.
{const button=document.getElementById("continueGame");if(button){button.removeEventListener?.("click",continueGame);button.addEventListener("click",managerContinueWithBriefing);}}
