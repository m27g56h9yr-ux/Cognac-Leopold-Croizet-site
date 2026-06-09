$(document).ready(function () {


    repair_visit_map();
    repair_contact_email();
    remove_russian_prices();
    repair_russian_order_links();


    move_language_switch();


    window.addEventListener("resize", function () {
        move_language_switch();
    });


    function move_language_switch() {
        $(".wpml-ls-legacy-list-horizontal").appendTo(".navbar");
    }

    function repair_visit_map() {
        var map = document.querySelector("#gmap_canvas");
        if (!map) return;

        map.setAttribute("src", "https://www.google.com/maps?q=30%20Route%20d%27Angoul%C3%AAme%2C%2016200%20Triac-Lautrait%2C%20France&z=13&output=embed");
        map.setAttribute("loading", "lazy");
        map.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
        map.style.border = "0";
        map.style.width = "100%";
        map.style.maxWidth = "1200px";
        map.style.height = "350px";

        $(".gmap_canvas a[href*='123movies-to.org'], .gmap_canvas a[href*='embedgooglemap.net']").remove();
    }

    function repair_contact_email() {
        var oldEmails = ["contact@mdpierre.com", "cognac@mdpierre.com"];
        var newEmail = "cognac@mdpierrre.com";

        $("a[href^='mailto:']").each(function () {
            var href = $(this).attr("href");
            oldEmails.forEach(function (oldEmail) {
                href = href.replace(oldEmail, newEmail);
            });
            $(this).attr("href", href);
        });

        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        var node;
        while ((node = walker.nextNode())) {
            oldEmails.forEach(function (oldEmail) {
                node.nodeValue = node.nodeValue.split(oldEmail).join(newEmail);
            });
        }

        $("script[type='application/ld+json']").each(function () {
            var json = this.textContent;
            oldEmails.forEach(function (oldEmail) {
                json = json.split(oldEmail).join(newEmail);
            });
            this.textContent = json;
        });
    }

    function remove_russian_prices() {
        if (!window.location.pathname.match(/\/ru(\/|$)/)) return;
        $(".prix-produit-collection, .prix-produit-container, .woocommerce-Price-amount").remove();
    }

    function repair_russian_order_links() {
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