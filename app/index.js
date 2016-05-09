$(function () {
  var numImagesColumn = 5,
    numImagesRow = 4,
    images = [],
    imageElements = [],
    imgHeight,
    imgWidth,
    maxImages;

  var rotateImage = function (imageElement) {
    if (imageElement.hasClass('show')) {
      (function (img) {
        setTimeout(function () {
          img.removeClass('show');

          setTimeout(function () {
            img.attr('src', images[Math.floor(Math.random() * images.length)].url);
          }, 1000);

          rotateImage(img);
        }, 5000 + Math.random() * 8000);
      })(imageElement);
    } else {
      (function (img) {
        setTimeout(function () {
          img.addClass('show');

          rotateImage(imageElement);
        }, 1000);
      })(imageElement);
    }
  };

  fetch('/images')
  .then(function (resp) {
    return resp.json();
  })
  .then(function (json) {
    images = json.images;
  });

  setTimeout(function () {
    $('body').addClass('loaded');

    setTimeout(function () {
      var newImg;

      $('header').addClass('show');

      setView('landing');

      if (window.innerWidth < 600) {
        numImagesColumn = 2;
        numImagesRow = 4;
      }

      imgHeight = window.innerHeight / numImagesRow;
      imgWidth = window.innerWidth / numImagesColumn;

      maxImages = numImagesRow * numImagesColumn;

      for (var i = 0; i < images.length && i < maxImages; i++) {
        newImg = $('<img class="tiny-space" src="' + images[i].url + '">').appendTo('body');

        imageElements.push(newImg);

        newImg.css('height', imgHeight + 'px')
        .css('width', imgWidth + 'px')
        .css('left', i % numImagesColumn * imgWidth)
        .css('top', Math.floor(i / numImagesColumn) * imgHeight - (numImagesRow % 2 === 0 ? 0.5 : 0));

        rotateImage(newImg);
      }
    }, 1000);
  }, 500);
});

viewCallbacks = {
  gallery: function () {
    $('.gallery-item img').click(function (e) {
      $(e.target).toggleClass('expanded');
    });
  },
  landing: function () {
    $('.nav-button[data-template="gallery"]').click(function () {
      fetch('/spaces')
      .then(function (res) {
        return res.json();
      })
      .then(function (json) {
        console.log(json);
        setView('gallery', json);
      })
      .catch(function (error) {
        console.log(error);
      });
    });
  }
};

function setView(view, data) {
  var $content = $('.content');

  $content.removeClass('show');
  setTimeout(function () {
    $content.addClass('show');
    $content.html(Mustache.render($('script[id="templates/' + view + '.html"]').html(), data));

    if (viewCallbacks[view]) {
      viewCallbacks[view]();
    }
  }, 500);
}
