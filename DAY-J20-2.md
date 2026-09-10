# Dagsflöde och J20-matchning, steg 2

## Genomfört

Kontoret och kalenderns dagsprogram visar vad nästa FORTSÄTT faktiskt gör.
Träningsprognosen använder samma `trainingSessionEffect` som genomförandet,
inklusive stabsdelegerad vila. En pågående match, obesvarat samtal,
matchuppföljning och säsongsutvärdering får egna besked. Kalendern avancerar
fortfarande högst en dag. Den senaste avslutade dagen får en begränsad,
sparad summering av passet, nyinkomna besked, kassa och orkförändringar.
Den beskriver observerade förändringar, inte bevisad taktisk orsak.

Juniorprofilen har separat matchning: normal, större, begränsad roll eller
stå över. Detta ändrar inte individuell träningsvila eller A-lagsuttagning.
Juniortränarens plan respekterar medicinska minutgränser och fördelar exakt
3 600 målvaktssekunder, 7 200 backsekunder och 10 800 forwardsekunder när
truppen kan täcka matchen. Likvärdiga målvakter roteras. Matchutvecklingen
kräver faktisk istid, och spelaren kan få en större fysisk belastning.

AI-akademiernas egna mål, assist och istid registreras nu från samma
J20-serieresultat, inte från ytterligare veckovisa låtsasmatcher under
grundserien. Poängfördelningen väger istid och relevanta attribut med
reproducerbar slump. Den nya registrerade poängligan börjar vid uppdateringen;
gamla individuella AI-mål återskapas inte. En returmatch byter verkligen
hemma/borta; den äldre beräkningen råkade byta tillbaka en andra gång.
Äldre bokförda matchresultat bevaras.

## Kod och kompatibilitet

`day-j20-integration.js` installerar de berörda körvägarna innan
`junior-world.js` fångar juniorernas matchfunktion. Den buildlösa klienten
har fortfarande endast en aktiv dag- och junioruppdatering. De tidigare
modulerna och deras övriga funktioner behålls. Fortsatt moduluppdelning bör
ersätta dessa globala integrationsgränser med explicita modulberoenden.

Nya val och dagsrapporter valideras vid import. Saknade fält använder
befintliga standardvärden. Ingen befintlig trupp eller historik byts ut.
Cachetagg och synlig version: `day-j20-2`.

## Avgränsning

Detta är inte hela det tidigare föreslagna paketet 1–3. Juniorserien är
spelets egen förenklade utvecklingsserie, inte en kopia av det officiella
J20-seriesystemet. Omgångarna är fortfarande knutna till A-lagets matcher;
en självständig daterad juniorkalender och full kedjeeditor återstår.
Juniorresultaten är en abstrakt modell, inte 2D-motorns händelsesimulering.
Ingen full hockeykalibrering eller ny komplett utvisningsmodell ingår.

Riktade Node-tester kontrollerar prognos/genomförande, dagssummering,
blokerande beslut, sparning/import, juniorernas istidsbudget, matchroller,
AI-bokföring, målvaktsrotation, returmatcher och den gamla 16-rapportsgränsen.
Befintliga helmatch- och visningslägestester används som regression.
Fullständig flersäsongsbalans för den nya modellen är inte verifierad.
Visuell webbläsarkontroll kunde inte genomföras: miljön blockerade både
lokal server och filadress med ERR_BLOCKED_BY_ADMINISTRATOR.
