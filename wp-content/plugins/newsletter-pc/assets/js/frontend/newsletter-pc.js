(function ($) {
    'use strict';

    /**
     * All of the code for your frontend-facing JavaScript source
     * should reside in this file.
     *
     * Note that this assume you're going to use jQuery, so it prepares
     * the $ function reference to be used within the scope of this
     * function.
     *
     * From here, you're able to define handlers for when the DOM is
     * ready:
     *
     * $(function() {
     *
     * });
     *
     * Or when the window is loaded:
     *
     * $( window ).load(function() {
     *
     * });
     *
     * ...and so on.
     *
     * Remember that ideally, we should not attach any more than a single DOM-ready or window-load handler
     * for any particular page. Though other scripts in WordPress core, other plugins, and other themes may
     * be doing this, we should try to minimize doing that in our own work.
     */

})(jQuery);

$(document).ready(function () {

    $(".container-newsletter").on("submit", function (event) {
        event.preventDefault();

        var form = $(this);
        var button = form.find("button");
        var info = form.find(".info-systeme");
        var originalButtonText = button.data("original-text") || button.text();
        var endpoint = form.attr("data-newsletter-endpoint") || newsletterEndpoint();

        button.data("original-text", originalButtonText);
        button.attr("disabled", true);
        button.html("<i class='fas fa-spinner fa-spin'></i>");
        info.removeClass("success error").html("");

        var data = new FormData(this);
        data.append("language", document.documentElement.getAttribute("lang") || "");
        data.append("page", window.location.href);
        data.append("consent_version", "newsletter-news-2026-06-11");

        $.ajax({
            method: "POST",
            url: endpoint,
            contentType: false,
            processData: false,
            data: data,
        }).done(function (response) {
            var data = typeof response === "string" ? $.parseJSON(response) : response;
            if (data && data.ok) {
                info.addClass("success").html("Votre adresse e-mail est bien enregistrée.");
                button.html("Terminé");
            } else {
                info.addClass("error").html("Votre adresse e-mail n'a pas pu être enregistrée.");
                button.attr("disabled", false).html(originalButtonText);
            }
        }).fail(function () {
            info.addClass("error").html("Votre adresse e-mail n'a pas pu être enregistrée.");
            button.attr("disabled", false).html(originalButtonText);
        });
    });

    function newsletterEndpoint() {
        var path = window.location.pathname;
        var deployBase = "";
        var base = path === deployBase || path.indexOf(deployBase + "/") === 0 ? deployBase : "";
        return base + "/api/newsletter.php";
    }

});
