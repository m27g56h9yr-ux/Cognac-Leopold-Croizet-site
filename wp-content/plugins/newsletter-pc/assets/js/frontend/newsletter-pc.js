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


        $(".container-newsletter button").attr("disabled", true);
        $(".container-newsletter button").html("<i class='fas fa-spinner fa-spin'></i>");

        var data = new FormData(this);
        data.append("action", "newsletter_save_email");

        $.ajax({
            method: "POST",
            url: ajaxurl,
            contentType: false,
            processData: false,
            data: data,
        }).done(function (data) {
            data = $.parseJSON(data);
            $(".info-systeme").addClass(data.class);
            $(".info-systeme").html(data.texte);
            $(".container-newsletter button").html("Terminé");
        });
    });


});