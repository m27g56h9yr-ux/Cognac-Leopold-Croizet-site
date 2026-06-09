$(document).ready(function () {

    repair_russian_vsop_order_link();

    timer = setTimeout(function () {
        if (!$(".flex-control-thumbs").length) {

        } else {
            clearTimeout(timer);
            $(".container-btn-commander-produit").appendTo(".woocommerce-product-gallery").css("margin-bottom", "20px");
            $(".flex-control-thumbs").appendTo(".woocommerce-product-gallery");
        }
    }, 50);

    function repair_russian_vsop_order_link() {
        if (window.location.pathname.indexOf("/ru/collection/vsop/") === -1) return;
        $(".btn-commander-produit").attr("href", "https://av.ru/i/174054");
    }

});