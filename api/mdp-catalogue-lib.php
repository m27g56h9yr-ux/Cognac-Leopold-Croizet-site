<?php
/** Shared read-only storefront renderer. No credentials, orders or browser sessions. */
function mdp_catalogue_validate($data,string $brand): array {
    if (!is_array($data) || ($data['version']??null)!==1 || ($data['brand']??null)!==$brand || ($data['currency']??null)!=='EUR' ||
        !is_int($data['generated_at']??null) || abs(time()-$data['generated_at'])>180 || !is_array($data['products']??null) || count($data['products'])>100) throw new RuntimeException('Invalid catalogue');
    static $bindings=null;$bindings??=json_decode('{"EO0001":[700,"https://cognac-esprit-organic.com/produits/fondation-vs.html"],"EO0002":[700,"https://cognac-esprit-organic.com/produits/conviction-vsop.html"],"EO0003":[350,"https://cognac-esprit-organic.com/produits/conviction-vsop.html"],"EO0004":[700,"https://cognac-esprit-organic.com/produits/cohesion-napoleon.html"],"EO0005":[700,"https://cognac-esprit-organic.com/produits/transmission-xo.html"],"EO0006":[700,"https://cognac-esprit-organic.com/produits/xxo.html"],"EO0007":[700,"https://cognac-esprit-organic.com/produits/single-cask.html"],"EO0008":[500,"https://cognac-esprit-organic.com/produits/single-cask.html"],"LC0001":[700,"https://cognac-leopold-croizet.com/collection/vs/"],"LC0002":[350,"https://cognac-leopold-croizet.com/collection/vs/"],"LC0003":[700,"https://cognac-leopold-croizet.com/collection/vsop/"],"LC0004":[350,"https://cognac-leopold-croizet.com/collection/vsop/"],"LC0005":[1000,"https://cognac-leopold-croizet.com/collection/vsop/"],"LC0006":[3000,"https://cognac-leopold-croizet.com/collection/vsop/"],"LC0007":[700,"https://cognac-leopold-croizet.com/collection/napoleon/"],"LC0008":[1000,"https://cognac-leopold-croizet.com/collection/napoleon/"],"LC0009":[700,"https://cognac-leopold-croizet.com/collection/xo/"],"LC0010":[350,"https://cognac-leopold-croizet.com/collection/xo/"],"LC0011":[700,"https://cognac-leopold-croizet.com/collection/xo-exception/"],"LC0012":[700,"https://cognac-leopold-croizet.com/collection/extra/"],"LC0013":[700,"https://cognac-leopold-croizet.com/collection/excellence/"],"LC0014":[700,"https://cognac-leopold-croizet.com/collection/heritage/"],"LC0015":[350,"https://cognac-leopold-croizet.com/collection/valentine/"],"LC0016":[2000,"https://cognac-leopold-croizet.com/"]}',true);
    $host=$brand==='eo'?'cognac-esprit-organic.com':'cognac-leopold-croizet.com';$seen=[];
    foreach($data['products'] as $p){
        if (!is_array($p) || !is_string($p['reference']??null) || !preg_match('/^'.strtoupper($brand).'[0-9]{4}$/D',$p['reference']) || isset($seen[$p['reference']]) ||
            !is_string($p['name']??null) || strlen($p['name'])>240 || !is_int($p['price_cents']??null) || $p['price_cents']<=0 || $p['price_cents']>1000000000 ||
            !is_int($p['volume_ml']??null) || $p['volume_ml']<=0 || $p['volume_ml']>100000 || ($p['currency']??null)!=='EUR' ||
            !in_array($p['availability']??null,['InStock','BackOrder','OutOfStock'],true) || !is_string($p['product_url']??null) ||
            ($bindings[$p['reference']]??null)!==[$p['volume_ml'],$p['product_url']] ||
            ($p['order_url']??'')!=='https://boutique.mdpierre.com/commander/?mdp_ref='.$p['reference'].'&mdp_lang=fr') throw new RuntimeException('Invalid product');
        $seen[$p['reference']]=true;
    }
    return $data;
}
function mdp_catalogue_fetch(string $brand): array {
    $file=sys_get_temp_dir().'/mdp-catalogue-v1-'.hash('sha256',__DIR__.$brand).'.json';
    $read=static function()use($file,$brand){if(!is_file($file)||filesize($file)>100000)return null;try{return mdp_catalogue_validate(json_decode(file_get_contents($file),true,32,JSON_THROW_ON_ERROR),$brand);}catch(Throwable){return null;}};
    $cached=$read();if($cached && $cached['generated_at']>time()-60)return $cached;
    $lock=fopen($file.'.lock','c');if(!$lock||!flock($lock,LOCK_EX|LOCK_NB)){if($lock)fclose($lock);throw new RuntimeException('Refresh in progress');}
    try{
        $cached=$read();if($cached && $cached['generated_at']>time()-60)return $cached;
        if(is_file($file.'.retry') && filemtime($file.'.retry')>time()-15)throw new RuntimeException('Retry later');
        touch($file.'.retry');
        $ch=curl_init('https://boutique.mdpierre.com/commander/?mdp_catalogue='.$brand);$body='';
        curl_setopt_array($ch,[CURLOPT_CONNECTTIMEOUT=>2,CURLOPT_TIMEOUT=>4,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_HTTPHEADER=>['Accept: application/json'],CURLOPT_WRITEFUNCTION=>static function($ch,$chunk)use(&$body){if(strlen($body)+strlen($chunk)>100000)return 0;$body.=$chunk;return strlen($chunk);}]);
        $ok=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);
        if(!$ok||$status!==200)throw new RuntimeException('Catalogue unavailable');
        $data=mdp_catalogue_validate(json_decode($body,true,32,JSON_THROW_ON_ERROR),$brand);
        $tmp=$file.'.'.bin2hex(random_bytes(6));file_put_contents($tmp,json_encode($data));chmod($tmp,0600);rename($tmp,$file);return $data;
    } finally {flock($lock,LOCK_UN);fclose($lock);}
}
function mdp_catalogue_render(string $html,?array $catalogue,string $url,string $brand): string {
    $h=static fn($v)=>htmlspecialchars((string)$v,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
    $items=array_values(array_filter($catalogue['products']??[],static fn($p)=>$p['product_url']===$url));
    $rows='';$offers=[];
    foreach($items as $p){
        $state=['InStock'=>'En stock','BackOrder'=>'Sur préparation · délai confirmé dans la boutique','OutOfStock'=>'Indisponible'][$p['availability']];
        $price=number_format($p['price_cents']/100,2,',',' ').' €';$size=($p['volume_ml']/10).' cl';
        $rows.='<div class="mdp-live-row" data-shop-volume="'.$p['volume_ml'].' ml"><span>'.$h($size).'</span><strong>'.$h($price).' <small>TTC</small></strong>'.($p['availability']==='OutOfStock'?'<span>Indisponible</span>':'<a href="'.$h($p['order_url']).'" aria-label="'.$h('Acheter '.$p['name'].' '.$price.' TTC').'">Acheter</a>').'<small class="mdp-live-stock">'.$h($state).'</small></div>';
        $offers[]=['@type'=>'Offer','sku'=>$p['reference'],'price'=>number_format($p['price_cents']/100,2,'.',''),'priceCurrency'=>'EUR','availability'=>'https://schema.org/'.$p['availability'],'url'=>$p['order_url'],
            'itemOffered'=>['@type'=>'Product','name'=>$p['name'],'sku'=>$p['reference'],'size'=>$p['volume_ml'].' ml'],
            'seller'=>['@type'=>'Organization','name'=>'Maison des Pierres','url'=>'https://mdpierre.com/'],'eligibleRegion'=>['@type'=>'Place','name'=>'France métropolitaine'],'itemCondition'=>'https://schema.org/NewCondition'];
    }
    $fallback=$catalogue===null?'Prix et disponibilité momentanément indisponibles.':'Ce format n’est pas disponible en ligne.';
    $block='<section id="mdp-direct-order" class="'.($brand==='eo'?'eo-shop ':'').'mdp-live-shop" aria-label="Acheter" data-catalogue-at="'.(int)($catalogue['generated_at']??0).'">'.$rows.'<p data-shop-unavailable'.($rows!==''?' hidden':'').' role="status">'.$h($fallback).'</p></section>';
    $html=preg_replace('#<section\b[^>]*id="mdp-direct-order"[^>]*>.*?</section>#s',$block,$html,1);
    $walk=function($node)use(&$walk,$offers){
        if(!is_array($node))return $node;
        if(($node['@type']??null)==='Product' || ($node['@type']??null)==='ProductGroup'){
            unset($node['offers']);if($offers)$node['offers']=$offers;
            // Remove historical offers on embedded variants; the live offers carry exact formats.
            foreach(['hasVariant'] as $key) if(isset($node[$key]))foreach($node[$key] as &$variant)unset($variant['offers']);
            return $node;
        }
        foreach($node as $key=>$value)if(is_array($value))$node[$key]=$walk($value);
        return $node;
    };
    $html=preg_replace_callback('#(<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>)(.*?)(</script>)#s',static function($m)use($walk){try{$data=json_decode($m[2],true,64,JSON_THROW_ON_ERROR);return $m[1].json_encode($walk($data),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP).$m[3];}catch(Throwable){return $m[0];}},$html);
    // Old static selector must not reintroduce cached links or assume its former markup.
    $html=preg_replace('#<script\b[^>]*id="lc-direct-order-js"[^>]*>.*?</script>#s','',$html);
    $html=str_replace('</head>','<link rel="stylesheet" href="/assets/mdp-live-catalogue.css?v=1"></head>',$html);
    return str_replace('</body>','<script src="/assets/mdp-live-catalogue.js?v=1" defer></script></body>',$html);
}
