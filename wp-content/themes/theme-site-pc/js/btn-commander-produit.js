$(document).ready(function () {

    timer = setTimeout(function () {
        if (!$(".flex-control-thumbs").length) {

        } else {
            clearTimeout(timer);
            $(".container-btn-commander-produit").appendTo(".woocommerce-product-gallery").css("margin-bottom", "20px");
            $(".flex-control-thumbs").appendTo(".woocommerce-product-gallery");
        }
    }, 50);

});