<?php
// Synthetic fixture prices: these do not change the commercial catalogue.
require $argv[1];

function check(string $name,bool $ok): void {
    if(!$ok)throw new RuntimeException($name);
    echo "PASS $name\n";
}
function json_ld(string $html): array {
    preg_match_all('#<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>#s',$html,$matches);
    $schemas=[];
    foreach($matches[1] as $source){$decoded=json_decode($source,true);if(is_array($decoded))$schemas[]=$decoded;}
    return $schemas;
}
function nodes_of_type($node,string $type): array {
    $found=[];
    $walk=function($value)use(&$walk,&$found,$type): void {
        if(!is_array($value))return;
        if(($value['@type']??null)===$type)$found[]=$value;
        foreach($value as $child)if(is_array($child))$walk($child);
    };
    $walk($node);return $found;
}
function product_by_sku(array $schemas,string $sku): ?array {
    foreach($schemas as $schema)foreach(nodes_of_type($schema,'Product') as $product)if(($product['sku']??null)===$sku)return $product;
    return null;
}
function page_product(array $schemas,string $id): ?array {
    foreach($schemas as $schema)foreach(array_merge(nodes_of_type($schema,'Product'),nodes_of_type($schema,'ProductGroup')) as $product)
        if(($product['@id']??null)===$id)return $product;
    return null;
}
function item(string $reference,string $name,int $volume,string $url,int $price): array {
    return ['reference'=>$reference,'name'=>$name,'volume_ml'=>$volume,'price_cents'=>$price,'currency'=>'EUR','product_url'=>$url,
        'availability'=>'InStock','order_url'=>'https://boutique.mdpierre.com/commander/?mdp_ref='.$reference.'&mdp_lang=fr'];
}
function render_page(string $source,array $products,string $brand,string $url): string {
    return mdp_catalogue_render($source,['generated_at'=>time(),'products'=>$products],$url,$brand);
}
function product_fixture(array $product): string {
    return '<script type="application/ld+json">'.json_encode(['@context'=>'https://schema.org']+$product,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).'</script><section id="mdp-direct-order">Ancien bloc</section>';
}

$lcUrl='https://cognac-leopold-croizet.com/collection/vs/';
$lcSource=product_fixture(['@type'=>'Product','@id'=>$lcUrl.'#product','url'=>$lcUrl,'name'=>'Cognac Léopold Croizet VS',
    'size'=>'700 ml','gtin13'=>'3322870003330','additionalProperty'=>[['@type'=>'PropertyValue','name'=>'Bottle size','value'=>'70 cl']]]);
$lcProducts=[item('LC0001','Cognac Léopold Croizet VS — 70 cl',700,$lcUrl,5100),item('LC0002','Cognac Léopold Croizet VS — 35 cl',350,$lcUrl,3200)];
$lcRendered=render_page($lcSource,$lcProducts,'lc',$lcUrl);$lcSchemas=json_ld($lcRendered);$lcGroup=page_product($lcSchemas,$lcUrl.'#product');
check('LC VS preserves root @id and becomes a ProductGroup',is_array($lcGroup)&&$lcGroup['@type']==='ProductGroup'&&$lcGroup['@id']===$lcUrl.'#product');
check('LC VS group does not claim a bottle size or bottle GTIN',!isset($lcGroup['size'])&&!isset($lcGroup['gtin13'])&&!isset($lcGroup['offers']));
$lc70=product_by_sku($lcSchemas,'LC0001');$lc35=product_by_sku($lcSchemas,'LC0002');
check('LC VS 70 cl offer belongs to its exact variant',is_array($lc70)&&$lc70['size']==='700 ml'&&($lc70['offers'][0]['price']??null)==='51.00'&&($lc70['offers'][0]['availability']??null)==='https://schema.org/InStock'&&($lc70['offers'][0]['itemOffered']['@id']??null)===$lc70['@id']);
check('LC VS root GTIN transfers only to 70 cl',is_array($lc70)&&($lc70['gtin13']??null)==='3322870003330'&&is_array($lc35)&&$lc35['size']==='350 ml'&&!isset($lc35['gtin13']));
check('LC VS 35 cl offer belongs to its exact variant',is_array($lc35)&&($lc35['offers'][0]['price']??null)==='32.00'&&($lc35['offers'][0]['availability']??null)==='https://schema.org/InStock'&&($lc35['offers'][0]['itemOffered']['@id']??null)===$lc35['@id']);
check('LC VS variant IDs are stable URL plus format',($lc70['@id']??null)===$lcUrl.'#variant-700ml'&&($lc35['@id']??null)===$lcUrl.'#variant-350ml');
$rootOnlySchema=['@context'=>'https://schema.org','@type'=>'Product','@id'=>$lcUrl.'#product','url'=>$lcUrl,'name'=>'Cognac Léopold Croizet VS','size'=>'700 ml','gtin13'=>'3322870003330'];
$rootOnlySource='<script type="application/ld+json">'.json_encode($rootOnlySchema).'</script>';
$rootOnly=render_page($rootOnlySource,[item('LC0002','Cognac Léopold Croizet VS — 35 cl',350,$lcUrl,3200)],'lc',$lcUrl);
$rootOnlySchemas=json_ld($rootOnly);$rootOnlyGroup=page_product($rootOnlySchemas,$lcUrl.'#product');
$retainedRootVariants=array_values(array_filter(nodes_of_type($rootOnlyGroup??[],'Product'),static fn($product)=>($product['gtin13']??null)==='3322870003330'));
check('LC root GTIN keeps its 70 cl variant when only 35 cl remains sellable',is_array($rootOnlyGroup)&&$rootOnlyGroup['@type']==='ProductGroup'&&count($retainedRootVariants)===1&&$retainedRootVariants[0]['size']==='700 ml'&&!isset($retainedRootVariants[0]['offers']));

$eoUrl='https://cognac-esprit-organic.com/produits/single-cask.html';
$eoSource=product_fixture(['@type'=>'Product','@id'=>$eoUrl.'#product','url'=>$eoUrl,'name'=>'Single Cask','size'=>'500 ml',
    'offers'=>[['@type'=>'Offer','sku'=>'EO0008','url'=>'https://boutique.mdpierre.com/commander/?mdp_ref=EO0008&mdp_lang=fr','price'=>'110.00']],
    'hasVariant'=>[
        ['@type'=>'Product','name'=>'Cognac Esprit Organic Single Cask 70 cl','size'=>'700 ml','gtin13'=>'3322870011458','isVariantOf'=>['@id'=>$eoUrl.'#product']],
        ['@type'=>'Product','name'=>'Caisse Cognac Esprit Organic Single Cask n°1 6 x 70 cl','size'=>'6 x 700 ml','gtin13'=>'3322870011465','isVariantOf'=>['@id'=>$eoUrl.'#product']],
    ],
    'additionalProperty'=>[['@type'=>'PropertyValue','name'=>'GTIN variante 700 ml','value'=>'3322870011458'],['@type'=>'PropertyValue','name'=>'GTIN variante 6 x 700 ml','value'=>'3322870011465']]]);
$eoProducts=[item('EO0007','Single Cask — 70 cl',700,$eoUrl,16500),item('EO0008','Single Cask — 50 cl',500,$eoUrl,11000)];
$eoRendered=render_page($eoSource,$eoProducts,'eo',$eoUrl);$eoSchemas=json_ld($eoRendered);$eoGroup=page_product($eoSchemas,$eoUrl.'#product');
$eo50=product_by_sku($eoSchemas,'EO0008');$eo70=product_by_sku($eoSchemas,'EO0007');
check('EO Single Cask preserves root @id and groups 50/70 cl',is_array($eoGroup)&&$eoGroup['@type']==='ProductGroup'&&$eoGroup['@id']===$eoUrl.'#product'&&is_array($eo50)&&$eo50['size']==='500 ml'&&is_array($eo70)&&$eo70['size']==='700 ml');
check('EO Single Cask 50 cl does not receive an invented GTIN',is_array($eo50)&&!isset($eo50['gtin13'])&&!isset($eo50['gtin14']));
check('EO Single Cask 70 cl retains its source GTIN and exact offer',is_array($eo70)&&($eo70['gtin13']??null)==='3322870011458'&&($eo70['offers'][0]['price']??null)==='165.00'&&($eo70['offers'][0]['itemOffered']['@id']??null)===$eo70['@id']);
$caseVariants=array_values(array_filter(nodes_of_type($eoSchemas,'Product'),static fn($product)=>str_starts_with((string)($product['size']??''),'6 x ')));
check('EO Single Cask case remains a non-offer variant with its GTIN',count($caseVariants)===1&&!isset($caseVariants[0]['offers'])&&($caseVariants[0]['gtin13']??null)==='3322870011465');

$singleUrl='https://cognac-esprit-organic.com/produits/fondation-vs.html';
$singleSource=product_fixture(['@type'=>'Product','@id'=>$singleUrl.'#product','url'=>$singleUrl,'name'=>'Fondation VS','size'=>'700 ml','gtin13'=>'3322870010826']);
$single=render_page($singleSource,[item('EO0001','Fondation VS — 70 cl',700,$singleUrl,4500)],'eo',$singleUrl);
$singleProduct=page_product(json_ld($single),$singleUrl.'#product');
check('single matching format remains Product with its existing @id and GTIN',is_array($singleProduct)&&$singleProduct['@type']==='Product'&&$singleProduct['@id']===$singleUrl.'#product'&&$singleProduct['size']==='700 ml'&&($singleProduct['gtin13']??null)==='3322870010826'&&($singleProduct['offers'][0]['price']??null)==='45.00');

$changed=item('EO0001','SYNTHETIC VS',700,$singleUrl,5700);$changed['availability']='BackOrder';
$updated=render_page($singleSource,[$changed],'eo',$singleUrl);$updatedProduct=page_product(json_ld($updated),$singleUrl.'#product');
check('price and stock changes update visible text and SEO together',str_contains($updated,'57,00 €')&&str_contains($updated,'Sur préparation')&&($updatedProduct['offers'][0]['price']??null)==='57.00'&&($updatedProduct['offers'][0]['availability']??null)==='https://schema.org/BackOrder'&&!str_contains($updated,'45,00 €'));

$stale='<script type="application/ld+json">'.json_encode(['@context'=>'https://schema.org','@type'=>'Product','@id'=>$eoUrl.'#product','size'=>'500 ml','offers'=>['@type'=>'Offer','url'=>'https://boutique.mdpierre.com/commander/?mdp_ref=EO0008&mdp_lang=fr','price'=>'110.00'],
    'hasVariant'=>[['@type'=>'Product','name'=>'Caisse 6 x 70 cl','size'=>'6 x 700 ml','offers'=>['@type'=>'Offer','url'=>'https://boutique.mdpierre.com/commander/?mdp_ref=EO9999&mdp_lang=fr','price'=>'999.00']]]]).'</script><section id="mdp-direct-order">Ancien bloc</section>';
$outage=mdp_catalogue_render($stale,null,$eoUrl,'eo');$outageSchemas=json_ld($outage);$remaining=[];
foreach($outageSchemas as $schema)foreach(array_merge(nodes_of_type($schema,'Product'),nodes_of_type($schema,'ProductGroup')) as $product)if(isset($product['offers']))$remaining[]=$product['offers'];
check('catalogue outage recursively removes stale MDP offers',!$remaining&&str_contains($outage,'momentanément indisponibles'));

foreach(['brand','stale','foreign_link','wrong_format','swapped_product'] as $case){
    $bad=['version'=>1,'brand'=>'eo','currency'=>'EUR','generated_at'=>time(),'products'=>[item('EO0001','SYNTHETIC VS',700,$singleUrl,4500)]];
    if($case==='brand')$bad['brand']='lc';
    if($case==='stale')$bad['generated_at']=time()-200;
    if($case==='foreign_link')$bad['products'][0]['order_url']='https://example.invalid';
    if($case==='swapped_product')$bad['products'][0]['product_url']='https://cognac-esprit-organic.com/produits/xxo.html';
    if($case==='wrong_format')$bad['products'][0]['volume_ml']='700';
    try{mdp_catalogue_validate($bad,'eo');throw new LogicException('accepted');}
    catch(RuntimeException $e){check('reject '.$case,true);}
}
