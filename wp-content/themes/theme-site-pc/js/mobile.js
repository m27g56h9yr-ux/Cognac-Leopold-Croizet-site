$(document).ready(function () {


    move_language_switch();
    init_language_menu();
    restore_pineau_product_footer();
    repair_pineau_collection_cards();
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

    function repair_pineau_collection_cards() {
        var container = $(".container-end-page").first();
        if (!container.length) {
            return;
        }

        var whiteCard = container
            .find('a[href*="/collection/pineau-des-charentes/"]')
            .not('a[href*="/collection/pineau-des-charentes-rouge/"]')
            .closest(".container-collection-produit")
            .last();
        var redCard = container
            .find('a[href*="/collection/pineau-des-charentes-rouge/"]')
            .closest(".container-collection-produit")
            .last();

        if (whiteCard.length && redCard.length && !redCard.parent().is(container)) {
            redCard.detach().insertAfter(whiteCard);
        }
    }

    function repair_pineau_rouge_images() {
        var base = window.location.pathname.indexOf("/Cognac-Leopold-Croizet-site/") === 0
            ? "/Cognac-Leopold-Croizet-site"
            : "";
        var collectionImage = base + "/wp-content/uploads/2026/06/pineau-des-charentes-rouge-196x300.png";
        var footerImage = "data:image/png;base64,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";

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
                    width: "90px",
                    "max-width": "90px",
                    "margin-bottom": "0"
                });
            } else {
                $image.css({
                    "max-width": "100%"
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