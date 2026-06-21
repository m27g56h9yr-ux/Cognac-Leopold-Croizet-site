$(document).ready(function () {





  // var bdiExpedition = $("#shipping_method").find("bdi");

  // console.log(bdiExpedition);

  // var prixExpedition = $(bdiExpedition).html();

  // console.log(prixExpedition);

  // $(bdiExpedition).html("<span class='prix-expedition'>Expédition : </span>" + prixExpedition);



  if ($(".shop_table.woocommerce-checkout-review-order-table").length) {





    setTimeout(function () {

      var labelFDP = $("#shipping_method li > span");

      $(labelFDP).appendTo(".placeholder-labelFDP");

    }, 500);

  }



  var nbArticlePanier = $(".hide-nb-article-panier").html();

  add_icon_panier(nbArticlePanier);



  function add_icon_panier(nbArticlePanier) {

    if (nbArticlePanier > 0) {

      $(".panier-menu a").removeClass("disabled-panier");

      $(".panier-menu a").append("<div class='container-icon-panier-header'><img src='/wp-content/uploads/2022/01/panier.svg' class='icon-panier-header'><span class='nb-article-panier'>" + nbArticlePanier + "<span></div>");

    } else {

      disable_panier();

    }

  }





  function disable_panier() {

    $(".panier-menu a").addClass("disabled-panier");

  }



});

