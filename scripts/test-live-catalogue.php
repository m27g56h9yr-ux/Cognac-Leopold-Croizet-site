<?php
require $argv[1];
function check($name,$ok){if(!$ok)throw new RuntimeException($name);echo "PASS $name\n";}
$p=['reference'=>'EO0001','name'=>'SYNTHETIC VS','volume_ml'=>700,'price_cents'=>4500,'currency'=>'EUR','product_url'=>'https://cognac-esprit-organic.com/produits/fondation-vs.html','availability'=>'InStock','order_url'=>'https://boutique.mdpierre.com/commander/?mdp_ref=EO0001&mdp_lang=fr'];
$d=['version'=>1,'brand'=>'eo','currency'=>'EUR','generated_at'=>time(),'products'=>[$p]];
mdp_catalogue_validate($d,'eo');
$html='<html><head><script type="application/ld+json">{"@type":"Product","size":"700 ml","offers":{"price":"99"}}</script></head><body><section id="mdp-direct-order">OLD PRICE</section></body></html>';
$a=mdp_catalogue_render($html,$d,$p['product_url'],'eo');check('visible price and SEO from same feed',str_contains($a,'45,00 €')&&str_contains($a,'"price":"45.00"')&&str_contains($a,'https://schema.org/InStock')&&!str_contains($a,'OLD PRICE'));
$d['products'][0]['price_cents']=5700;$d['products'][0]['availability']='BackOrder';$a=mdp_catalogue_render($html,$d,$p['product_url'],'eo');check('price and stock changes update both representations',str_contains($a,'57,00 €')&&str_contains($a,'"price":"57.00"')&&str_contains($a,'Sur préparation')&&str_contains($a,'https://schema.org/BackOrder'));
$a=mdp_catalogue_render($html,null,$p['product_url'],'eo');check('outage removes stale prices and SEO offers',!str_contains($a,'OLD PRICE')&&!str_contains($a,'"offers"')&&str_contains($a,'momentanément indisponibles'));
foreach(['brand','stale','foreign_link','wrong_format','swapped_product'] as $case){$bad=$d;if($case==='brand')$bad['brand']='lc';if($case==='stale')$bad['generated_at']=time()-200;if($case==='foreign_link')$bad['products'][0]['order_url']='https://example.invalid';if($case==='swapped_product')$bad['products'][0]['product_url']='https://cognac-esprit-organic.com/produits/xxo.html';if($case==='wrong_format')$bad['products'][0]['volume_ml']='700';try{mdp_catalogue_validate($bad,'eo');throw new LogicException('accepted');}catch(RuntimeException $e){check('reject '.$case,true);}}
