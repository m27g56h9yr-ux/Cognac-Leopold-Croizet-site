$(document).ready(function () {


    move_language_switch();


    window.addEventListener("resize", function () {
        move_language_switch();
    });


    function move_language_switch() {
        $(".wpml-ls-legacy-list-horizontal").appendTo(".navbar");
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