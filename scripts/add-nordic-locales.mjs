import { access, cp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEPLOY_BASE = '/Cognac-Leopold-Croizet-site';
const PUBLIC_ORIGIN = 'https://cognac-leopold-croizet.com';
const PINEAU_SLUG = 'pineau-des-charentes';
const PINEAU_RED_SLUG = 'pineau-des-charentes-rouge';

const locales = [
  { code: 'fr', label: 'Fr', hreflang: 'fr' },
  { code: 'en', label: 'En', hreflang: 'en' },
  { code: 'ru', label: 'Ру', hreflang: 'ru' },
  { code: 'da', label: 'Da', hreflang: 'da' },
  { code: 'sv', label: 'Sv', hreflang: 'sv' },
  { code: 'no', label: 'No', hreflang: 'no' },
];

const nordicConfigs = {
  da: {
    htmlLang: 'da',
    footerAward: 'En kælder med mange medaljer',
    translations: [
      ['Skill &amp; know how', 'Håndværk &amp; savoir-faire'],
      ['Skill & know how', 'Håndværk & savoir-faire'],
      ['Collection', 'Kollektion'],
      ['Meet us', 'Mød os'],
      ['Shop', 'Bestilling'],
      ['The fruit', 'Frugten'],
      ['The fire', 'Ilden'],
      ['Alchemy', 'Alkymi'],
      ['Time', 'Tiden'],
      ['Our vines, our land, the fruits of our labour', 'Vores vinstokke, vores jord, frugten af vores arbejde'],
      ['Each stage of our work distills the character of our products', 'Hvert trin i vores arbejde destillerer produkternes karakter'],
      ['A centuries-old know-how handed down from generation to generation', 'Et århundredgammelt håndværk overleveret fra generation til generation'],
      ['Taking the time to seal what makes us different', 'At tage tiden til at fastholde det, der gør os særlige'],
      ['Welcome!', 'Velkommen!'],
      ['Country', 'Land'],
      ['Day of birth', 'Fødselsdag'],
      ['Enter', 'Gå ind'],
      ['Discover', 'Opdag'],
      ['DISCOVER', 'OPDAG'],
      ['Have you experienced ?', 'Har du oplevet det?'],
      ['Shake !', 'Shake!'],
      ['Fresh ideas for sunny days', 'Friske ideer til lyse dage'],
      ['Idées fraîches pour les beaux jours', 'Friske ideer til lyse dage'],
      ['Appellation Cognac Contrôlée', 'Appellation Cognac Contrôlée'],
      ['Appellation cognac Fins Bois controlée', 'Appellation Cognac Fins Bois contrôlée'],
      ['Pineau des Charentes controlled appellation', 'Kontrolleret appellation Pineau des Charentes'],
      ['Bottles', 'Flaske'],
      ['Alcohol content', 'Alkoholprocent'],
      ['Tasting notes', 'Smagsnoter'],
      ['Sensory Notes', 'Sensoriske noter'],
      ['Product quantity', 'Produktantal'],
      ['Add to cart', 'Læg i kurv'],
      ['Order', 'Bestil'],
      ['Return to shop', 'Tilbage til butikken'],
      ['Your cart is currently empty.', 'Din kurv er tom.'],
      ['My Account', 'Min konto'],
      ['Cart', 'Kurv'],
      ['Checkout', 'Betaling'],
      ['Login', 'Log ind'],
      ['Username or email address', 'Brugernavn eller e-mailadresse'],
      ['Password', 'Adgangskode'],
      ['Remember me', 'Husk mig'],
      ['Lost your password?', 'Glemt din adgangskode?'],
      ['Visit our cellars…', 'Besøg vores kældre…'],
      ['On appointment', 'Efter aftale'],
      ['Perhaps you are one of the people who like to enjoy our cognac in a tulip glass with a good cigar, by the fire etc… you’re right.<br>But we also suggest you to enjoy the freshness and fruitiness of Léopold Croizet cognacs in a more festive, exotic, more striking and «on the rocks»', 'Måske nyder du helst vores cognac i et tulipanglas med en god cigar ved pejsen. Det forstår vi.<br>Men vi foreslår også, at du oplever friskheden og frugten i Léopold Croizet cognac i en mere festlig, eksotisk og markant version, serveret over is.'],
      ['We use our youngest Cognacs <strong>VS</strong> and <strong>VSOP</strong> to make our favorite cocktails.<br>We want to share them with you:', 'Vi bruger vores yngste Cognacs <strong>VS</strong> og <strong>VSOP</strong> til vores favoritcocktails.<br>Dem vil vi gerne dele med dig:'],
    ],
    sensory: {
      'Oak wood': 'Egetræ',
      Brioche: 'Brioche',
      'Vine flower': 'Vinblomst',
      Peach: 'Fersken',
      Pear: 'Pære',
      Vanilla: 'Vanilje',
      'Dried aprico': 'Tørret abrikos',
      'Dried apricot': 'Tørret abrikos',
      Clove: 'Nellike',
      Plum: 'Blomme',
      Rose: 'Rose',
      Almond: 'Mandel',
      'Slightly vanilla warm wood': 'Varmt træ med let vanilje',
      Peanut: 'Jordnød',
      Hazelnut: 'Hasselnød',
      Toffee: 'Toffee',
      'Black cherr': 'Sort kirsebær',
      Leather: 'Læder',
      'Iris flowers': 'Irisblomster',
      'Dried flowers': 'Tørrede blomster',
      Lychee: 'Litchi',
      'First rancio notes': 'Første rancio-noter',
      Tobacco: 'Tobak',
      Wood: 'Træ',
      Cinnamon: 'Kanel',
      'Candied ginger': 'Kandiseret ingefær',
      Prune: 'Sveske',
      Apricot: 'Abrikos',
      'Honeysuckle and jasmine': 'Kaprifolie og jasmin',
      Chocolate: 'Chokolade',
      'Candied fruit': 'Kandiseret frugt',
      Nutmeg: 'Muskatnød',
      'Cedarwood and sandalwood': 'Cedertræ og sandeltræ',
      Eucalyptus: 'Eukalyptus',
      'Passion fruit': 'Passionsfrugt',
      Coconut: 'Kokos',
      Rancio: 'Rancio',
      'Cigar wood': 'Cigartræ',
      Cedar: 'Cedertræ',
      'White lily  and  honeysuckle flowers': 'Hvid lilje og kaprifolie',
      'Stewed fruits / Dried figs': 'Kogte frugter / tørrede figner',
      'Woodland undergrowth': 'Skovbund',
      'Old oak': 'Gammel eg',
      Cherry: 'Kirsebær',
      Walnut: 'Valnød',
      Ginger: 'Ingefær',
      Nuts: 'Nødder',
    },
    productCopy: {
      vs: {
        note: 'Ung og kraftfuld cognac. VS kendetegnes af sin friskhed med noter af pære, fersken og vinblomst. De unge egetanniner afslører aromaer af brioche. Ideel i cocktails eller serveret over is.',
        view: 'Gyldengul / strågul',
        nose: 'Aromaer af frisk frugt som pære, fersken og kogt frugt (bagte æbler og gyldne rosiner).',
        mouth: 'En subtil balance mellem friskhed og frugtighed, fuldendt af fine nuancer af brioche og vanilje. Afslutning: frugtig friskhed af friske druer og pærer.',
      },
      vsop: {
        note: 'Léopold Croizet VSOP er en rund og gourmand cognac. De første år på egetræsfade giver noter af blomme og abrikosmarmelade. Træets tanniner fremhæver vaniljen og afslutter med et friskt strejf af nellike.',
        view: 'Gyldengul',
        nose: 'Balanceret og rund: egetræ og vanilje. Subtile noter af kogt frugt (sveske, abrikos).',
        mouth: 'Rig og fyldig med en elegant frugtig karakter, typisk for Fins Bois. Afslutning: friske nelliker.',
      },
      napoleon: {
        note: 'Den lange lagring på fade giver behagelige noter af tørrede frugter og nødder: jordnød, mandel og hasselnød samt ristet træ, toffee og vanilje. Lang og pebret afslutning.',
        view: 'Orangegul',
        nose: 'Modningen på fade afslører og forstærker de oprindelige træ- og vaniljenoter.',
        mouth: 'Fine egetanniner forenes med noter af tørret frugt og nødder: mandel, hasselnød og valnød. Afslutningen er livlig, balanceret, let krydret og mintet.',
      },
      xo: {
        note: 'Vores XO er fint struktureret, rund og generøs ved smagning. Sorte kirsebær i kompot og litchi giver plads til florale noter af iris og tørrede blomster. Rancio Charentais-karakteren træder frem og udvikler sig i længden med noter af læder og tobak.',
        view: 'Lys rav',
        nose: 'Udviklet og balanceret næse. Smuk kombination af kandiseret frugt, træ og krydrede noter.',
        mouth: 'Velstruktureret krop, hvor en subtil blødhed vokser frem efter lang modning på egetræsfade.',
      },
      'xo-exception': {
        note: 'For at skabe denne XO Exception var mange års lagring uundværlige. Denne XO Exception har en ravfarvet robe. En kompleks næse afslører noter af tørret frugt, kandiseret frugt og gammelt træ. Smagen er intens og viser fint smeltede træ-tanniner med noter af kanel og tobak.',
        view: 'Gylden rav',
        nose: 'Søde pærer ledsager vilde blomster og varme krydderier. Med tiden udvikler aromaerne sig mod kandiseret frugt og krydderier.',
        mouth: 'Gourmand og rig. En eksplosion af krydrede smage og aromaer med en afslutning på muskatnød og kanel.',
      },
      extra: {
        note: 'Denne Extra cognac er rig og kompleks. Dens rancio markeres af noter af kandiseret frugt og chokolade. Munden er frisk og blomstrende og afslører dufte af kaprifolie og jasmin. En krydret afslutning med muskatnød og kanel.',
        view: 'Gylden rav/orange',
        nose: 'Rig og kompleks med noter af kandiserede og tørrede frugter. De første antydninger af rancio viser sig, som skovbund.',
        mouth: 'Fremragende fylde ved smagning. Subtile florale dufte forener jasmin og kaprifolie. Gennem årtier udvikles de tydelige modne egetræsnoter. Smuk balance mellem frugt og en krydret afslutning med noter af nødder og tørret frugt.',
      },
      excellence: {
        note: 'Meget gammel cognac, karakteristisk for Fins Bois. En kompleks frugtig og blomstrende næse med aromaer af kokos og passionsfrugt. Dens rancio giver plads til mere markante trænoter af ceder og sandeltræ. Den friske eukalyptusafslutning giver en bemærkelsesværdig længde.',
        view: 'Orange rav med let rødt skær',
        nose: 'Intens og dyb. Smuk aromatisk kompleksitet. Noter af passionsfrugt og kokos møder rancio og gammelt træ.',
        mouth: 'Kraftfuld, rig og blød. Noterne af sandeltræ og ceder giver styrke og karakter til denne Cognac d&#39;Excellence. Afslutningen er frisk, præget af eukalyptus, lang og vedvarende.',
      },
      heritage: {
        note: 'I sin håndlavede krystalflaske er den husets sjæl, og ikke mindre end fire generationer af familien har arbejdet passioneret på at forme dens karakter. Kraftfuld og let animalsk, med en duft så sirupsagtig som den er kompleks. Her mærkes årenes vægt: læder, tobak og gammelt træ afslører en enestående rancio sammen med en floral eksplosion og en frisk afslutning. Den værdsættes for sin intensitet og længde.',
        view: 'Intens og dyb rød rav',
        nose: 'Kraftfuld og kompleks.',
        mouth: 'Utroligt sød og sirupsagtig med en intens aromatisk eksplosion. Bemærkelsesværdig rancio, stærkt udviklet træ og skovbund. Afslutning: lang i munden med sjælden intensitet.',
      },
      valentine: {
        note: 'Cognac Valentine er feminin, hvor tiden ikke tæller. Denne XO er en delikatesse: valnødder, kirsebær, chokolade, kanel og ingefær smigrer næse og gane. Den vil glæde både gourmets og gourmands.',
        view: 'Intens og dyb kastanjebrun',
        nose: 'Rig og gourmand med noter af chokolade, ingefær og kanel.',
        mouth: 'Rund og gourmand, som Christmas pudding med rige noter af sort kirsebær og chokolade. Intens og frugtig afslutning.',
      },
      'pineau-des-charentes': {
        note: 'Pineau des Charentes Léopold Croizet fremstilles af en blanding af Cognac-eaux-de-vie og druemost fra Colombard og Ugni Blanc. Efter blandingen omrøres den i egetræsfade de første måneder og lagres derefter i mange år. Den har en klar ravfarve, runde aromaer af kandiseret frugt og vanilje samt noter af valnød og skovbund i afslutningen.',
        view: 'Gyldengul / rav',
        nose: 'Aromaer af kandiseret frugt og honning med noter af abrikos, sveske og kirsebær.',
        mouth: 'En subtil balance mellem sødme, runde vaniljenoter og kandiseret frugt. Afslutning: frugt, honning og valnød, typisk for gammel Pineau des Charentes.',
      },
    },
  },
  sv: {
    htmlLang: 'sv',
    footerAward: 'En källare med många medaljer',
    translations: [
      ['Skill &amp; know how', 'Hantverk &amp; kunnande'],
      ['Skill & know how', 'Hantverk & kunnande'],
      ['Collection', 'Kollektion'],
      ['Meet us', 'Möt oss'],
      ['Shop', 'Beställning'],
      ['The fruit', 'Frukten'],
      ['The fire', 'Elden'],
      ['Alchemy', 'Alkemi'],
      ['Time', 'Tiden'],
      ['Our vines, our land, the fruits of our labour', 'Våra vinrankor, vår jord, frukten av vårt arbete'],
      ['Each stage of our work distills the character of our products', 'Varje steg i vårt arbete destillerar produkternas karaktär'],
      ['A centuries-old know-how handed down from generation to generation', 'Ett sekelgammalt kunnande som förs vidare från generation till generation'],
      ['Taking the time to seal what makes us different', 'Att ta sig tid att bevara det som gör oss särskilda'],
      ['Welcome!', 'Välkommen!'],
      ['Country', 'Land'],
      ['Day of birth', 'Födelsedag'],
      ['Enter', 'Gå in'],
      ['Discover', 'Upptäck'],
      ['DISCOVER', 'UPPTÄCK'],
      ['Have you experienced ?', 'Har du upplevt det?'],
      ['Shake !', 'Shake!'],
      ['Fresh ideas for sunny days', 'Friska idéer för ljusa dagar'],
      ['Idées fraîches pour les beaux jours', 'Friska idéer för ljusa dagar'],
      ['Pineau des Charentes controlled appellation', 'Kontrollerad appellation Pineau des Charentes'],
      ['Bottles', 'Flaska'],
      ['Alcohol content', 'Alkoholhalt'],
      ['Tasting notes', 'Smaknoter'],
      ['Sensory Notes', 'Sensoriska noter'],
      ['Product quantity', 'Produktantal'],
      ['Add to cart', 'Lägg i varukorg'],
      ['Order', 'Beställ'],
      ['Return to shop', 'Tillbaka till butiken'],
      ['Your cart is currently empty.', 'Din varukorg är tom.'],
      ['My Account', 'Mitt konto'],
      ['Cart', 'Varukorg'],
      ['Checkout', 'Kassa'],
      ['Login', 'Logga in'],
      ['Username or email address', 'Användarnamn eller e-postadress'],
      ['Password', 'Lösenord'],
      ['Remember me', 'Kom ihåg mig'],
      ['Lost your password?', 'Glömt lösenordet?'],
      ['Visit our cellars…', 'Besök våra källare…'],
      ['On appointment', 'Efter överenskommelse'],
      ['Perhaps you are one of the people who like to enjoy our cognac in a tulip glass with a good cigar, by the fire etc… you’re right.<br>But we also suggest you to enjoy the freshness and fruitiness of Léopold Croizet cognacs in a more festive, exotic, more striking and «on the rocks»', 'Kanske hör du till dem som helst njuter vår cognac i ett tulpanformat glas med en god cigarr vid brasan. Det förstår vi.<br>Men vi föreslår också att du upptäcker friskheten och fruktigheten i Léopold Croizet cognac i en mer festlig, exotisk och uttrycksfull version, serverad över is.'],
      ['We use our youngest Cognacs <strong>VS</strong> and <strong>VSOP</strong> to make our favorite cocktails.<br>We want to share them with you:', 'Vi använder våra yngsta Cognacs <strong>VS</strong> och <strong>VSOP</strong> till våra favoritcocktails.<br>Vi vill dela dem med dig:'],
    ],
    sensory: {
      'Oak wood': 'Ek',
      Brioche: 'Brioche',
      'Vine flower': 'Vinblomma',
      Peach: 'Persika',
      Pear: 'Päron',
      Vanilla: 'Vanilj',
      'Dried aprico': 'Torkad aprikos',
      'Dried apricot': 'Torkad aprikos',
      Clove: 'Kryddnejlika',
      Plum: 'Plommon',
      Rose: 'Ros',
      Almond: 'Mandel',
      'Slightly vanilla warm wood': 'Varmt trä med lätt vanilj',
      Peanut: 'Jordnöt',
      Hazelnut: 'Hasselnöt',
      Toffee: 'Kola',
      'Black cherr': 'Svart körsbär',
      Leather: 'Läder',
      'Iris flowers': 'Irisblommor',
      'Dried flowers': 'Torkade blommor',
      Lychee: 'Litchi',
      'First rancio notes': 'Första rancio-noter',
      Tobacco: 'Tobak',
      Wood: 'Trä',
      Cinnamon: 'Kanel',
      'Candied ginger': 'Kanderad ingefära',
      Prune: 'Katrinplommon',
      Apricot: 'Aprikos',
      'Honeysuckle and jasmine': 'Kaprifol och jasmin',
      Chocolate: 'Choklad',
      'Candied fruit': 'Kanderad frukt',
      Nutmeg: 'Muskot',
      'Cedarwood and sandalwood': 'Cederträ och sandelträ',
      Eucalyptus: 'Eukalyptus',
      'Passion fruit': 'Passionsfrukt',
      Coconut: 'Kokos',
      Rancio: 'Rancio',
      'Cigar wood': 'Cigarrträ',
      Cedar: 'Cederträ',
      'White lily  and  honeysuckle flowers': 'Vit lilja och kaprifol',
      'Stewed fruits / Dried figs': 'Kokta frukter / torkade fikon',
      'Woodland undergrowth': 'Skogsbotten',
      'Old oak': 'Gammal ek',
      Cherry: 'Körsbär',
      Walnut: 'Valnöt',
      Ginger: 'Ingefära',
      Nuts: 'Nötter',
    },
    productCopy: {
      vs: {
        note: 'Ung och kraftfull cognac. VS kännetecknas av sin friskhet: toner av päron, persika och vinblomma. De unga ek-tanninerna avslöjar aromer av brioche. Idealisk i cocktails eller serverad över is.',
        view: 'Gyllengul / halmgul',
        nose: 'Aromer av färsk frukt som päron, persika och kokt frukt (bakade äpplen och gyllene russin).',
        mouth: 'Subtil blandning av friskhet och fruktighet, kompletterad av fina nyanser av brioche och vanilj. Avslutning: fruktig friskhet av färska druvor och päron.',
      },
      vsop: {
        note: 'Léopold Croizet VSOP är en rund och gourmand cognac. De första åren på ekfat ger toner av plommon och aprikosmarmelad. Träets tanniner lyfter vaniljtonerna och avslutar med en frisk touch av kryddnejlika.',
        view: 'Gyllengul',
        nose: 'Balanserad och rund: ek och vanilj. Subtil touch av kokt frukt (katrinplommon, aprikos).',
        mouth: 'Rik och fyllig med elegant fruktig karaktär, typisk för Fins Bois. Avslutning: frisk kryddnejlika.',
      },
      napoleon: {
        note: 'Den långa lagringen på fat ger behagliga toner av torkad frukt och nötter: jordnöt, mandel och hasselnöt samt rostat trä, kola och vanilj. Lång och pepprig avslutning.',
        view: 'Orangegul',
        nose: 'Mognaden på fat avslöjar och förstärker de ursprungliga trä- och vaniljtonerna.',
        mouth: 'Fina ek-tanniner förenas med toner av torkad frukt och nötter: mandel, hasselnöt och valnöt. Avslutningen är livlig, balanserad, lätt kryddig och mintig.',
      },
      xo: {
        note: 'Vår XO är fint strukturerad, rund och generös vid provning. Svart körsbärskompott och litchi ger plats åt florala toner av iris och torkade blommor. Rancio Charentais-karaktären framträder och utvecklas i längd med toner av läder och tobak.',
        view: 'Ljus bärnsten',
        nose: 'Utvecklad och balanserad doft. Fin kombination av kanderad frukt, trä och kryddiga toner.',
        mouth: 'Välstrukturerad kropp där en subtil mjukhet växer fram efter lång mognad på ekfat.',
      },
      'xo-exception': {
        note: 'För att utveckla denna XO Exception krävdes många långa års lagring. Denna XO Exception bär bärnstensfärgade nyanser. En komplex doft avslöjar toner av torkad frukt, kanderad frukt och åldrat trä. Smaken är intensiv och visar fint sammansmälta trä-tanniner med toner av kanel och tobak.',
        view: 'Gyllene bärnsten',
        nose: 'Söta päron möter vilda blommor och varma kryddor. Med tiden utvecklas aromerna mot kanderad frukt och kryddor.',
        mouth: 'Gourmand och rik. En explosion av kryddiga smaker och aromer med avslutning av muskot och kanel.',
      },
      extra: {
        note: 'Denna Extra cognac är rik och komplex. Dess rancio präglas av toner av kanderad frukt och choklad. Munnen är frisk och blommig och avslöjar dofter av kaprifol och jasmin. En kryddig avslutning med muskot och kanel.',
        view: 'Gyllene bärnsten/orange',
        nose: 'Rik och komplex med toner av kanderad och torkad frukt. De första antydningarna av rancio framträder, som skogsbotten.',
        mouth: 'Utmärkt fyllighet vid provning. Subtila florala dofter förenar jasmin och kaprifol. Under årtionden utvecklas tydliga mogna ektoner. Vacker balans mellan frukt och en kryddig avslutning med toner av nötter och torkad frukt.',
      },
      excellence: {
        note: 'Mycket gammal cognac, karakteristisk för Fins Bois. En komplex fruktig och blommig doft med aromer av kokos och passionsfrukt. Dess rancio ger plats åt mer markerade trätoner av ceder och sandelträ. Den friska eukalyptusavslutningen ger en anmärkningsvärd längd.',
        view: 'Orange bärnsten med lätt röd reflex',
        nose: 'Intensiv och djup. Vacker aromatisk komplexitet. Toner av passionsfrukt och kokos blandas med rancio och åldrat trä.',
        mouth: 'Kraftfull, rik och mjuk. Tonerna av sandelträ och ceder ger styrka och karaktär åt denna Cognac d&#39;Excellence. Avslutningen är frisk, markerad av eukalyptus, lång och ihållande.',
      },
      heritage: {
        note: 'I sin handgjorda kristallflaska är den husets själ, och inte mindre än fyra generationer av familjen har med passion format dess karaktär. Kraftfull och lätt animalisk, med en doft lika sirapslik som komplex. Här känns årens tyngd: läder, tobak och gammalt trä avslöjar en exceptionell rancio tillsammans med en floral explosion och en frisk avslutning. Den uppskattas för sin intensitet och längd.',
        view: 'Intensiv och djup röd bärnsten',
        nose: 'Kraftfull och komplex.',
        mouth: 'Otroligt söt och sirapslik med en intensiv aromatisk explosion. Anmärkningsvärd rancio, starkt utvecklat trä och skogsbotten. Avslutning: lång i munnen med sällsynt intensitet.',
      },
      valentine: {
        note: 'Cognac Valentine är feminin, där tiden inte räknas. Denna XO är en delikatess: valnötter, körsbär, choklad, kanel och ingefära smickrar doft och gom. Den gläder både gourmeter och livsnjutare.',
        view: 'Intensiv och djup kastanjebrun',
        nose: 'Rik och gourmand med toner av choklad, ingefära och kanel.',
        mouth: 'Rund och gourmand, som Christmas pudding med rika toner av svart körsbär och choklad. Intensiv och fruktig avslutning.',
      },
      'pineau-des-charentes': {
        note: 'Pineau des Charentes Léopold Croizet framställs av en blandning av Cognac-eaux-de-vie och druvmust från Colombard och Ugni Blanc. Efter blandningen rörs den i ekfat under de första månaderna och lagras därefter i många år. Den visar en klar bärnstensfärg, runda aromer av kanderad frukt och vanilj samt toner av valnöt och skogsbotten i avslutningen.',
        view: 'Gyllengul / bärnsten',
        nose: 'Aromer av kanderad frukt och honung med toner av aprikos, katrinplommon och körsbär.',
        mouth: 'En subtil balans mellan sötma, runda vaniljtoner och kanderad frukt. Avslutning: frukt, honung och valnöt, typiskt för gammal Pineau des Charentes.',
      },
    },
  },
  no: {
    htmlLang: 'no',
    footerAward: 'En kjeller med mange medaljer',
    translations: [
      ['Skill &amp; know how', 'Håndverk &amp; savoir-faire'],
      ['Skill & know how', 'Håndverk & savoir-faire'],
      ['Collection', 'Kolleksjon'],
      ['Meet us', 'Møt oss'],
      ['Shop', 'Bestilling'],
      ['The fruit', 'Frukten'],
      ['The fire', 'Ilden'],
      ['Alchemy', 'Alkymi'],
      ['Time', 'Tiden'],
      ['Our vines, our land, the fruits of our labour', 'Våre vinstokker, vår jord, frukten av vårt arbeid'],
      ['Each stage of our work distills the character of our products', 'Hvert trinn i arbeidet destillerer produktenes karakter'],
      ['A centuries-old know-how handed down from generation to generation', 'Et århundregammelt håndverk videreført fra generasjon til generasjon'],
      ['Taking the time to seal what makes us different', 'Å ta seg tid til å bevare det som gjør oss særegne'],
      ['Welcome!', 'Velkommen!'],
      ['Country', 'Land'],
      ['Day of birth', 'Fødselsdag'],
      ['Enter', 'Gå inn'],
      ['Discover', 'Oppdag'],
      ['DISCOVER', 'OPPDAG'],
      ['Have you experienced ?', 'Har du opplevd det?'],
      ['Shake !', 'Shake!'],
      ['Fresh ideas for sunny days', 'Friske ideer for lyse dager'],
      ['Idées fraîches pour les beaux jours', 'Friske ideer for lyse dager'],
      ['Pineau des Charentes controlled appellation', 'Kontrollert appellation Pineau des Charentes'],
      ['Bottles', 'Flaske'],
      ['Alcohol content', 'Alkoholinnhold'],
      ['Tasting notes', 'Smaksnoter'],
      ['Sensory Notes', 'Sensoriske noter'],
      ['Product quantity', 'Produktantall'],
      ['Add to cart', 'Legg i handlekurv'],
      ['Order', 'Bestill'],
      ['Return to shop', 'Tilbake til butikken'],
      ['Your cart is currently empty.', 'Handlekurven er tom.'],
      ['My Account', 'Min konto'],
      ['Cart', 'Handlekurv'],
      ['Checkout', 'Kasse'],
      ['Login', 'Logg inn'],
      ['Username or email address', 'Brukernavn eller e-postadresse'],
      ['Password', 'Passord'],
      ['Remember me', 'Husk meg'],
      ['Lost your password?', 'Glemt passordet?'],
      ['Visit our cellars…', 'Besøk våre kjellere…'],
      ['On appointment', 'Etter avtale'],
      ['Perhaps you are one of the people who like to enjoy our cognac in a tulip glass with a good cigar, by the fire etc… you’re right.<br>But we also suggest you to enjoy the freshness and fruitiness of Léopold Croizet cognacs in a more festive, exotic, more striking and «on the rocks»', 'Kanskje liker du best å nyte vår cognac i et tulipanglass med en god sigar ved peisen. Det forstår vi.<br>Men vi foreslår også at du opplever friskheten og fruktigheten i Léopold Croizet cognac i en mer festlig, eksotisk og markant versjon, servert over is.'],
      ['We use our youngest Cognacs <strong>VS</strong> and <strong>VSOP</strong> to make our favorite cocktails.<br>We want to share them with you:', 'Vi bruker våre yngste Cognacs <strong>VS</strong> og <strong>VSOP</strong> til våre favorittcocktails.<br>Vi vil gjerne dele dem med deg:'],
    ],
    sensory: {
      'Oak wood': 'Eik',
      Brioche: 'Brioche',
      'Vine flower': 'Vinblomst',
      Peach: 'Fersken',
      Pear: 'Pære',
      Vanilla: 'Vanilje',
      'Dried aprico': 'Tørket aprikos',
      'Dried apricot': 'Tørket aprikos',
      Clove: 'Nellik',
      Plum: 'Plomme',
      Rose: 'Rose',
      Almond: 'Mandel',
      'Slightly vanilla warm wood': 'Varmt tre med lett vanilje',
      Peanut: 'Peanøtt',
      Hazelnut: 'Hasselnøtt',
      Toffee: 'Karamell',
      'Black cherr': 'Sort kirsebær',
      Leather: 'Lær',
      'Iris flowers': 'Irisblomster',
      'Dried flowers': 'Tørkede blomster',
      Lychee: 'Litchi',
      'First rancio notes': 'Første rancio-noter',
      Tobacco: 'Tobakk',
      Wood: 'Tre',
      Cinnamon: 'Kanel',
      'Candied ginger': 'Kandisert ingefær',
      Prune: 'Sviske',
      Apricot: 'Aprikos',
      'Honeysuckle and jasmine': 'Kaprifol og jasmin',
      Chocolate: 'Sjokolade',
      'Candied fruit': 'Kandisert frukt',
      Nutmeg: 'Muskat',
      'Cedarwood and sandalwood': 'Sedertre og sandeltre',
      Eucalyptus: 'Eukalyptus',
      'Passion fruit': 'Pasjonsfrukt',
      Coconut: 'Kokos',
      Rancio: 'Rancio',
      'Cigar wood': 'Sigartre',
      Cedar: 'Sedertre',
      'White lily  and  honeysuckle flowers': 'Hvit lilje og kaprifol',
      'Stewed fruits / Dried figs': 'Kokte frukter / tørkede fiken',
      'Woodland undergrowth': 'Skogbunn',
      'Old oak': 'Gammel eik',
      Cherry: 'Kirsebær',
      Walnut: 'Valnøtt',
      Ginger: 'Ingefær',
      Nuts: 'Nøtter',
    },
    productCopy: {
      vs: {
        note: 'Ung og kraftfull cognac. VS kjennetegnes av sin friskhet med noter av pære, fersken og vinblomst. De unge eiketanninene avslører aromaer av brioche. Ideell i cocktails eller servert over is.',
        view: 'Gyldengul / strågul',
        nose: 'Aromaer av frisk frukt som pære, fersken og kokt frukt (bakte epler og gylne rosiner).',
        mouth: 'Subtil blanding av friskhet og fruktighet, fullendt med fine nyanser av brioche og vanilje. Avslutning: fruktig friskhet av friske druer og pærer.',
      },
      vsop: {
        note: 'Léopold Croizet VSOP er en rund og gourmand cognac. De første årene på eikefat gir noter av plomme og aprikosmarmelade. Treets tanniner fremhever vaniljen og avslutter med et friskt streif av nellik.',
        view: 'Gyldengul',
        nose: 'Balansert og rund: eik og vanilje. Subtile noter av kokt frukt (sviske, aprikos).',
        mouth: 'Rik og fyldig med elegant fruktig karakter, typisk for Fins Bois. Avslutning: frisk nellik.',
      },
      napoleon: {
        note: 'Den lange lagringen på fat gir behagelige noter av tørket frukt og nøtter: peanøtt, mandel og hasselnøtt samt ristet tre, karamell og vanilje. Lang og pepret avslutning.',
        view: 'Oransjegul',
        nose: 'Modningen på fat avslører og forsterker de opprinnelige tre- og vaniljenotene.',
        mouth: 'Fine eiketanniner forenes med noter av tørket frukt og nøtter: mandel, hasselnøtt og valnøtt. Avslutningen er livlig, balansert, lett krydret og mintet.',
      },
      xo: {
        note: 'Vår XO er fint strukturert, rund og generøs ved smaking. Sort kirsebærkompott og litchi gir plass til florale noter av iris og tørkede blomster. Rancio Charentais-karakteren trer frem og utvikler lengde med noter av lær og tobakk.',
        view: 'Lys rav',
        nose: 'Utviklet og balansert nese. Fin kombinasjon av kandisert frukt, tre og krydrede noter.',
        mouth: 'Velstrukturert kropp der en subtil mykhet vokser frem etter lang modning på eikefat.',
      },
      'xo-exception': {
        note: 'For å utvikle denne XO Exception var mange lange års lagring uunnværlige. Denne XO Exception har ravfargede nyanser. En kompleks nese avslører noter av tørket frukt, kandisert frukt og modent tre. Smaken er intens og viser fint smeltede tretanniner med noter av kanel og tobakk.',
        view: 'Gylden rav',
        nose: 'Søte pærer ledsager ville blomster og varme krydder. Over tid utvikler aromaene seg mot kandisert frukt og krydder.',
        mouth: 'Gourmand og rik. En eksplosjon av krydrede smaker og aromaer med avslutning av muskat og kanel.',
      },
      extra: {
        note: 'Denne Extra cognac er rik og kompleks. Dens rancio preges av noter av kandisert frukt og sjokolade. Munnen er frisk og blomstrende og avslører dufter av kaprifol og jasmin. En krydret avslutning med muskat og kanel.',
        view: 'Gylden rav/oransje',
        nose: 'Rik og kompleks med noter av kandiserte og tørkede frukter. De første antydningene av rancio viser seg, som skogbunn.',
        mouth: 'Utmerket fylde ved smaking. Subtile florale dufter forener jasmin og kaprifol. Gjennom tiår utvikles tydelige modne eikenoter. Vakker balanse mellom frukt og en krydret avslutning med noter av nøtter og tørket frukt.',
      },
      excellence: {
        note: 'Meget gammel cognac, karakteristisk for Fins Bois. En kompleks fruktig og blomstrende nese med aromaer av kokos og pasjonsfrukt. Dens rancio gir plass til mer markante trenoter av seder og sandeltre. Den friske eukalyptusavslutningen gir bemerkelsesverdig lengde.',
        view: 'Oransje rav med lett rødt skjær',
        nose: 'Intens og dyp. Vakker aromatisk kompleksitet. Noter av pasjonsfrukt og kokos blandes med rancio og gammelt tre.',
        mouth: 'Kraftfull, rik og myk. Notene av sandeltre og seder gir styrke og karakter til denne Cognac d&#39;Excellence. Avslutningen er frisk, preget av eukalyptus, lang og vedvarende.',
      },
      heritage: {
        note: 'I sin håndlagde krystallflaske er den husets sjel, og ikke mindre enn fire generasjoner av familien har arbeidet med lidenskap for å forme dens karakter. Kraftfull og lett animalsk, med en duft like sirupsaktig som den er kompleks. Her merkes årenes tyngde: lær, tobakk og gammelt tre avslører en eksepsjonell rancio sammen med en floral eksplosjon og frisk avslutning. Den verdsettes for sin intensitet og lengde.',
        view: 'Intens og dyp rød rav',
        nose: 'Kraftfull og kompleks.',
        mouth: 'Utrolig søt og sirupsaktig med en intens aromatisk eksplosjon. Bemerkelsesverdig rancio, sterkt utviklet tre og skogbunn. Avslutning: lang i munnen med sjelden intensitet.',
      },
      valentine: {
        note: 'Cognac Valentine er feminin, der tiden ikke teller. Denne XO er en delikatesse: valnøtter, kirsebær, sjokolade, kanel og ingefær smigrer nese og gane. Den vil glede både gourmeter og livsnytere.',
        view: 'Intens og dyp kastanjebrun',
        nose: 'Rik og gourmand med noter av sjokolade, ingefær og kanel.',
        mouth: 'Rund og gourmand, som Christmas pudding med rike noter av sort kirsebær og sjokolade. Intens og fruktig avslutning.',
      },
      'pineau-des-charentes': {
        note: 'Pineau des Charentes Léopold Croizet fremstilles av en blanding av Cognac-eaux-de-vie og druemost fra Colombard og Ugni Blanc. Etter blandingen røres den i eikefat de første månedene og lagres deretter i mange år. Den har en klar ravfarge, runde aromaer av kandisert frukt og vanilje samt noter av valnøtt og skogbunn i avslutningen.',
        view: 'Gyldengul / rav',
        nose: 'Aromaer av kandisert frukt og honning med noter av aprikos, sviske og kirsebær.',
        mouth: 'En subtil balanse mellom sødme, runde vaniljenoter og kandisert frukt. Avslutning: frukt, honning og valnøtt, typisk for gammel Pineau des Charentes.',
      },
    },
  },
};

const englishProductCopy = {
  vs: {
    note: 'Young and powerful cognac. The VS is characterized by its freshness: notes of pear and peach, even vine blossom. The young oak tannins reveal brioche aromas. Ideal for making cocktails or being consumed on ice.',
    view: 'Golden yellow / straw yellow',
    nose: 'Aromas of fresh fruit such as pear, peach and stewed fruit (baked apples and golden raisins)',
    mouth: 'Subtle blend of freshness and fruitiness completed with subtle nuances of brioche and vanilla notes. Finish: fruity freshness of fresh grapes and pears.',
  },
  vsop: {
    note: 'Léopold Croizet’s VSOP is a round and gourmet cognac. The early years in oak barrels produce plum and apricot jam notes. The wood tannins enhance the vanilla notes along with a fresh clove touch to finish.',
    view: 'Golden yellow',
    nose: 'Balanced and round: oak wood and vanilla. Subtle touch of stewed fruit (prune, apricot).',
    mouth: 'Rich and ample: with elegant fruity character, typical of the « Fins Bois» region. Finish: Fresh cloves.',
  },
  napoleon: {
    note: 'The prolonged aging in barrels conveys pleasant notes of dried fruit and nuts : (peanut, almond, hazelnut), toasted wood, toffee and vanilla notes. Long and peppery finish.',
    view: 'Orange yellow',
    nose: 'The maturing in barrels reveals and enhances the original woody and vanilla notes.',
    mouth: 'Fine oak tannins combine with notes of dried fruit and nuts: almond, hazelnut and walnut. The finish is vigorous, balanced, lightly spiced and minty',
  },
  xo: {
    note: 'Our Cognac XO is finely structured, and at present, round and generous on tasting. A boiled fruity black cherry jam and lychee punch gives way to floral notes of iris and dried flowers. The liquer « Rancio Charentais » character emerges and develops in length, with notes of leather and tobacco.',
    view: 'Light amber',
    nose: 'Elaborate and balanced nose. Nice combination of fruit confit, woody and spicy notes',
    mouth: 'Well structured body with subtle softness emerges from long maturing in oak cask.',
  },
  'xo-exception': {
    note: 'To develop this XO Exception many long years of aging were (are) indispensable. This Exception XO is robed in amber colours. A Complex nose reveals notes of dried fruit, candied fruit and aged wood. The \r\ntaste is intense and reveals finely melted wood tannins, with notes of cinnamon and tobacco.',
    view: 'Golden amber',
    nose: 'Sweet pears accompany wild flowers and warm spices. Over time, the aromas evolve towards notes of candied fruit and spices.',
    mouth: 'Gourmet and rich ! An explosion of spicy flavors and aromas, finishing with nutmeg and cinnamon',
  },
  extra: {
    note: 'This "Extra" Cognac is rich and complex. Its « rancio » is marked by notes of candied fruit and chocolate. Its mouth is fresh and flowery and reveals a honeysuckle and jasmin scent. A Spicy finish with nutmeg and cinnamon',
    view: 'Golden amber/orange',
    nose: 'Rich and complex, revealing notes of candied and dried fruits. The first hints of « rancio » are revealed. (Woodland undergrowth).',
    mouth: 'Excellent fullness on tasting. Subtle floral fragrances combine jasmine and honeysuckle. Over decades the distinct « aged » woody oak notes develop. A lovely balance between fruits and a spicy finish, marked by hints (notes) of nuts and dried fruits.',
  },
  excellence: {
    note: 'Very old Cognac characteristic of « Fins Bois ». A complex fruity and flowery nose, with aromas of coconut and passion fruit. Its « rancio » gives way to more assertive woody notes of cedar and sandalwood. The fresh eucalyptus finish produces remarkable length in the mouth.',
    view: 'Orange amber, slight red reflection',
    nose: 'Intense and deep. Lovely aromatic complexity. Notes of passion fruit and coconut mingle with notes of rancio and aged wood.',
    mouth: 'Powerful, rich and mellow. The notes of sandalwood and cedar give strength and character to this Cognac d&#39;Excellence. The finish is fresh, marked by notes of eucalyptus, long and lingering.',
  },
  heritage: {
    note: 'In its crystal bottle handmade by master craftsmen, it is the soul of the house and no less than 4 generations of the family have worked with passion to forge its character. Powerful, slightly animal, its fragrance is as syrupy as it is complex. From here, you can feel the weight of the years that span the seasons: the leather, the tobacco, and old wood reveal an exceptional « rancio » along with a floral explosion and fresh finish. It’s appreciated on tasting for it’s intensity and length.',
    view: 'Intense and deep red amber',
    nose: 'Powerful and complex',
    mouth: 'Incredibly sweet and syrupy with an intense aromatic explosion. Remarkable rancio, highly developed woody and forest undergrowth. Finish: long lasting in the mouth with a rare intensity.',
  },
  valentine: {
    note: 'The Cognac Valentine is feminine, where time doesn’t count ! This XO is a delicacy ! walnuts, cherries, chocolate, cinnamon and ginger flatter the nose and the palate. It will delight gourmets and gourmands.',
    view: 'Intense and deep auburn',
    nose: 'Rich and greedy with notes of chocolate, ginger and cinnamon.',
    mouth: 'Round and gourmand, like Christmas pudding with rich notes of black cherry and chocolate. Intense and fruity finish.',
  },
  'pineau-des-charentes': {
    note: 'Pineau des Charentes Léopold Croizet is made from a blend of Cognac eaux-de-vie and grape must from Colombard and Ugni Blanc. After blending, it is stirred in oak barrels during the first months, then aged for many years. It reveals a bright amber colour, rounded aromas of candied fruit and vanilla, and walnut and woodland notes on the finish.',
    view: 'Golden yellow / amber',
    nose: 'Candied fruit and honey aromas, with apricot, prune and cherry notes.',
    mouth: 'A subtle balance of sweetness, round vanilla notes and candied fruit. Finish: fruit, honey and walnut notes, typical of old Pineau des Charentes.',
  },
};

for (const config of Object.values(nordicConfigs)) {
  config.productCopy[PINEAU_RED_SLUG] = config.productCopy[PINEAU_SLUG];
}
englishProductCopy[PINEAU_RED_SLUG] = englishProductCopy[PINEAU_SLUG];

const editorialCopy = {
  da: [
    ['A centuries-old know-how handed down from generation to generation', 'Et århundredgammelt håndværk overleveret fra generation til generation'],
    ['Many long years of aging were (are) indispensable', 'Mange lange års lagring var uundværlige'],
    ['to develop this XO Exception.', 'for at udvikle denne XO Exception.'],
    ['Discover a very old Cognac characteristic of Fins Bois.', 'Opdag en meget gammel cognac med den særlige Fins Bois-karakter.'],
    ['An exceptional and unique creation which is the pride', 'En enestående og unik kreation, som er stoltheden'],
    ['of the LÉOPOLD CROIZET house and reveals', 'i huset LÉOPOLD CROIZET og afslører'],
    ['the excellence of our know-how.', 'det ypperste af vores savoir-faire.'],
    ['a very old Cognac', 'en meget gammel cognac'],
    ['of Fins Bois.', 'fra Fins Bois.'],
    ['and unique,', 'og unik,'],
    ['the pride of the house', 'husets stolthed'],
    ['This Cognac reveals to you', 'Denne cognac afslører'],
    ['all the excellence', 'hele den særlige kvalitet'],
    ['of our know-how.', 'af vores savoir-faire.'],
    ['Discover the Extra Léopold Croizet', 'Opdag Extra Léopold Croizet'],
    ['&#8230; and upward it', '&#8230; og videre opefter'],
    ['hazards don&#8217;t exist', 'tilfældigheder findes ikke'],
    ['LÉOPOLD CROIZET COGNAC FROM GENERATION TO GENERATION', 'LÉOPOLD CROIZET COGNAC FRA GENERATION TIL GENERATION'],
    ['I want to receive some news time to time', 'Jeg ønsker at modtage nyheder fra jer fra tid til anden'],
    ['Léopold Croizet cognacs originate from a distinguished ancient line of winegrowers. We are situated in the privileged Cognac region called, (AOC) “Fins Bois Cru”, at the heart of the village of Triac lautrait, close to the Charente River, Come and discover our cognacs, soak up our identity and personality in an authentic atmosphere steeped in history.', 'Léopold Croizet cognac udspringer af en gammel og anerkendt vinbondefamilie. Vi ligger i det privilegerede cognacområde Fins Bois, i hjertet af landsbyen Triac-Lautrait, tæt på Charente-floden. Kom og opdag vores cognacs, vores identitet og vores personlighed i en autentisk atmosfære præget af historie.'],
    ['of a passion.', 'af en passion.'],
    ['WORK IN THE VINEYARD', 'ARBEJDET I VINMARKEN'],
    ['THE GRAPE', 'DRUEN'],
    ['THE HARVEST', 'HØSTEN'],
    ['Le travail de la vigne mobile', 'Arbejdet i vinmarken mobil'],
    ['Le travail de la vigne', 'Arbejdet i vinmarken'],
    ['LE RAISIN', 'DRUEN'],
    ['LES VENDANGES', 'HØSTEN'],
    ['Making a quality cognac starts with a reflection on the environment and on time.', 'At skabe en cognac af høj kvalitet begynder med omtanke for miljøet og for tiden.'],
    ['The vine is a root anchored deep in the earth. It draws its resources there and will produce grapes over several decades.', 'Vinstokken er en rod dybt forankret i jorden. Der henter den sine ressourcer og bærer druer gennem flere årtier.'],
    ["The quality of the grapes is essential to produce cognac. Above all the love dedicated through one's work, the desire to impart a healthy vineyard, to inspire good work habits and to always question oneself every day is primordial.", 'Druernes kvalitet er afgørende for at fremstille cognac. Frem for alt er kærligheden til arbejdet, ønsket om at videregive en sund vinmark, de gode vaner og den daglige ydmyghed helt centrale.'],
    ['The vines are treated with respect for the soil, without chemical pesticides or herbicides. The management of the vine is thought out according to the plots and the type of soil. We do our best to obtain quality, healthy and aromatic grapes.', 'Vinstokkene dyrkes med respekt for jorden, uden kemiske pesticider eller herbicider. Arbejdet tilpasses parcellerne og jordtypen. Vi gør alt for at opnå sunde, aromatiske druer af høj kvalitet.'],
    ['Our vineyard has been managed entirely using  organic farming techniques for 20 years.', 'Vores vinmark har i 20 år været drevet fuldt ud efter økologiske dyrkningsprincipper.'],
    ['Our vineyard is made up of three grape varieties essential for making cognac.', 'Vores vinmark består af tre druesorter, der er væsentlige for fremstillingen af cognac.'],
    ['The major grape variety of the appellation ; it produces an acidic wine which favours the aromatic concentration of Cognac spirits. « Eaux de vie ».', 'Appellationens vigtigste druesort giver en frisk vin med syre, som fremmer den aromatiske koncentration i cognacens eaux-de-vie.'],
    ['The <b>COLOMBARD</b> and the <b>FOLLE BLANCHE</b>,', '<b>COLOMBARD</b> og <b>FOLLE BLANCHE</b>,'],
    ['The COLOMBARD and the FOLLE BLANCHE ,', 'COLOMBARD og FOLLE BLANCHE,'],
    ['These grape varieties represent only 1% of the vineyards in the appellation, and are renowned for their very aromatic and very intense « eaux-de-vie ».', 'Disse druesorter udgør kun 1 % af appellationens vinmarker og er kendt for meget aromatiske og intense eaux-de-vie.'],
    ['This diversity of grape varieties plays an important role in the complexity and aromatic richness of our Cognac.', 'Denne mangfoldighed af druesorter spiller en vigtig rolle i kompleksiteten og den aromatiske rigdom i vores cognac.'],
    ['Even though today our harvest is fully mechanized, it still requires human intervention and decisions in every stage of the harvest.', 'Selvom høsten i dag er fuldt mekaniseret, kræver hvert trin stadig menneskelige valg og indgreb.'],
    ['This is an exciting time on the property. Our harvesting machine is equipped with an automated sorting table to remove all the unwanted plant debris: leaves, stalks, wood.', 'Det er en intens periode på ejendommen. Vores høstmaskine er udstyret med et automatisk sorteringsbord, der fjerner uønskede plantedele: blade, stilke og træ.'],
    ['The grape harvest is loaded by gravity into the presses from the top in order to respect the taste qualities of the grapes.', 'Druerne fyldes i presserne ovenfra ved hjælp af tyngdekraften for at bevare deres smagskvalitet.'],
    ['The freshly squeezed grape juice ferments in thermoregulated stainless steel tanks for 24 hours, to guarantee optimal control of the natural fermentation process.', 'Den friskpressede druesaft gærer i temperaturstyrede ståltanke i 24 timer for at sikre optimal kontrol med den naturlige gæring.'],
    ['The Fire', 'Ilden'],
    ['The fire', 'Ilden'],
    ['of creation.', 'af skabelsen.'],
    ['THE DISTILLATION', 'DESTILLATIONEN'],
    ['A DOUBLE<br />\r\nDISTILLATION', 'EN DOBBELT<br />\r\nDESTILLATION'],
    ['A DOUBLE<br />\nDISTILLATION', 'EN DOBBELT<br />\nDESTILLATION'],
    ['A DOUBLE DISTILLATION', 'EN DOBBELT DESTILLATION'],
    ['THE AGEING', 'LAGRINGEN'],
    ['double distillation', 'dobbelt destillation'],
    ['La distillation mobile', 'Destillation mobil'],
    ['Double distillation mobile', 'Dobbelt destillation mobil'],
    ['Le vieillissement mobile', 'Lagring mobil'],
    ['The distillation is an essential step in the production of our cognacs.', 'Destillationen er et afgørende trin i fremstillingen af vores cognacs.'],
    ['All our senses are awakened during this winter period when the stills are lit day and night to produce our cognacs. The distillery takes on an incredible ambience. One enters with emotion and respect. Silence reigns.', 'Alle sanser vækkes i vinterperioden, når kedlerne er tændt dag og nat for at fremstille vores cognacs. Destilleriet får en helt særlig stemning; man træder ind med følelse og respekt. Stilheden hersker.'],
    ['Only the roar of the gas burners heating the stills sing melodiously. The water trickles into the cooling pipe and the cognac into the barrel.', 'Kun gasbrændernes brusen under kedlerne synger melodisk. Vandet risler i kølerøret, og cognacen løber i fadet.'],
    ['The atmosphere is humid and warm. The vapors are intense and intoxicating. The heat that emerges from the stills is intense.', 'Stemningen er fugtig og varm. Dampene er intense og berusende. Varmen fra kedlerne er kraftig.'],
    ['We let ourselves be uplifted by the emotion and the pride of taking our product so far.', 'Vi lader os løfte af følelsen og stoltheden over at føre vores produkt så langt.'],
    ['The wines, once the fermentation is over, are distilled in order to obtain cognac.', 'Når gæringen er afsluttet, destilleres vinene for at opnå cognac.'],
    ['To qualify as certified Cognac, the wines have to be distilled twice in pot stills, called “Alambic Charentais”.', 'For at blive anerkendt som Cognac skal vinene destilleres to gange i kobberkedler kaldet Alambic Charentais.'],
    ['On our property, we distill with small copper stills of 16hl and 20hl. Our cognacs are distilled with the lees in order to preserve their round and rich taste.', 'På ejendommen destillerer vi i små kobberkedler på 16 hl og 20 hl. Vores cognacs destilleres på bærmen for at bevare en rund og rig smag.'],
    ['In the Léopold Croizet family, the art of distilling combines years of practice and consistently striving for excellence. The end result respects the tradition of our ancestors, a combination of powerful fruity spirits, typical of the fins bois appellation.', 'Hos Léopold Croizet forener destillationskunsten mange års praksis med en konstant søgen efter excellence. Resultatet respekterer forfædrenes tradition: kraftfulde, frugtige eaux-de-vie, typiske for Fins Bois.'],
    ['After Distillation, our eaux-de-vie are ready to spend a long time ageing in barrels.', 'Efter destillationen er vores eaux-de-vie klar til en lang lagring på fade.'],
    ['With time, they will take on a beautiful amber color and extract the sweet and subtle aromas of the Oak which gives our cognac its intensity.', 'Med tiden får de en smuk ravfarve og trækker de søde, subtile aromaer ud af egetræet, som giver vores cognac sin intensitet.'],
    ['We take extra care when selecting our French Oak Barrels for the ageing of our cognac. Different grains of wood are used and barrels of different ages (new, young and old). This allows our cognac to achieve their highest aromatic potential.', 'Vi udvælger vores franske egetræsfade med stor omhu. Forskellige træårer og fade i forskellige aldre bruges for at løfte vores cognac til sit højeste aromatiske potentiale.'],
    ['The majority of our barrels are 350 liters as they allow the best exchange between the Cognac, the air and the wood. We also age it in different cellars which have different temperature and moisture levels allowing us to have a broader and more complex range of “eaux de vies”.', 'De fleste af vores fade rummer 350 liter, fordi de giver den bedste udveksling mellem cognac, luft og træ. Vi lagrer også i forskellige kældre med forskellige temperatur- og fugtighedsniveauer, hvilket giver os et bredere og mere komplekst udvalg af eaux-de-vie.'],
    ['of senses.', 'af sanser.'],
    ["L'assemblage", 'Assemblagen'],
    ['La mise en bouteille', 'Aftapningen'],
    ['It is the subtle art of the cellar master who, like a perfumer’s nose, selects and produces blends of brandy of different ages to give them a constant quality year after year.', 'Det er kældermesterens subtile kunst: som en parfumørs næse udvælger og sammensætter han eaux-de-vie i forskellige aldre for at give dem en konstant kvalitet år efter år.'],
    ['This marriage brings balance and complexity to our cognacs. Over time, the secret of making cognac is passed on to the new generation, each bringing a subtlety to the know-how of the previous one. This gives the cognac Léopold Croizet its unique and exceptional character.', 'Denne forening giver balance og kompleksitet til vores cognacs. Med tiden gives hemmeligheden bag cognacfremstilling videre til den nye generation, hvor hver generation føjer sin nuance til den forriges savoir-faire. Det giver cognacen Léopold Croizet sin unikke og enestående karakter.'],
    ['The bottling of our cognacs is done on the property. The vast majority is handmade as in the past. We take special care when dressing our bottles.', 'Aftapningen af vores cognacs foregår på ejendommen. Langt det meste udføres i hånden som tidligere, og vi lægger særlig omhu i flaskernes præsentation.'],
    ['Our team ensures the quality of our stock and redoubles our vigilance in the control of bottles.', 'Vores team sikrer kvaliteten af vores beholdning og er ekstra opmærksomt ved kontrollen af flaskerne.'],
    ['in memory.', 'i erindringen.'],
    ['of memory.', 'af minder.'],
    ['The Cognacs LÉOPOLD CROIZET,', 'Cognacerne LÉOPOLD CROIZET,'],
    ['It’s a family matter.', 'det er en familiesag.'],
    ['bordered by river and woods,', 'omkranset af flod og skov,'],
    ['handed down from generation', 'overleveret fra generation'],
    ['to generation.', 'til generation.'],
    ['Thanks to our records,', 'Takket være vores arkiver,'],
    ['we can go back in time until 1714.', 'kan vi følge historien tilbage til 1714.'],
    ['Various acts of marriage and sale.', 'Forskellige vielses- og salgsakter.'],
    ['We find in this photo the marriage certificate of Pierre GANAN and Jeanne MASSON on February 3, 1750: 1st generation to live in the home of LANTIN.', 'På dette foto ser vi vielsesattesten for Pierre GANAN og Jeanne MASSON fra 3. februar 1750: første generation, der boede i Lantin-hjemmet.'],
    ['of François FOUCHÉ.', 'fra François FOUCHÉ.'],
    ['Act of Sale of Property', 'Skøde på ejendommen'],
    ['from François HUBERT', 'fra François HUBERT'],
    ['from François HUBERT to his daughter', 'fra François HUBERT til hans datter'],
    ['fra François HUBERT to his daughter', 'fra François HUBERT til hans datter'],
    ['to his daughter Rose HUBERT', 'til hans datter Rose HUBERT'],
    ['and Jeanne GANAN', 'og Jeanne GANAN'],
    ['Deed of sale of the parcel', 'Skøde på parcellen'],
    ['«Bois de LANTIN» to François HUBERT', '«Bois de LANTIN» til François HUBERT'],
    ['in November 1850. Parcel still owned', 'i november 1850. Parcellen ejes stadig'],
    ['to the LÉOPOLD CROIZET family.', 'af familien LÉOPOLD CROIZET.'],
    ['Deed of sale "of a piece of vines.', 'Skøde på "et stykke vinmark.'],
    ['According to the Republican calendar', 'Ifølge den republikanske kalender'],
    ['which corresponds to April 28, 1799).', 'svarende til 28. april 1799).'],
    ['LÉOPOLD CROIZET Frères cognac label,', 'Etiket for LÉOPOLD CROIZET Frères cognac,'],
    ['found in departmental archives', 'fundet i departementsarkiverne'],
    ['Cognac trademark filings from 1945.', 'Registreringer af cognacmærker fra 1945.'],
    ['Trademark registered by Marc, grandfather of Léopold Croizet,', 'Mærke registreret af Marc, Léopold Croizets bedstefar,'],
    ['and his brother Roger, from the Léopold Croizet family.', 'og hans bror Roger fra familien Léopold Croizet.'],
    ['Aerial view of Lantin’s home', 'Luftfoto af Lantin-hjemmet'],
    ['in the 1950s with the house', 'i 1950’erne med huset'],
    ['family and farm body', 'familiens bygninger og driftslænge'],
    ['Marc FOUCHÉ, 7th generation', 'Marc FOUCHÉ, 7. generation'],
    ['of Léopold Croizet.', 'af familien Léopold Croizet.'],
    ['Pierre (left), 8th generation, followed by Léopold and his son Paul (9th and 10th generation of family winemakers).', 'Pierre (til venstre), 8. generation, efterfulgt af Léopold og hans søn Paul, 9. og 10. generation af familiens vinbønder.'],
    ['Pierre relaunched the production of bottled cognac in the 1970s.', 'Pierre relancerede produktionen af cognac på flaske i 1970’erne.'],
    ['It is establishing itself in Asian markets, which today remain our number one market. We perpetuate his name through his brand and honor his memory.', 'Mærket slog sig fast på de asiatiske markeder, som i dag fortsat er vores vigtigste marked. Vi viderefører hans navn gennem brandet og ærer hans minde.'],
    ['I am Léopold Croizet, I represent the 9th generation of winegrowers on the estate. I inherited it from my father who inherited it from his mother who herself inherited it from her father and so on&#8230; Our vineyard, planted mainly in the commune of Triac Lautrait, brings together 30 hectares around a farm typically Charente. Here we are in the heart of the village, Lantin, near Jarnac. It is a privileged land. It belongs to the Fins Bois cru and benefits from the clay-limestone limits of the lands of Champagne.', 'Jeg er Léopold Croizet og repræsenterer 9. generation af vinbønder på ejendommen. Jeg arvede den fra min far, som arvede den fra sin mor, som selv arvede den fra sin far, og sådan fortsætter historien. Vores vinmark, hovedsageligt plantet i kommunen Triac-Lautrait, samler 30 hektar omkring en typisk charentais gård. Her er vi i hjertet af landsbyen Lantin, tæt på Jarnac. Det er et privilegeret terroir i Fins Bois cru med ler- og kalkholdige jordgrænser fra Champagne-områderne.'],
    ['What is your work and its scope within Maison Léopold Croizet?', 'Hvad består dit arbejde i hos Maison Léopold Croizet?'],
    ['Since 2001, I have taken my full place in the family adventure. I am a winemaker, distiller, master-blender. I spread the word to my friends and consumers of Léopold Croizet cognac. I am also an actor of the passage of time! Time is an essential element to be taken into account for the production of cognac. « It’s about letting time work, but being active! »', 'Siden 2001 har jeg taget min fulde plads i familieeventyret. Jeg er vinbonde, destillatør og maître de chai. Jeg fortæller historien til mine venner og til dem, der nyder Léopold Croizet cognac. Jeg er også aktør i tidens arbejde: tid er afgørende i produktionen af cognac. « Det handler om at lade tiden arbejde, men selv være aktiv! »'],
    ['What major assets and know-how do you have ?', 'Hvilke vigtigste styrker og hvilket savoir-faire har I?'],
    ['First of all in the working method: our vineyard is fully converted to organic farming. I started the conversion as soon as I arrived on the estate. The entire vineyard is dedicated to the production of our cognacs which leaves me free choice on the conduct I wish to lead and the direction I wish to offer to my “eaux de vie”. We choose an old-fashioned culture with organic smoke and premature harvests to maintain good acidity and give elegant and aromatic “eaux de vie”. The distillation is carried out in two small potstills of 16hl and 20hl, those that my grandmother had installed! Our distillation method remains uncommon in the region, it comes from my father who himself got it from his mother: a family secret!', 'Først og fremmest vores arbejdsmetode: hele vinmarken er omlagt til økologisk dyrkning. Jeg begyndte omlægningen, så snart jeg kom til ejendommen. Hele vinmarken er dedikeret til produktionen af vores cognacs, hvilket giver mig frihed til at vælge den retning, jeg vil give mine eaux-de-vie. Vi arbejder på gammeldags vis med organisk gødning og tidlig høst for at bevare en god syre og skabe elegante, aromatiske eaux-de-vie. Destillationen foregår i to små kedler på 16 hl og 20 hl, dem min bedstemor fik installeret. Vores destillationsmetode er sjælden i regionen; den kommer fra min far, som selv lærte den af sin mor: en familiehemmelighed.'],
    ['What are the values that take precedence and distinguish you from other brands?', 'Hvilke værdier kommer først og adskiller jer fra andre mærker?'],
    ['Respect for tradition, values&#8230; For several generations my family has provided expertise and know-how in all stages of the production of cognac: from the vine to the blending, including of course the distillation. This mastery allows us to «nurture» and ensure an heritage for future generations. Be visionary, see further and ensure quality of products. My grandfather Marc launched his brand of cognac with his brother just after the second world war. It was a period of reconstruction in the country and we were recovering of several tough years. He was thinking big, he launched his business with some success and even won. I have a lot of anecdotes about my ancestors and it enriches my business vision and also give me motivation to prove myself to be worthy of it.', 'Respekt for tradition og værdier. I flere generationer har min familie samlet ekspertise og savoir-faire i alle trin af cognacproduktionen: fra vinstokken til assemblagen, naturligvis inklusive destillationen. Denne beherskelse gør det muligt at nære og sikre en arv til kommende generationer. Man skal være visionær, se længere frem og sikre produkternes kvalitet. Min bedstefar Marc lancerede sit cognacmærke med sin bror lige efter Anden Verdenskrig, i en periode med genopbygning. Han tænkte stort, skabte sin virksomhed med succes og vandt frem. Jeg har mange historier om mine forfædre, og de beriger mit syn på virksomheden og giver mig lyst til at være arven værdig.'],
    ['Could you describe the particularity and the style of your cognacs ?', 'Kan du beskrive det særlige ved stilen i jeres cognacs?'],
    ['Difficult for me to describe my cognacs &#8230; I prefer to make them taste, they speak for themselves! As I said earlier, each step is important to make a good cognac. The expertise I carry produces very fruity cognacs, typical of the Fins Bois cru. They are fragrant, round, mellow and easy to drink. This roundness comes mainly from a distillation on the lees. Our spirits then age in French oak barrels whose woods are selected from the best forests in France. This task now falls to my wife, who once worked in cooperage and who has a real passion for the interaction between wood and spirit. The blend of this diversity offers a range of very interesting aromas.', 'Det er svært for mig at beskrive mine cognacs. Jeg foretrækker at lade dem smage; de taler for sig selv. Som sagt er hvert trin vigtigt for at skabe en god cognac. Den ekspertise, jeg viderefører, giver meget frugtige cognacs, typiske for Fins Bois cru. De er duftende, runde, bløde og lette at drikke. Denne rundhed kommer især fra destillation på bærmen. Vores eaux-de-vie lagrer derefter på franske egetræsfade, hvor træet udvælges fra de bedste skove i Frankrig. Det arbejde ligger nu hos min hustru, der tidligere arbejdede med bødkeri og har en reel passion for mødet mellem træ og spiritus. Denne mangfoldighed giver et meget interessant aromatisk spektrum.'],
  ],
  sv: [
    ['A centuries-old know-how handed down from generation to generation', 'Ett sekelgammalt kunnande som förs vidare från generation till generation'],
    ['Many long years of aging were (are) indispensable', 'Många långa års lagring var nödvändiga'],
    ['to develop this XO Exception.', 'för att utveckla denna XO Exception.'],
    ['Discover a very old Cognac characteristic of Fins Bois.', 'Upptäck en mycket gammal cognac med tydlig Fins Bois-karaktär.'],
    ['An exceptional and unique creation which is the pride', 'En exceptionell och unik skapelse som är stoltheten'],
    ['of the LÉOPOLD CROIZET house and reveals', 'i huset LÉOPOLD CROIZET och visar'],
    ['the excellence of our know-how.', 'det yppersta av vårt kunnande.'],
    ['a very old Cognac', 'en mycket gammal cognac'],
    ['of Fins Bois.', 'från Fins Bois.'],
    ['and unique,', 'och unik,'],
    ['the pride of the house', 'husets stolthet'],
    ['This Cognac reveals to you', 'Denna cognac visar dig'],
    ['all the excellence', 'hela excellensen'],
    ['of our know-how.', 'av vårt kunnande.'],
    ['Discover the Extra Léopold Croizet', 'Upptäck Extra Léopold Croizet'],
    ['&#8230; and upward it', '&#8230; och vidare uppåt'],
    ['hazards don&#8217;t exist', 'slumpen finns inte'],
    ['LÉOPOLD CROIZET COGNAC FROM GENERATION TO GENERATION', 'LÉOPOLD CROIZET COGNAC FRÅN GENERATION TILL GENERATION'],
    ['I want to receive some news time to time', 'Jag vill få nyheter från er då och då'],
    ['Léopold Croizet cognacs originate from a distinguished ancient line of winegrowers. We are situated in the privileged Cognac region called, (AOC) “Fins Bois Cru”, at the heart of the village of Triac lautrait, close to the Charente River, Come and discover our cognacs, soak up our identity and personality in an authentic atmosphere steeped in history.', 'Léopold Croizet cognac kommer ur en gammal och framstående vinodlartradition. Vi finns i det privilegierade cognacområdet Fins Bois, mitt i byn Triac-Lautrait, nära floden Charente. Kom och upptäck våra cognacs, vår identitet och vår personlighet i en autentisk miljö präglad av historia.'],
    ['of a passion.', 'ur en passion.'],
    ['WORK IN THE VINEYARD', 'ARBETET I VINGÅRDEN'],
    ['THE GRAPE', 'DRUVAN'],
    ['THE HARVEST', 'SKÖRDEN'],
    ['Le travail de la vigne mobile', 'Arbetet i vingården mobil'],
    ['Le travail de la vigne', 'Arbetet i vingården'],
    ['LE RAISIN', 'DRUVAN'],
    ['LES VENDANGES', 'SKÖRDEN'],
    ['Making a quality cognac starts with a reflection on the environment and on time.', 'Att skapa en cognac av hög kvalitet börjar med omtanke om miljön och om tiden.'],
    ['The vine is a root anchored deep in the earth. It draws its resources there and will produce grapes over several decades.', 'Vinrankan är en rot djupt förankrad i jorden. Där hämtar den sina resurser och bär druvor under flera årtionden.'],
    ["The quality of the grapes is essential to produce cognac. Above all the love dedicated through one's work, the desire to impart a healthy vineyard, to inspire good work habits and to always question oneself every day is primordial.", 'Druvornas kvalitet är avgörande för att framställa cognac. Framför allt är kärleken till arbetet, viljan att lämna vidare en frisk vingård, goda arbetsvanor och daglig självkritik grundläggande.'],
    ['The vines are treated with respect for the soil, without chemical pesticides or herbicides. The management of the vine is thought out according to the plots and the type of soil. We do our best to obtain quality, healthy and aromatic grapes.', 'Vinrankorna behandlas med respekt för jorden, utan kemiska bekämpningsmedel eller herbicider. Skötseln anpassas efter varje jordlott och jordtyp. Vi gör vårt bästa för att få friska, aromatiska druvor av hög kvalitet.'],
    ['Our vineyard has been managed entirely using  organic farming techniques for 20 years.', 'Vår vingård har i 20 år skötts helt enligt ekologiska odlingsprinciper.'],
    ['Our vineyard is made up of three grape varieties essential for making cognac.', 'Vår vingård består av tre druvsorter som är avgörande för framställningen av cognac.'],
    ['The major grape variety of the appellation ; it produces an acidic wine which favours the aromatic concentration of Cognac spirits. « Eaux de vie ».', 'Appellationens viktigaste druvsort ger ett friskt vin med syra, vilket gynnar den aromatiska koncentrationen i cognacens eaux-de-vie.'],
    ['The <b>COLOMBARD</b> and the <b>FOLLE BLANCHE</b>,', '<b>COLOMBARD</b> och <b>FOLLE BLANCHE</b>,'],
    ['The COLOMBARD and the FOLLE BLANCHE ,', 'COLOMBARD och FOLLE BLANCHE,'],
    ['These grape varieties represent only 1% of the vineyards in the appellation, and are renowned for their very aromatic and very intense « eaux-de-vie ».', 'Dessa druvsorter utgör bara 1 % av appellationens vingårdar och är kända för mycket aromatiska och intensiva eaux-de-vie.'],
    ['This diversity of grape varieties plays an important role in the complexity and aromatic richness of our Cognac.', 'Denna mångfald av druvsorter spelar en viktig roll för komplexiteten och den aromatiska rikedomen i vår cognac.'],
    ['Even though today our harvest is fully mechanized, it still requires human intervention and decisions in every stage of the harvest.', 'Även om skörden i dag är helt mekaniserad kräver varje steg fortfarande mänskliga beslut och ingripanden.'],
    ['This is an exciting time on the property. Our harvesting machine is equipped with an automated sorting table to remove all the unwanted plant debris: leaves, stalks, wood.', 'Det är en intensiv tid på egendomen. Vår skördemaskin har ett automatiskt sorteringsbord som tar bort oönskade växtdelar: blad, stjälkar och trä.'],
    ['The grape harvest is loaded by gravity into the presses from the top in order to respect the taste qualities of the grapes.', 'Druvorna fylls i pressarna uppifrån med gravitationens hjälp för att bevara deras smakmässiga kvalitet.'],
    ['The freshly squeezed grape juice ferments in thermoregulated stainless steel tanks for 24 hours, to guarantee optimal control of the natural fermentation process.', 'Den nypressade druvjuicen jäser i temperaturstyrda ståltankar under 24 timmar för optimal kontroll av den naturliga jäsningen.'],
    ['The Fire', 'Elden'],
    ['The fire', 'Elden'],
    ['of creation.', 'av skapandet.'],
    ['THE DISTILLATION', 'DESTILLATIONEN'],
    ['A DOUBLE<br />\r\nDISTILLATION', 'EN DUBBEL<br />\r\nDESTILLATION'],
    ['A DOUBLE<br />\nDISTILLATION', 'EN DUBBEL<br />\nDESTILLATION'],
    ['A DOUBLE DISTILLATION', 'EN DUBBEL DESTILLATION'],
    ['THE AGEING', 'LAGRINGEN'],
    ['double distillation', 'dubbel destillation'],
    ['La distillation mobile', 'Destillation mobil'],
    ['Double distillation mobile', 'Dubbel destillation mobil'],
    ['Le vieillissement mobile', 'Lagring mobil'],
    ['The distillation is an essential step in the production of our cognacs.', 'Destillationen är ett avgörande steg i framställningen av våra cognacs.'],
    ['All our senses are awakened during this winter period when the stills are lit day and night to produce our cognacs. The distillery takes on an incredible ambience. One enters with emotion and respect. Silence reigns.', 'Alla sinnen väcks under vintern när pannorna är tända dag och natt för att framställa våra cognacs. Destilleriet får en särskild atmosfär; man går in med känsla och respekt. Tystnaden råder.'],
    ['Only the roar of the gas burners heating the stills sing melodiously. The water trickles into the cooling pipe and the cognac into the barrel.', 'Endast gasbrännarnas dån under pannorna sjunger melodiskt. Vattnet porlar i kylröret och cognacen rinner ned i fatet.'],
    ['The atmosphere is humid and warm. The vapors are intense and intoxicating. The heat that emerges from the stills is intense.', 'Luften är fuktig och varm. Ångorna är intensiva och berusande. Värmen från pannorna är stark.'],
    ['We let ourselves be uplifted by the emotion and the pride of taking our product so far.', 'Vi låter oss bäras av känslan och stoltheten över att föra vår produkt så långt.'],
    ['The wines, once the fermentation is over, are distilled in order to obtain cognac.', 'När jäsningen är avslutad destilleras vinerna för att bli cognac.'],
    ['To qualify as certified Cognac, the wines have to be distilled twice in pot stills, called “Alambic Charentais”.', 'För att få kallas Cognac måste vinerna destilleras två gånger i kopparpannor, så kallade Alambic Charentais.'],
    ['On our property, we distill with small copper stills of 16hl and 20hl. Our cognacs are distilled with the lees in order to preserve their round and rich taste.', 'På egendomen destillerar vi i små kopparpannor på 16 hl och 20 hl. Våra cognacs destilleras på jästfällningen för att bevara en rund och rik smak.'],
    ['In the Léopold Croizet family, the art of distilling combines years of practice and consistently striving for excellence. The end result respects the tradition of our ancestors, a combination of powerful fruity spirits, typical of the fins bois appellation.', 'Hos Léopold Croizet förenar destillationens konst många års erfarenhet med en ständig strävan efter excellens. Resultatet respekterar våra förfäders tradition: kraftfulla, fruktiga eaux-de-vie, typiska för Fins Bois.'],
    ['After Distillation, our eaux-de-vie are ready to spend a long time ageing in barrels.', 'Efter destillationen är våra eaux-de-vie redo för en lång lagring på fat.'],
    ['With time, they will take on a beautiful amber color and extract the sweet and subtle aromas of the Oak which gives our cognac its intensity.', 'Med tiden får de en vacker bärnstensfärg och hämtar de söta, subtila aromerna ur eken som ger vår cognac sin intensitet.'],
    ['We take extra care when selecting our French Oak Barrels for the ageing of our cognac. Different grains of wood are used and barrels of different ages (new, young and old). This allows our cognac to achieve their highest aromatic potential.', 'Vi är mycket noggranna när vi väljer franska ekfat för lagringen av vår cognac. Olika trästrukturer och fat i olika åldrar används för att våra cognacs ska nå sin högsta aromatiska potential.'],
    ['The majority of our barrels are 350 liters as they allow the best exchange between the Cognac, the air and the wood. We also age it in different cellars which have different temperature and moisture levels allowing us to have a broader and more complex range of “eaux de vies”.', 'De flesta av våra fat rymmer 350 liter eftersom de ger det bästa utbytet mellan cognac, luft och trä. Vi lagrar också i olika källare med varierande temperatur och fuktighet, vilket ger oss ett bredare och mer komplext urval av eaux-de-vie.'],
    ['of senses.', 'av sinnen.'],
    ["L'assemblage", 'Assemblaget'],
    ['La mise en bouteille', 'Buteljeringen'],
    ['It is the subtle art of the cellar master who, like a perfumer’s nose, selects and produces blends of brandy of different ages to give them a constant quality year after year.', 'Det är källarmästarens subtila konst: likt en parfymörs näsa väljer och skapar han assemblage av eaux-de-vie i olika åldrar för att ge dem jämn kvalitet år efter år.'],
    ['This marriage brings balance and complexity to our cognacs. Over time, the secret of making cognac is passed on to the new generation, each bringing a subtlety to the know-how of the previous one. This gives the cognac Léopold Croizet its unique and exceptional character.', 'Denna förening ger balans och komplexitet åt våra cognacs. Med tiden förs hemligheten bakom cognac vidare till nästa generation, där varje generation tillför sin egen nyans till den föregåendes kunnande. Det ger cognacen Léopold Croizet dess unika och exceptionella karaktär.'],
    ['The bottling of our cognacs is done on the property. The vast majority is handmade as in the past. We take special care when dressing our bottles.', 'Buteljeringen av våra cognacs görs på egendomen. Det mesta utförs för hand som förr, och vi lägger särskild omsorg på flaskornas presentation.'],
    ['Our team ensures the quality of our stock and redoubles our vigilance in the control of bottles.', 'Vårt team säkerställer kvaliteten på vårt lager och är extra uppmärksamt vid kontrollen av flaskorna.'],
    ['in memory.', 'i minnet.'],
    ['of memory.', 'av minnet.'],
    ['The Cognacs LÉOPOLD CROIZET,', 'Cognacerna LÉOPOLD CROIZET,'],
    ['It’s a family matter.', 'det är en familjeangelägenhet.'],
    ['bordered by river and woods,', 'omgiven av flod och skog,'],
    ['handed down from generation', 'överlämnad från generation'],
    ['to generation.', 'till generation.'],
    ['Thanks to our records,', 'Tack vare våra arkiv,'],
    ['we can go back in time until 1714.', 'kan vi följa historien tillbaka till 1714.'],
    ['Various acts of marriage and sale.', 'Olika vigsel- och köpehandlingar.'],
    ['We find in this photo the marriage certificate of Pierre GANAN and Jeanne MASSON on February 3, 1750: 1st generation to live in the home of LANTIN.', 'På detta foto finns vigselbeviset för Pierre GANAN och Jeanne MASSON från den 3 februari 1750: den första generationen som bodde i Lantin.'],
    ['of François FOUCHÉ.', 'från François FOUCHÉ.'],
    ['Act of Sale of Property', 'Köpehandling för egendomen'],
    ['from François HUBERT', 'från François HUBERT'],
    ['from François HUBERT to his daughter', 'från François HUBERT till hans dotter'],
    ['från François HUBERT to his daughter', 'från François HUBERT till hans dotter'],
    ['to his daughter Rose HUBERT', 'till hans dotter Rose HUBERT'],
    ['and Jeanne GANAN', 'och Jeanne GANAN'],
    ['Deed of sale of the parcel', 'Köpehandling för parcellen'],
    ['«Bois de LANTIN» to François HUBERT', '«Bois de LANTIN» till François HUBERT'],
    ['in November 1850. Parcel still owned', 'i november 1850. Parcellen ägs fortfarande'],
    ['to the LÉOPOLD CROIZET family.', 'av familjen LÉOPOLD CROIZET.'],
    ['Deed of sale "of a piece of vines.', 'Köpehandling för "ett stycke vinmark.'],
    ['According to the Republican calendar', 'Enligt den republikanska kalendern'],
    ['which corresponds to April 28, 1799).', 'vilket motsvarar den 28 april 1799).'],
    ['LÉOPOLD CROIZET Frères cognac label,', 'Etikett för LÉOPOLD CROIZET Frères cognac,'],
    ['found in departmental archives', 'funnen i departementsarkiven'],
    ['Cognac trademark filings from 1945.', 'Registreringar av cognacvarumärken från 1945.'],
    ['Trademark registered by Marc, grandfather of Léopold Croizet,', 'Varumärke registrerat av Marc, Léopold Croizets farfar,'],
    ['and his brother Roger, from the Léopold Croizet family.', 'och hans bror Roger, från familjen Léopold Croizet.'],
    ['Aerial view of Lantin’s home', 'Flygbild över Lantin'],
    ['in the 1950s with the house', 'på 1950-talet med huset'],
    ['family and farm body', 'familjens byggnader och gårdslänga'],
    ['Marc FOUCHÉ, 7th generation', 'Marc FOUCHÉ, 7:e generationen'],
    ['of Léopold Croizet.', 'av familjen Léopold Croizet.'],
    ['Pierre (left), 8th generation, followed by Léopold and his son Paul (9th and 10th generation of family winemakers).', 'Pierre (till vänster), 8:e generationen, följd av Léopold och hans son Paul, 9:e och 10:e generationen familjevinodlare.'],
    ['Pierre relaunched the production of bottled cognac in the 1970s.', 'Pierre återlanserade produktionen av buteljerad cognac på 1970-talet.'],
    ['It is establishing itself in Asian markets, which today remain our number one market. We perpetuate his name through his brand and honor his memory.', 'Märket etablerade sig på asiatiska marknader, som än i dag är vår viktigaste marknad. Vi för hans namn vidare genom varumärket och hedrar hans minne.'],
    ['I am Léopold Croizet, I represent the 9th generation of winegrowers on the estate. I inherited it from my father who inherited it from his mother who herself inherited it from her father and so on&#8230; Our vineyard, planted mainly in the commune of Triac Lautrait, brings together 30 hectares around a farm typically Charente. Here we are in the heart of the village, Lantin, near Jarnac. It is a privileged land. It belongs to the Fins Bois cru and benefits from the clay-limestone limits of the lands of Champagne.', 'Jag är Léopold Croizet och representerar den 9:e generationen vinodlare på egendomen. Jag ärvde den av min far, som ärvde den av sin mor, som i sin tur ärvde den av sin far, och så fortsätter historien. Vår vingård, huvudsakligen planterad i kommunen Triac-Lautrait, omfattar 30 hektar runt en typisk charentais-gård. Här är vi i hjärtat av byn Lantin, nära Jarnac. Det är ett privilegierat terroir i Fins Bois cru med ler- och kalkjordar från Champagne-områdena.'],
    ['What is your work and its scope within Maison Léopold Croizet?', 'Vad består ditt arbete av inom Maison Léopold Croizet?'],
    ['Since 2001, I have taken my full place in the family adventure. I am a winemaker, distiller, master-blender. I spread the word to my friends and consumers of Léopold Croizet cognac. I am also an actor of the passage of time! Time is an essential element to be taken into account for the production of cognac. « It’s about letting time work, but being active! »', 'Sedan 2001 har jag tagit min fulla plats i familjeäventyret. Jag är vinodlare, destillatör och maître de chai. Jag berättar historien för mina vänner och för dem som njuter av Léopold Croizet cognac. Jag är också delaktig i tidens arbete: tiden är avgörande för framställningen av cognac. « Det handlar om att låta tiden arbeta, men att själv vara aktiv! »'],
    ['What major assets and know-how do you have ?', 'Vilka är era viktigaste styrkor och ert kunnande?'],
    ['First of all in the working method: our vineyard is fully converted to organic farming. I started the conversion as soon as I arrived on the estate. The entire vineyard is dedicated to the production of our cognacs which leaves me free choice on the conduct I wish to lead and the direction I wish to offer to my “eaux de vie”. We choose an old-fashioned culture with organic smoke and premature harvests to maintain good acidity and give elegant and aromatic “eaux de vie”. The distillation is carried out in two small potstills of 16hl and 20hl, those that my grandmother had installed! Our distillation method remains uncommon in the region, it comes from my father who himself got it from his mother: a family secret!', 'Först och främst vår arbetsmetod: hela vingården är omlagd till ekologisk odling. Jag började omställningen så snart jag kom till egendomen. Hela vingården är tillägnad produktionen av våra cognacs, vilket ger mig frihet att välja den riktning jag vill ge mina eaux-de-vie. Vi arbetar på gammalt vis med organisk gödsel och tidig skörd för att bevara en god syra och skapa eleganta, aromatiska eaux-de-vie. Destillationen sker i två små pannor på 16 hl och 20 hl, de som min mormor lät installera. Vår destillationsmetod är ovanlig i regionen; den kommer från min far, som själv lärde den av sin mor: en familjehemlighet.'],
    ['What are the values that take precedence and distinguish you from other brands?', 'Vilka värderingar kommer först och skiljer er från andra märken?'],
    ['Respect for tradition, values&#8230; For several generations my family has provided expertise and know-how in all stages of the production of cognac: from the vine to the blending, including of course the distillation. This mastery allows us to «nurture» and ensure an heritage for future generations. Be visionary, see further and ensure quality of products. My grandfather Marc launched his brand of cognac with his brother just after the second world war. It was a period of reconstruction in the country and we were recovering of several tough years. He was thinking big, he launched his business with some success and even won. I have a lot of anecdotes about my ancestors and it enriches my business vision and also give me motivation to prove myself to be worthy of it.', 'Respekt för tradition och värderingar. I flera generationer har min familj byggt upp expertis och kunnande i alla steg av cognacproduktionen: från vinrankan till assemblaget, självklart inklusive destillationen. Denna behärskning gör att vi kan vårda och säkra ett arv för kommande generationer. Man måste vara visionär, se längre fram och garantera produkternas kvalitet. Min farfar Marc lanserade sitt cognacmärke med sin bror strax efter andra världskriget, under en tid av återuppbyggnad. Han tänkte stort, byggde sin verksamhet med framgång och vann mark. Jag har många berättelser om mina förfäder; de berikar min syn på företaget och ger mig motivation att visa mig värdig arvet.'],
    ['Could you describe the particularity and the style of your cognacs ?', 'Kan du beskriva det särskilda i stilen hos era cognacs?'],
    ['Difficult for me to describe my cognacs &#8230; I prefer to make them taste, they speak for themselves! As I said earlier, each step is important to make a good cognac. The expertise I carry produces very fruity cognacs, typical of the Fins Bois cru. They are fragrant, round, mellow and easy to drink. This roundness comes mainly from a distillation on the lees. Our spirits then age in French oak barrels whose woods are selected from the best forests in France. This task now falls to my wife, who once worked in cooperage and who has a real passion for the interaction between wood and spirit. The blend of this diversity offers a range of very interesting aromas.', 'Det är svårt för mig att beskriva mina cognacs. Jag föredrar att låta dem smakas; de talar för sig själva. Som jag sa tidigare är varje steg viktigt för att skapa en bra cognac. Det kunnande jag för vidare ger mycket fruktiga cognacs, typiska för Fins Bois cru. De är doftande, runda, mjuka och lätta att dricka. Denna rundhet kommer främst från destillation på jästfällningen. Våra eaux-de-vie lagras sedan på franska ekfat där träet väljs från de bästa skogarna i Frankrike. Den uppgiften ligger nu hos min fru, som tidigare arbetade med tunnbinderi och har en stark passion för mötet mellan trä och sprit. Denna mångfald ger ett mycket intressant aromatiskt register.'],
  ],
  no: [
    ['A centuries-old know-how handed down from generation to generation', 'Et århundregammelt håndverk videreført fra generasjon til generasjon'],
    ['Many long years of aging were (are) indispensable', 'Mange lange års lagring var uunnværlige'],
    ['to develop this XO Exception.', 'for å utvikle denne XO Exception.'],
    ['Discover a very old Cognac characteristic of Fins Bois.', 'Oppdag en svært gammel cognac med tydelig Fins Bois-karakter.'],
    ['An exceptional and unique creation which is the pride', 'En enestående og unik kreasjon som er stoltheten'],
    ['of the LÉOPOLD CROIZET house and reveals', 'i huset LÉOPOLD CROIZET og avslører'],
    ['the excellence of our know-how.', 'det ypperste av vårt savoir-faire.'],
    ['a very old Cognac', 'en svært gammel cognac'],
    ['of Fins Bois.', 'fra Fins Bois.'],
    ['and unique,', 'og unik,'],
    ['the pride of the house', 'husets stolthet'],
    ['This Cognac reveals to you', 'Denne cognacen viser deg'],
    ['all the excellence', 'hele kvaliteten'],
    ['of our know-how.', 'av vårt savoir-faire.'],
    ['Discover the Extra Léopold Croizet', 'Oppdag Extra Léopold Croizet'],
    ['&#8230; and upward it', '&#8230; og videre oppover'],
    ['hazards don&#8217;t exist', 'tilfeldigheter finnes ikke'],
    ['LÉOPOLD CROIZET COGNAC FROM GENERATION TO GENERATION', 'LÉOPOLD CROIZET COGNAC FRA GENERASJON TIL GENERASJON'],
    ['I want to receive some news time to time', 'Jeg ønsker å motta nyheter fra dere fra tid til annen'],
    ['Léopold Croizet cognacs originate from a distinguished ancient line of winegrowers. We are situated in the privileged Cognac region called, (AOC) “Fins Bois Cru”, at the heart of the village of Triac lautrait, close to the Charente River, Come and discover our cognacs, soak up our identity and personality in an authentic atmosphere steeped in history.', 'Léopold Croizet cognac springer ut av en gammel og anerkjent vinbondefamilie. Vi ligger i det privilegerte cognacområdet Fins Bois, midt i landsbyen Triac-Lautrait, nær elven Charente. Kom og oppdag våre cognacer, vår identitet og personlighet i en autentisk atmosfære preget av historie.'],
    ['of a passion.', 'av en lidenskap.'],
    ['WORK IN THE VINEYARD', 'ARBEIDET I VINMARKEN'],
    ['THE GRAPE', 'DRUEN'],
    ['THE HARVEST', 'INNHØSTINGEN'],
    ['Le travail de la vigne mobile', 'Arbeidet i vinmarken mobil'],
    ['Le travail de la vigne', 'Arbeidet i vinmarken'],
    ['LE RAISIN', 'DRUEN'],
    ['LES VENDANGES', 'INNHØSTINGEN'],
    ['Making a quality cognac starts with a reflection on the environment and on time.', 'Å skape en cognac av høy kvalitet begynner med omtanke for miljøet og for tiden.'],
    ['The vine is a root anchored deep in the earth. It draws its resources there and will produce grapes over several decades.', 'Vinstokken er en rot dypt forankret i jorden. Der henter den sine ressurser og bærer druer gjennom flere tiår.'],
    ["The quality of the grapes is essential to produce cognac. Above all the love dedicated through one's work, the desire to impart a healthy vineyard, to inspire good work habits and to always question oneself every day is primordial.", 'Druenes kvalitet er avgjørende for å fremstille cognac. Først og fremst er kjærligheten til arbeidet, ønsket om å gi videre en sunn vinmark, gode arbeidsvaner og daglig ydmykhet helt sentralt.'],
    ['The vines are treated with respect for the soil, without chemical pesticides or herbicides. The management of the vine is thought out according to the plots and the type of soil. We do our best to obtain quality, healthy and aromatic grapes.', 'Vinstokkene dyrkes med respekt for jorden, uten kjemiske plantevernmidler eller ugressmidler. Arbeidet tilpasses parsellene og jordtypen. Vi gjør vårt beste for å få sunne, aromatiske druer av høy kvalitet.'],
    ['Our vineyard has been managed entirely using  organic farming techniques for 20 years.', 'Vinmarken vår har i 20 år vært drevet helt etter økologiske dyrkingsprinsipper.'],
    ['Our vineyard is made up of three grape varieties essential for making cognac.', 'Vinmarken vår består av tre druesorter som er avgjørende for fremstillingen av cognac.'],
    ['The major grape variety of the appellation ; it produces an acidic wine which favours the aromatic concentration of Cognac spirits. « Eaux de vie ».', 'Appellasjonens viktigste druesort gir en frisk vin med syre, som fremmer den aromatiske konsentrasjonen i cognacens eaux-de-vie.'],
    ['The <b>COLOMBARD</b> and the <b>FOLLE BLANCHE</b>,', '<b>COLOMBARD</b> og <b>FOLLE BLANCHE</b>,'],
    ['The COLOMBARD and the FOLLE BLANCHE ,', 'COLOMBARD og FOLLE BLANCHE,'],
    ['These grape varieties represent only 1% of the vineyards in the appellation, and are renowned for their very aromatic and very intense « eaux-de-vie ».', 'Disse druesortene utgjør bare 1 % av appellasjonens vinmarker og er kjent for svært aromatiske og intense eaux-de-vie.'],
    ['This diversity of grape varieties plays an important role in the complexity and aromatic richness of our Cognac.', 'Dette mangfoldet av druesorter spiller en viktig rolle for kompleksiteten og den aromatiske rikdommen i vår cognac.'],
    ['Even though today our harvest is fully mechanized, it still requires human intervention and decisions in every stage of the harvest.', 'Selv om innhøstingen i dag er fullt mekanisert, krever hvert trinn fortsatt menneskelige valg og inngrep.'],
    ['This is an exciting time on the property. Our harvesting machine is equipped with an automated sorting table to remove all the unwanted plant debris: leaves, stalks, wood.', 'Det er en intens tid på eiendommen. Høstmaskinen vår er utstyrt med et automatisk sorteringsbord som fjerner uønskede plantedeler: blader, stilker og tre.'],
    ['The grape harvest is loaded by gravity into the presses from the top in order to respect the taste qualities of the grapes.', 'Druene fylles i pressene ovenfra ved hjelp av tyngdekraften for å bevare smakskvaliteten.'],
    ['The freshly squeezed grape juice ferments in thermoregulated stainless steel tanks for 24 hours, to guarantee optimal control of the natural fermentation process.', 'Den nypressede druesaften gjærer i temperaturstyrte ståltanker i 24 timer for optimal kontroll av den naturlige gjæringen.'],
    ['The Fire', 'Ilden'],
    ['The fire', 'Ilden'],
    ['of creation.', 'av skapelsen.'],
    ['THE DISTILLATION', 'DESTILLASJONEN'],
    ['A DOUBLE<br />\r\nDISTILLATION', 'EN DOBBEL<br />\r\nDESTILLASJON'],
    ['A DOUBLE<br />\nDISTILLATION', 'EN DOBBEL<br />\nDESTILLASJON'],
    ['A DOUBLE DISTILLATION', 'EN DOBBEL DESTILLASJON'],
    ['THE AGEING', 'LAGRINGEN'],
    ['double distillation', 'dobbel destillasjon'],
    ['La distillation mobile', 'Destillasjon mobil'],
    ['Double distillation mobile', 'Dobbel destillasjon mobil'],
    ['Le vieillissement mobile', 'Lagring mobil'],
    ['The distillation is an essential step in the production of our cognacs.', 'Destillasjonen er et avgjørende trinn i fremstillingen av våre cognacer.'],
    ['All our senses are awakened during this winter period when the stills are lit day and night to produce our cognacs. The distillery takes on an incredible ambience. One enters with emotion and respect. Silence reigns.', 'Alle sanser vekkes i vinterperioden når pannene er tent dag og natt for å fremstille våre cognacer. Destilleriet får en helt spesiell stemning; man går inn med følelse og respekt. Stillheten råder.'],
    ['Only the roar of the gas burners heating the stills sing melodiously. The water trickles into the cooling pipe and the cognac into the barrel.', 'Bare bruset fra gassbrennerne under pannene synger melodisk. Vannet risler i kjølerøret og cognacen renner i fatet.'],
    ['The atmosphere is humid and warm. The vapors are intense and intoxicating. The heat that emerges from the stills is intense.', 'Luften er fuktig og varm. Dampene er intense og berusende. Varmen fra pannene er kraftig.'],
    ['We let ourselves be uplifted by the emotion and the pride of taking our product so far.', 'Vi lar oss løfte av følelsen og stoltheten over å føre produktet vårt så langt.'],
    ['The wines, once the fermentation is over, are distilled in order to obtain cognac.', 'Når gjæringen er over, destilleres vinene for å oppnå cognac.'],
    ['To qualify as certified Cognac, the wines have to be distilled twice in pot stills, called “Alambic Charentais”.', 'For å kunne kalles Cognac må vinene destilleres to ganger i kobberpanner kalt Alambic Charentais.'],
    ['On our property, we distill with small copper stills of 16hl and 20hl. Our cognacs are distilled with the lees in order to preserve their round and rich taste.', 'På eiendommen destillerer vi i små kobberpanner på 16 hl og 20 hl. Våre cognacer destilleres på bunnfallet for å bevare en rund og rik smak.'],
    ['In the Léopold Croizet family, the art of distilling combines years of practice and consistently striving for excellence. The end result respects the tradition of our ancestors, a combination of powerful fruity spirits, typical of the fins bois appellation.', 'Hos Léopold Croizet forener destillasjonskunsten mange års praksis med en konstant søken etter det ypperste. Resultatet respekterer forfedrenes tradisjon: kraftfulle, fruktige eaux-de-vie, typiske for Fins Bois.'],
    ['After Distillation, our eaux-de-vie are ready to spend a long time ageing in barrels.', 'Etter destillasjonen er våre eaux-de-vie klare for lang lagring på fat.'],
    ['With time, they will take on a beautiful amber color and extract the sweet and subtle aromas of the Oak which gives our cognac its intensity.', 'Med tiden får de en vakker ravfarge og henter de søte, subtile aromaene fra eiken som gir vår cognac sin intensitet.'],
    ['We take extra care when selecting our French Oak Barrels for the ageing of our cognac. Different grains of wood are used and barrels of different ages (new, young and old). This allows our cognac to achieve their highest aromatic potential.', 'Vi er svært nøye når vi velger franske eikefat til lagringen av vår cognac. Ulike tresorter og fat i ulike aldre brukes for at våre cognacer skal nå sitt høyeste aromatiske potensial.'],
    ['The majority of our barrels are 350 liters as they allow the best exchange between the Cognac, the air and the wood. We also age it in different cellars which have different temperature and moisture levels allowing us to have a broader and more complex range of “eaux de vies”.', 'De fleste fatene våre rommer 350 liter fordi de gir den beste utvekslingen mellom cognac, luft og tre. Vi lagrer også i ulike kjellere med forskjellige temperatur- og fuktighetsnivåer, noe som gir oss et bredere og mer komplekst utvalg av eaux-de-vie.'],
    ['of senses.', 'av sansene.'],
    ["L'assemblage", 'Assemblagen'],
    ['La mise en bouteille', 'Tappingen'],
    ['It is the subtle art of the cellar master who, like a perfumer’s nose, selects and produces blends of brandy of different ages to give them a constant quality year after year.', 'Det er kjellermesterens subtile kunst: som en parfymørs nese velger og sammensetter han eaux-de-vie i ulike aldre for å gi dem jevn kvalitet år etter år.'],
    ['This marriage brings balance and complexity to our cognacs. Over time, the secret of making cognac is passed on to the new generation, each bringing a subtlety to the know-how of the previous one. This gives the cognac Léopold Croizet its unique and exceptional character.', 'Denne foreningen gir balanse og kompleksitet til våre cognacer. Med tiden gis hemmeligheten bak cognac videre til neste generasjon, der hver generasjon tilfører sin nyanse til den forriges savoir-faire. Det gir cognacen Léopold Croizet sin unike og enestående karakter.'],
    ['The bottling of our cognacs is done on the property. The vast majority is handmade as in the past. We take special care when dressing our bottles.', 'Tappingen av våre cognacer skjer på eiendommen. Det aller meste gjøres for hånd som før, og vi legger særlig omtanke i flaskenes presentasjon.'],
    ['Our team ensures the quality of our stock and redoubles our vigilance in the control of bottles.', 'Teamet vårt sikrer kvaliteten på beholdningen og er ekstra oppmerksomt ved kontrollen av flaskene.'],
    ['in memory.', 'i minnet.'],
    ['of memory.', 'av minnet.'],
    ['The Cognacs LÉOPOLD CROIZET,', 'Cognacene LÉOPOLD CROIZET,'],
    ['It’s a family matter.', 'det er en familiesak.'],
    ['bordered by river and woods,', 'omkranset av elv og skog,'],
    ['handed down from generation', 'overlevert fra generasjon'],
    ['to generation.', 'til generasjon.'],
    ['Thanks to our records,', 'Takket være arkivene våre,'],
    ['we can go back in time until 1714.', 'kan vi følge historien tilbake til 1714.'],
    ['Various acts of marriage and sale.', 'Ulike vielses- og salgsdokumenter.'],
    ['We find in this photo the marriage certificate of Pierre GANAN and Jeanne MASSON on February 3, 1750: 1st generation to live in the home of LANTIN.', 'På dette bildet finner vi vielsesattesten til Pierre GANAN og Jeanne MASSON fra 3. februar 1750: første generasjon som bodde i Lantin-hjemmet.'],
    ['of François FOUCHÉ.', 'fra François FOUCHÉ.'],
    ['Act of Sale of Property', 'Skjøte på eiendommen'],
    ['from François HUBERT', 'fra François HUBERT'],
    ['from François HUBERT to his daughter', 'fra François HUBERT til hans datter'],
    ['fra François HUBERT to his daughter', 'fra François HUBERT til hans datter'],
    ['to his daughter Rose HUBERT', 'til hans datter Rose HUBERT'],
    ['and Jeanne GANAN', 'og Jeanne GANAN'],
    ['Deed of sale of the parcel', 'Skjøte på parsellen'],
    ['«Bois de LANTIN» to François HUBERT', '«Bois de LANTIN» til François HUBERT'],
    ['in November 1850. Parcel still owned', 'i november 1850. Parsellen eies fortsatt'],
    ['to the LÉOPOLD CROIZET family.', 'av familien LÉOPOLD CROIZET.'],
    ['Deed of sale "of a piece of vines.', 'Skjøte på "et stykke vinmark.'],
    ['According to the Republican calendar', 'Ifølge den republikanske kalenderen'],
    ['which corresponds to April 28, 1799).', 'som tilsvarer 28. april 1799).'],
    ['LÉOPOLD CROIZET Frères cognac label,', 'Etikett for LÉOPOLD CROIZET Frères cognac,'],
    ['found in departmental archives', 'funnet i departementsarkivene'],
    ['Cognac trademark filings from 1945.', 'Registreringer av cognacmerker fra 1945.'],
    ['Trademark registered by Marc, grandfather of Léopold Croizet,', 'Varemerke registrert av Marc, bestefaren til Léopold Croizet,'],
    ['and his brother Roger, from the Léopold Croizet family.', 'og hans bror Roger, fra familien Léopold Croizet.'],
    ['Aerial view of Lantin’s home', 'Flyfoto av Lantin-hjemmet'],
    ['in the 1950s with the house', 'på 1950-tallet med huset'],
    ['family and farm body', 'familiebygningene og gårdsanlegget'],
    ['Marc FOUCHÉ, 7th generation', 'Marc FOUCHÉ, 7. generasjon'],
    ['of Léopold Croizet.', 'av familien Léopold Croizet.'],
    ['Pierre (left), 8th generation, followed by Léopold and his son Paul (9th and 10th generation of family winemakers).', 'Pierre (til venstre), 8. generasjon, etterfulgt av Léopold og hans sønn Paul, 9. og 10. generasjon av familiens vinbønder.'],
    ['Pierre relaunched the production of bottled cognac in the 1970s.', 'Pierre relanserte produksjonen av cognac på flaske på 1970-tallet.'],
    ['It is establishing itself in Asian markets, which today remain our number one market. We perpetuate his name through his brand and honor his memory.', 'Merket etablerte seg i asiatiske markeder, som i dag fortsatt er vårt viktigste marked. Vi viderefører hans navn gjennom merkevaren og hedrer hans minne.'],
    ['I am Léopold Croizet, I represent the 9th generation of winegrowers on the estate. I inherited it from my father who inherited it from his mother who herself inherited it from her father and so on&#8230; Our vineyard, planted mainly in the commune of Triac Lautrait, brings together 30 hectares around a farm typically Charente. Here we are in the heart of the village, Lantin, near Jarnac. It is a privileged land. It belongs to the Fins Bois cru and benefits from the clay-limestone limits of the lands of Champagne.', 'Jeg er Léopold Croizet og representerer 9. generasjon vinbønder på eiendommen. Jeg arvet den fra min far, som arvet den fra sin mor, som igjen arvet den fra sin far, og slik fortsetter historien. Vinmarken vår, hovedsakelig plantet i kommunen Triac-Lautrait, omfatter 30 hektar rundt en typisk charentais gård. Her er vi i hjertet av landsbyen Lantin, nær Jarnac. Dette er et privilegert terroir i Fins Bois cru med leir- og kalkholdige jordgrenser fra Champagne-områdene.'],
    ['What is your work and its scope within Maison Léopold Croizet?', 'Hva består arbeidet ditt av hos Maison Léopold Croizet?'],
    ['Since 2001, I have taken my full place in the family adventure. I am a winemaker, distiller, master-blender. I spread the word to my friends and consumers of Léopold Croizet cognac. I am also an actor of the passage of time! Time is an essential element to be taken into account for the production of cognac. « It’s about letting time work, but being active! »', 'Siden 2001 har jeg tatt min fulle plass i familieeventyret. Jeg er vinbonde, destillatør og maître de chai. Jeg forteller historien til venner og til dem som nyter Léopold Croizet cognac. Jeg er også en aktør i tidens arbeid: tid er avgjørende i produksjonen av cognac. « Det handler om å la tiden arbeide, men selv være aktiv! »'],
    ['What major assets and know-how do you have ?', 'Hvilke viktigste styrker og hvilket savoir-faire har dere?'],
    ['First of all in the working method: our vineyard is fully converted to organic farming. I started the conversion as soon as I arrived on the estate. The entire vineyard is dedicated to the production of our cognacs which leaves me free choice on the conduct I wish to lead and the direction I wish to offer to my “eaux de vie”. We choose an old-fashioned culture with organic smoke and premature harvests to maintain good acidity and give elegant and aromatic “eaux de vie”. The distillation is carried out in two small potstills of 16hl and 20hl, those that my grandmother had installed! Our distillation method remains uncommon in the region, it comes from my father who himself got it from his mother: a family secret!', 'Først og fremst arbeidsmetoden vår: hele vinmarken er omlagt til økologisk dyrking. Jeg startet omleggingen så snart jeg kom til eiendommen. Hele vinmarken er dedikert til produksjonen av våre cognacer, noe som gir meg frihet til å velge retningen jeg vil gi mine eaux-de-vie. Vi arbeider på gammeldags vis med organisk gjødsel og tidlig innhøsting for å bevare god syre og skape elegante, aromatiske eaux-de-vie. Destillasjonen skjer i to små panner på 16 hl og 20 hl, de som bestemoren min fikk installert. Destillasjonsmetoden vår er sjelden i regionen; den kommer fra min far, som selv lærte den av sin mor: en familiehemmelighet.'],
    ['What are the values that take precedence and distinguish you from other brands?', 'Hvilke verdier kommer først og skiller dere fra andre merker?'],
    ['Respect for tradition, values&#8230; For several generations my family has provided expertise and know-how in all stages of the production of cognac: from the vine to the blending, including of course the distillation. This mastery allows us to «nurture» and ensure an heritage for future generations. Be visionary, see further and ensure quality of products. My grandfather Marc launched his brand of cognac with his brother just after the second world war. It was a period of reconstruction in the country and we were recovering of several tough years. He was thinking big, he launched his business with some success and even won. I have a lot of anecdotes about my ancestors and it enriches my business vision and also give me motivation to prove myself to be worthy of it.', 'Respekt for tradisjon og verdier. I flere generasjoner har familien min samlet ekspertise og savoir-faire i alle trinn av cognacproduksjonen: fra vinstokken til assemblagen, naturligvis også destillasjonen. Denne beherskelsen gjør det mulig å nære og sikre en arv for kommende generasjoner. Man må være visjonær, se lenger frem og sikre kvaliteten på produktene. Bestefaren min Marc lanserte cognacmerket sitt sammen med broren like etter andre verdenskrig, i en tid med gjenoppbygging. Han tenkte stort, skapte virksomheten med suksess og vant frem. Jeg har mange historier om forfedrene mine; de beriker mitt syn på virksomheten og gir meg motivasjon til å være arven verdig.'],
    ['Could you describe the particularity and the style of your cognacs ?', 'Kan du beskrive det særegne ved stilen i deres cognacer?'],
    ['Difficult for me to describe my cognacs &#8230; I prefer to make them taste, they speak for themselves! As I said earlier, each step is important to make a good cognac. The expertise I carry produces very fruity cognacs, typical of the Fins Bois cru. They are fragrant, round, mellow and easy to drink. This roundness comes mainly from a distillation on the lees. Our spirits then age in French oak barrels whose woods are selected from the best forests in France. This task now falls to my wife, who once worked in cooperage and who has a real passion for the interaction between wood and spirit. The blend of this diversity offers a range of very interesting aromas.', 'Det er vanskelig for meg å beskrive mine cognacer. Jeg foretrekker å la dem smakes; de taler for seg selv. Som sagt er hvert trinn viktig for å lage en god cognac. Kompetansen jeg fører videre gir svært fruktige cognacer, typiske for Fins Bois cru. De er duftende, runde, myke og lette å drikke. Denne rundheten kommer særlig fra destillasjon på bunnfallet. Våre eaux-de-vie lagres deretter på franske eikefat, der treverket er valgt fra de beste skogene i Frankrike. Denne oppgaven ligger nå hos min kone, som tidligere arbeidet med bøkkeri og har en ekte lidenskap for møtet mellom tre og brennevin. Mangfoldet gir et svært interessant aromatisk register.'],
  ],
};

try {
  await access(path.join(ROOT, 'en'));
} catch {
  throw new Error('The English source directory is required before generating Nordic pages.');
}

for (const locale of Object.keys(nordicConfigs)) {
  await rm(path.join(ROOT, locale), { recursive: true, force: true });
  await cp(path.join(ROOT, 'en'), path.join(ROOT, locale), { recursive: true });

  const files = await walkHtml(path.join(ROOT, locale));
  for (const file of files) {
    const route = routeForFile(file);
    let html = await readFile(file, 'utf8');
    html = localizeCopiedEnglishPage(html, locale, route);
    await writeFile(file, html, 'utf8');
  }
}

const allFiles = await walkHtml(ROOT);
const existingRoutes = new Set(allFiles.map(routeForFile));
for (const file of allFiles) {
  const route = routeForFile(file);
  const html = await readFile(file, 'utf8');
  await writeFile(file, replaceLanguageSwitcher(html, route, existingRoutes), 'utf8');
}

console.log('Nordic locale pages generated: da, sv, no');

async function walkHtml(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkHtml(full));
    } else if (entry.name === 'index.html') {
      files.push(full);
    }
  }
  return files;
}

function routeForFile(file) {
  const relative = path.relative(ROOT, file).replace(/\\/g, '/');
  if (relative === 'index.html') return '/';
  return `/${relative.replace(/index\.html$/, '')}`;
}

function localizeCopiedEnglishPage(html, locale, route) {
  const config = nordicConfigs[locale];
  let next = html
    .replace(/<html([^>]*)lang=["'][^"']*["']([^>]*)>/i, `<html$1lang="${config.htmlLang}"$2>`)
    .replaceAll(`${DEPLOY_BASE}/en/`, `${DEPLOY_BASE}/${locale}/`)
    .replaceAll(`${PUBLIC_ORIGIN}/en/`, `${PUBLIC_ORIGIN}/${locale}/`)
    .replaceAll('menu-menu-principal-anglais', `menu-menu-principal-${locale}`)
    .replaceAll('menu-pied-de-page-en', `menu-pied-de-page-${locale}`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/collection\//g, `href="${DEPLOY_BASE}/${locale}/collection/`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/(la-matiere|le-feu|lalchimie|le-temps|leopold-croizet|rencontre|pierre-croizet-cocktails)\//g, `href="${DEPLOY_BASE}/${locale}/$1/`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/panier\//g, `href="${DEPLOY_BASE}/${locale}/cart/`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/mon-compte\//g, `href="${DEPLOY_BASE}/${locale}/my-account/`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/commander\//g, `href="${DEPLOY_BASE}/${locale}/checkout/`)
    .replace(/href="http:\/\/cognacg\.cluster028\.hosting\.ovh\.net\/wordpress\/produit\/([^/]+)\/"/g, (match, slug) => (
      `href="${DEPLOY_BASE}/${locale}/collection/${slug}/"`
    ))
    .replace(/href="http:\/\/cognacg\.cluster028\.hosting\.ovh\.net\/wordpress\/(la-matiere|le-feu|lalchimie|le-temps|rencontre)\/"/g, (match, slug) => (
      `href="${DEPLOY_BASE}/${locale}/${slug}/"`
    ));

  next = localizeEditorialCopy(next, locale);

  for (const [from, to] of config.translations) next = next.split(from).join(to);
  for (const [from, to] of Object.entries(config.sensory)) next = next.split(`>${from}<`).join(`>${to}<`);

  next = localizeAgeGate(next, locale);
  next = localizeProductCopy(next, locale, route);
  next = localizeCocktails(next, locale);
  next = repairTechnicalStrings(next);

  return next.replace(
    /<div class="texte-medaille">\s*[\s\S]*?\s*<\/div>/,
    `<div class="texte-medaille">\n      ${config.footerAward}\n    </div>`,
  );
}

function repairTechnicalStrings(html) {
  return html
    .replace(/\bloadingTiden\b/g, 'loadingTime')
    .replace(/\bDateTidenFormat\b/g, 'DateTimeFormat')
    .replace(/\bchinaTidenZones\b/g, 'chinaTimeZones')
    .replace(/"addressLand"/g, '"addressCountry"')
    .replace(/(?:LÉOPOLD\s+)+((?:Etiket|Etikett) (?:for|för) )/g, '$1')
    .replace(/(?:LÉOPOLD\s+){2,}CROIZET/g, 'LÉOPOLD CROIZET');
}

function localizeEditorialCopy(html, locale) {
  let next = html;
  for (const [from, to] of editorialCopy[locale] ?? []) {
    next = next.split(from).join(to);
  }
  return next;
}

function localizeAgeGate(html, locale) {
  const copy = {
    da: {
      access: 'For at få adgang til vores site skal du have lovlig alder til at købe og nyde alkohol i henhold til lovgivningen i dit bopælsland eller din region.',
      fallback: 'Hvis der ikke findes en sådan lovgivning i dit land eller din region, skal du være mindst 21 år.',
      terms: 'Du accepterer vores <a href="#">generelle brugsbetingelser</a> og erklærer at have læst vores',
      privacy: '<a href="#">politik for personoplysninger og cookies</a>',
    },
    sv: {
      access: 'För att få tillgång till vår webbplats måste du ha laglig ålder för att köpa och konsumera alkohol enligt lagstiftningen i ditt land eller din region.',
      fallback: 'Om sådan lagstiftning saknas i ditt land eller din region måste du vara minst 21 år.',
      terms: 'Du accepterar våra <a href="#">allmänna användarvillkor</a> och bekräftar att du har läst vår',
      privacy: '<a href="#">policy för personuppgifter och cookies</a>',
    },
    no: {
      access: 'For å få tilgang til nettstedet vårt må du ha lovlig alder til å kjøpe og nyte alkohol i henhold til lovgivningen i landet eller regionen der du bor.',
      fallback: 'Hvis slik lovgivning ikke finnes i landet eller regionen din, må du være minst 21 år.',
      terms: 'Du godtar våre <a href="#">generelle bruksvilkår</a> og bekrefter at du har lest vår',
      privacy: '<a href="#">policy for personopplysninger og cookies</a>',
    },
  }[locale];

  return html
    .replace(/Pour accéder à notre site, vous devez être en âge d’acheter et de consommer de l’alcool conformément à la législation en vigueur dans votre pays\/région\s*de résidence\./g, copy.access)
    .replace(/Si cette législation n’existe pas dans votre pays\/région,\s*vous devez avoir au moins 21 ans\./g, copy.fallback)
    .replace(/Vous acceptez nos <a href="#">Conditions générales d'utilisation<\/a> et déclarez avoir lu notre/g, copy.terms)
    .replace(/<a href="#">Charte de données personnelles & Cookies<\/a>/g, copy.privacy);
}

function localizeProductCopy(html, locale, route) {
  const slug = matchFirst(route, /^\/(?:da|sv|no)\/collection\/([^/]+)\//);
  if (!slug) return html;
  const target = nordicConfigs[locale].productCopy[slug];
  const source = englishProductCopy[slug];
  if (!target || !source) return html;

  return html
    .replace(source.note, target.note)
    .replace(source.view, target.view)
    .replace(source.nose, target.nose)
    .replace(source.mouth, target.mouth);
}

function localizeCocktails(html, locale) {
  if (!html.includes('container-page cocktails')) return html;
  const replacements = {
    da: [
      ['1 piece of sugar', '1 stykke sukker'],
      ['2 dashes of bitter Angostura', '2 stænk Angostura bitter'],
      ['1 twist of lemon', '1 citronskal'],
      ['1 twist of orange', '1 appelsinskal'],
      ['Melt the sugar in the glass, sprinkle it with Angostura.', 'Smelt sukkeret i glasset og dryp Angostura over.'],
      ['Pour in the sparkling water, then crush the sugar with a pestle until it melts<br />\r\ncompletely.', 'Tilsæt danskvand, og knus derefter sukkeret med en støder, til det er helt opløst.'],
      ['Decorate your glass with a twist of orange.', 'Pynt glasset med appelsinskal.'],
      ['Your Old Fashioned cocktail is ready!', 'Din Old Fashioned er klar.'],
      ['2 cl cane sugar syrup', '2 cl rørsukkersirup'],
      ['6 mint leaves', '6 mynteblade'],
      ['1/2 lime', '1/2 lime'],
      ['sparkling water', 'danskvand'],
      ['crushed ice', 'knust is'],
      ['Place the whole mint leaves at the bottom of each glass.', 'Læg hele mynteblade i bunden af hvert glas.'],
      ['Add the cognac', 'Tilsæt cognac'],
      ['Complete with sparkling water.', 'Top op med danskvand.'],
      ['Mix .', 'Rør rundt.'],
      ['Straw or no straw, it’s ready', 'Med eller uden sugerør: den er klar.'],
      ['4 thin slices of ginger', '4 tynde skiver ingefær'],
      ['1 lime zest', '1 limeskal'],
      ['6 cl lemonade', '6 cl lemonade'],
      ['1 cucumber peel', '1 agurkeskræl'],
      ['Your Summit is ready', 'Din Summit er klar.'],
      ['Pour in the danskvand, then crush the sugar with a pestle until it melts<br />\r\ncompletely.', 'Tilsæt danskvand, og knus derefter sukkeret med en støder, til det er helt opløst.'],
      ['Add 1 or 2 ice cubes and 2.5 cl of cognac and stir with a mixing spoon for 15', 'Tilsæt 1 eller 2 isterninger og 2,5 cl cognac, og rør med en barske i 15'],
      ['Add ice at your convenience and pour in the remaining cognac (2.5 cl).', 'Tilsæt is efter smag, og hæld resten af cognacen i (2,5 cl).'],
      ['Stir for another ten seconds.', 'Rør i yderligere ti sekunder.'],
      ['Place your ice cubes in a tea towel and then using a rolling pin, crush the ice.', 'Læg isterningerne i et viskestykke, og knus isen med en kagerulle.'],
      ['Pour into a bowl and store in the freezer.', 'Hæld isen i en skål, og opbevar den i fryseren.'],
      ['Cut the lemon in half and then each half lemon into 6 pieces.', 'Skær citronen over, og skær derefter hver halvdel i 6 stykker.'],
      ['Add the 6 pieces of lemon to each glass (1/2 lemon).', 'Læg 6 citronstykker i hvert glas (1/2 citron).'],
      ['Add the cane sugar syrup.', 'Tilsæt rørsukkersirup.'],
      ['Crush the lemon with a special cocktail pestle.', 'Knus citronen med en cocktailstøder.'],
      ['Add the crushed ice leaving 2 cm of space.', 'Tilsæt knust is, og lad 2 cm være fri.'],
      ['Add the knust is leaving 2 cm of space.', 'Tilsæt knust is, og lad 2 cm være fri.'],
      ['Complete with danskvand.', 'Top op med danskvand.'],
      ['Add the ginger slices and lime zest.', 'Tilsæt ingefærskiver og limeskal.'],
      ['Add 2 cl of cognac and lightly squeeze 2 to 3 times the ginger with a pestle.', 'Tilsæt 2 cl cognac, og pres ingefæren let 2 til 3 gange med en støder.'],
      ['Place ice cubes and stir for 5 seconds with a spoon.', 'Tilsæt isterninger, og rør i 5 sekunder med en ske.'],
      ['Pour again 2 cl of Cognac and lengthen with lemonade.', 'Hæld igen 2 cl cognac i, og forlæng med lemonade.'],
      ['Add the cucumber peel.', 'Tilsæt agurkeskrællen.'],
      ['Stir with a spoon.', 'Rør med en ske.'],
    ],
    sv: [
      ['1 piece of sugar', '1 sockerbit'],
      ['2 dashes of bitter Angostura', '2 stänk Angostura bitter'],
      ['1 twist of lemon', '1 citronskal'],
      ['1 twist of orange', '1 apelsinskal'],
      ['Melt the sugar in the glass, sprinkle it with Angostura.', 'Smält sockret i glaset och stänk Angostura över.'],
      ['Decorate your glass with a twist of orange.', 'Garnera glaset med apelsinskal.'],
      ['Your Old Fashioned cocktail is ready!', 'Din Old Fashioned är klar.'],
      ['2 cl cane sugar syrup', '2 cl rörsockersirap'],
      ['6 mint leaves', '6 myntablad'],
      ['sparkling water', 'kolsyrat vatten'],
      ['crushed ice', 'krossad is'],
      ['Place the whole mint leaves at the bottom of each glass.', 'Lägg hela myntablad i botten av varje glas.'],
      ['Add the cognac', 'Tillsätt cognac'],
      ['Complete with sparkling water.', 'Toppa med kolsyrat vatten.'],
      ['Mix .', 'Rör om.'],
      ['Straw or no straw, it’s ready', 'Med eller utan sugrör: den är klar.'],
      ['4 thin slices of ginger', '4 tunna skivor ingefära'],
      ['1 lime zest', '1 limeskal'],
      ['1 cucumber peel', '1 gurkskal'],
      ['Your Summit is ready', 'Din Summit är klar.'],
      ['Pour in the kolsyrat vatten, then crush the sugar with a pestle until it melts<br />\r\ncompletely.', 'Häll i kolsyrat vatten och krossa sedan sockret med en muddler tills det är helt upplöst.'],
      ['Pour in the sparkling water, then crush the sugar with a pestle until it melts<br />\r\ncompletely.', 'Häll i kolsyrat vatten och krossa sedan sockret med en muddler tills det är helt upplöst.'],
      ['Add 1 or 2 ice cubes and 2.5 cl of cognac and stir with a mixing spoon for 15', 'Tillsätt 1 eller 2 iskuber och 2,5 cl cognac, och rör med en barsked i 15'],
      ['Add ice at your convenience and pour in the remaining cognac (2.5 cl).', 'Tillsätt is efter smak och häll i resten av cognacen (2,5 cl).'],
      ['Stir for another ten seconds.', 'Rör i ytterligare tio sekunder.'],
      ['Place your ice cubes in a tea towel and then using a rolling pin, crush the ice.', 'Lägg iskuberna i en kökshandduk och krossa isen med en kavel.'],
      ['Pour into a bowl and store in the freezer.', 'Häll över i en skål och förvara i frysen.'],
      ['Cut the lemon in half and then each half lemon into 6 pieces.', 'Dela citronen och skär sedan varje halva i 6 bitar.'],
      ['Add the 6 pieces of lemon to each glass (1/2 lemon).', 'Lägg 6 citronbitar i varje glas (1/2 citron).'],
      ['Add the cane sugar syrup.', 'Tillsätt rörsockersirapen.'],
      ['Crush the lemon with a special cocktail pestle.', 'Muddla citronen med en cocktailmuddler.'],
      ['Add the crushed ice leaving 2 cm of space.', 'Tillsätt krossad is och lämna 2 cm fritt.'],
      ['Add the krossad is leaving 2 cm of space.', 'Tillsätt krossad is och lämna 2 cm fritt.'],
      ['Complete with kolsyrat vatten.', 'Toppa med kolsyrat vatten.'],
      ['Add the ginger slices and lime zest.', 'Tillsätt ingefärsskivor och limeskal.'],
      ['Add 2 cl of cognac and lightly squeeze 2 to 3 times the ginger with a pestle.', 'Tillsätt 2 cl cognac och pressa ingefäran lätt 2 till 3 gånger med en muddler.'],
      ['Place ice cubes and stir for 5 seconds with a spoon.', 'Lägg i iskuber och rör i 5 sekunder med en sked.'],
      ['Pour again 2 cl of Cognac and lengthen with lemonade.', 'Häll i ytterligare 2 cl cognac och fyll upp med lemonade.'],
      ['Add the cucumber peel.', 'Tillsätt gurkskalet.'],
      ['Stir with a spoon.', 'Rör med en sked.'],
    ],
    no: [
      ['1 piece of sugar', '1 sukkerbit'],
      ['2 dashes of bitter Angostura', '2 dråper Angostura bitter'],
      ['1 twist of lemon', '1 sitronskall'],
      ['1 twist of orange', '1 appelsinskall'],
      ['Melt the sugar in the glass, sprinkle it with Angostura.', 'Smelt sukkeret i glasset og drypp Angostura over.'],
      ['Decorate your glass with a twist of orange.', 'Pynt glasset med appelsinskall.'],
      ['Your Old Fashioned cocktail is ready!', 'Din Old Fashioned er klar.'],
      ['2 cl cane sugar syrup', '2 cl rørsukkersirup'],
      ['6 mint leaves', '6 mynteblader'],
      ['sparkling water', 'kullsyrevann'],
      ['crushed ice', 'knust is'],
      ['Place the whole mint leaves at the bottom of each glass.', 'Legg hele mynteblader i bunnen av hvert glass.'],
      ['Add the cognac', 'Tilsett cognac'],
      ['Complete with sparkling water.', 'Topp med kullsyrevann.'],
      ['Mix .', 'Rør rundt.'],
      ['Straw or no straw, it’s ready', 'Med eller uten sugerør: den er klar.'],
      ['4 thin slices of ginger', '4 tynne skiver ingefær'],
      ['1 lime zest', '1 limeskall'],
      ['1 cucumber peel', '1 agurkskall'],
      ['Your Summit is ready', 'Din Summit er klar.'],
      ['Pour in the kullsyrevann, then crush the sugar with a pestle until it melts<br />\r\ncompletely.', 'Hell i kullsyrevann, og knus deretter sukkeret med en muddler til det er helt oppløst.'],
      ['Pour in the sparkling water, then crush the sugar with a pestle until it melts<br />\r\ncompletely.', 'Hell i kullsyrevann, og knus deretter sukkeret med en muddler til det er helt oppløst.'],
      ['Add 1 or 2 ice cubes and 2.5 cl of cognac and stir with a mixing spoon for 15', 'Tilsett 1 eller 2 isbiter og 2,5 cl cognac, og rør med en barskje i 15'],
      ['Add ice at your convenience and pour in the remaining cognac (2.5 cl).', 'Tilsett is etter smak, og hell i resten av cognacen (2,5 cl).'],
      ['Stir for another ten seconds.', 'Rør i ytterligere ti sekunder.'],
      ['Place your ice cubes in a tea towel and then using a rolling pin, crush the ice.', 'Legg isbitene i et kjøkkenhåndkle, og knus isen med en kjevle.'],
      ['Pour into a bowl and store in the freezer.', 'Hell isen i en bolle, og sett den i fryseren.'],
      ['Cut the lemon in half and then each half lemon into 6 pieces.', 'Del sitronen i to, og skjær deretter hver halvdel i 6 biter.'],
      ['Add the 6 pieces of lemon to each glass (1/2 lemon).', 'Legg 6 sitronbiter i hvert glass (1/2 sitron).'],
      ['Add the cane sugar syrup.', 'Tilsett rørsukkersirup.'],
      ['Crush the lemon with a special cocktail pestle.', 'Knus sitronen med en cocktailmuddler.'],
      ['Add the crushed ice leaving 2 cm of space.', 'Tilsett knust is, og la 2 cm være igjen.'],
      ['Add the knust is leaving 2 cm of space.', 'Tilsett knust is, og la 2 cm være igjen.'],
      ['Complete with kullsyrevann.', 'Topp med kullsyrevann.'],
      ['Add the ginger slices and lime zest.', 'Tilsett ingefærskiver og limeskall.'],
      ['Add 2 cl of cognac and lightly squeeze 2 to 3 times the ginger with a pestle.', 'Tilsett 2 cl cognac, og press ingefæren lett 2 til 3 ganger med en muddler.'],
      ['Place ice cubes and stir for 5 seconds with a spoon.', 'Legg i isbiter, og rør i 5 sekunder med en skje.'],
      ['Pour again 2 cl of Cognac and lengthen with lemonade.', 'Hell i ytterligere 2 cl cognac, og fyll opp med lemonade.'],
      ['Add the cucumber peel.', 'Tilsett agurkskallet.'],
      ['Stir with a spoon.', 'Rør med en skje.'],
    ],
  }[locale];

  let next = html;
  for (const [from, to] of replacements) next = next.split(from).join(to);
  return next;
}

function replaceLanguageSwitcher(html, route, existingRoutes) {
  const key = normalizedRouteKey(route);
  const currentLocale = languageForRoute(route);
  const currentLabel = locales.find((locale) => locale.code === currentLocale)?.label || 'Lang';
  const items = locales.map((locale, index) => {
    const localized = routeForLocale(locale.code, key);
    const href = existingRoutes.has(localized) ? localized : routeForLocale(locale.code, '/');
    const classes = [
      'wpml-ls-slot-shortcode_actions',
      'wpml-ls-item',
      `wpml-ls-item-${locale.hreflang}`,
      index === 0 ? 'wpml-ls-first-item' : '',
      index === locales.length - 1 ? 'wpml-ls-last-item' : '',
      locale.code === currentLocale ? 'wpml-ls-current-language' : '',
      'wpml-ls-item-legacy-list-horizontal',
    ].filter(Boolean).join(' ');
    return `<li class="${classes}"><a href="${DEPLOY_BASE}${href}" class="wpml-ls-link" hreflang="${locale.hreflang}"><span class="wpml-ls-display">${locale.label}</span></a></li>`;
  }).join('');

  const block = `<div class="wpml-ls-statics-shortcode_actions wpml-ls wpml-ls-legacy-list-horizontal lc-language-menu">\n\t<a href="#language-menu" class="wpml-ls-link lc-language-menu-toggle" role="button" aria-haspopup="true" aria-expanded="false"><span class="wpml-ls-display lc-language-menu-current">${currentLabel}</span></a>\n\t<ul class="lc-language-menu-list" hidden>${items}</ul>\n</div>`;
  const regex = /<div class="wpml-ls-statics-shortcode_actions wpml-ls wpml-ls-legacy-list-horizontal(?: [^"]*)?">[\s\S]*?<\/ul>\s*<\/div>/;
  if (regex.test(html)) return html.replace(regex, block);
  return html;
}

function normalizedRouteKey(route) {
  if (route === '/') return '/';
  if (route === '/en/' || route === '/ru/' || route === '/da/' || route === '/sv/' || route === '/no/') return '/';
  if (route === '/en/shop/' || route === '/ru/a-faire/' || /^\/(?:da|sv|no)\/shop\/$/.test(route)) return '/collection/';
  if (route === '/en/cart/' || route === '/ru/panier-2/' || /^\/(?:da|sv|no)\/cart\/$/.test(route)) return '/panier/';
  if (route === '/en/checkout/' || route === '/ru/validation/' || /^\/(?:da|sv|no)\/checkout\/$/.test(route)) return '/commander/';
  if (route === '/en/my-account/' || route === '/ru/mon-compte-2/' || /^\/(?:da|sv|no)\/my-account\/$/.test(route)) return '/mon-compte/';
  if (route === '/ru/%d0%bb%d0%b5%d0%be%d0%bf%d0%be%d0%bb%d1%8c%d0%b4%d0%b0-%d0%ba%d1%80%d1%83%d0%b0%d0%b7%d0%b5/') return '/leopold-croizet/';
  if (route === '/en/categorie-produit/non-classe-en/' || route === '/ru/categorie-produit/non-classe-ru/' || /^\/(?:da|sv|no)\/categorie-produit\/non-classe-en\/$/.test(route)) return '/categorie-produit/non-classe/';
  const prefixMatch = route.match(/^\/(?:en|da|sv|no)(\/.*)$/);
  if (prefixMatch) return prefixMatch[1];
  const ruMatch = route.match(/^\/ru(\/.*)$/);
  if (ruMatch) return ruMatch[1];
  return route;
}

function routeForLocale(locale, key) {
  if (locale === 'fr') return key;
  if (locale === 'en') {
    if (key === '/') return '/en/';
    if (key === '/collection/') return '/en/shop/';
    if (key === '/panier/') return '/en/cart/';
    if (key === '/commander/') return '/en/checkout/';
    if (key === '/mon-compte/') return '/en/my-account/';
    if (key === '/categorie-produit/non-classe/') return '/en/categorie-produit/non-classe-en/';
    return `/en${key}`;
  }
  if (locale === 'ru') {
    if (key === '/') return '/ru/';
    if (key === '/collection/') return '/ru/a-faire/';
    if (key === '/panier/') return '/ru/panier-2/';
    if (key === '/commander/') return '/ru/validation/';
    if (key === '/mon-compte/') return '/ru/mon-compte-2/';
    if (key === '/categorie-produit/non-classe/') return '/ru/categorie-produit/non-classe-ru/';
    if (key === '/leopold-croizet/') return '/ru/%d0%bb%d0%b5%d0%be%d0%bf%d0%be%d0%bb%d1%8c%d0%b4%d0%b0-%d0%ba%d1%80%d1%83%d0%b0%d0%b7%d0%b5/';
    return `/ru${key}`;
  }
  if (key === '/') return `/${locale}/`;
  if (key === '/collection/') return `/${locale}/shop/`;
  if (key === '/panier/') return `/${locale}/cart/`;
  if (key === '/commander/') return `/${locale}/checkout/`;
  if (key === '/mon-compte/') return `/${locale}/my-account/`;
  if (key === '/categorie-produit/non-classe/') return `/${locale}/categorie-produit/non-classe-en/`;
  return `/${locale}${key}`;
}

function languageForRoute(route) {
  const match = route.match(/^\/(en|ru|da|sv|no)\//);
  return match ? match[1] : 'fr';
}

function matchFirst(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : '';
}
