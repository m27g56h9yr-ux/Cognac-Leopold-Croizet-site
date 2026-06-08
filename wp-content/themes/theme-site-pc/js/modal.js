$(document).ready(function () {
    $("#age-legal").modal({
        escapeClose: false,
        clickClose: false,
        showClose: false
    });

    $("#form-age-legal").on("submit", function (event) {
        event.preventDefault();
        $.modal.close();
    });
});
