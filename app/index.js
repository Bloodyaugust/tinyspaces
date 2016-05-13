$(function () {
  var numImagesColumn = 5,
    numImagesRow = 4,
    nearBottom = false,
    images = [],
    imageElements = [],
    imgHeight,
    imgWidth,
    spacesStart = 0,
    maxImages;

  window.user = {};

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

      setView('landing', {});

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

      $('.admin').click(function (e) {
        setView('login', {});
      });
      $(window).scroll(function() {
         if($(window).scrollTop() + $(window).height() > $(document).height() - 200 && !nearBottom) {
           nearBottom = true;
           spacesStart += 10;

           fetch('/spaces?start=' + spacesStart)
           .then(function (res) {
             return res.json();
           })
           .then(function (json) {
             $('.gallery').append(Mustache.render($('script[id="templates/gallery-items.html"]').html(), json));
           })
           .catch(function (error) {
             console.log(error);
           });
         } else {
           if ($(window).scrollTop() + $(window).height() < $(document).height() - 200) {
             nearBottom = false;
           }
         }
      });
    }, 1000);
  }, 500);
});

viewCallbacks = {
  admin: function () {
    var formData;

    $('.submit').click(function (e) {
      formData = new FormData();
      formData.append('token', user.token);
      formData.append('space', $('input[type="file"]')[0].files[0]);

      fetch('/images', {
        method: 'post',
        body: formData
      })
      .then(function (resp) {
        return resp.json();
      })
      .then(function (json) {
        if (json.code === 200) {
          fetch('/spaces', {
            body: JSON.stringify({
              description: $('input[data-type="description"]').val(),
              name: $('input[data-type="name"]').val(),
              sold: $('input[type="checkbox"]').prop('checked'),
              token: user.token,
              url: json.url
            }),
            headers: {
              "Content-Type": "application/json"
            },
            method: 'post'
          })
          .then(function (resp2) {
            return resp2.json();
          })
          .then(function (json2) {
            if (json2.code === 200) {
              $('input[data-type="description"]').val('');
              $('input[data-type="name"]').val('');
              $('input[type="checkbox"]').prop('checked', false);
            }
            $('.status').html(json2.message);
          });
        } else {
          $('.status').html(json.message);
        }
      });
    });
  },
  gallery: function () {
    $('.gallery-item img').click(function (e) {
      $(e.target).toggleClass('expanded');
    });

    $('.order').click(function (e) {
      setView('order', {
        _id: $(e.target).data().id
      });
    });
  },
  landing: function () {
    $('.nav-button[data-template="gallery"]').click(function () {
      fetch('/spaces')
      .then(function (res) {
        return res.json();
      })
      .then(function (json) {
        setView('gallery', json);
      })
      .catch(function (error) {
        console.log(error);
      });
    });
  },
  login: function () {
    $('.status').html('');

    $('.submit').click(function () {
      fetch('/login', {
        method: 'post',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password: $('input[data-type="password"]').val()
        })
      })
      .then(function (resp) {
        return resp.json();
      })
      .then(function (json) {
        if (json.code === 200) {
          user = {
            token: json.token
          };

          setView('admin', {});
        } else {
          $('.status').html(json.message);
        }
      });
    });
  },
  order: function () {
    $('.status').html('');

    $('.submit').click(function () {
      fetch('/buy', {
        method: 'post',
        body: JSON.stringify({
          name: $('input[data-type="name"]').val(),
          address: $('input[data-type="address"]').val(),
          email: $('input[data-type="email"]').val(),
          date: new Date(),
          spaceID: $('.submit').data().spaceId
        }),
        headers: {
          "Content-Type": "application/json"
        }
      })
      .then(function (resp) {
        return resp.json();
      })
      .then(function (json) {
        if (json.code === 200) {
          setView('success', {});
        } else {
          $('.status').html(json.message);
        }
      });
    });
  }
};

function setView(view, data) {
  var $content = $('.content');

  data.user = user;

  $content.removeClass('show');
  setTimeout(function () {
    $content.addClass('show');
    $content.html(Mustache.render($('script[id="templates/' + view + '.html"]').html(), data));

    if (viewCallbacks[view]) {
      viewCallbacks[view]();
    }
  }, 500);
}
