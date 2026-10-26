<?php
/** Local concurrent cache fixture. The child must never call the network. */
$lib=realpath($argv[1]??'');if(!$lib)throw new RuntimeException('Library required');
$cache=sys_get_temp_dir().'/mdp-catalogue-v1-'.hash('sha256',dirname($lib).'lc').'.json';
$old=is_file($cache)?file_get_contents($cache):null;
$fixture=static fn($age,$price)=>json_encode(['version'=>1,'brand'=>'lc','currency'=>'EUR','generated_at'=>time()-$age,'products'=>[['reference'=>'LC0001','name'=>'SYNTHETIC','volume_ml'=>700,'price_cents'=>$price,'currency'=>'EUR','availability'=>'InStock','product_url'=>'https://cognac-leopold-croizet.com/collection/vs/','order_url'=>'https://boutique.mdpierre.com/commander/?mdp_ref=LC0001&mdp_lang=fr']]]);
$lock=fopen($cache.'.lock','c');flock($lock,LOCK_EX);$checks=[];
$launch=static function($lib){$pipes=[];$code='require $argv[1];try{$c=mdp_catalogue_fetch("lc");echo json_encode(["price"=>$c["products"][0]["price_cents"]]);}catch(Throwable $e){echo json_encode(["error"=>true]);}';$p=proc_open([PHP_BINARY,'-r',$code,$lib],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);if(!is_resource($p))throw new RuntimeException('Child failed');fclose($pipes[0]);return [$p,$pipes];};
$collect=static function($child){[$p,$pipes]=$child;$out=stream_get_contents($pipes[1]);$err=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);$exit=proc_close($p);if($exit!==0||$err!=='')throw new RuntimeException('Child failed: '.$err);return json_decode($out,true,32,JSON_THROW_ON_ERROR);};
try {
    file_put_contents($cache,$fixture(70,7001));$child=$launch($lib);usleep(200000);
    $tmp=$cache.'.test';file_put_contents($tmp,$fixture(0,8811));rename($tmp,$cache);flock($lock,LOCK_UN);
    $out=$collect($child);if(($out['price']??null)!==8811)throw new RuntimeException('Concurrent visitor lost the refreshed price');
    $checks['concurrent visitor receives newly published cache instead of hiding the offer']=true;
    flock($lock,LOCK_EX);file_put_contents($cache,$fixture(70,7001));$start=hrtime(true);$out=$collect($launch($lib));$elapsed=(hrtime(true)-$start)/1e9;
    if(empty($out['error'])||isset($out['price'])||$elapsed<4||$elapsed>7)throw new RuntimeException('Timeout returned stale price or was unbounded');
    $checks['bounded wait refuses stale price if refresh never completes']=true;
    echo json_encode(['checks'=>$checks,'scope'=>'local locked synthetic cache and child PHP process; no network'])."\n";
} finally {flock($lock,LOCK_UN);fclose($lock);if($old===null)unlink($cache);else file_put_contents($cache,$old);}
