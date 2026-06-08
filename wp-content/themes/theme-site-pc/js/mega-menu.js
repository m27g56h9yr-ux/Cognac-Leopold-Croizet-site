$(document).ready(function () {

    $(".nav li a").hover(function () {
        var listClass = $(this).parent().attr("class");
        var elementHovered = listClass.split(' ')[0];
        timer = setTimeout(function () {
            $(".mega-menu-container").addClass("show-mega-menu");

            $(".inner-mega-menu-container > div").each(function (element) {
                $(this).removeClass("show-element-menu");
            });
            $(".mega-menu-" + elementHovered + "-item").addClass("show-element-menu");
        }, 400);
    }, function () {
        clearTimeout(timer);
        var isOnCollection = $("li.collection").is(":hover");
        var isOnSavoirFaire = $("li.experience").is(":hover");
        var isOnHeader = $("header").is(":hover");

        if (!isOnCollection && !isOnHeader && !isOnSavoirFaire) {
            $(".mega-menu-container").removeClass("show-mega-menu");
        }
    });



    $(".mega-menu-container").mouseout(function () {

        var isOnHeader = $("header").is(":hover");
        if (!isOnHeader) {
            $(".mega-menu-container").removeClass("show-mega-menu");
        }
    });

    // data = new FormData();
    // data.append("action", "ajax_add_nb_articles_panier_to_menu");

    // $.ajax({
    //     method: "POST",
    //     url: ajaxurl,
    //     contentType: false,
    //     processData: false,
    //     data: data,
    // }).done(function (data) {

    //     $(".panier-menu a ").append("<span class='nb-articles-menu'><i class='fas fa-shopping-cart'></i>" + data + "</span>");


    // });




});