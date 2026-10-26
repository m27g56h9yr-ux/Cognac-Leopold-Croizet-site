<?php
require __DIR__.'/mdp-catalogue-lib.php';
$routes=json_decode('{"/collection/extra/":"collection/extra/index.html","/collection/pineau-des-charentes-blanc/":"collection/pineau-des-charentes-blanc/index.html","/collection/heritage/":"collection/heritage/index.html","/collection/xo-exception/":"collection/xo-exception/index.html","/collection/vs/":"collection/vs/index.html","/collection/excellence/":"collection/excellence/index.html","/collection/pineau-des-charentes-rouge/":"collection/pineau-des-charentes-rouge/index.html","/collection/valentine/":"collection/valentine/index.html","/collection/pineau-des-charentes/":"collection/pineau-des-charentes/index.html","/collection/napoleon/":"collection/napoleon/index.html","/collection/vsop/":"collection/vsop/index.html","/collection/xo/":"collection/xo/index.html"}',true);
$path=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH);
if(!is_string($path)||!isset($routes[$path])){http_response_code(404);exit('Page introuvable');}
if(($_SERVER['REQUEST_METHOD']??'GET')!=='GET' && ($_SERVER['REQUEST_METHOD']??'')!=='HEAD'){http_response_code(405);header('Allow: GET, HEAD');exit;}
$html=file_get_contents(dirname(__DIR__).'/'.$routes[$path]);
try{$catalogue=mdp_catalogue_fetch('lc');}catch(Throwable){$catalogue=null;}
header('Content-Type: text/html; charset=UTF-8');header('Cache-Control: no-cache, max-age=0');
header('X-MDP-Catalogue: '.($catalogue?'fresh':'unavailable'));
echo mdp_catalogue_render($html,$catalogue,'https://cognac-leopold-croizet.com'.$path,'lc');
