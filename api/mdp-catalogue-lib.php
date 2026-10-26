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
    $lock=fopen($file.'.lock','c');if(!$lock)throw new RuntimeException('Cache lock unavailable');
    if(!flock($lock,LOCK_EX|LOCK_NB)){
        fclose($lock);$until=hrtime(true)+4500000000;
        do{
            usleep(50000);$cached=$read();
            if($cached && $cached['generated_at']>time()-60)return $cached;
        }while(hrtime(true)<$until);
        throw new RuntimeException('Refresh in progress');
    }
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
    $items=array_values(array_filter($catalogue['products']??[],static fn($p)=>is_array($p)&&($p['product_url']??null)===$url));
    $rows='';
    foreach($items as $p){
        $state=['InStock'=>'En stock','BackOrder'=>'Sur préparation · délai confirmé dans la boutique','OutOfStock'=>'Indisponible'][$p['availability']];
        $price=number_format($p['price_cents']/100,2,',',' ').' €';$size=($p['volume_ml']/10).' cl';
        $rows.='<div class="mdp-live-row" data-shop-volume="'.$p['volume_ml'].' ml"><span>'.$h($size).'</span><strong>'.$h($price).' <small>TTC</small></strong>'.($p['availability']==='OutOfStock'?'<span>Indisponible</span>':'<a href="'.$h($p['order_url']).'" aria-label="'.$h('Acheter '.$p['name'].' '.$price.' TTC').'">Acheter</a>').'<small class="mdp-live-stock">'.$h($state).'</small></div>';
    }
    $fallback=$catalogue===null?'Prix et disponibilité momentanément indisponibles.':'Ce format n’est pas disponible en ligne.';
    $block='<section id="mdp-direct-order" class="'.($brand==='eo'?'eo-shop ':'').'mdp-live-shop" aria-label="Acheter" data-catalogue-at="'.(int)($catalogue['generated_at']??0).'">'.$rows.'<p data-shop-unavailable'.($rows!==''?' hidden':'').' role="status">'.$h($fallback).'</p></section>';
    $html=preg_replace('#<section\b[^>]*id="mdp-direct-order"[^>]*>.*?</section>#s',$block,$html,1);
    $parse_size=static function($value): ?int {
        if(!is_string($value)||!preg_match('/^\s*([0-9]+(?:[.,][0-9]+)?)\s*(ml|cl|l)\s*$/iD',$value,$m))return null;
        $quantity=(float)str_replace(',','.',$m[1]);$unit=strtolower($m[2]);
        $ml=$quantity*($unit==='l'?1000:($unit==='cl'?10:1));
        return is_finite($ml)&&$ml>0&&$ml<=100000&&abs($ml-round($ml))<1e-9?(int)round($ml):null;
    };
    $volume_of=static fn($product): ?int=>is_array($product)?$parse_size($product['size']??null):null;
    $is_mdp_offer=static function($offer): bool {
        if(!is_array($offer))return false;
        $url=(string)($offer['url']??'');$seller=$offer['seller']??null;
        return str_starts_with($url,'https://boutique.mdpierre.com/commander/')||
            (is_array($seller)&&(($seller['url']??null)==='https://mdpierre.com/'||($seller['name']??null)==='Maison des Pierres'));
    };
    $clean_offers=function($node)use(&$clean_offers,$is_mdp_offer){
        if(!is_array($node))return $node;
        if(in_array($node['@type']??null,['Product','ProductGroup'],true)&&array_key_exists('offers',$node)){
            $offers=$node['offers'];
            if(is_array($offers)&&isset($offers['@type'])){
                if($is_mdp_offer($offers))unset($node['offers']);
            } elseif(is_array($offers)){
                $remaining=array_values(array_filter($offers,static fn($offer)=>!$is_mdp_offer($offer)));
                if($remaining)$node['offers']=$remaining;else unset($node['offers']);
            }
        }
        foreach($node as $key=>$value)if(is_array($value))$node[$key]=$clean_offers($value);
        return $node;
    };
    $drop_variant_properties=static function(array $properties): array {
        return array_values(array_filter($properties,static function($property): bool {
            if(!is_array($property))return true;
            $label=strtolower((string)($property['name']??'').' '.(string)($property['propertyID']??''));
            return !preg_match('/(?:gtin|ean|\bsku\b|\bvolume\b|\bsize\b|\bformat\b|contenance)/u',$label);
        }));
    };
    $gtin_keys=['gtin8','gtin12','gtin13','gtin14'];
    $walk=function($node)use(&$walk,$items,$url,$parse_size,$volume_of,$clean_offers,$drop_variant_properties,$gtin_keys){
        if(!is_array($node))return $node;
        $type=$node['@type']??null;
        $matches_page=in_array($type,['Product','ProductGroup'],true)&&(($node['@id']??null)===$url.'#product'||($node['url']??null)===$url);
        if($matches_page){
            // Remove every baked-in offer in this product graph before attaching live ones.
            $node=$clean_offers($node);
            $root_id=is_string($node['@id']??null)&&$node['@id']!==''?$node['@id']:$url.'#product';
            $root_size=$volume_of($node);
            $root_gtins=[];
            foreach($gtin_keys as $key)if(is_string($node[$key]??null)&&$node[$key]!=='')$root_gtins[$key]=$node[$key];
            $variants=is_array($node['hasVariant']??null)?array_values($node['hasVariant']):[];
            $offer_sizes=[];
            foreach($items as $item)$offer_sizes[$item['volume_ml']]=true;
            $existing_sizes=[];
            foreach($variants as $variant){$size=$volume_of($variant);if($size!==null)$existing_sizes[$size]=true;}
            $multi_format=count($offer_sizes)>1 || count($existing_sizes)>1 ||
                ($root_size!==null && $existing_sizes!==[] && array_diff_key($existing_sizes,[$root_size=>true])!==[]) ||
                ($root_size!==null && $offer_sizes!==[] && !isset($offer_sizes[$root_size])) ||
                $type==='ProductGroup';
            $offer_for=function(array $item,string $variant_id): array {
                return ['@type'=>'Offer','sku'=>$item['reference'],'price'=>number_format($item['price_cents']/100,2,'.',''),'priceCurrency'=>'EUR',
                    'availability'=>'https://schema.org/'.$item['availability'],'url'=>$item['order_url'],
                    'itemOffered'=>['@id'=>$variant_id],
                    'seller'=>['@type'=>'Organization','name'=>'Maison des Pierres','url'=>'https://mdpierre.com/'],
                    'eligibleRegion'=>['@type'=>'Place','name'=>'France métropolitaine'],'itemCondition'=>'https://schema.org/NewCondition'];
            };
            if(!$multi_format){
                if($items){
                    $item=$items[0];
                    $node['sku']=$item['reference'];$node['size']=$item['volume_ml'].' ml';
                    $node['offers']=array_map(fn($offer)=>$offer_for($offer,$root_id),$items);
                }
                return $node;
            }

            // Keep the existing entity identifier as the group ID; size and GTIN describe a variant.
            $node['@type']='ProductGroup';$node['@id']=$root_id;
            if(!isset($node['productGroupID'])||$node['productGroupID']==='')$node['productGroupID']=$root_id;
            $node['variesBy']=array_values(array_unique(array_merge((array)($node['variesBy']??[]),['https://schema.org/size'])));
            unset($node['offers'],$node['size'],$node['sku']);
            foreach($gtin_keys as $key)unset($node[$key]);
            if(isset($node['additionalProperty'])&&is_array($node['additionalProperty'])){
                $node['additionalProperty']=$drop_variant_properties($node['additionalProperty']);
                if($node['additionalProperty']===[])unset($node['additionalProperty']);
            }

            // Only retain bottle-size variants as candidates; case variants remain untouched and never get a bottle offer.
            $bottle_indexes=[];
            foreach($variants as $index=>$variant){
                $size=$volume_of($variant);
                if($size!==null)$bottle_indexes[$size][]=$index;
            }
            // A root GTIN still identifies its original bottle even when the live feed no longer sells it.
            if($root_size!==null&&$root_gtins!==[]){
                $root_variant_index=null;
                foreach($bottle_indexes[$root_size]??[] as $candidate){$root_variant_index=$candidate;break;}
                if($root_variant_index===null){
                    $variant=['@type'=>'Product','@id'=>$url.'#variant-'.$root_size.'ml','isVariantOf'=>['@id'=>$root_id],
                        'name'=>$node['name']??'','size'=>$root_size.' ml'];
                    foreach(['brand','manufacturer','category','image','description'] as $key)if(isset($node[$key]))$variant[$key]=$node[$key];
                    $variants[]=$variant;$root_variant_index=array_key_last($variants);$bottle_indexes[$root_size][]=$root_variant_index;
                } else {
                    $variants[$root_variant_index]['@type']='Product';
                    if(empty($variants[$root_variant_index]['@id']))$variants[$root_variant_index]['@id']=$url.'#variant-'.$root_size.'ml';
                    $variants[$root_variant_index]['size']=$root_size.' ml';
                    $variants[$root_variant_index]['isVariantOf']=['@id'=>$root_id];
                }
                foreach($root_gtins as $key=>$value)if(empty($variants[$root_variant_index][$key]))$variants[$root_variant_index][$key]=$value;
            }
            $used_root_identity=false;
            foreach($items as $item){
                $size=(int)$item['volume_ml'];$index=null;
                foreach($bottle_indexes[$size]??[] as $candidate){
                    $existing_sku=$variants[$candidate]['sku']??null;
                    if(!is_string($existing_sku)||$existing_sku===$item['reference']){$index=$candidate;break;}
                }
                if($index===null){
                    $variant=['@type'=>'Product','@id'=>$url.'#variant-'.$size.'ml','isVariantOf'=>['@id'=>$root_id],
                        'name'=>$item['name'],'sku'=>$item['reference'],'size'=>$size.' ml'];
                    foreach(['brand','manufacturer','category','image','description'] as $key)if(isset($node[$key]))$variant[$key]=$node[$key];
                    if($root_size===$size&&!$used_root_identity){
                        foreach($root_gtins as $key=>$value)$variant[$key]=$value;
                        $used_root_identity=true;
                    }
                    $variants[]=$variant;$index=array_key_last($variants);$bottle_indexes[$size][]=$index;
                } else {
                    $variant=$variants[$index];
                    if(empty($variant['@id']))$variant['@id']=$url.'#variant-'.$size.'ml';
                    $variant['@type']='Product';$variant['sku']=$item['reference'];$variant['size']=$size.' ml';
                    $variant['isVariantOf']=['@id'=>$root_id];
                    if($root_size===$size&&!$used_root_identity){
                        foreach($root_gtins as $key=>$value)if(empty($variant[$key]))$variant[$key]=$value;
                        $used_root_identity=true;
                    }
                    if(isset($variant['additionalProperty'])&&is_array($variant['additionalProperty'])){
                        $variant['additionalProperty']=$drop_variant_properties($variant['additionalProperty']);
                        if($variant['additionalProperty']===[])unset($variant['additionalProperty']);
                    }
                    $variants[$index]=$variant;
                }
                $variants[$index]['offers']=[$offer_for($item,(string)$variants[$index]['@id'])];
            }
            $node['hasVariant']=$variants;
            return $node;
        }
        foreach($node as $key=>$value)if(is_array($value))$node[$key]=$walk($value);
        return $node;
    };
    $html=preg_replace_callback('#(<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>)(.*?)(</script>)#s',static function($m)use($walk,$clean_offers,$items){
        try{$data=json_decode($m[2],true,64,JSON_THROW_ON_ERROR);$data=$items?$walk($data):$clean_offers($data);return $m[1].json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP).$m[3];}
        catch(Throwable){return $m[0];}
    },$html);
    // Old static selector must not reintroduce cached links or assume its former markup.
    $html=preg_replace('#<script\b[^>]*id="lc-direct-order-js"[^>]*>.*?</script>#s','',$html);
    $html=str_replace('</head>','<link rel="stylesheet" href="/assets/mdp-live-catalogue.css?v=2"></head>',$html);
    return str_replace('</body>','<script src="/assets/mdp-live-catalogue.js?v=1" defer></script></body>',$html);
}
