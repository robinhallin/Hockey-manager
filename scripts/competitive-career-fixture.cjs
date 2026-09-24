'use strict';
// Isolated fixtures for existing match/market regressions. Skip the new interactive
// preseason, retaining the September snapshot/date on which those scenarios were
// authored. Production onboarding and all five friendlies have separate coverage.
module.exports=`
const fixtureCareerStart=startCareerWithClub;
startCareerWithClub=function(club){
 fixtureCareerStart(club);if(!state.careerStarted)return;
 delete state.seasonCalendar;delete state.preseasonCoach;
 state.season.phase='regular';state.calendar.friendlies=[];state.calendar.active=null;
 state.calendar.date=state.rosterStartDate||calAdd(calRoundDate(1),-3);
 state.calendar.marketDay=calAdd(state.calendar.date,7);
 for(const g of state.schedule)g.date=calRoundDate(g.round,state.season.year);
 state.training.calendarKey=null;state.training.day=0;state.page='home';save();render();
};
const fixturePreseasonStart=beginPreseason;
beginPreseason=function(){const year=state.season.year;fixturePreseasonStart();if(state.season.year!==year){delete state.preseasonCoach;state.calendar.friendlies=[];save();render();}};
`;
