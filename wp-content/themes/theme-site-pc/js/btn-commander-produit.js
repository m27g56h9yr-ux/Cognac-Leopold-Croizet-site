$(document).ready(function () {

    repair_russian_order_link();

    timer = setTimeout(function () {
        if (!$(".flex-control-thumbs").length) {

        } else {
            clearTimeout(timer);
            $(".container-btn-commander-produit").appendTo(".woocommerce-product-gallery").css("margin-bottom", "20px");
            $(".flex-control-thumbs").appendTo(".woocommerce-product-gallery");
        }
    }, 50);

    function repair_russian_order_link() {
        var orderLinks = {
            "/ru/collection/vs/": "https://av.ru/i/1021709",
            "/ru/collection/vsop/": "https://av.ru/i/174054",
            "/ru/collection/napoleon/": "https://av.ru/i/1020490",
            "/ru/collection/xo/": "https://av.ru/i/1020491",
            "/ru/collection/xo-exception/": "https://av.ru/i/1005624",
            "/ru/collection/extra/": "https://av.ru/i/174057",
            "/ru/collection/excellence/": "https://av.ru/i/231809",
            "/ru/collection/heritage/": "https://av.ru/search/?freeText=Leopold%20Croizet%20Heritage",
            "/ru/collection/valentine/": "https://av.ru/i/178511",
        };
        var pathname = window.location.pathname.replace(/\/?$/, "/");
        var orderLink = Object.keys(orderLinks).reduce(function (link, route) {
            return link || (pathname.indexOf(route) !== -1 ? orderLinks[route] : "");
        }, "");
        if (!orderLink) return;

        $(".btn-commander-produit").attr("href", orderLink);
    }

});