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
            img.attr('src', images[Math.floor(Math.random() * images.length)]);
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

  fetch('/spaces')
  .then(function (resp) {
    return resp.json();
  })
  .then(function (json) {
    images = json;
  });

  setTimeout(function () {
    $('body').addClass('loaded');

    setTimeout(function () {
      var newImg;

      $('header').addClass('show');

      if (window.innerWidth < 600) {
        numImagesColumn = 2;
        numImagesRow = 4;
      }

      imgHeight = window.innerHeight / numImagesRow;
      imgWidth = window.innerWidth / numImagesColumn;

      maxImages = numImagesRow * numImagesColumn;

      for (var i = 0; i < images.length && i < maxImages; i++) {
        newImg = $('<img class="tiny-space" src="' + images[i] + '">').appendTo('body');

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
