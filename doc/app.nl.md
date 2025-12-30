# Gebruiksinstructies Top 2000-webapplicatie

Deze pagina beschrijft hoe de lijst van de Top 2000 bekeken kan worden, wat de 
symbolen betekenen en welke interacties beschikbaar zijn.

## Symbolen

| &#x1f523; | Context     | Betekenis                    |
| --------- | ----------- | ---------------------------- |
| &#x1f534; | Tabs        | [Lijst](#lijst) van recentste jaar |
| &#x1f535; | Tabs        | [Lijst](#lijst) van eerder getoond jaar |
| &#x1f519; | Tabs        | [Lijst](#lijst) van eerder jaar |
| &#x1f51c; | Tabs        | [Lijst](#lijst) van later jaar |
| &#x1f4ca; | Tabs        | [Grafieken met statistieken](#statistieken) |
| &#x2139;&#xfe0f; | Tabs | Informatie met gebruiksinstructies en credits |
| &#x1f50e; | Tabs, tabel | [Zoekveld](#zoekveld) openen |
| &#x1f4e4; | Tabs        | [Uploaden](#uploaden)        |
| &#x2600;&#xfe0f; | Tabs | Licht thema gebruiken        |
| &#x1f319; | Tabs        | Donker thema gebruiken       |
| &#x29be;  | Titel       | Albumversie                  |
| &#x25b2;  | Titel       | Aantal plaatsen gestegen     |
| &#x25bc;  | Titel       | Aantal plaatsen gedaald      |
| &#x21c4;  | Titel       | Gelijk gebleven              |
| &#x27f2;  | Titel       | Teruggekeerd uit eerder jaar |
| &#x2234;  | Titel       | Nieuw, niet in eerder jaar geweest |
| &#x25b6;  | Rij         | [Informatie](#informatiepaneel) over nummer tonen |
| &#x25bc;  | Rij         | [Informatiepaneel](#informatiepaneel) verbergen |
| &#x2b24;  | Progressie  | Positie in eerder jaar       |
| &#x2795;&#xfe0e; | Progressie  | Positie van huidig nummer in huidig jaar |
| &#x29eb;  | Progressie  | Progressie van ander nummer in huidig jaar |
| &#x2b1b;&#xfe0e; | Progressie  | Progressie van ander nummer in huidig jaar |
| &#x2605;  | Progressie  | Progressie van ander nummer in huidig jaar |
| &#x25b2;&#xfe0e; | Progressie  | Progressie van ander nummer in huidig jaar |
| &#x1f501; | Artiestlijst  | Andere nummers toevoegen/weghalen in progressie |
| &#x2935;&#xfe0f; | Artiestlijst  | Nummer lager dan huidig nummer |
| &#x2934;&#xfe0f; | Artiestlijst  | Nummer hoger dan huidig nummer |
| &#x1f5d1; | Upload      | Ingeladen bestand weghalen   |

## Lijst

De hoofdweergave van de webapplicatie is een lijst van de Top 2000 van het 
recente jaar. Het belangrijkste deel van de weergave omvat een tabel met 
nummers, met een aantal kolommen:

- `nr.`: De positie van het nummer in de lijst
- `artiest`: De namen van de samenwerkende uitvoerende artiesten die aan het 
  nummer bijgedragen hebben, volgens de databronnen. Tussen haakjes staat het 
  jaartal van de release van het nummer, volgens de databronnen. Soms kan een 
  nummer al langer bestaan, bijvoorbeeld als een bepaalde release gekozen is 
  voor de uitzending.
- `titel`: De naam van het nummer. Tussen haakjes staat informatie over de 
  positie van het nummer ten opzichte van eerdere jaren en een korte 
  representatie van de positie van het nummer in de lijst voor een van de 
  uitvoerende artiesten (degene die de meeste nummers in de lijst heeft, of als 
  meerdere evenveel nummers hebben, van wie het meeste nummers nog komen).
- `tijd`: Als de lijst informatie heeft over de uitzending, de tijd waarop het 
  nummer wordt uitgezonden.
- &#x1f50e;: Een indicator van elke rij of een informatiepaneel geopend is. 
  Door op de kolomtitel te drukken, wordt een [zoekveld](#zoekveld) geopend.

Bovenaan de weergave staan een aantal posities waarmee snel naar deze plekken 
kan worden gescrold door erop te drukken. De bijbehorende rij wordt dan 
geselecteerd. Er is meer functionaliteit als er informatie beschikbaar is over 
de uitzendtijd. Als de lijst nu bezig is, wordt het huidige nummer uitgelicht 
en gevolgd, door steeds in de rij het zicht te scrollen (tenzij een ander 
nummer geselecteerd, bijvoorbeeld door naar de informatie te kijken). Als de 
lijst nog moet starten, dan laat een omlaag tellende klok zien wanneer het 
eerste nummer begint.

### Informatiepaneel: Progressie en artiestlijst

Door een rij van een nummer uit te klappen wordt meer informatie gerelateerd 
aan het nummer en de artiest getoond. Een grafiek laat de progressie van het 
nummer in eerdere jaren zien. De horizontale as heeft verschillende jaren en de 
verticale as de posities. Hierin heeft het nummer een blauwe kleur, andere 
jaren hebben een cirkel en het huidige jaar is getoond met een plus. In deze 
symbolen staat de positie van het nummer in dat jaar. Als het nummer meerdere 
jaren achter elkaar in de lijst stond, dan wordt een lijn getekend tussen de 
aaneengesloten punten.

Bij de progressiegrafiek worden lijsten van samenwerkende uitvoerende artiesten 
getoond. Als bepaalde artiesten nummers gemaakt hebben waarbij ze niet met de 
andere artiesten samengewerkt hebben, dan hebben ze een eigen lijst. Ook 
krijgen alle samenwerkende artiesten die alleen met dit nummer erin staan een 
eigen lijst met dat nummer. Bovenaan een lijst, getoond als een kleinere tabel, 
staan de artiesten die relevant zijn bij die lijst alsmede het nummer. Mogelijk 
linken deze door naar een databron, zoals Wikipedia, voor achtergrondinformatie 
of andere details. De lijst zelf bevat net als de hoofdtabel kolommen:

- `nr.`: De positie van het nummer in de algehele lijst
- `titel`: De naam van het nummer, met opnieuw informatie over positie ten 
  opzichte van vorige jaren en de positie in de individuele lijst van een 
  artiest. Dit hoeft niet de artiest te zijn voor wie de lijst is.
- `jaar`: Het jaartal van de release van het nummer, volgens de databronnen.
- `tijd`: Als de lijst informatie heeft over de uitzending, de tijd waarop het 
  nummer wordt uitgezonden.
- &#x1f501;: Een indicator van elke rij of ze hoger of lager in de lijst staan, 
  of als het nummer is geselecteerd, welk symbool voor het huidige jaar wordt 
  gebruikt. Door op het symbool in een rij te drukken springt de gehele lijst 
  naar het nummer met uitgeklapte informatie. Door op de kolomtitel te drukken, 
  worden alle nummers toegevoegd aan de progressiegrafiek, of als ze al waren 
  toegevoegd, weer weggehaald. Het huidige nummer blijft altijd in de grafiek.

Ook door op een rij de drukken, wordt dat nummer toegevoegd of verwijderd uit 
de grafiek, ter vergelijking met het huidige nummer. De progressiegrafiek staat 
ook toe om nummers van andere artiesten toe te voegen. Hiervoor is een 
[zoekveld](#zoekveld) beschikbaar. Gekozen artiesten of nummers uit een 
zoekopdracht worden in een extra lijst getoond en aan de grafiek toegevoegd.

### Zoekveld

Via de tabs, de kolomtitel van de lijst en de extra artiestlijst in het 
informatiepaneel kan naar artiesten, posities en nummers gezocht worden. Er 
zijn een aantal verschillen in functionaliteit tussen de manieren waarop het 
zoekveld wordt benaderd:

| Tab en kolomtitel | Artiestlijst |
| ----------------- | ------------ |
| Dialoogvenster    | Extra lijst  |
| Sluiten via `Escape`, druk op achtergrond of kruis | Blijft open in paneel |
| Alle velden even relevant | Artiestnaam belangrijker |
| Alleen individuele nummers | Vindt ook artiesten (met alle nummers) |
| Scrolt naar nummer met geopend infopaneel | Toont nummer(s) in progressie |

### Uploaden

Het is mogelijk de lijst te vervangen met informatie die uit andere bronnen is 
vergaard door een JSON-bestand in te laden. Via een dialoogvenster kan een 
dergelijk bestand worden geselecteerd van de eigen opslag of met behulp van 
slepen naar het venster worden geplaatst. Het gaat overigens functioneel niet 
om een upload, omdat de data alleen in de browser wordt ingeladen en niet naar 
de hostinglocatie van de webapplicatie wordt gestuurd. Hierdoor kan de lijst 
van een jaar worden vervangen door uitgebreide data, bijvoorbeeld met tijden 
waarop nummers worden uitgezonden. Het dialoogvenster toont ook voor welke 
jaren bestanden zijn ingeladen en welke kolommen beschikbaar zijn in het 
bestand. Met behulp van de prullenbak kan een ingeladen bestand worden 
weggehaald, zodat de standaard functionaliteit weer beschikbaar is.

## Statistieken

Via de tab met grafieken van statistieken zijn enkele samenvattende rapporten 
te vinden over bepaalde trends binnen de lijst, zoals artiesten met de meeste 
nummers of een uiteenzetting van nummers per tijdsperiode. Met behulp van het 
keuzemenu kan een andere grafiek worden gekozen.

In de staafdiagrammen zijn verschillende informatiepunten te zien, afhankelijk 
van de grafiek. Totaal aantallen, extrema of andere punten staan aan het eind 
van elke staaf beschreven. Artiesten, nummers of andere onderscheidende 
factoren staan ook op de staaf.
