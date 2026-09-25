"use strict";
// A home for the existing international simulation. No calendar or game data changes.
function worldOpenLeague(league){
 if(!['NHL','AHL'].includes(league))return;
 nasUI.league=league;nasUI.division='all';nasUI.club='all';nasUI.year='current';nasUI.tab='table';nasUI.game=null;
 nasOpen();
}
function worldWorkspaceView(){return worldDeskOverview();}
