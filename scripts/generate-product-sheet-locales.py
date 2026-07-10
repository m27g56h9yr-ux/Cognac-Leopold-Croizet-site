#!/usr/bin/env python3
"""Generate localized tasting-sheet PDFs from the prepared product sheets."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "static-assets" / "assets" / "product-sheets"
PUBLIC_DIR = ROOT / "assets" / "product-sheets"
TMP_DIR = ROOT / "tmp" / "product-sheet-locales"
RAW_DIR = TMP_DIR / "raw"
BG_DIR = TMP_DIR / "backgrounds"

PAGE_WIDTH = 595.28
PAGE_HEIGHT = 841.89
FONT_PATH = Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf")
FONT = "LCArialUnicode"
BG_DPI = 130

PDFTOPPM_CANDIDATES = [
    shutil.which("pdftoppm"),
    "/Users/leopold/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pdftoppm",
]
GS_CANDIDATES = [
    shutil.which("gs"),
    "/opt/homebrew/bin/gs",
]
ICC_CANDIDATES = [
    "/opt/homebrew/Cellar/ghostscript/10.07.1/share/ghostscript/iccprofiles/srgb.icc",
    "/opt/homebrew/Cellar/ghostscript/10.07.1/share/ghostscript/iccprofiles/default_rgb.icc",
]

LOCALES = {
    "fr": {
        "file_label": "fr-fiche-degustation",
        "lang_name": "français",
        "notes": "Notes de dégustation",
        "aromas": "Repères aromatiques",
        "color": "Couleur",
        "nose": "Nez",
        "palate": "Bouche",
        "finish": "Finale",
        "appellation_cognac": "Appellation Cognac Fins Bois contrôlée",
        "appellation_pineau": "Appellation Pineau des Charentes contrôlée",
        "subject": "Fiche de dégustation",
    },
    "en": {
        "file_label": "en-tasting-sheet",
        "lang_name": "English",
        "notes": "Tasting notes",
        "aromas": "Aromatic markers",
        "color": "Color",
        "nose": "Nose",
        "palate": "Palate",
        "finish": "Finish",
        "appellation_cognac": "Controlled Cognac Fins Bois appellation",
        "appellation_pineau": "Controlled Pineau des Charentes appellation",
        "subject": "Tasting sheet",
    },
    "ru": {
        "file_label": "ru-degustation-sheet",
        "lang_name": "русский",
        "notes": "Дегустационные ноты",
        "aromas": "Ароматические ориентиры",
        "color": "Цвет",
        "nose": "Аромат",
        "palate": "Вкус",
        "finish": "Послевкусие",
        "appellation_cognac": "Контролируемое наименование Cognac Fins Bois",
        "appellation_pineau": "Контролируемое наименование Pineau des Charentes",
        "subject": "Дегустационная карта",
    },
    "da": {
        "file_label": "da-smageark",
        "lang_name": "dansk",
        "notes": "Smagenoter",
        "aromas": "Aromatiske pejlemærker",
        "color": "Farve",
        "nose": "Duft",
        "palate": "Smag",
        "finish": "Eftersmag",
        "appellation_cognac": "Kontrolleret appellation Cognac Fins Bois",
        "appellation_pineau": "Kontrolleret appellation Pineau des Charentes",
        "subject": "Smageark",
    },
    "sv": {
        "file_label": "sv-provningsblad",
        "lang_name": "svenska",
        "notes": "Provningsnoter",
        "aromas": "Aromatiska markörer",
        "color": "Färg",
        "nose": "Doft",
        "palate": "Smak",
        "finish": "Avslut",
        "appellation_cognac": "Kontrollerad appellation Cognac Fins Bois",
        "appellation_pineau": "Kontrollerad appellation Pineau des Charentes",
        "subject": "Provningsblad",
    },
    "no": {
        "file_label": "no-smaksark",
        "lang_name": "norsk",
        "notes": "Smaksnotater",
        "aromas": "Aromatiske kjennetegn",
        "color": "Farge",
        "nose": "Duft",
        "palate": "Smak",
        "finish": "Avslutning",
        "appellation_cognac": "Kontrollert appellasjon Cognac Fins Bois",
        "appellation_pineau": "Kontrollert appellasjon Pineau des Charentes",
        "subject": "Smaksark",
    },
    "zh": {
        "file_label": "zh-pinjiansheet",
        "lang_name": "简体中文",
        "notes": "品鉴记录",
        "aromas": "香气标记",
        "color": "色泽",
        "nose": "香气",
        "palate": "口感",
        "finish": "余韵",
        "appellation_cognac": "干邑 Fins Bois 法定产区",
        "appellation_pineau": "Pineau des Charentes 法定产区",
        "subject": "品鉴资料",
    },
}

PRODUCTS = [
    {
        "slug": "vs",
        "source": "cognac-leopold-croizet-vs-product-sheet.pdf",
        "stem": "cognac-leopold-croizet-vs",
        "title": "VS",
        "kind": "cognac",
        "volume": "40 % vol. / 70 cl",
        "texts": {
            "fr": {
                "description": "Cognac jeune et puissant. Le VS se caractérise par sa fraîcheur : poire, pêche, fleur de vigne et premiers tanins du bois. Idéal en cocktails ou sur glace.",
                "aromas": ["Bois de chêne", "Brioche", "Fleur de vigne", "Pêche", "Poire", "Vanille"],
                "color": "Jaune or / jaune paille.",
                "nose": "Arômes de fruits frais, poire et pêche, puis fruits compotés comme pommes au four et raisins secs dorés.",
                "palate": "Subtil mélange de fraîcheur et de fruité, suivi par des notes briochées et vanillées.",
                "finish": "Fraîcheur fruitée de raisin frais et de poire.",
            },
            "en": {
                "description": "A young, powerful Cognac. VS is defined by freshness: pear, peach, vine flower and the first oak tannins. Ideal in cocktails or over ice.",
                "aromas": ["Oak wood", "Brioche", "Vine flower", "Peach", "Pear", "Vanilla"],
                "color": "Golden yellow / pale straw yellow.",
                "nose": "Fresh fruit aromas, pear and peach, followed by baked apple and golden raisin notes.",
                "palate": "A subtle mix of freshness and fruit, rounded by brioche and vanilla notes.",
                "finish": "Fresh, fruity finish of grape and pear.",
            },
            "ru": {
                "description": "Молодой и выразительный Cognac. VS отличается свежестью: груша, персик, цвет виноградной лозы и первые дубовые танины. Подходит для коктейлей и подачи со льдом.",
                "aromas": ["Дуб", "Бриошь", "Цвет лозы", "Персик", "Груша", "Ваниль"],
                "color": "Золотисто-желтый / соломенный.",
                "nose": "Свежие фрукты, груша и персик, затем печеное яблоко и золотистый изюм.",
                "palate": "Тонкое сочетание свежести и фруктов с округлыми нотами бриоши и ванили.",
                "finish": "Свежий фруктовый финал с виноградом и грушей.",
            },
            "da": {
                "description": "En ung og kraftfuld Cognac. VS kendetegnes af friskhed: pære, fersken, vinblomst og de første egetanniner. Ideel i cocktails eller med is.",
                "aromas": ["Egetræ", "Brioche", "Vinblomst", "Fersken", "Pære", "Vanilje"],
                "color": "Gyldengul / strågul.",
                "nose": "Friske frugtaromaer af pære og fersken, efterfulgt af bagt æble og gyldne rosiner.",
                "palate": "Fin blanding af friskhed og frugt, rundet af brioche- og vaniljenoter.",
                "finish": "Frisk, frugtig eftersmag af drue og pære.",
            },
            "sv": {
                "description": "En ung och kraftfull Cognac. VS präglas av friskhet: päron, persika, vinblomma och de första ektonerna. Idealisk i cocktails eller med is.",
                "aromas": ["Ek", "Brioche", "Vinblomma", "Persika", "Päron", "Vanilj"],
                "color": "Guldgul / halmgul.",
                "nose": "Friska fruktaromer av päron och persika, följt av bakat äpple och gyllene russin.",
                "palate": "Subtil kombination av friskhet och frukt med runda toner av brioche och vanilj.",
                "finish": "Frisk, fruktig avslutning med druva och päron.",
            },
            "no": {
                "description": "En ung og kraftfull Cognac. VS kjennetegnes av friskhet: pære, fersken, vinblomst og de første eiketanninene. Ideell i cocktails eller med is.",
                "aromas": ["Eik", "Brioche", "Vinblomst", "Fersken", "Pære", "Vanilje"],
                "color": "Gyldengul / strågul.",
                "nose": "Friske fruktaromaer av pære og fersken, etterfulgt av bakt eple og gylne rosiner.",
                "palate": "Fin blanding av friskhet og frukt, avrundet av brioche og vanilje.",
                "finish": "Frisk, fruktig avslutning med drue og pære.",
            },
            "zh": {
                "description": "年轻而有力量的干邑。VS 以清新感见长：梨、桃、葡萄花香与初现的橡木单宁。适合调制鸡尾酒，也可加冰饮用。",
                "aromas": ["橡木", "布里欧修", "葡萄花", "桃子", "梨", "香草"],
                "color": "金黄色 / 稻草黄。",
                "nose": "新鲜水果香气，梨与桃子，并带有烤苹果和金色葡萄干气息。",
                "palate": "清新与果味细腻交织，随后呈现布里欧修和香草的圆润感。",
                "finish": "新鲜葡萄与梨的清爽果味余韵。",
            },
        },
    },
    {
        "slug": "vsop",
        "source": "cognac-leopold-croizet-vsop-product-sheet.pdf",
        "stem": "cognac-leopold-croizet-vsop",
        "title": "VSOP",
        "kind": "cognac",
        "volume": "40 % vol. / 70 cl",
        "texts": {
            "fr": {
                "description": "Léopold Croizet VSOP est un cognac rond et gourmand. Les premières années en fûts lui donnent des notes compotées de prune et d'abricot, une touche vanillée et une finale fraîche de clou de girofle.",
                "aromas": ["Abricot sec", "Clou de girofle", "Prune", "Rose", "Vanille"],
                "color": "Jaune doré.",
                "nose": "Équilibré et rond : bois de chêne et vanille, avec une touche de fruits compotés, pruneau et abricot.",
                "palate": "Riche et ample, avec un beau caractère fruité typique du cru Fins Bois.",
                "finish": "Fraîche, marquée par le clou de girofle.",
            },
            "en": {
                "description": "Léopold Croizet VSOP is round and generous. Its first years in cask bring stewed plum and apricot notes, a vanilla touch and a fresh clove finish.",
                "aromas": ["Dried apricot", "Clove", "Plum", "Rose", "Vanilla"],
                "color": "Golden yellow.",
                "nose": "Balanced and rounded: oak and vanilla with stewed fruit notes of prune and apricot.",
                "palate": "Rich and ample, with the fruit character typical of the Fins Bois cru.",
                "finish": "Fresh, marked by clove.",
            },
            "ru": {
                "description": "Léopold Croizet VSOP - округлый и гастрономичный Cognac. Первые годы в бочках раскрывают компотированные сливы и абрикос, ванильный оттенок и свежий финал с гвоздикой.",
                "aromas": ["Сушеный абрикос", "Гвоздика", "Слива", "Роза", "Ваниль"],
                "color": "Золотисто-желтый.",
                "nose": "Сбалансированный и округлый: дуб и ваниль, с нотами чернослива и абрикоса.",
                "palate": "Богатый и широкий вкус с фруктовым характером, типичным для Fins Bois.",
                "finish": "Свежий финал с акцентом гвоздики.",
            },
            "da": {
                "description": "Léopold Croizet VSOP er rund og indbydende. De første år på fad giver noter af syltet blomme og abrikos, et strejf af vanilje og en frisk finish med nellike.",
                "aromas": ["Tørret abrikos", "Nellike", "Blomme", "Rose", "Vanilje"],
                "color": "Gyldengul.",
                "nose": "Balanceret og rund: eg og vanilje med noter af sveske og abrikos.",
                "palate": "Rig og fyldig med en frugtig karakter, der er typisk for Fins Bois.",
                "finish": "Frisk, præget af nellike.",
            },
            "sv": {
                "description": "Léopold Croizet VSOP är rund och generös. De första åren på fat ger toner av kompott på plommon och aprikos, en vaniljton och en frisk avslutning med kryddnejlika.",
                "aromas": ["Torkad aprikos", "Kryddnejlika", "Plommon", "Ros", "Vanilj"],
                "color": "Guldgul.",
                "nose": "Balanserad och rund: ek och vanilj med toner av katrinplommon och aprikos.",
                "palate": "Rik och fyllig med fruktig karaktär typisk för Fins Bois.",
                "finish": "Frisk, präglad av kryddnejlika.",
            },
            "no": {
                "description": "Léopold Croizet VSOP er rund og innbydende. De første årene på fat gir toner av kompott av plomme og aprikos, et preg av vanilje og en frisk avslutning med nellik.",
                "aromas": ["Tørket aprikos", "Nellik", "Plomme", "Rose", "Vanilje"],
                "color": "Gyldengul.",
                "nose": "Balansert og rund: eik og vanilje med toner av sviske og aprikos.",
                "palate": "Rik og fyldig med fruktig karakter typisk for Fins Bois.",
                "finish": "Frisk, preget av nellik.",
            },
            "zh": {
                "description": "Léopold Croizet VSOP 圆润而馥郁。最初数年的橡木桶陈酿带来李子和杏子的果酱感、香草气息，以及丁香般清新的收尾。",
                "aromas": ["杏干", "丁香", "李子", "玫瑰", "香草"],
                "color": "金黄色。",
                "nose": "平衡而圆润：橡木与香草，并有西梅和杏子的果酱香。",
                "palate": "丰润饱满，展现 Fins Bois 产区典型的果味个性。",
                "finish": "清新，带丁香气息。",
            },
        },
    },
    {
        "slug": "napoleon",
        "source": "cognac-leopold-croizet-napoleon-product-sheet.pdf",
        "stem": "cognac-leopold-croizet-napoleon",
        "title": "Napoléon",
        "kind": "cognac",
        "volume": "40 % vol. / 70 cl",
        "texts": {
            "fr": {
                "description": "Un vieillissement généreux en barriques lui confère de belles notes de fruits secs, de bois chaud, de vanille et de toffee. Finale longue et poivrée.",
                "aromas": ["Amande", "Bois chaud vanillé", "Cacahuète", "Noisette", "Poire", "Toffee"],
                "color": "Jaune orangé.",
                "nose": "Le vieillissement en barrique laisse apparaître les premières notes boisées et vanillées.",
                "palate": "De fins tanins de chêne se lient aux fruits secs : amande, noisette et noix.",
                "finish": "Équilibrée, légèrement poivrée et mentholée.",
            },
            "en": {
                "description": "Generous ageing in cask brings dried fruit, warm wood, vanilla and toffee notes. The finish is long and peppery.",
                "aromas": ["Almond", "Warm vanilla wood", "Peanut", "Hazelnut", "Pear", "Toffee"],
                "color": "Orange-yellow.",
                "nose": "Cask ageing reveals the first woody and vanilla notes.",
                "palate": "Fine oak tannins bind with dried fruit: almond, hazelnut and walnut.",
                "finish": "Balanced, lightly peppery and mentholated.",
            },
            "ru": {
                "description": "Щедрая выдержка в бочках придает ноты сухофруктов, теплого дерева, ванили и тоффи. Финал долгий и перцовый.",
                "aromas": ["Миндаль", "Теплое ванильное дерево", "Арахис", "Фундук", "Груша", "Тоффи"],
                "color": "Оранжево-желтый.",
                "nose": "Выдержка в бочке раскрывает первые древесные и ванильные ноты.",
                "palate": "Тонкие дубовые танины соединяются с сухофруктами: миндалем, фундуком и орехом.",
                "finish": "Сбалансированный, слегка перцовый и ментоловый.",
            },
            "da": {
                "description": "Generøs lagring på fade giver noter af tørret frugt, varmt træ, vanilje og toffee. Eftersmagen er lang og peberkrydret.",
                "aromas": ["Mandel", "Varmt vaniljetræ", "Jordnød", "Hasselnød", "Pære", "Toffee"],
                "color": "Orangegul.",
                "nose": "Fadlagringen åbner for de første træ- og vaniljenoter.",
                "palate": "Fine egetanniner møder tørret frugt: mandel, hasselnød og valnød.",
                "finish": "Balanceret, let pebret og mentolfrisk.",
            },
            "sv": {
                "description": "Generös fatlagring ger toner av torkad frukt, varmt trä, vanilj och toffee. Avslutningen är lång och pepprig.",
                "aromas": ["Mandel", "Varmt vaniljträ", "Jordnöt", "Hasselnöt", "Päron", "Toffee"],
                "color": "Orangegul.",
                "nose": "Fatlagringen lyfter fram de första trä- och vaniljtonerna.",
                "palate": "Fina ektanniner möter torkad frukt: mandel, hasselnöt och valnöt.",
                "finish": "Balanserad, lätt pepprig och mentolfrisk.",
            },
            "no": {
                "description": "Generøs fatlagring gir toner av tørket frukt, varmt treverk, vanilje og toffee. Avslutningen er lang og pepperpreget.",
                "aromas": ["Mandel", "Varmt vaniljetre", "Peanøtt", "Hasselnøtt", "Pære", "Toffee"],
                "color": "Oransjegul.",
                "nose": "Fatlagringen åpner for de første tre- og vaniljetonene.",
                "palate": "Fine eiketanniner møter tørket frukt: mandel, hasselnøtt og valnøtt.",
                "finish": "Balansert, lett pepperpreget og mentolfrisk.",
            },
            "zh": {
                "description": "充足的橡木桶陈酿赋予干果、温暖木质、香草和太妃糖气息。余韵悠长，带胡椒感。",
                "aromas": ["杏仁", "温暖香草木质", "花生", "榛子", "梨", "太妃糖"],
                "color": "橙黄色。",
                "nose": "桶陈带出初现的木质与香草气息。",
                "palate": "细腻橡木单宁与干果交织：杏仁、榛子和核桃。",
                "finish": "平衡，微带胡椒和薄荷清凉感。",
            },
        },
    },
    {
        "slug": "xo",
        "source": "cognac-leopold-croizet-xo-product-sheet.pdf",
        "stem": "cognac-leopold-croizet-xo",
        "title": "XO",
        "kind": "cognac",
        "volume": "40 % vol. / 70 cl",
        "texts": {
            "fr": {
                "description": "Notre Cognac XO est bien structuré, avec déjà une belle rondeur. Cerise noire et litchi ouvrent la bouche, puis iris, fleurs séchées, cuir et tabac prolongent le rancio.",
                "aromas": ["Cerise noire", "Cuir", "Fleurs d'iris", "Fleurs séchées", "Litchi", "Rancio", "Tabac"],
                "color": "Ambre clair.",
                "nose": "Nez élaboré et équilibré, belle association de notes fruitées, boisées et épicées.",
                "palate": "Corps bien structuré avec une douceur née d'un long passage en bois de chêne.",
                "finish": "Fraîche, marquée par le clou de girofle.",
            },
            "en": {
                "description": "Our XO Cognac is well structured and already beautifully rounded. Black cherry and lychee open the palate before iris, dried flowers, leather and tobacco carry the rancio.",
                "aromas": ["Black cherry", "Leather", "Iris flowers", "Dried flowers", "Lychee", "Rancio", "Tobacco"],
                "color": "Light amber.",
                "nose": "Refined and balanced, combining fruity, woody and spicy notes.",
                "palate": "Well-structured body with softness born from long ageing in oak.",
                "finish": "Fresh, marked by clove.",
            },
            "ru": {
                "description": "Наш Cognac XO хорошо структурирован и уже обладает красивой округлостью. Черная вишня и личи открывают вкус, затем ирис, сухие цветы, кожа и табак поддерживают rancio.",
                "aromas": ["Черная вишня", "Кожа", "Ирис", "Сухие цветы", "Личи", "Rancio", "Табак"],
                "color": "Светлый янтарь.",
                "nose": "Выверенный и сбалансированный аромат с фруктовыми, древесными и пряными нотами.",
                "palate": "Хорошо структурированное тело с мягкостью, рожденной долгой выдержкой в дубе.",
                "finish": "Свежий, с акцентом гвоздики.",
            },
            "da": {
                "description": "Vores XO Cognac er velstruktureret og allerede smukt rund. Sort kirsebær og litchi åbner smagen, før iris, tørrede blomster, læder og tobak bærer rancio-præget.",
                "aromas": ["Sort kirsebær", "Læder", "Irisblomster", "Tørrede blomster", "Litchi", "Rancio", "Tobak"],
                "color": "Lys rav.",
                "nose": "Forfinet og balanceret med frugtige, træagtige og krydrede noter.",
                "palate": "Velstruktureret krop med blødhed fra lang lagring på eg.",
                "finish": "Frisk, præget af nellike.",
            },
            "sv": {
                "description": "Vår XO Cognac är välstrukturerad och redan vackert rund. Svart körsbär och litchi öppnar smaken innan iris, torkade blommor, läder och tobak bär rancio-karaktären.",
                "aromas": ["Svart körsbär", "Läder", "Irisblommor", "Torkade blommor", "Litchi", "Rancio", "Tobak"],
                "color": "Ljus bärnsten.",
                "nose": "Förfinad och balanserad med fruktiga, träiga och kryddiga toner.",
                "palate": "Välstrukturerad kropp med mjukhet från lång lagring på ek.",
                "finish": "Frisk, präglad av kryddnejlika.",
            },
            "no": {
                "description": "Vår XO Cognac er velstrukturert og allerede vakkert rund. Svart kirsebær og litchi åpner smaken før iris, tørkede blomster, lær og tobakk bærer rancio-preget.",
                "aromas": ["Svart kirsebær", "Lær", "Irisblomster", "Tørkede blomster", "Litchi", "Rancio", "Tobakk"],
                "color": "Lys rav.",
                "nose": "Raffinert og balansert med fruktige, treaktige og krydrede toner.",
                "palate": "Velstrukturert kropp med mykhet fra lang lagring på eik.",
                "finish": "Frisk, preget av nellik.",
            },
            "zh": {
                "description": "这款 XO 干邑结构良好，已呈现迷人的圆润感。黑樱桃与荔枝开启口感，随后鸢尾、干花、皮革和烟草延展出 rancio 韵味。",
                "aromas": ["黑樱桃", "皮革", "鸢尾花", "干花", "荔枝", "Rancio", "烟草"],
                "color": "浅琥珀色。",
                "nose": "精致而平衡，融合果香、木质和香料气息。",
                "palate": "结构良好，长时间橡木陈酿带来柔和质感。",
                "finish": "清新，带丁香气息。",
            },
        },
    },
    {
        "slug": "xo-exception",
        "source": "cognac-leopold-croizet-xo-exception-product-sheet.pdf",
        "stem": "cognac-leopold-croizet-xo-exception",
        "title": "XO Exception",
        "kind": "cognac",
        "volume": "40 % vol. / 70 cl",
        "texts": {
            "fr": {
                "description": "De nombreuses années de vieillissement ont été nécessaires pour élaborer ce XO Exception. Fruits secs, fruits confits, vieux bois, cannelle et tabac composent une bouche intense.",
                "aromas": ["Bois", "Cannelle", "Gingembre confit", "Pruneau", "Tabac", "Vanille"],
                "color": "Ambre doré.",
                "nose": "Poires douces, fleurs sauvages et épices chaudes, évoluant vers les fruits confits.",
                "palate": "Gourmande et riche, avec une explosion de saveurs et d'arômes épicés.",
                "finish": "Épicée de noix de muscade et de cannelle.",
            },
            "en": {
                "description": "Many years of ageing were needed to craft this XO Exception. Dried fruit, candied fruit, old wood, cinnamon and tobacco shape an intense palate.",
                "aromas": ["Wood", "Cinnamon", "Candied ginger", "Prune", "Tobacco", "Vanilla"],
                "color": "Golden amber.",
                "nose": "Sweet pears, wild flowers and warm spices, evolving toward candied fruit.",
                "palate": "Generous and rich, with an explosion of spicy flavors and aromas.",
                "finish": "Spiced with nutmeg and cinnamon.",
            },
            "ru": {
                "description": "Для создания XO Exception потребовались многие годы выдержки. Сухофрукты, цукаты, старое дерево, корица и табак формируют интенсивный вкус.",
                "aromas": ["Дерево", "Корица", "Имбирные цукаты", "Чернослив", "Табак", "Ваниль"],
                "color": "Золотистый янтарь.",
                "nose": "Сладкие груши, полевые цветы и теплые специи, переходящие в цукаты.",
                "palate": "Щедрый и насыщенный вкус со взрывом пряных ароматов.",
                "finish": "Пряный финал с мускатным орехом и корицей.",
            },
            "da": {
                "description": "Mange års lagring var nødvendig for at skabe denne XO Exception. Tørret frugt, kandiseret frugt, gammelt træ, kanel og tobak former en intens smag.",
                "aromas": ["Træ", "Kanel", "Kandiseret ingefær", "Sveske", "Tobak", "Vanilje"],
                "color": "Gylden rav.",
                "nose": "Søde pærer, vilde blomster og varme krydderier, der udvikler sig mod kandiseret frugt.",
                "palate": "Fyldig og rig med en eksplosion af krydrede smage og aromaer.",
                "finish": "Krydret med muskatnød og kanel.",
            },
            "sv": {
                "description": "Många års lagring krävdes för att skapa denna XO Exception. Torkad frukt, kanderad frukt, gammalt trä, kanel och tobak formar en intensiv smak.",
                "aromas": ["Trä", "Kanel", "Kanderad ingefära", "Katrinplommon", "Tobak", "Vanilj"],
                "color": "Gyllene bärnsten.",
                "nose": "Söta päron, vilda blommor och varma kryddor som utvecklas mot kanderad frukt.",
                "palate": "Generös och rik med en explosion av kryddiga smaker och aromer.",
                "finish": "Kryddig med muskot och kanel.",
            },
            "no": {
                "description": "Mange års lagring var nødvendig for å skape denne XO Exception. Tørket frukt, kandisert frukt, gammelt treverk, kanel og tobakk former en intens smak.",
                "aromas": ["Treverk", "Kanel", "Kandisert ingefær", "Sviske", "Tobakk", "Vanilje"],
                "color": "Gylden rav.",
                "nose": "Søte pærer, ville blomster og varme krydder som utvikler seg mot kandisert frukt.",
                "palate": "Fyldig og rik med en eksplosjon av krydrede smaker og aromaer.",
                "finish": "Krydret med muskatnøtt og kanel.",
            },
            "zh": {
                "description": "XO Exception 需要多年陈酿方能成形。干果、蜜饯水果、老木、肉桂和烟草共同塑造强烈而深邃的口感。",
                "aromas": ["木质", "肉桂", "糖渍姜", "西梅", "烟草", "香草"],
                "color": "金色琥珀。",
                "nose": "甜梨、野花和温暖香料，逐渐转向蜜饯水果。",
                "palate": "丰盈而浓郁，香料风味与香气奔涌而出。",
                "finish": "肉豆蔻与肉桂的香料余韵。",
            },
        },
    },
    {
        "slug": "valentine",
        "source": "cognac-leopold-croizet-valentine-xo-product-sheet.pdf",
        "stem": "cognac-leopold-croizet-valentine-xo",
        "title": "Valentine XO",
        "kind": "cognac",
        "volume": "40 % vol. / 35 cl",
        "texts": {
            "fr": {
                "description": "Sur le Cognac Valentine, le temps n'a pas d'emprise. Ce XO est une gourmandise : noix, cerise, chocolat, cannelle et gingembre parfument le nez et le palais.",
                "aromas": ["Cannelle", "Chocolat", "Gingembre", "Cerise", "Noix"],
                "color": "Ambre clair et scintillant.",
                "nose": "Riche et gourmand, avec des notes de chocolat, gingembre et cannelle.",
                "palate": "Ronde et gourmande, avec des notes de Christmas pudding, cerise noire et chocolat.",
                "finish": "Intense et fruitée.",
            },
            "en": {
                "description": "Time has no hold over Valentine. This XO is indulgent: walnut, cherry, chocolate, cinnamon and ginger perfume both nose and palate.",
                "aromas": ["Cinnamon", "Chocolate", "Ginger", "Cherry", "Walnut"],
                "color": "Clear, shimmering amber.",
                "nose": "Rich and generous, with chocolate, ginger and cinnamon notes.",
                "palate": "Round and indulgent, evoking Christmas pudding, black cherry and chocolate.",
                "finish": "Intense and fruity.",
            },
            "ru": {
                "description": "Время не властно над Valentine. Этот XO полон удовольствия: грецкий орех, вишня, шоколад, корица и имбирь раскрываются в аромате и вкусе.",
                "aromas": ["Корица", "Шоколад", "Имбирь", "Вишня", "Грецкий орех"],
                "color": "Светлый сияющий янтарь.",
                "nose": "Богатый и гастрономичный, с нотами шоколада, имбиря и корицы.",
                "palate": "Округлый и щедрый, напоминает рождественский пудинг, черную вишню и шоколад.",
                "finish": "Интенсивный и фруктовый.",
            },
            "da": {
                "description": "Tiden har ikke greb om Valentine. Denne XO er ren nydelse: valnød, kirsebær, chokolade, kanel og ingefær præger både duft og smag.",
                "aromas": ["Kanel", "Chokolade", "Ingefær", "Kirsebær", "Valnød"],
                "color": "Klar, glitrende rav.",
                "nose": "Rig og indbydende med noter af chokolade, ingefær og kanel.",
                "palate": "Rund og generøs med associationer til Christmas pudding, sort kirsebær og chokolade.",
                "finish": "Intens og frugtig.",
            },
            "sv": {
                "description": "Tiden får inget grepp om Valentine. Denna XO är njutningsfull: valnöt, körsbär, choklad, kanel och ingefära doftar i både näsa och smak.",
                "aromas": ["Kanel", "Choklad", "Ingefära", "Körsbär", "Valnöt"],
                "color": "Klar, skimrande bärnsten.",
                "nose": "Rik och generös med toner av choklad, ingefära och kanel.",
                "palate": "Rund och njutningsfull med drag av Christmas pudding, svart körsbär och choklad.",
                "finish": "Intensiv och fruktig.",
            },
            "no": {
                "description": "Tiden får ikke tak på Valentine. Denne XO er nytelsesfull: valnøtt, kirsebær, sjokolade, kanel og ingefær preger både duft og smak.",
                "aromas": ["Kanel", "Sjokolade", "Ingefær", "Kirsebær", "Valnøtt"],
                "color": "Klar, glitrende rav.",
                "nose": "Rik og innbydende med toner av sjokolade, ingefær og kanel.",
                "palate": "Rund og generøs med preg av Christmas pudding, svart kirsebær og sjokolade.",
                "finish": "Intens og fruktig.",
            },
            "zh": {
                "description": "时间无法左右 Valentine。此款 XO 甜美诱人：核桃、樱桃、巧克力、肉桂与姜香萦绕鼻端与味蕾。",
                "aromas": ["肉桂", "巧克力", "姜", "樱桃", "核桃"],
                "color": "清澈闪亮的琥珀色。",
                "nose": "丰盈而诱人，带巧克力、姜和肉桂气息。",
                "palate": "圆润甜美，让人联想到圣诞布丁、黑樱桃和巧克力。",
                "finish": "浓郁而果味鲜明。",
            },
        },
    },
    {
        "slug": "extra",
        "source": "cognac-leopold-croizet-extra-product-sheet.pdf",
        "stem": "cognac-leopold-croizet-extra",
        "title": "Extra",
        "kind": "cognac",
        "volume": "40 % vol. / 70 cl",
        "texts": {
            "fr": {
                "description": "Ce Cognac Extra est riche et complexe. Son rancio évoque fruits confits et chocolat. La bouche fraîche et fleurie laisse apparaître chèvrefeuille et jasmin, puis une finale de noix de muscade et cannelle.",
                "aromas": ["Chèvrefeuille", "Cannelle", "Chocolat", "Fruits confits", "Jasmin", "Noix de muscade"],
                "color": "Ambre doré / orangé.",
                "nose": "Riche et complexe, révélant des notes de fruits confits et de fruits secs, avec les premières notes de rancio.",
                "palate": "Excellente rondeur. Parfum fleuri de jasmin et chèvrefeuille, bois marqué mais fondu par le vieillissement.",
                "finish": "Épicée, marquée par la noix et les fruits secs.",
            },
            "en": {
                "description": "This Extra Cognac is rich and complex. Its rancio evokes candied fruit and chocolate. The fresh, floral palate reveals honeysuckle and jasmine before a nutmeg and cinnamon finish.",
                "aromas": ["Honeysuckle", "Cinnamon", "Chocolate", "Candied fruit", "Jasmine", "Nutmeg"],
                "color": "Golden / orange amber.",
                "nose": "Rich and complex, revealing candied and dried fruit with early rancio notes.",
                "palate": "Excellent roundness. Floral jasmine and honeysuckle, with marked oak softened by long ageing.",
                "finish": "Spiced, marked by walnut and dried fruit.",
            },
            "ru": {
                "description": "Этот Cognac Extra богат и сложен. Его rancio напоминает цукаты и шоколад. Свежий цветочный вкус раскрывает жимолость и жасмин, затем мускатный орех и корицу.",
                "aromas": ["Жимолость", "Корица", "Шоколад", "Цукаты", "Жасмин", "Мускатный орех"],
                "color": "Золотисто-оранжевый янтарь.",
                "nose": "Богатый и сложный аромат с цукатами, сухофруктами и первыми нотами rancio.",
                "palate": "Отличная округлость. Цветочный жасмин и жимолость, выраженный дуб смягчен долгой выдержкой.",
                "finish": "Пряный, с орехом и сухофруктами.",
            },
            "da": {
                "description": "Denne Extra Cognac er rig og kompleks. Dens rancio minder om kandiseret frugt og chokolade. Den friske, blomstrede smag viser kaprifolie og jasmin før muskatnød og kanel.",
                "aromas": ["Kaprifolie", "Kanel", "Chokolade", "Kandiseret frugt", "Jasmin", "Muskatnød"],
                "color": "Gylden / orange rav.",
                "nose": "Rig og kompleks med kandiseret og tørret frugt samt de første rancio-noter.",
                "palate": "Fremragende rundhed. Blomstrede noter af jasmin og kaprifolie, med tydelig eg blødgjort af lang lagring.",
                "finish": "Krydret, præget af valnød og tørret frugt.",
            },
            "sv": {
                "description": "Denna Extra Cognac är rik och komplex. Dess rancio för tanken till kanderad frukt och choklad. Den friska, blommiga smaken visar kaprifol och jasmin före muskot och kanel.",
                "aromas": ["Kaprifol", "Kanel", "Choklad", "Kanderad frukt", "Jasmin", "Muskot"],
                "color": "Gyllene / orange bärnsten.",
                "nose": "Rik och komplex med kanderad och torkad frukt samt tidiga rancio-toner.",
                "palate": "Utmärkt rundhet. Blommig jasmin och kaprifol, med tydlig ek mjukad av lång lagring.",
                "finish": "Kryddig, präglad av valnöt och torkad frukt.",
            },
            "no": {
                "description": "Denne Extra Cognac er rik og kompleks. Rancio-preget minner om kandisert frukt og sjokolade. Den friske, blomstrede smaken viser kaprifol og jasmin før muskat og kanel.",
                "aromas": ["Kaprifol", "Kanel", "Sjokolade", "Kandisert frukt", "Jasmin", "Muskatnøtt"],
                "color": "Gylden / oransje rav.",
                "nose": "Rik og kompleks med kandisert og tørket frukt samt de første rancio-tonene.",
                "palate": "Utmerket rundhet. Blomstrede toner av jasmin og kaprifol, med tydelig eik myknet av lang lagring.",
                "finish": "Krydret, preget av valnøtt og tørket frukt.",
            },
            "zh": {
                "description": "这款 Extra 干邑丰富而复杂。其 rancio 让人联想到蜜饯水果和巧克力。清新花香的口感展现忍冬与茉莉，收尾带肉豆蔻和肉桂。",
                "aromas": ["忍冬", "肉桂", "巧克力", "蜜饯水果", "茉莉", "肉豆蔻"],
                "color": "金色 / 橙色琥珀。",
                "nose": "丰富复杂，呈现蜜饯水果、干果和初现的 rancio 气息。",
                "palate": "圆润出色。茉莉与忍冬的花香中，明显橡木被长年陈酿柔化。",
                "finish": "带香料感，以核桃和干果为主。",
            },
        },
    },
    {
        "slug": "excellence",
        "source": "cognac-leopold-croizet-excellence-product-sheet.pdf",
        "stem": "cognac-leopold-croizet-excellence",
        "title": "Excellence",
        "kind": "cognac",
        "volume": "40 % vol. / 70 cl",
        "texts": {
            "fr": {
                "description": "Très vieux Cognac caractéristique des Fins Bois. Nez fruité et fleuri, noix de coco et fruit de la passion, puis rancio, cèdre et santal. Finale fraîche d'eucalyptus.",
                "aromas": ["Cèdre et santal", "Eucalyptus", "Fruit de la passion", "Noix de coco", "Rancio"],
                "color": "Ambre orangé, léger reflet rouge.",
                "nose": "Intense et profond. Belle complexité aromatique, mêlant fruit de la passion, noix de coco, rancio et vieux bois.",
                "palate": "Puissante, riche et moelleuse. Le santal et le cèdre donnent force et caractère.",
                "finish": "Fraîcheur marquée par l'eucalyptus, avec une longueur remarquable.",
            },
            "en": {
                "description": "A very old Cognac characteristic of Fins Bois. Fruity and floral nose, coconut and passion fruit, then rancio, cedar and sandalwood. Fresh eucalyptus finish.",
                "aromas": ["Cedar and sandalwood", "Eucalyptus", "Passion fruit", "Coconut", "Rancio"],
                "color": "Orange amber with a light red glint.",
                "nose": "Intense and deep. Fine aromatic complexity blending passion fruit, coconut, rancio and old wood.",
                "palate": "Powerful, rich and mellow. Sandalwood and cedar bring strength and character.",
                "finish": "Fresh eucalyptus notes with remarkable length.",
            },
            "ru": {
                "description": "Очень старый Cognac, характерный для Fins Bois. Фруктово-цветочный аромат, кокос и маракуйя, затем rancio, кедр и сандал. Свежий эвкалиптовый финал.",
                "aromas": ["Кедр и сандал", "Эвкалипт", "Маракуйя", "Кокос", "Rancio"],
                "color": "Оранжевый янтарь с легким красным отблеском.",
                "nose": "Интенсивный и глубокий. Сложность маракуйи, кокоса, rancio и старого дерева.",
                "palate": "Мощный, богатый и мягкий. Сандал и кедр придают силу и характер.",
                "finish": "Свежесть эвкалипта с замечательной длиной.",
            },
            "da": {
                "description": "En meget gammel Cognac med Fins Bois-karakter. Frugtig og blomstret duft, kokos og passionsfrugt, derefter rancio, ceder og sandeltræ. Frisk finish af eukalyptus.",
                "aromas": ["Ceder og sandeltræ", "Eukalyptus", "Passionsfrugt", "Kokos", "Rancio"],
                "color": "Orange rav med et let rødt skær.",
                "nose": "Intens og dyb. Fin aromatisk kompleksitet med passionsfrugt, kokos, rancio og gammelt træ.",
                "palate": "Kraftfuld, rig og blød. Sandeltræ og ceder giver styrke og karakter.",
                "finish": "Friske eukalyptusnoter med bemærkelsesværdig længde.",
            },
            "sv": {
                "description": "En mycket gammal Cognac med Fins Bois-karaktär. Fruktig och blommig doft, kokos och passionsfrukt, sedan rancio, ceder och sandelträ. Frisk eukalyptusavslutning.",
                "aromas": ["Ceder och sandelträ", "Eukalyptus", "Passionsfrukt", "Kokos", "Rancio"],
                "color": "Orange bärnsten med lätt röd ton.",
                "nose": "Intensiv och djup. Fin aromatisk komplexitet med passionsfrukt, kokos, rancio och gammalt trä.",
                "palate": "Kraftfull, rik och mjuk. Sandelträ och ceder ger styrka och karaktär.",
                "finish": "Friska eukalyptustoner med anmärkningsvärd längd.",
            },
            "no": {
                "description": "En svært gammel Cognac med Fins Bois-karakter. Fruktig og blomstrete duft, kokos og pasjonsfrukt, deretter rancio, sedertre og sandeltre. Frisk eukalyptusavslutning.",
                "aromas": ["Seder og sandeltre", "Eukalyptus", "Pasjonsfrukt", "Kokos", "Rancio"],
                "color": "Oransje rav med et lett rødt skjær.",
                "nose": "Intens og dyp. Fin aromatisk kompleksitet med pasjonsfrukt, kokos, rancio og gammelt treverk.",
                "palate": "Kraftfull, rik og myk. Sandeltre og seder gir styrke og karakter.",
                "finish": "Friske eukalyptustoner med bemerkelsesverdig lengde.",
            },
            "zh": {
                "description": "一款极老的干邑，展现 Fins Bois 特色。果香与花香并存，有椰子和百香果，继而出现 rancio、雪松与檀香，余韵带清新的桉树气息。",
                "aromas": ["雪松与檀香", "桉树", "百香果", "椰子", "Rancio"],
                "color": "橙色琥珀，带轻微红色反光。",
                "nose": "强烈而深邃。百香果、椰子、rancio 与老木气息交织，层次复杂。",
                "palate": "有力、丰厚而柔和。檀香和雪松赋予力量与个性。",
                "finish": "桉树般清新，余韵格外悠长。",
            },
        },
    },
    {
        "slug": "heritage",
        "source": "cognac-leopold-croizet-heritage-product-sheet.pdf",
        "stem": "cognac-leopold-croizet-heritage",
        "title": "Héritage",
        "kind": "cognac",
        "volume": "40 % vol. / 70 cl",
        "texts": {
            "fr": {
                "description": "Dans sa bouteille en cristal, Héritage est l'âme de la maison. Puissant, presque animal, il réunit cuir, tabac, vieux bois, rancio exceptionnel et une finale florale fraîche.",
                "aromas": ["Boîte à cigares", "Cèdre", "Eucalyptus", "Noix de muscade", "Sous-bois", "Vieux chêne", "Fruits confits"],
                "color": "Ambre doré / orangé.",
                "nose": "Riche et complexe, avec fruits confits, fruits secs et premières notes de rancio.",
                "palate": "Excellente rondeur. Jasmin, chèvrefeuille, vieux bois fondu et bel équilibre entre fruits et épices.",
                "finish": "Épicée, marquée par la noix et les fruits secs.",
            },
            "en": {
                "description": "In its crystal decanter, Héritage is the soul of the house. Powerful, almost animal, it brings leather, tobacco, old wood, exceptional rancio and a fresh floral finish.",
                "aromas": ["Cigar box", "Cedar", "Eucalyptus", "Nutmeg", "Undergrowth", "Old oak", "Candied fruit"],
                "color": "Golden / orange amber.",
                "nose": "Rich and complex, with candied fruit, dried fruit and early rancio notes.",
                "palate": "Excellent roundness. Jasmine, honeysuckle, old melted wood and a fine balance of fruit and spice.",
                "finish": "Spiced, marked by walnut and dried fruit.",
            },
            "ru": {
                "description": "В хрустальном декантере Héritage становится душой дома. Мощный, почти животный, он объединяет кожу, табак, старое дерево, исключительный rancio и свежий цветочный финал.",
                "aromas": ["Сигарная коробка", "Кедр", "Эвкалипт", "Мускатный орех", "Подлесок", "Старый дуб", "Цукаты"],
                "color": "Золотисто-оранжевый янтарь.",
                "nose": "Богатый и сложный, с цукатами, сухофруктами и первыми нотами rancio.",
                "palate": "Отличная округлость. Жасмин, жимолость, старое расплавленное дерево и баланс фруктов со специями.",
                "finish": "Пряный, с орехом и сухофруктами.",
            },
            "da": {
                "description": "I sin krystalkaraffel er Héritage husets sjæl. Kraftfuld, næsten animalsk, med læder, tobak, gammelt træ, enestående rancio og en frisk blomstret finish.",
                "aromas": ["Cigarkasse", "Ceder", "Eukalyptus", "Muskatnød", "Skovbund", "Gammel eg", "Kandiseret frugt"],
                "color": "Gylden / orange rav.",
                "nose": "Rig og kompleks med kandiseret frugt, tørret frugt og de første rancio-noter.",
                "palate": "Fremragende rundhed. Jasmin, kaprifolie, gammelt smeltet træ og fin balance mellem frugt og krydderier.",
                "finish": "Krydret, præget af valnød og tørret frugt.",
            },
            "sv": {
                "description": "I sin kristallkaraff är Héritage husets själ. Kraftfull, nästan animalisk, med läder, tobak, gammalt trä, exceptionell rancio och en frisk blommig avslutning.",
                "aromas": ["Cigarrlåda", "Ceder", "Eukalyptus", "Muskot", "Skogsmark", "Gammal ek", "Kanderad frukt"],
                "color": "Gyllene / orange bärnsten.",
                "nose": "Rik och komplex med kanderad frukt, torkad frukt och tidiga rancio-toner.",
                "palate": "Utmärkt rundhet. Jasmin, kaprifol, gammalt smält trä och fin balans mellan frukt och krydda.",
                "finish": "Kryddig, präglad av valnöt och torkad frukt.",
            },
            "no": {
                "description": "I sin krystallkaraffel er Héritage husets sjel. Kraftfull, nesten animalsk, med lær, tobakk, gammelt treverk, eksepsjonell rancio og en frisk blomsterpreget avslutning.",
                "aromas": ["Sigarkasse", "Seder", "Eukalyptus", "Muskatnøtt", "Skogbunn", "Gammel eik", "Kandisert frukt"],
                "color": "Gylden / oransje rav.",
                "nose": "Rik og kompleks med kandisert frukt, tørket frukt og de første rancio-tonene.",
                "palate": "Utmerket rundhet. Jasmin, kaprifol, gammelt smeltet treverk og fin balanse mellom frukt og krydder.",
                "finish": "Krydret, preget av valnøtt og tørket frukt.",
            },
            "zh": {
                "description": "置于水晶酒瓶中的 Héritage 是酒庄灵魂。强劲、近乎野性，汇聚皮革、烟草、老木、非凡 rancio 与清新的花香余韵。",
                "aromas": ["雪茄盒", "雪松", "桉树", "肉豆蔻", "林下气息", "老橡木", "蜜饯水果"],
                "color": "金色 / 橙色琥珀。",
                "nose": "丰富复杂，带蜜饯水果、干果和初现的 rancio 气息。",
                "palate": "圆润出色。茉莉、忍冬、融合的老木质，以及水果与香料的平衡。",
                "finish": "带香料感，以核桃和干果为主。",
            },
        },
    },
    {
        "slug": "dame-jeanne-xo",
        "source": "cognac-leopold-croizet-dame-jeanne-xo-product-sheet.pdf",
        "stem": "cognac-leopold-croizet-dame-jeanne-xo",
        "title": "Dame Jeanne XO",
        "kind": "cognac",
        "volume": "40 % vol. / 200 cl",
        "cover_x": 158,
        "cover_top": 706,
        "texts": {
            "fr": {
                "description": "Plusieurs années de vieillissement ont donné à ce XO des notes intenses de fruits secs, fruits confits et vieux bois. La Dame Jeanne rassemble les bouteilles autour d'une même matière.",
                "aromas": ["Fruits confits", "Gingembre", "Pruneau", "Vanille", "Bois", "Tabac"],
                "color": "Ambre doré.",
                "nose": "Notes de fruits confits et d'épices.",
                "palate": "Ronde et gourmande, très fruitée, avec des saveurs douces et chaudes.",
                "finish": "Épicée de noix de muscade, avec une légère touche mentholée.",
            },
            "en": {
                "description": "Several years of ageing give this XO intense notes of dried fruit, candied fruit and old wood. The Dame Jeanne brings the bottles together around one generous spirit.",
                "aromas": ["Candied fruit", "Ginger", "Prune", "Vanilla", "Wood", "Tobacco"],
                "color": "Golden amber.",
                "nose": "Candied fruit and spice notes.",
                "palate": "Round, indulgent and very fruity, with sweet, warm flavors.",
                "finish": "Spiced with nutmeg and a light menthol touch.",
            },
            "ru": {
                "description": "Несколько лет выдержки придали этому XO интенсивные ноты сухофруктов, цукатов и старого дерева. Dame Jeanne объединяет бутылки вокруг единого щедрого характера.",
                "aromas": ["Цукаты", "Имбирь", "Чернослив", "Ваниль", "Дерево", "Табак"],
                "color": "Золотистый янтарь.",
                "nose": "Ноты цукатов и специй.",
                "palate": "Округлый, щедрый и очень фруктовый вкус с мягкими теплыми оттенками.",
                "finish": "Пряный финал с мускатным орехом и легкой ментоловой нотой.",
            },
            "da": {
                "description": "Flere års lagring giver denne XO intense noter af tørret frugt, kandiseret frugt og gammelt træ. Dame Jeanne samler flaskerne omkring samme generøse ånd.",
                "aromas": ["Kandiseret frugt", "Ingefær", "Sveske", "Vanilje", "Træ", "Tobak"],
                "color": "Gylden rav.",
                "nose": "Noter af kandiseret frugt og krydderier.",
                "palate": "Rund, indbydende og meget frugtig med søde, varme smage.",
                "finish": "Krydret med muskatnød og et let strejf af mentol.",
            },
            "sv": {
                "description": "Flera års lagring ger denna XO intensiva toner av torkad frukt, kanderad frukt och gammalt trä. Dame Jeanne samlar flaskorna kring samma generösa anda.",
                "aromas": ["Kanderad frukt", "Ingefära", "Katrinplommon", "Vanilj", "Trä", "Tobak"],
                "color": "Gyllene bärnsten.",
                "nose": "Toner av kanderad frukt och kryddor.",
                "palate": "Rund, generös och mycket fruktig med söta, varma smaker.",
                "finish": "Kryddig med muskot och en lätt mentolton.",
            },
            "no": {
                "description": "Flere års lagring gir denne XO intense toner av tørket frukt, kandisert frukt og gammelt treverk. Dame Jeanne samler flaskene rundt samme generøse uttrykk.",
                "aromas": ["Kandisert frukt", "Ingefær", "Sviske", "Vanilje", "Treverk", "Tobakk"],
                "color": "Gylden rav.",
                "nose": "Toner av kandisert frukt og krydder.",
                "palate": "Rund, innbydende og svært fruktig med søte, varme smaker.",
                "finish": "Krydret med muskatnøtt og et lett preg av mentol.",
            },
            "zh": {
                "description": "多年陈酿赋予此款 XO 强烈的干果、蜜饯水果和老木气息。Dame Jeanne 以同一份丰盈酒质汇聚瓶中风味。",
                "aromas": ["蜜饯水果", "姜", "西梅", "香草", "木质", "烟草"],
                "color": "金色琥珀。",
                "nose": "蜜饯水果与香料气息。",
                "palate": "圆润诱人，果味充沛，带柔和温暖的味道。",
                "finish": "肉豆蔻香料余韵，并有轻微薄荷感。",
            },
        },
    },
    {
        "slug": "pineau-des-charentes",
        "source": "pineau-des-charentes-leopold-croizet-product-sheet.pdf",
        "stem": "pineau-des-charentes-leopold-croizet",
        "title": "Pineau des Charentes",
        "kind": "pineau",
        "volume": "17,5 % vol. / 75 cl",
        "texts": {
            "fr": {
                "description": "Élaboré à partir d'eaux-de-vie de cognac et de moûts de raisin issus de Colombard et d'Ugni Blanc, ce Pineau vieillit en barrique. Il est structuré, intense, riche et sans sulfites ajoutés.",
                "aromas": ["Vanille", "Fruits confits", "Noix", "Cerise", "Abricots secs"],
                "color": "Jaune doré / ambré.",
                "nose": "Arômes de fruits confits et de miel : abricot, pruneau et cerise.",
                "palate": "Subtil mélange de sucrosité, de rondeur, de notes vanillées et de fruits confits.",
                "finish": "Explosion de fruits et de miel, notes de noix, caractéristique des vieux Pineaux.",
            },
            "en": {
                "description": "Made from Cognac eaux-de-vie and grape musts from Colombard and Ugni Blanc, this Pineau ages in oak cask. It is structured, intense, rich and contains no added sulfites.",
                "aromas": ["Vanilla", "Candied fruit", "Walnut", "Cherry", "Dried apricots"],
                "color": "Golden yellow / amber.",
                "nose": "Candied fruit and honey aromas: apricot, prune and cherry.",
                "palate": "Subtle blend of sweetness, roundness, vanilla notes and candied fruit.",
                "finish": "Explosion of fruit and honey, walnut notes, typical of old Pineau.",
            },
            "ru": {
                "description": "Этот Pineau создан из коньячных спиртов и виноградного сусла сортов Colombard и Ugni Blanc, затем выдержан в дубовых бочках. Он структурный, интенсивный, богатый и без добавленных сульфитов.",
                "aromas": ["Ваниль", "Цукаты", "Грецкий орех", "Вишня", "Сушеные абрикосы"],
                "color": "Золотисто-желтый / янтарный.",
                "nose": "Ароматы цукатов и меда: абрикос, чернослив и вишня.",
                "palate": "Тонкое сочетание сладости, округлости, ванильных нот и цукатов.",
                "finish": "Взрыв фруктов и меда, ореховые ноты, характерные для старого Pineau.",
            },
            "da": {
                "description": "Denne Pineau fremstilles af cognac-eaux-de-vie og druemost fra Colombard og Ugni Blanc og lagres på egetræsfad. Den er struktureret, intens, rig og uden tilsatte sulfitter.",
                "aromas": ["Vanilje", "Kandiseret frugt", "Valnød", "Kirsebær", "Tørrede abrikoser"],
                "color": "Gyldengul / rav.",
                "nose": "Aromaer af kandiseret frugt og honning: abrikos, sveske og kirsebær.",
                "palate": "Fin blanding af sødme, rundhed, vaniljenoter og kandiseret frugt.",
                "finish": "Eksplosion af frugt og honning, noter af valnød, typisk for gammel Pineau.",
            },
            "sv": {
                "description": "Denna Pineau görs av cognac-eaux-de-vie och druvmust från Colombard och Ugni Blanc och lagras på ekfat. Den är strukturerad, intensiv, rik och utan tillsatta sulfiter.",
                "aromas": ["Vanilj", "Kanderad frukt", "Valnöt", "Körsbär", "Torkade aprikoser"],
                "color": "Guldgul / bärnsten.",
                "nose": "Aromer av kanderad frukt och honung: aprikos, katrinplommon och körsbär.",
                "palate": "Fin blandning av sötma, rundhet, vaniljtoner och kanderad frukt.",
                "finish": "Explosion av frukt och honung, valnötstoner, typiskt för gammal Pineau.",
            },
            "no": {
                "description": "Denne Pineau lages av cognac-eaux-de-vie og druemost fra Colombard og Ugni Blanc og lagres på eikefat. Den er strukturert, intens, rik og uten tilsatte sulfitter.",
                "aromas": ["Vanilje", "Kandisert frukt", "Valnøtt", "Kirsebær", "Tørkede aprikoser"],
                "color": "Gyldengul / rav.",
                "nose": "Aromaer av kandisert frukt og honning: aprikos, sviske og kirsebær.",
                "palate": "Fin blanding av sødme, rundhet, vaniljetoner og kandisert frukt.",
                "finish": "Eksplosjon av frukt og honning, noter av valnøtt, typisk for gammel Pineau.",
            },
            "zh": {
                "description": "这款 Pineau 由干邑生命之水与 Colombard、Ugni Blanc 葡萄汁调配而成，并在橡木桶中陈年。结构良好，浓郁丰厚，不添加亚硫酸盐。",
                "aromas": ["香草", "蜜饯水果", "核桃", "樱桃", "杏干"],
                "color": "金黄色 / 琥珀色。",
                "nose": "蜜饯水果与蜂蜜香气：杏子、西梅和樱桃。",
                "palate": "甜润、圆融、香草气息与蜜饯水果细腻交织。",
                "finish": "水果与蜂蜜奔涌，带核桃气息，是老年份 Pineau 的典型特征。",
            },
        },
    },
]

BAR_COLORS = [
    colors.HexColor("#8a5a2b"),
    colors.HexColor("#c97a36"),
    colors.HexColor("#b7b28b"),
    colors.HexColor("#7e4e2b"),
    colors.HexColor("#b9a342"),
    colors.HexColor("#b98562"),
    colors.HexColor("#7d6a55"),
]


def first_existing(candidates: list[str | None]) -> str:
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate
    raise FileNotFoundError(f"Missing required tool or file from candidates: {candidates}")


def prepare() -> tuple[str, str, str]:
    if not FONT_PATH.exists():
        raise FileNotFoundError(f"Missing Unicode font: {FONT_PATH}")
    pdfmetrics.registerFont(TTFont(FONT, str(FONT_PATH)))
    for directory in (RAW_DIR, BG_DIR, SOURCE_DIR, PUBLIC_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    return first_existing(PDFTOPPM_CANDIDATES), first_existing(GS_CANDIDATES), first_existing(ICC_CANDIDATES)


def render_background(pdftoppm: str, source_pdf: Path) -> Path:
    target = BG_DIR / f"{source_pdf.stem}.jpg"
    if target.exists() and target.stat().st_mtime >= source_pdf.stat().st_mtime:
        return target
    prefix = BG_DIR / source_pdf.stem
    subprocess.run(
        [pdftoppm, "-jpeg", "-singlefile", "-r", str(BG_DPI), str(source_pdf), str(prefix)],
        check=True,
    )
    generated = prefix.with_suffix(".jpg")
    with Image.open(generated) as image:
        image.convert("RGB").save(target, "JPEG", quality=88, optimize=True)
    if generated != target and generated.exists():
        generated.unlink()
    return target


def wrap_text(text: str, max_width: float, font_size: float) -> list[str]:
    paragraphs = [part.strip() for part in text.split("\n") if part.strip()]
    lines: list[str] = []
    for paragraph in paragraphs:
        line = ""
        tokens = paragraph.split(" ")
        if len(tokens) == 1:
            tokens = list(paragraph)
            joiner = ""
        else:
            joiner = " "
        for token in tokens:
            candidate = token if not line else f"{line}{joiner}{token}"
            if pdfmetrics.stringWidth(candidate, FONT, font_size) <= max_width:
                line = candidate
            else:
                if line:
                    lines.append(line)
                line = token
        if line:
            lines.append(line)
    return lines


def fit_font(texts: list[str], width: float, height: float, start_size: float, leading_factor: float = 1.25) -> float:
    size = start_size
    while size >= 5.4:
        line_count = sum(len(wrap_text(text, width, size)) for text in texts)
        if line_count * size * leading_factor <= height:
            return size
        size -= 0.3
    return size


def draw_wrapped(c: canvas.Canvas, text: str, x: float, y: float, width: float, size: float, leading: float, color=colors.HexColor("#2f261d")) -> float:
    c.setFont(FONT, size)
    c.setFillColor(color)
    for line in wrap_text(text, width, size):
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_label_block(c: canvas.Canvas, label: str, body: str, x: float, y: float, width: float, lang: str) -> float:
    title_size = 7.4 if lang != "zh" else 7.0
    body_size = 7.0 if lang not in {"ru", "zh"} else 6.6
    c.setFont(FONT, title_size)
    c.setFillColor(colors.HexColor("#3f3326"))
    c.drawString(x, y, label)
    y -= title_size + 2.0
    return draw_wrapped(c, body, x, y, width, body_size, body_size * 1.28)


def draw_aromas(c: canvas.Canvas, aromas: list[str], x: float, y: float, width: float, lang: str) -> None:
    size = 7.0 if lang not in {"ru", "zh"} else 6.4
    leading = size * 1.32
    c.setFont(FONT, size)
    for index, aroma in enumerate(aromas[:8]):
        if index == 4:
            x += width / 2 + 8
            y += leading * 4
        color = BAR_COLORS[index % len(BAR_COLORS)]
        c.setStrokeColor(color)
        c.setLineWidth(1.3)
        c.line(x, y - 1.8, x + 28, y - 1.8)
        c.setFillColor(colors.HexColor("#4b3828"))
        for line in wrap_text(aroma, width / 2 - 22, size):
            c.drawString(x + 35, y - 4, line)
            y -= leading
        y -= 1.0


def draw_sheet(raw_pdf: Path, background: Path, product: dict, lang: str) -> None:
    locale = LOCALES[lang]
    text = product["texts"][lang]
    c = canvas.Canvas(str(raw_pdf), pagesize=(PAGE_WIDTH, PAGE_HEIGHT), pageCompression=1)
    c.setTitle(f"{product['title']} Léopold Croizet - {locale['subject']}")
    c.setAuthor("LA MAISON DES PIERRES")
    c.setSubject(locale["subject"])
    c.setKeywords(f"Léopold Croizet, {product['title']}, {locale['subject']}, {locale['lang_name']}")

    c.drawImage(ImageReader(str(background)), 0, 0, PAGE_WIDTH, PAGE_HEIGHT)

    beige = colors.HexColor("#ebe1d2")
    brown = colors.HexColor("#6d3b1f")
    dark = colors.HexColor("#2f261d")
    muted = colors.HexColor("#675847")

    c.setFillColor(colors.white)
    cover_x = product.get("cover_x", 244)
    cover_top = product.get("cover_top", 658)
    c.rect(cover_x, 286, 558 - cover_x, cover_top - 286, stroke=0, fill=1)
    c.setFillColor(beige)
    c.rect(0, 0, PAGE_WIDTH, 285, stroke=0, fill=1)

    x = 270
    y = 628
    c.setFillColor(dark)
    c.setFont(FONT, 8)
    c.drawString(x, y, "COGNAC LÉOPOLD CROIZET" if product["kind"] == "cognac" else "LÉOPOLD CROIZET")
    y -= 49 if len(product["title"]) <= 9 else 43
    title_size = 38 if len(product["title"]) <= 9 else 28
    if lang in {"ru", "zh"} and len(product["title"]) > 12:
        title_size -= 2
    c.setFont(FONT, title_size)
    c.setFillColor(brown)
    c.drawString(x, y, product["title"])
    y -= 22
    c.setFont(FONT, 7.5)
    c.setFillColor(muted)
    app_key = "appellation_pineau" if product["kind"] == "pineau" else "appellation_cognac"
    y = draw_wrapped(c, locale[app_key], x, y, 258, 7.2, 9.0, muted)
    y -= 6
    c.setStrokeColor(colors.HexColor("#a8b8aa"))
    c.setLineWidth(0.7)
    c.line(x, y, x + 185, y)
    y -= 18
    c.setFont(FONT, 7.4)
    c.setFillColor(dark)
    c.drawString(x, y, product["volume"])
    y -= 22
    desc_size = fit_font([text["description"]], 258, 122, 7.2)
    draw_wrapped(c, text["description"], x, y, 258, desc_size, desc_size * 1.3, dark)

    c.setFillColor(brown)
    c.setFont(FONT, 12 if lang != "zh" else 11)
    c.drawString(42, 260, locale["notes"])
    c.setFillColor(muted)
    c.setFont(FONT, 7.2)
    c.drawString(42, 238, locale["aromas"])
    draw_aromas(c, text["aromas"], 42, 214, 205, lang)

    section_texts = [text["color"], text["nose"], text["palate"], text["finish"]]
    section_size = fit_font(section_texts, 258, 210, 7.1 if lang not in {"ru", "zh"} else 6.7)
    y = 233
    y = draw_label_block(c, locale["color"], text["color"], 305, y, 250, lang) - 4
    y = draw_label_block(c, locale["nose"], text["nose"], 305, y, 250, lang) - 4
    y = draw_label_block(c, locale["palate"], text["palate"], 305, y, 250, lang) - 4
    draw_label_block(c, locale["finish"], text["finish"], 305, y, 250, lang)
    c.showPage()
    c.save()


def pdfa_def_file(icc: str) -> Path:
    path = TMP_DIR / "PDFA_def.ps"
    path.write_text(
        f"""%!
[ /_objdef {{icc_PDFA}} /type /stream /OBJ pdfmark
[{{icc_PDFA}} << /N 3 >> /PUT pdfmark
[{{icc_PDFA}} ({icc}) (r) file /PUT pdfmark
[ /_objdef {{OutputIntent_PDFA}} /type /dict /OBJ pdfmark
[{{OutputIntent_PDFA}} <<
  /Type /OutputIntent
  /S /GTS_PDFA1
  /DestOutputProfile {{icc_PDFA}}
  /OutputConditionIdentifier (sRGB)
>> /PUT pdfmark
[{{Catalog}} << /OutputIntents [{{OutputIntent_PDFA}}] >> /PUT pdfmark
""",
        encoding="utf-8",
    )
    return path


def convert_to_pdfa(gs: str, icc: str, raw_pdf: Path, output_pdf: Path) -> None:
    output_pdf.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            gs,
            "-q",
            "-dPDFA=2",
            "-dBATCH",
            "-dNOPAUSE",
            "-dNOOUTERSAVE",
            "-sDEVICE=pdfwrite",
            "-dPDFACompatibilityPolicy=1",
            "-sProcessColorModel=DeviceRGB",
            "-sColorConversionStrategy=RGB",
            f"-sOutputICCProfile={icc}",
            f"-sOutputFile={output_pdf}",
            str(pdfa_def_file(icc)),
            str(raw_pdf),
        ],
        check=True,
    )


def localized_filename(product: dict, lang: str) -> str:
    return f"{product['stem']}-{LOCALES[lang]['file_label']}.pdf"


def main() -> None:
    pdftoppm, gs, icc = prepare()
    generated = 0
    for product in PRODUCTS:
        source_pdf = SOURCE_DIR / product["source"]
        if not source_pdf.exists():
            raise FileNotFoundError(source_pdf)
        background = render_background(pdftoppm, source_pdf)
        for lang in LOCALES:
            raw_pdf = RAW_DIR / localized_filename(product, lang)
            final_pdf = SOURCE_DIR / localized_filename(product, lang)
            draw_sheet(raw_pdf, background, product, lang)
            convert_to_pdfa(gs, icc, raw_pdf, final_pdf)
            public_pdf = PUBLIC_DIR / final_pdf.name
            public_pdf.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(final_pdf, public_pdf)
            generated += 1
    print(f"Generated {generated} localized tasting-sheet PDFs")


if __name__ == "__main__":
    main()
