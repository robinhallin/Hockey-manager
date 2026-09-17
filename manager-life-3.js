"use strict";

// One agenda, shared with the office. Compatibility entrypoints do not install
// a second list in the follow-up panel or depend on a browser-only global.
function managerLifeAgenda(){return managerOffice2VisibleItems();}
function managerLifeAgendaView(){return managerOffice2View();}
