import { access, cp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEPLOY_BASE = '/Cognac-Leopold-Croizet-site';
const PUBLIC_ORIGIN = 'https://cognac-leopold-croizet.com';

const locales = [
  { code: 'fr', label: 'Fr', hreflang: 'fr' },
  { code: 'en', label: 'En', hreflang: 'en' },
  { code: 'ru', label: 'Ру', hreflang: 'ru' },
  { code: 'da', label: 'Da', hreflang: 'da' },
  { code: 'sv', label: 'Sv', hreflang: 'sv' },
  { code: 'no', label: 'No', hreflang: 'no' },
  { code: 'zh', label: '中文', hreflang: 'zh-Hans' },
];

const productCopy = {
  vs: {
    note: '年轻而有力的干邑。VS 以清新为特征，带有梨、桃与葡萄花的香气，年轻橡木单宁带来淡淡的奶油面包气息。适合调制鸡尾酒，也适合加冰享用。',
    view: '金黄色 / 稻草黄色',
    nose: '新鲜水果香气，如梨、桃，以及熟果香气（烤苹果、金色葡萄干）。',
    mouth: '清新与果味之间的细腻平衡，并带有奶油面包与香草的微妙气息。余味呈现鲜葡萄与梨的果香清爽感。',
  },
  vsop: {
    note: 'Léopold Croizet VSOP 是一款圆润而美食感十足的干邑。最初数年的橡木桶陈酿带来李子与杏酱香气，木质单宁提升香草气息，并以一抹清新的丁香收尾。',
    view: '金黄色',
    nose: '平衡而圆润：橡木与香草，并带有熟果（西梅、杏）的细腻气息。',
    mouth: '丰盈、宽阔，带有 Fins Bois 产区典型的优雅果味。余味：清新的丁香气息。',
  },
  napoleon: {
    note: '长时间橡木桶陈酿带来干果与坚果的愉悦香气：花生、杏仁、榛子，以及烘烤木、太妃糖与香草。余味悠长，并带有胡椒感。',
    view: '橙金色',
    nose: '橡木桶成熟过程揭示并强化了原始的木质与香草香气。',
    mouth: '细腻橡木单宁与干果、坚果香气交织：杏仁、榛子与核桃。余味有活力、平衡，带轻微香料与薄荷感。',
  },
  xo: {
    note: '我们的 XO 结构细腻，入口圆润而慷慨。黑樱桃果酱与荔枝香气之后，浮现鸢尾与干花的花香。Charentais rancio 特征逐渐展开，并以皮革与烟草气息延展。',
    view: '浅琥珀色',
    nose: '成熟而平衡的香气。蜜饯水果、木质与香料气息结合优雅。',
    mouth: '酒体结构良好，长时间橡木桶陈酿带来柔和而细腻的质感。',
  },
  'xo-exception': {
    note: '这款 XO Exception 需要漫长岁月的陈酿才能成就。它披着琥珀色酒袍，复杂香气展现干果、蜜饯水果与陈年木质。口感浓郁，木质单宁融合细腻，并带有肉桂与烟草气息。',
    view: '金琥珀色',
    nose: '甜梨、野花与温暖香料相伴。随着时间推移，香气发展为蜜饯水果与香料。',
    mouth: '丰盈而美食感十足。香料风味与香气爆发，尾韵带有肉豆蔻与肉桂。',
  },
  extra: {
    note: '这款 Extra 干邑丰富而复杂。其 rancio 特征带有蜜饯水果与巧克力气息。入口清新且带花香，展现忍冬与茉莉香气，并以肉豆蔻和肉桂的香料感收尾。',
    view: '金琥珀 / 橙色',
    nose: '丰富复杂，展现蜜饯与干果香气，并浮现最初的 rancio 气息，如林下土壤般深邃。',
    mouth: '入口饱满出色。茉莉与忍冬的细腻花香交织。数十年陈酿发展出明显的成熟橡木气息，果味与香料余味之间保持优美平衡，并带坚果与干果气息。',
  },
  excellence: {
    note: '一款极为陈年的干邑，展现 Fins Bois 的典型个性。复杂的果香与花香中带有椰子与百香果气息。rancio 逐渐让位于更鲜明的雪松与檀香木香气，清新的桉树尾韵带来卓越长度。',
    view: '橙琥珀色，带轻微红色反光',
    nose: '深邃而浓郁。香气复杂优美，百香果与椰子气息与 rancio、陈年木质交织。',
    mouth: '有力、丰富而柔和。檀香木与雪松香气赋予这款 Cognac d&#39;Excellence 力量与个性。余味清新，带桉树气息，悠长而持久。',
  },
  heritage: {
    note: '装于手工水晶瓶中，它是酒庄的灵魂。家族四代人以热情塑造其性格。强劲、略带动物感，香气如糖浆般浓郁且复杂。岁月的重量在皮革、烟草与古老木质中显现，揭示非凡 rancio，并伴随花香爆发与清新收尾。品饮时以强度与长度见长。',
    view: '深邃浓郁的红琥珀色',
    nose: '强劲而复杂。',
    mouth: '惊人的甜美与糖浆感，伴随强烈芳香爆发。显著 rancio、高度发展的木质与林下气息。余味：口中悠长，强度罕见。',
  },
  valentine: {
    note: 'Valentine 干邑优雅而柔美，时间在其中变得不再重要。这款 XO 如同精致甜点，核桃、樱桃、巧克力、肉桂与姜的气息取悦嗅觉与味蕾。它将令美食爱好者心动。',
    view: '深邃浓郁的栗褐色',
    nose: '丰富而美食感十足，带巧克力、姜与肉桂气息。',
    mouth: '圆润而丰美，仿佛圣诞布丁，带黑樱桃与巧克力的浓郁气息。余味强烈且果香充沛。',
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
};

const translations = [
  ['Skill &amp; know how', '工艺与传承'],
  ['Skill & know how', '工艺与传承'],
  ['Collection', '系列'],
  ['Meet us', '走近我们'],
  ['Shop', '订购'],
  ['The fruit', '果实'],
  ['The fire', '火焰'],
  ['Alchemy', '调配艺术'],
  ['Time', '时间'],
  ['Our vines, our land, the fruits of our labour', '我们的葡萄藤、土地与辛勤成果'],
  ['Each stage of our work distills the character of our products', '每一个步骤都凝练出产品的性格'],
  ['A centuries-old know-how handed down from generation to generation', '代代相传的百年工艺'],
  ['Taking the time to seal what makes us different', '以时间封存我们的独特之处'],
  ['Welcome!', '欢迎！'],
  ['Country', '国家/地区'],
  ['Day of birth', '出生日期'],
  ['Enter', '进入'],
  ['Discover', '探索'],
  ['DISCOVER', '探索'],
  ['Many long years of aging were (are) indispensable', '漫长岁月的陈酿不可或缺'],
  ['to develop this XO Exception.', '方能成就这款 XO Exception。'],
  ['LÉOPOLD CROIZET COGNAC FROM GENERATION TO GENERATION', 'LÉOPOLD CROIZET 干邑，代代相传'],
  ['a very old Cognac characteristic of Fins Bois.', '一款极为陈年的干邑，呈现 Fins Bois 的典型个性。'],
  ['a very old Cognac<br />', '一款极为陈年的干邑，<br />'],
  ['characteristic<br />of Fins Bois...', '呈现 Fins Bois<br />典型个性……'],
  ['characteristic<br />', '展现<br />'],
  ['of Fins Bois.<br />', 'Fins Bois 的个性。<br />'],
  ['A creation<br />', '一款<br />'],
  ['exceptional', '非凡之作'],
  ['the Extra Léopold Croizet', 'Léopold Croizet Extra'],
  ['Take time', '让时间沉淀'],
  ['&#8230; and upward it', '……并将其升华'],
  ['hazards don&#8217;t exist', '偶然并不存在'],
  ['Have you experienced ?', '您体验过吗？'],
  ['Shake !', 'Shake!'],
  ['Fresh ideas for sunny days', '晴日里的清新灵感'],
  ['Idées fraîches pour les beaux jours', '晴日里的清新灵感'],
  ['Bottles', '瓶型'],
  ['Alcohol content', '酒精度'],
  ['Tasting notes', '品鉴笔记'],
  ['Sensory Notes', '感官笔记'],
  ['Product quantity', '产品数量'],
  ['Add to cart', '加入购物车'],
  ['Order', '咨询'],
  ['Return to shop', '返回系列'],
  ['Your cart is currently empty.', '您的购物车目前为空。'],
  ['My Account', '我的账户'],
  ['Cart', '购物车'],
  ['Checkout', '结算'],
  ['Login', '登录'],
  ['Username or email address', '用户名或电子邮箱'],
  ['Password', '密码'],
  ['Remember me', '记住我'],
  ['Lost your password?', '忘记密码？'],
  ['Visit our cellars…', '参观我们的酒窖…'],
  ['On appointment', '需预约'],
  ['Visite', '参观'],
  ['Votre commande', '您的订单'],
  ['Nous Contacter', '联系我们'],
  ['Mentions Légales', '法律声明'],
  ['Annee', '年份'],
  ['I want to receive some news time to time', '我希望不时收到来自酒庄的消息'],
  ['Pour vous désinscrire, merci d&#39;envoyer un e-mail à cognac@mdpierrre.com.', '如需退订，请发送电子邮件至 cognac@mdpierrre.com。'],
  ["Pour vous désinscrire, merci d'envoyer un e-mail à cognac@mdpierrre.com.", '如需退订，请发送电子邮件至 cognac@mdpierrre.com。'],
  ['By entering your e-mail address, you agree to receive each month our latest news about our products and you acknowledge our', '填写电子邮箱即表示您同意每月接收我们的产品资讯，并确认已阅读我们的'],
  ['legal notices', '法律声明'],
  ['Laissez nous votre e-mail', '请输入您的电子邮箱'],
  ['Send', '发送'],
  ['A cellar with many medals', '屡获奖项的酒窖'],
  ['Perhaps you are one of the people who like to enjoy our cognac in a tulip glass with a good cigar, by the fire etc… you’re right.<br>But we also suggest you to enjoy the freshness and fruitiness of Léopold Croizet cognacs in a more festive, exotic, more striking and «on the rocks»', '也许您喜欢在壁炉旁，以郁金香杯搭配一支好雪茄来品味我们的干邑，这当然很美妙。<br>但我们也建议您以更欢庆、更异域、更鲜明的方式，在加冰或鸡尾酒中感受 Léopold Croizet 干邑的清新果香。'],
  ['We use our youngest Cognacs <strong>VS</strong> and <strong>VSOP</strong> to make our favorite cocktails.<br>We want to share them with you:', '我们使用最年轻的 <strong>VS</strong> 与 <strong>VSOP</strong> 干邑调制喜爱的鸡尾酒。<br>愿与您分享：'],
  ['THE GRAPE', '葡萄'],
  ['THE HARVEST', '采收'],
  ['WORK IN THE VINEYARD', '葡萄园工作'],
  ['THE DISTILLATION', '蒸馏'],
  ['A DOUBLE DISTILLATION', '双重蒸馏'],
  ['THE AGEING', '陈酿'],
  ['The Fire', '火焰'],
  ['The fire', '火焰'],
  ['Le fruit', '果实'],
  ['Le feu', '火焰'],
  ['Les sens', '感官'],
  ['Le temps', '时间'],
  ['Legacy', '传承'],
  ['BLENDING', '调配'],
  ['BOTTLING', '装瓶'],
  ["L'assemblage", '调配'],
  ['La mise en bouteille', '装瓶'],
  ['of creation.', '创造之源。'],
  ['of senses.', '感官之境。'],
  ['of memory.', '记忆之中。'],
  ['in memory.', '留存记忆。'],
  ['It’s a family matter.', '这是一段家族故事。'],
  ['Visit information in Triac-Lautrait.', 'Triac-Lautrait 参观信息。'],
  ['Contact us', '联系我们'],
  ['Read more', '阅读更多'],
  ['Home', '首页'],
  ['Even though today our harvest is fully mechanized, it still requires human intervention and decisions in every stage of the harvest.', '虽然如今采收已经机械化，但采收的每一个阶段仍需要人的判断与参与。'],
  ['The grape harvest is loaded by gravity into the presses from the top in order to respect the taste qualities of the grapes.', '葡萄从上方借助重力进入压榨机，以尽可能保留葡萄的风味品质。'],
  ['The freshly squeezed grape juice ferments in thermoregulated stainless steel tanks for 24 hours, to guarantee optimal control of the natural fermentation process.', '新鲜压榨的葡萄汁在温控不锈钢罐中发酵 24 小时，以确保自然发酵过程得到精准控制。'],
  ['The atmosphere is humid and warm. The vapors are intense and intoxicating. The heat that emerges from the stills is intense.', '空气湿润而温暖，蒸汽浓烈而令人沉醉，蒸馏器散发出强烈热度。'],
  ['The Cognacs LÉOPOLD CROIZET,<br />\nhanded down from generation<br />\nto generation.', 'LÉOPOLD CROIZET 干邑，<br />\n代代相传。'],
  ['The Cognacs LÉOPOLD CROIZET,<br />', 'LÉOPOLD CROIZET 干邑，<br />'],
  ['A typical Charente farm,', '典型的夏朗德农庄，'],
  ['bordered by river and woods,', '由河流与树林环绕，'],
  ['handed down from generation<br />', '代代<br />'],
  ['to generation.<br />', '相传。<br />'],
  ['Thanks to our records,', '得益于我们的档案，'],
  ['we can go back in time until 1714.', '我们可以追溯至 1714 年。'],
  ['Act of Sale of Property', '地产买卖契约'],
  ['Various acts of marriage and sale.', '多份婚姻与买卖契约。'],
  ['Cognac sale', '干邑销售记录'],
  ['Deed of sale of the parcel', '地块买卖契约'],
  ['Deed of sale "of a piece of vines.', '葡萄园地块买卖契约'],
  ['Aerial view of Lantin’s home', 'Lantin 家族宅邸航拍'],
  ['Marc FOUCHÉ, 7th generation', 'Marc FOUCHÉ，第七代'],
  ['LÉOPOLD CROIZET Frères cognac label,<br />Trademark registered by Marc, grandfather of Léopold Croizet,<br />and his brother Roger, from the Léopold Croizet family.', 'LÉOPOLD CROIZET Frères 干邑酒标，<br />由 Léopold Croizet 的祖父 Marc 与其兄弟 Roger 注册，<br />传承自 Léopold Croizet 家族。'],
  ['Pierre (left), 8th generation, followed by Léopold and his son Paul (9th and 10th generation of family winemakers). Pierre relaunched the production of bottled cognac in the 1970s.', 'Pierre（左）为第八代，身旁是 Léopold 与其子 Paul，分别为家族葡萄种植者第九代与第十代。Pierre 于 20 世纪 70 年代重新启动瓶装干邑生产。'],
];

const sensory = {
  'Oak wood': '橡木',
  Brioche: '奶油面包',
  'Vine flower': '葡萄花',
  Peach: '桃',
  Pear: '梨',
  Vanilla: '香草',
  'Dried aprico': '干杏',
  Clove: '丁香',
  Plum: '李子',
  Rose: '玫瑰',
  Almond: '杏仁',
  'Slightly vanilla warm wood': '微香草的温暖木质',
  Peanut: '花生',
  Hazelnut: '榛子',
  Toffee: '太妃糖',
  'Black cherr': '黑樱桃',
  Leather: '皮革',
  'Iris flowers': '鸢尾花',
  'Dried flowers': '干花',
  Lychee: '荔枝',
  'First rancio notes': '初显 rancio 气息',
  Tobacco: '烟草',
  Wood: '木质',
  Cinnamon: '肉桂',
  'Candied ginger': '蜜饯姜',
  Prune: '西梅',
  Apricot: '杏',
  'Honeysuckle and jasmine': '忍冬与茉莉',
  Chocolate: '巧克力',
  'Candied fruit': '蜜饯水果',
  Nutmeg: '肉豆蔻',
  'Cedarwood and sandalwood': '雪松与檀香木',
  Eucalyptus: '桉树',
  'Passion fruit': '百香果',
  Coconut: '椰子',
  Rancio: 'Rancio',
  'Cigar wood': '雪茄木',
  Cedar: '雪松',
  'White lily  and  honeysuckle flowers': '白百合与忍冬花',
  'Stewed fruits / Dried figs': '熟果 / 干无花果',
  'Woodland undergrowth': '林下气息',
  'Old oak': '老橡木',
  Cherry: '樱桃',
  Ginger: '姜',
  Nuts: '坚果',
};

const editorialCopy = [
  ['Making a quality cognac starts with a reflection on the environment and on time.', '酿造高品质干邑，始于对环境与时间的思考。'],
  ['The vine is a root anchored deep in the earth. It draws its resources there and will produce grapes over several decades.', '葡萄藤深深扎根于土地，从中汲取力量，并在数十年间结出葡萄。'],
  ["The quality of the grapes is essential to produce cognac. Above all the love dedicated through one's work, the desire to impart a healthy vineyard, to inspire good work habits and to always question oneself every day is primordial.", '葡萄品质是酿造干邑的根本。热爱工作、守护健康葡萄园、传承良好习惯，并不断自我审视，是我们最重要的原则。'],
  ['The vines are treated with respect for the soil, without chemical pesticides or herbicides. The management of the vine is thought out according to the plots and the type of soil. We do our best to obtain quality, healthy and aromatic grapes.', '我们以尊重土壤的方式照料葡萄藤，不使用化学农药与除草剂。每块地、每种土壤都有相应的管理方式，只为获得健康、芳香而优质的葡萄。'],
  ['Our vineyard has been managed entirely using  organic farming techniques for 20 years.', '我们的葡萄园已采用有机耕作方式管理二十年。'],
  ['Our vineyard is made up of three grape varieties essential for making cognac.', '我们的葡萄园由三种对干邑酿造至关重要的葡萄品种构成。'],
  ['This diversity of grape varieties plays an important role in the complexity and aromatic richness of our Cognac.', '葡萄品种的多样性在我们干邑的复杂度与芳香丰富性中扮演重要角色。'],
  ['The distillation is an essential step in the production of our cognacs.', '蒸馏是我们干邑酿造中至关重要的一步。'],
  ['All our senses are awakened during this winter period when the stills are lit day and night to produce our cognacs. The distillery takes on an incredible ambience. One enters with emotion and respect. Silence reigns.', '冬季蒸馏期间，蒸馏器日夜燃烧，我们的所有感官都被唤醒。蒸馏室拥有独特氛围，人们带着情感与敬意进入，静默笼罩其间。'],
  ['Only the roar of the gas burners heating the stills sing melodiously. The water trickles into the cooling pipe and the cognac into the barrel.', '唯有加热蒸馏器的燃气火焰低声鸣唱。水流入冷却管，干邑流入酒桶。'],
  ['The wines, once the fermentation is over, are distilled in order to obtain cognac.', '发酵完成后，葡萄酒经蒸馏成为干邑生命之水。'],
  ['To qualify as certified Cognac, the wines have to be distilled twice in pot stills, called “Alambic Charentais”.', '要成为法定干邑，葡萄酒必须在夏朗德铜壶蒸馏器中进行两次蒸馏。'],
  ['On our property, we distill with small copper stills of 16hl and 20hl. Our cognacs are distilled with the lees in order to preserve their round and rich taste.', '在酒庄，我们使用 16hl 与 20hl 的小型铜壶蒸馏器，并带酒泥蒸馏，以保留圆润而丰富的口感。'],
  ['After Distillation, our eaux-de-vie are ready to spend a long time ageing in barrels.', '蒸馏之后，生命之水将进入橡木桶，开始漫长陈酿。'],
  ['With time, they will take on a beautiful amber color and extract the sweet and subtle aromas of the Oak which gives our cognac its intensity.', '随着时间推移，它们呈现美丽琥珀色，并从橡木中萃取甜美细腻的香气，赋予干邑深度。'],
  ['We take extra care when selecting our French Oak Barrels for the ageing of our cognac. Different grains of wood are used and barrels of different ages (new, young and old). This allows our cognac to achieve their highest aromatic potential.', '我们格外谨慎地选择法国橡木桶。不同木纹、不同桶龄的新桶、年轻桶与老桶共同帮助干邑达到最高芳香潜力。'],
  ['The majority of our barrels are 350 liters as they allow the best exchange between the Cognac, the air and the wood. We also age it in different cellars which have different temperature and moisture levels allowing us to have a broader and more complex range of “eaux de vies”.', '多数酒桶容量为 350 升，可实现干邑、空气与木材之间的理想交换。我们也在不同温湿度的酒窖中陈酿，从而获得更宽广、更复杂的生命之水系列。'],
  ['It is the subtle art of the cellar master who, like a perfumer’s nose, selects and produces blends of brandy of different ages to give them a constant quality year after year.', '这是酒窖大师的细腻艺术：如同调香师之鼻，他甄选并调配不同年份的生命之水，使品质年复一年保持稳定。'],
  ['This marriage brings balance and complexity to our cognacs. Over time, the secret of making cognac is passed on to the new generation, each bringing a subtlety to the know-how of the previous one. This gives the cognac Léopold Croizet its unique and exceptional character.', '这种结合为我们的干邑带来平衡与复杂度。干邑酿造的秘密代代相传，每一代都为前人的技艺增添细微之处，从而赋予 Léopold Croizet 干邑独特而非凡的个性。'],
  ['The bottling of our cognacs is done on the property. The vast majority is handmade as in the past. We take special care when dressing our bottles.', '我们的干邑均在酒庄装瓶，大部分环节仍像过去一样以手工完成。我们格外重视每一只酒瓶的呈现。'],
  ['Our team ensures the quality of our stock and redoubles our vigilance in the control of bottles.', '团队确保库存品质，并在酒瓶检查中加倍谨慎。'],
  ['Léopold Croizet cognacs originate from a distinguished ancient line of winegrowers. We are situated in the privileged Cognac region called, (AOC) “Fins Bois Cru”, at the heart of the village of Triac lautrait, close to the Charente River, Come and discover our cognacs, soak up our identity and personality in an authentic atmosphere steeped in history.', 'Léopold Croizet 干邑源自古老而卓越的葡萄种植家族。我们位于优越的 Cognac 产区 Fins Bois，在 Triac-Lautrait 村中心，靠近夏朗德河。欢迎走近我们的干邑，在充满历史的真实氛围中感受我们的身份与个性。'],
  ['I am Léopold Croizet, I represent the 9th generation of winegrowers on the estate. I inherited it from my father who inherited it from his mother who herself inherited it from her father and so on&#8230; Our vineyard, planted mainly in the commune of Triac Lautrait, brings together 30 hectares around a farm typically Charente. Here we are in the heart of the village, Lantin, near Jarnac. It is a privileged land. It belongs to the Fins Bois cru and benefits from the clay-limestone limits of the lands of Champagne.', '我是 Léopold Croizet，代表酒庄第九代葡萄种植者。我从父亲手中继承，他又从母亲那里继承，如此一代代延续。我们的葡萄园主要位于 Triac-Lautrait，围绕典型的夏朗德农庄分布约 30 公顷。这里位于 Lantin 村中心，靠近 Jarnac，是属于 Fins Bois 的优越土地，并受益于香槟区边缘的黏土石灰质土壤。'],
  ['What is your work and its scope within Maison Léopold Croizet?', '您在 Maison Léopold Croizet 的工作是什么？'],
  ['Since 2001, I have taken my full place in the family adventure. I am a winemaker, distiller, master-blender. I spread the word to my friends and consumers of Léopold Croizet cognac. I am also an actor of the passage of time! Time is an essential element to be taken into account for the production of cognac. « It’s about letting time work, but being active! »', '自 2001 年起，我真正加入了这段家族事业。我是葡萄种植者、蒸馏师与调配师，也向朋友和消费者讲述 Léopold Croizet 干邑。我同样是时间传承中的行动者。时间是干邑生产中必须考虑的核心元素：让时间发挥作用，同时保持主动。'],
  ['What major assets and know-how do you have ?', '你们最重要的优势与技艺是什么？'],
  ['First of all in the working method: our vineyard is fully converted to organic farming. I started the conversion as soon as I arrived on the estate. The entire vineyard is dedicated to the production of our cognacs which leaves me free choice on the conduct I wish to lead and the direction I wish to offer to my “eaux de vie”. We choose an old-fashioned culture with organic smoke and premature harvests to maintain good acidity and give elegant and aromatic “eaux de vie”. The distillation is carried out in two small potstills of 16hl and 20hl, those that my grandmother had installed! Our distillation method remains uncommon in the region, it comes from my father who himself got it from his mother: a family secret!', '首先体现在工作方式上：我们的葡萄园已完全转为有机耕作。我一来到酒庄便启动了这一转型。整个葡萄园都用于我们干邑的生产，这让我能自由决定葡萄园管理方式，以及希望赋予生命之水的方向。我们选择传统耕作方式，以有机肥和较早采收保持良好酸度，酿出优雅而芳香的生命之水。蒸馏在两台 16hl 与 20hl 的小型铜壶蒸馏器中完成，那是我祖母当年安装的设备。我们的蒸馏方法在本地区并不常见，来自我的父亲，而他又从母亲那里继承下来：这是一个家族秘密。'],
  ['What are the values that take precedence and distinguish you from other brands?', '哪些价值观最能使你们区别于其他品牌？'],
  ['Could you describe the particularity and the style of your cognacs ?', '您如何描述你们干邑的独特性与风格？'],
];

try {
  await access(path.join(ROOT, 'en'));
} catch {
  throw new Error('The English source directory is required before generating Chinese pages.');
}

await rm(path.join(ROOT, 'zh'), { recursive: true, force: true });
await cp(path.join(ROOT, 'en'), path.join(ROOT, 'zh'), { recursive: true });

for (const file of await walkHtml(path.join(ROOT, 'zh'))) {
  const route = routeForFile(file);
  let html = await readFile(file, 'utf8');
  html = localizeCopiedEnglishPage(html, route);
  await writeFile(file, html, 'utf8');
}

const frenchCocktailsFile = path.join(ROOT, 'pierre-croizet-cocktails', 'index.html');
const chineseCocktailsFile = path.join(ROOT, 'zh', 'pierre-croizet-cocktails', 'index.html');
await writeFile(
  chineseCocktailsFile,
  localizeFrenchCocktailPage(await readFile(frenchCocktailsFile, 'utf8')),
  'utf8',
);

const allFiles = await walkHtml(ROOT);
const existingRoutes = new Set(allFiles.map(routeForFile));
for (const file of allFiles) {
  const route = routeForFile(file);
  const html = await readFile(file, 'utf8');
  await writeFile(file, replaceLanguageSwitcher(html, route, existingRoutes), 'utf8');
}

console.log('Chinese locale pages generated: zh');

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

function localizeCopiedEnglishPage(html, route) {
  let next = html
    .replace(/<html([^>]*)lang=["'][^"']*["']([^>]*)>/i, '<html$1lang="zh-Hans"$2>')
    .replaceAll(`${DEPLOY_BASE}/en/`, `${DEPLOY_BASE}/zh/`)
    .replaceAll(`${PUBLIC_ORIGIN}/en/`, `${PUBLIC_ORIGIN}/zh/`)
    .replaceAll('menu-menu-principal-anglais', 'menu-menu-principal-zh')
    .replaceAll('menu-pied-de-page-en', 'menu-pied-de-page-zh')
    .replace(/href="\/Cognac-Leopold-Croizet-site\/collection\//g, `href="${DEPLOY_BASE}/zh/collection/`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/(la-matiere|le-feu|lalchimie|le-temps|leopold-croizet|rencontre|pierre-croizet-cocktails)\//g, `href="${DEPLOY_BASE}/zh/$1/`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/panier\//g, `href="${DEPLOY_BASE}/zh/cart/`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/mon-compte\//g, `href="${DEPLOY_BASE}/zh/my-account/`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/commander\//g, `href="${DEPLOY_BASE}/zh/checkout/`)
    .replace(/href="http:\/\/cognacg\.cluster028\.hosting\.ovh\.net\/wordpress\/produit\/([^/]+)\/"/g, (match, slug) => (
      `href="${DEPLOY_BASE}/zh/collection/${slug}/"`
    ))
    .replace(/href="http:\/\/cognacg\.cluster028\.hosting\.ovh\.net\/wordpress\/(la-matiere|le-feu|lalchimie|le-temps|rencontre)\/"/g, (match, slug) => (
      `href="${DEPLOY_BASE}/zh/${slug}/"`
    ));

  for (const [from, to] of [...editorialCopy, ...translations]) next = next.split(from).join(to);
  for (const [from, to] of Object.entries(sensory)) next = next.split(`>${from}<`).join(`>${to}<`);

  next = localizeAgeGate(next);
  next = localizeProductCopy(next, route);
  next = localizeCocktails(next);
  next = removePrices(next);
  next = localizeNewsletter(next);
  next = localizeOrderControls(next);
  next = repairTechnicalStrings(next);

  return next.replace(
    /<div class="texte-medaille">\s*[\s\S]*?\s*<\/div>/,
    '<div class="texte-medaille">\n      屡获奖项的酒窖\n    </div>',
  );
}

function localizeAgeGate(html) {
  return html
    .replace(/Pour accéder à notre site, vous devez être en âge d’acheter et de consommer de l’alcool conformément à la législation en vigueur dans votre pays\/région\s*de résidence\./g, '访问本网站前，您必须达到您所在国家或地区法律规定的购买和饮用酒精饮品的法定年龄。')
    .replace(/Si cette législation n’existe pas dans votre pays\/région,\s*vous devez avoir au moins 21 ans\./g, '如果您所在国家或地区没有相关规定，您必须年满 21 岁。')
    .replace(/En cliquant sur « Entrer » vous confirmez avoir l'âge requis dans votre pays pour visiter ce site\./g, '点击“进入”即表示您确认已达到所在国家或地区访问本网站所需的法定年龄。')
    .replace(/Vous acceptez nos <a href="#">Conditions générales d'utilisation<\/a> et déclarez avoir lu notre/g, '您接受我们的 <a href="#">使用条款</a>，并确认已阅读我们的')
    .replace(/<a href="#">Charte de données personnelles & Cookies<\/a>/g, '<a href="#">个人数据与 Cookie 政策</a>')
    .replace(/<button type="submit">Entrer<\/button>/g, '<button type="submit">进入</button>');
}

function localizeProductCopy(html, route) {
  const slug = matchFirst(route, /^\/zh\/collection\/([^/]+)\//);
  if (!slug) return html;
  const source = englishProductCopy[slug];
  const target = productCopy[slug];
  if (!source || !target) return html;
  return html
    .replace(source.note, target.note)
    .replace(source.view, target.view)
    .replace(source.nose, target.nose)
    .replace(source.mouth, target.mouth);
}

function localizeCocktails(html) {
  if (!html.includes('container-page cocktails')) return html;
  const replacements = [
    ['Ingredients', '配料'],
    ['Preparation', '制作'],
    ['Decoration', '装饰'],
    ['Aromatic profile', '芳香轮廓'],
    ['Fruity', '果香'],
    ['Fresh', '清新'],
    ['Gourmet', '丰美'],
    ['Elegant', '优雅'],
    ['Spicy', '辛香'],
    ['Balanced', '平衡'],
    ['1 piece of sugar', '1 块方糖'],
    ['2 dashes of bitter Angostura', '2 滴安格斯图拉苦精'],
    ['1 twist of lemon', '1 条柠檬皮'],
    ['1 twist of orange', '1 条橙皮'],
    ['2 cl cane sugar syrup', '2 cl 甘蔗糖浆'],
    ['6 mint leaves', '6 片薄荷叶'],
    ['1/2 lime', '1/2 个青柠'],
    ['sparkling water', '苏打水'],
    ['crushed ice', '碎冰'],
    ['4 thin slices of ginger', '4 片薄姜'],
    ['1 lime zest', '1 条青柠皮'],
    ['6 cl lemonade', '6 cl 柠檬汽水'],
    ['1 cucumber peel', '1 条黄瓜皮'],
    ['Melt the sugar in the glass, sprinkle it with Angostura.', '在杯中溶化方糖，并滴入安格斯图拉苦精。'],
    ['Decorate your glass with a twist of orange.', '以橙皮装饰酒杯。'],
    ['Your Old Fashioned cocktail is ready!', '您的 Old Fashioned 已调制完成。'],
    ['Place the whole mint leaves at the bottom of each glass.', '将完整薄荷叶置于杯底。'],
    ['Add the cognac', '加入干邑'],
    ['Complete with sparkling water.', '以苏打水补足。'],
    ['Mix .', '轻轻搅拌。'],
    ['Straw or no straw, it’s ready', '可配吸管，也可直接享用。'],
    ['Your Summit is ready', '您的 Summit 已调制完成。'],
  ];
  let next = html;
  for (const [from, to] of replacements) next = next.split(from).join(to);
  return next;
}

function localizeFrenchCocktailPage(html) {
  let next = html
    .replace(/<html([^>]*)lang=["'][^"']*["']([^>]*)>/i, '<html$1lang="zh-Hans"$2>')
    .replaceAll(`${PUBLIC_ORIGIN}/pierre-croizet-cocktails/`, `${PUBLIC_ORIGIN}/zh/pierre-croizet-cocktails/`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/"/g, `href="${DEPLOY_BASE}/zh/"`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/collection\/"/g, `href="${DEPLOY_BASE}/zh/shop/"`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/collection\/([^/]+)\/"/g, (match, slug) => (
      `href="${DEPLOY_BASE}/zh/collection/${slug}/"`
    ))
    .replace(/href="\/Cognac-Leopold-Croizet-site\/(la-matiere|le-feu|lalchimie|le-temps|leopold-croizet|rencontre|pierre-croizet-cocktails)\//g, `href="${DEPLOY_BASE}/zh/$1/`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/panier\//g, `href="${DEPLOY_BASE}/zh/cart/`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/mon-compte\//g, `href="${DEPLOY_BASE}/zh/my-account/`)
    .replace(/href="\/Cognac-Leopold-Croizet-site\/commander\//g, `href="${DEPLOY_BASE}/zh/checkout/`)
    .replaceAll('menu-menu-principal-francais', 'menu-menu-principal-zh')
    .replaceAll('menu-pied-de-page-fr', 'menu-pied-de-page-zh');

  const replacements = [
    ['Cocktails Cognac Léopold Croizet | Recettes au Cognac et Pineau', 'Cognac Léopold Croizet 鸡尾酒 | 干邑与 Pineau 配方'],
    ["Découvrez Charente Spritz, L'Heure Dorée, Ginger d'Or et Golden Melon, quatre cocktails avec Cognac Léopold Croizet et Pineau des Charentes.", "探索 Charente Spritz、L'Heure Dorée、Ginger d'Or 与 Golden Melon，四款以 Cognac Léopold Croizet 与 Pineau des Charentes 调制的鸡尾酒。"],
    ['Cocktails <strong>Léopold Croizet</strong>', 'Léopold Croizet <strong>鸡尾酒</strong>'],
    ['Idées fraîches pour les beaux jours. Quatre créations autour du Cognac Léopold Croizet, du Pineau des Charentes et du melon charentais, pensées comme un carnet d’apéritifs de maison.', '晴日里的清新灵感。四款围绕 Cognac Léopold Croizet、Pineau des Charentes 与夏朗德甜瓜创作的配方，如同一册优雅的酒庄开胃酒手记。'],
    ['晴日里的清新灵感. Quatre créations autour du Cognac Léopold Croizet, du Pineau des Charentes et du melon charentais, pensées comme un carnet d’apéritifs de maison.', '晴日里的清新灵感。四款围绕 Cognac Léopold Croizet、Pineau des Charentes 与夏朗德甜瓜创作的配方，如同一册优雅的酒庄开胃酒手记。'],
    ['aria-label="Accès rapide aux recettes"', 'aria-label="快速查看配方"'],
    ['aria-label="Esprit des cocktails Léopold Croizet"', 'aria-label="Léopold Croizet 鸡尾酒精神"'],
    ['aria-label="Recettes de cocktails Léopold Croizet"', 'aria-label="Léopold Croizet 鸡尾酒配方"'],
    ['L’apéritif charentais nouvelle génération.', '新一代夏朗德开胃酒。'],
    ['Le Golden Melon', 'Golden Melon'],
    ['Charente Spritz, Pineau Rosé, Cognac Léopold Croizet et melon charentais en terrasse', 'Charente Spritz，搭配 Pineau Rosé、Cognac Léopold Croizet 与夏朗德甜瓜'],
    ['L’Heure Dorée, cocktail au Pineau Blanc des Charentes, Cognac Léopold Croizet, basilic et melon', 'L’Heure Dorée，以 Pineau Blanc des Charentes、Cognac Léopold Croizet、罗勒与甜瓜调制'],
    ['Ginger d’Or au Cognac Léopold Croizet, ginger beer, citron vert et timbale en cuivre', 'Ginger d’Or，以 Cognac Léopold Croizet、姜汁啤酒与青柠调制，盛于铜杯'],
    ['Le Golden Melon au Cognac VSOP, Vieux Pineau des Charentes, melon et miel d’acacia', 'Golden Melon，以 Cognac VSOP、Vieux Pineau des Charentes、甜瓜与洋槐蜜调制'],
    ['Golden Melon au Cognac VSOP, Vieux Pineau des Charentes, melon et miel d’acacia', 'Golden Melon，以 Cognac VSOP、Vieux Pineau des Charentes、甜瓜与洋槐蜜调制'],
    ['01 · Pineau Rosé · Cognac VS · Melon', '01 · Pineau Rosé · Cognac VS · 甜瓜'],
    ['02 · Pineau Blanc · Cognac VS · Basilic', '02 · Pineau Blanc · Cognac VS · 罗勒'],
    ['03 · Cognac · Ginger beer · Citron vert', '03 · Cognac · 姜汁啤酒 · 青柠'],
    ['04 · Cognac VSOP · Vieux Pineau · Miel', '04 · Cognac VSOP · Vieux Pineau · 蜂蜜'],
    ['Signature apéritive', '招牌开胃酒'],
    ['Cocktail signature', '招牌鸡尾酒'],
    ['Fraîcheur &amp; caractère', '清新与个性'],
    ['L’expression gastronomique', '美食表达'],
    ['L’esprit des terrasses charentaises', '夏朗德露台的精神'],
    ['Entre la fraîcheur du melon charentais et les notes fruitées du Pineau Rosé des Charentes, le Charente Spritz réinvente l’apéritif d’été. Léger, pétillant et intensément gourmand, il révèle une expression moderne du terroir charentais sublimée par l’élégance du Cognac Léopold Croizet.', '夏朗德甜瓜的清新与 Pineau Rosé des Charentes 的果香交织，Charente Spritz 重新演绎夏日开胃酒。轻盈、带气泡感且丰美，以 Cognac Léopold Croizet 的优雅升华这片风土的现代表达。'],
    ['Depuis des générations, en Charente, le melon accompagne naturellement le Pineau des Charentes. Maison Léopold Croizet revisite cet accord emblématique dans une création fraîche, élégante et contemporaine, où la douceur du melon révèle toute la finesse du Pineau Blanc et du Cognac Léopold Croizet.', '数代以来，在夏朗德，甜瓜与 Pineau des Charentes 自然相伴。Maison Léopold Croizet 以清新、优雅而当代的方式重新诠释这一经典组合，让甜瓜的柔美展现 Pineau Blanc 与 Cognac Léopold Croizet 的细腻。'],
    ['Ginger d’Or associe l’éclat du citron vert, la vivacité du ginger beer et la richesse aromatique du Cognac Léopold Croizet. Un cocktail frais, épicé et intensément désaltérant, servi dans l’esprit des grandes signatures de bar.', 'Ginger d’Or 将青柠的明亮、姜汁啤酒的活力与 Cognac Léopold Croizet 的芳香深度结合。清新、辛香、极富解渴感，呈现高级酒吧招牌鸡尾酒的精神。'],
    ['Alliance rare entre la profondeur du Cognac VSOP et la douceur du Vieux Pineau, le Golden Melon met à l’honneur le melon charentais dans une création élégante et raffinée. Une expérience gourmande et sophistiquée, pensée comme un dessert à boire.', 'Cognac VSOP 的深度与 Vieux Pineau 的柔美罕见结合，Golden Melon 以优雅精致的创作致敬夏朗德甜瓜。丰美而高级，如一款可饮用的甜点。'],
    ['aria-label="Profil aromatique"', 'aria-label="芳香轮廓"'],
    ['Profil aromatique', '芳香轮廓'],
    ['Fruité', '果香'],
    ['Pétillant', '气泡感'],
    ['Rafraîchissant', '清爽'],
    ['Estival', '夏日'],
    ['Frais', '清新'],
    ['Gourmand', '丰美'],
    ['Élégant', '优雅'],
    ['Épicé', '辛香'],
    ['Vif', '明快'],
    ['Équilibré', '平衡'],
    ['Rond', '圆润'],
    ['Subtil', '细腻'],
    ['Ingrédients', '配料'],
    ['Préparation', '制作'],
    ['Décoration', '装饰'],
    ['Le conseil Maison', '酒庄建议'],
    ['60 ml de Pineau Rosé des Charentes Léopold Croizet (assemblage 50 % rouge / 50 % blanc)', '60 ml Pineau Rosé des Charentes Léopold Croizet（50% 红 Pineau / 50% 白 Pineau 调配）'],
    ['20 ml de Cognac Léopold Croizet VS', '20 ml Cognac Léopold Croizet VS'],
    ['80 g de melon charentais', '80 g 夏朗德甜瓜'],
    ['Eau pétillante', '气泡水'],
    ['Quelques glaçons', '适量冰块'],
    ['Mixer le melon charentais avec le Pineau Rosé.', '将夏朗德甜瓜与 Pineau Rosé 混合搅打。'],
    ['Ajouter le Cognac Léopold Croizet VS.', '加入 Cognac Léopold Croizet VS。'],
    ['Verser dans un grand verre ballon rempli de glaçons.', '倒入装满冰块的大号气球杯。'],
    ['Compléter avec l’eau pétillante.', '以气泡水补足。'],
    ['Remuer délicatement.', '轻轻搅拌。'],
    ['Servir très frais.', '充分冰镇后享用。'],
    ['Bille de melon charentais', '夏朗德甜瓜球'],
    ['Zeste d’orange fraîche', '新鲜橙皮'],
    ['60 ml de Pineau Blanc des Charentes Léopold Croizet', '60 ml Pineau Blanc des Charentes Léopold Croizet'],
    ['30 ml de Cognac Léopold Croizet VS', '30 ml Cognac Léopold Croizet VS'],
    ['100 g de melon charentais bien mûr', '100 g 熟透的夏朗德甜瓜'],
    ['2 feuilles de basilic frais', '2 片新鲜罗勒叶'],
    ['1 trait de citron vert', '少量青柠汁'],
    ['Déposer le melon dans le blender.', '将甜瓜放入搅拌机。'],
    ['Ajouter le Pineau Blanc des Charentes Léopold Croizet, le Cognac Léopold Croizet VS, le basilic, le citron vert et les glaçons.', '加入 Pineau Blanc des Charentes Léopold Croizet、Cognac Léopold Croizet VS、罗勒、青柠汁与冰块。'],
    ['Mixer pendant 15 secondes.', '搅打 15 秒。'],
    ['Servir bien frais dans un verre ballon.', '充分冰镇后倒入气球杯享用。'],
    ['Mini brochette de melon charentais', '夏朗德甜瓜迷你串'],
    ['Feuille de basilic frais', '新鲜罗勒叶'],
    ['Le cocktail qui transforme une tradition charentaise en expérience moderne.', '一款将夏朗德传统转化为现代体验的鸡尾酒。'],
    ['4 cl de Cognac Léopold Croizet', '4 cl Cognac Léopold Croizet'],
    ['1,5 cl de jus de citron vert', '1.5 cl 青柠汁'],
    ['12 cl de ginger beer', '12 cl 姜汁啤酒'],
    ['Une rondelle de citron vert', '一片青柠'],
    ['Remplir une timbale en cuivre de glaçons.', '在铜杯中装入冰块。'],
    ['Verser le Cognac Léopold Croizet et le jus de citron vert.', '倒入 Cognac Léopold Croizet 与青柠汁。'],
    ['Compléter avec la ginger beer.', '以姜汁啤酒补足。'],
    ['Décorer d’une rondelle de citron vert.', '以一片青柠装饰。'],
    ['Déguster bien frais.', '充分冰镇后品饮。'],
    ['Utilisez une ginger beer de qualité pour sublimer les notes épicées et la fraîcheur du citron vert.', '选用品质上乘的姜汁啤酒，以凸显辛香气息与青柠的清新感。'],
    ['Un classique revisité avec l’élégance du Cognac.', '以 Cognac 的优雅重新演绎经典。'],
    ['50 ml de Cognac Léopold Croizet VSOP', '50 ml Cognac Léopold Croizet VSOP'],
    ['50 ml de Vieux Pineau des Charentes Léopold Croizet', '50 ml Vieux Pineau des Charentes Léopold Croizet'],
    ['100 g de melon très mûr', '100 g 非常成熟的甜瓜'],
    ['1 c. à c. de miel d’acacia', '1 茶匙洋槐蜜'],
    ['Zeste d’orange', '橙皮'],
    ['Mixer le melon très mûr avec le Vieux Pineau et le miel d’acacia jusqu’à obtenir une texture lisse.', '将熟透甜瓜、Vieux Pineau 与洋槐蜜搅打至质地顺滑。'],
    ['Ajouter le Cognac Léopold Croizet VSOP et quelques glaçons.', '加入 Cognac Léopold Croizet VSOP 与适量冰块。'],
    ['Mixer 15 secondes.', '搅打 15 秒。'],
    ['Verser dans un verre à vin ou un grand verre ballon.', '倒入葡萄酒杯或大号气球杯。'],
    ['Décorer d’un zeste d’orange.', '以橙皮装饰。'],
    ['Fine lamelle de melon', '薄片甜瓜'],
    ['Quand le melon dévoile sa plus belle maturité, le Cognac et le Pineau signent une création d’exception.', '当甜瓜展现最美成熟度，Cognac 与 Pineau 共同成就一款非凡之作。'],
    ['L’abus d’alcool est dangereux pour la santé. À consommer avec modération.', '过量饮酒有害健康，请适量饮用。'],
  ];

  for (const [from, to] of [...replacements, ...translations]) next = next.split(from).join(to);

  next = localizeAgeGate(next);
  next = localizeNewsletter(next);
  next = localizeOrderControls(next);
  next = repairTechnicalStrings(next);

  return next.replace(
    /<div class="texte-medaille">\s*[\s\S]*?\s*<\/div>/,
    '<div class="texte-medaille">\n      屡获奖项的酒窖\n    </div>',
  );
}

function removePrices(html) {
  return html
    .replace(/\s*<div class="prix-produit-collection">\s*<span>[0-9\s.,]+<\/span>\s*€\s*<\/div>\s*/g, '\n')
    .replace(/\s*<div class="prix-produit-container">\s*<span>[0-9\s.,]+<\/span>\s*€\s*<\/div>\s*/g, '\n')
    .replace(/\s*<p class="price">[\s\S]*?<\/p>\s*/g, '\n')
    .replace(/\s*<span class="woocommerce-Price-amount amount">[\s\S]*?<\/span>\s*/g, '\n')
    .replace(/\s*<form class="cart"[\s\S]*?<\/form>\s*/g, '\n');
}

function localizeNewsletter(html) {
  if (!html.includes('container-newsletter')) return html;
  return html
    .replace(/<label for="">[\s\S]*?<\/label>\s*(?=\s*<div class="info-legales">)/, '<label for="">我希望不时收到来自酒庄的消息。</label>\n')
    .replace(/<div class="info-legales">\s*[\s\S]*?\s*<\/div>\s*(?=\s*<div class="info-systeme">)/, `<div class="info-legales">
        填写电子邮箱即表示您同意每月接收我们的产品资讯，并确认已阅读我们的 <a href="${DEPLOY_BASE}/mentions-legales/">法律声明</a>。如需退订，请发送电子邮件至 cognac@mdpierrre.com。
    </div>\n`)
    .replace(/(<input\b[^>]*name="newsletter"[^>]*placeholder=")[^"]*(")/, '$1请输入您的电子邮箱$2')
    .replace(/(<form\b[^>]*class="[^"]*\bcontainer-newsletter\b[^"]*"[\s\S]*?<button type="submit">)[\s\S]*?(<\/button>)/, '$1发送$2');
}

function localizeOrderControls(html) {
  return html
    .replace(/class=" btn-commander-produit">\s*Order\s*<\/a>/g, 'class=" btn-commander-produit"> 咨询</a>')
    .replace(/class="commander-produit">\s*Order\s*<\/a>/g, 'class="commander-produit">咨询</a>')
    .replace(/class=" btn-commander-produit">\s*Send\s*<\/a>/g, 'class=" btn-commander-produit"> 咨询</a>')
    .replace(/class="commander-produit">\s*Send\s*<\/a>/g, 'class="commander-produit">咨询</a>');
}

function repairTechnicalStrings(html) {
  return html.replace(/\bloading时间\b/g, 'loadingTime');
}

function replaceLanguageSwitcher(html, route, existingRoutes) {
  const key = normalizedRouteKey(route);
  const currentLocale = languageForRoute(route);
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

  const block = `<div class="wpml-ls-statics-shortcode_actions wpml-ls wpml-ls-legacy-list-horizontal">\n\t<ul>${items}</ul>\n</div>`;
  const regex = /<div class="wpml-ls-statics-shortcode_actions wpml-ls wpml-ls-legacy-list-horizontal">[\s\S]*?<\/ul>\s*<\/div>/;
  return regex.test(html) ? html.replace(regex, block) : html;
}

function normalizedRouteKey(route) {
  if (route === '/') return '/';
  if (/^\/(?:en|ru|da|sv|no|zh)\/$/.test(route)) return '/';
  if (route === '/en/shop/' || route === '/ru/a-faire/' || /^\/(?:da|sv|no|zh)\/shop\/$/.test(route)) return '/collection/';
  if (route === '/en/cart/' || route === '/ru/panier-2/' || /^\/(?:da|sv|no|zh)\/cart\/$/.test(route)) return '/panier/';
  if (route === '/en/checkout/' || route === '/ru/validation/' || /^\/(?:da|sv|no|zh)\/checkout\/$/.test(route)) return '/commander/';
  if (route === '/en/my-account/' || route === '/ru/mon-compte-2/' || /^\/(?:da|sv|no|zh)\/my-account\/$/.test(route)) return '/mon-compte/';
  if (route === '/ru/%d0%bb%d0%b5%d0%be%d0%bf%d0%be%d0%bb%d1%8c%d0%b4%d0%b0-%d0%ba%d1%80%d1%83%d0%b0%d0%b7%d0%b5/') return '/leopold-croizet/';
  if (route === '/en/categorie-produit/non-classe-en/' || route === '/ru/categorie-produit/non-classe-ru/' || /^\/(?:da|sv|no|zh)\/categorie-produit\/non-classe-en\/$/.test(route)) return '/categorie-produit/non-classe/';
  const prefixMatch = route.match(/^\/(?:en|da|sv|no|zh)(\/.*)$/);
  if (prefixMatch) return prefixMatch[1];
  const ruMatch = route.match(/^\/ru(\/.*)$/);
  return ruMatch ? ruMatch[1] : route;
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
  const match = route.match(/^\/(en|ru|da|sv|no|zh)\//);
  return match ? match[1] : 'fr';
}

function matchFirst(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : '';
}
