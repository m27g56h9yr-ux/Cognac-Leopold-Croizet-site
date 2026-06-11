$(document).ready(function () {


    move_language_switch();
    init_language_menu();


    window.addEventListener("resize", function () {
        move_language_switch();
    });


    function move_language_switch() {
        $(".wpml-ls-legacy-list-horizontal").appendTo(".navbar");
    }

    function init_language_menu() {
        $(".lc-language-menu").removeClass("is-open");
        $(".lc-language-menu-toggle").attr("aria-expanded", "false");
        $(".lc-language-menu-list").attr("hidden", "hidden").hide();

        $(".lc-language-menu-toggle").off("click.lcLanguageMenu").on("click.lcLanguageMenu", function (event) {
            event.preventDefault();
            event.stopPropagation();

            var menu = $(this).closest(".lc-language-menu");
            var isOpen = menu.hasClass("is-open");

            $(".lc-language-menu").removeClass("is-open").find(".lc-language-menu-list").attr("hidden", "hidden").hide();
            $(".lc-language-menu-toggle").attr("aria-expanded", "false");

            if (!isOpen) {
                menu.addClass("is-open");
                menu.find(".lc-language-menu-list").removeAttr("hidden").show();
                $(this).attr("aria-expanded", "true");
            }
        });

        $(".lc-language-menu").off("click.lcLanguageMenu").on("click.lcLanguageMenu", function (event) {
            event.stopPropagation();
        });

        $(document).off("click.lcLanguageMenu").on("click.lcLanguageMenu", function () {
            $(".lc-language-menu").removeClass("is-open").find(".lc-language-menu-list").attr("hidden", "hidden").hide();
            $(".lc-language-menu-toggle").attr("aria-expanded", "false");
        });

        $(document).off("keydown.lcLanguageMenu").on("keydown.lcLanguageMenu", function (event) {
            if (event.key === "Escape") {
                $(".lc-language-menu").removeClass("is-open").find(".lc-language-menu-list").attr("hidden", "hidden").hide();
                $(".lc-language-menu-toggle").attr("aria-expanded", "false");
            }
        });
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
