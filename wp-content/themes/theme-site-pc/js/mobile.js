$(document).ready(function () {


    move_language_switch();
    init_language_menu();
    restore_pineau_product_footer();
    repair_pineau_rouge_images();


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

    function restore_pineau_product_footer() {
        var container = $(".container-produits").first();
        if (!container.length || container.find('a[href*="/collection/pineau-des-charentes/"]').length) {
            return;
        }

        var valentine = container.find('a[href*="/collection/valentine/"]').closest(".produit-unique").last();
        if (!valentine.length) {
            return;
        }

        var base = "/Cognac-Leopold-Croizet-site";
        var path = window.location.pathname;
        var localeMatch = path.match(/^\/Cognac-Leopold-Croizet-site\/(en|ru|da|sv|no|zh)\/collection\//);
        var locale = localeMatch ? "/" + localeMatch[1] : "";
        var pineauRoute = base + locale + "/collection/pineau-des-charentes/";
        var isCurrent = path.replace(/\/index\.html$/, "/") === pineauRoute;
        var currentMarker = isCurrent ? '<div class="etoile-produit">*</div>' : "";

        valentine.after(
            '<div class="produit-unique bas-page-produit">' +
                '<a href="' + pineauRoute + '">' +
                    currentMarker +
                    '<img src="' + base + '/wp-content/uploads/2021/06/img_produit_pineau_base-1.png" alt="Pineau" srcset="' + base + '/wp-content/uploads/2021/06/img_produit_pineau_base-1.png 0.5x, ' + base + '/wp-content/uploads/2021/06/img_produit_pineau_base-1.png 5x, ' + base + '/wp-content/uploads/2021/06/img_produit_pineau_base-1.png 2x, ' + base + '/wp-content/uploads/2021/06/img_produit_pineau_base-1.png 3x">' +
                    '<div class="titre-produit">Pineau Blanc</div>' +
                '</a>' +
            '</div>'
        );
    }

    function repair_pineau_rouge_images() {
        var base = window.location.pathname.indexOf("/Cognac-Leopold-Croizet-site/") === 0
            ? "/Cognac-Leopold-Croizet-site"
            : "";
        var collectionImage = base + "/wp-content/uploads/2026/06/pineau-des-charentes-rouge-196x300.png";
        var footerImage = base + "/wp-content/uploads/2026/06/pineau-des-charentes-rouge.png";

        $('a[href*="/collection/pineau-des-charentes-rouge/"] img').each(function () {
            var $image = $(this);
            var isFooter = $image.closest(".container-produits").length > 0;

            $image
                .removeAttr("srcset sizes")
                .attr("src", isFooter ? footerImage : collectionImage)
                .css({
                    display: "block",
                    height: "auto",
                    opacity: "1",
                    visibility: "visible"
                });

            if (isFooter) {
                $image.css({
                    width: "86px",
                    "max-width": "86px"
                });
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
