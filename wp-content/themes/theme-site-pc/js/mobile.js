$(document).ready(function () {


    move_language_switch();


    window.addEventListener("resize", function () {
        move_language_switch();
    });


    function move_language_switch() {
        if (window.matchMedia("(min-width: 1200px)").matches) {
            $(".wpml-ls-legacy-list-horizontal").appendTo(".navbar");
        } else {
            $(".wpml-ls-legacy-list-horizontal").appendTo(".menu-site ul#menu-menu-principal");
        }
    }

    $(".navbar-toggler").on("click", function () {
        $("html").toggleClass("prevent-scroll");
    });


    $(".sous-menu-mobile-container").appendTo(".experience");


    $("li.experience a").on("click", function () {
        if (window.matchMedia("(max-width: 1200px)").matches) {
            $("ul.sous-menu-mobile-container").slideToggle();
        }
    });


});