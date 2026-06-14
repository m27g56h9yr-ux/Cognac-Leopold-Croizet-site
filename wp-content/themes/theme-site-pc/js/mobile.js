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