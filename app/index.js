$(function () {
  var numImagesColumn = 3,
    numImagesRow = 3,
    imgHeight,
    imgWidth;

  setTimeout(function () {
    $('body').addClass('loaded');

    if (window.innerWidth < 600) {
      numImagesColumn = 2;
      numImagesRow = 4;
    }

    imgHeight = window.innerHeight / numImagesRow;
    imgWidth = window.innerWidth / numImagesColumn;

    setTimeout(function () {
      var newImg;

      $('header').addClass('show');

      for (var i = 1; i < 10; i++) {
        newImg = $('<img class="tiny-space" src="res/img/tiny-space-' + i + '.jpg">').appendTo('body');

        newImg.css('height', imgHeight + 'px')
          .css('width', imgWidth + 'px')
          .css('left', (i - 1) % numImagesColumn * imgWidth)
          .css('top', Math.floor((i - 1) / numImagesColumn) * imgHeight);

        (function(img) {
          setTimeout(function () {
            img.addClass('show');
          }, Math.random() * 5000);
        })(newImg);
      }
    }, 1000);
  }, 500);
});
