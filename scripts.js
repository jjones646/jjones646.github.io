var isFree = true;
var attempts = 1;
var imgSet = 1;
var nextEn = false;

function placePoint(x, y) {
  var aTags = $('div.tags');
  // create the atags div if it doesn't exist
  if (!aTags.find('div.atags').length) {
    aTags.append('<div></div>');
    aTags.find('div:last').addClass('atags');
  }
  // clone a placement marker
  var rootTag = $('.marker:first');
  rootTag.addClass('marker-user').clone().appendTo(aTags.find('div'));
  rootTag.removeClass('marker-user');

  // compute our offset for the correct placement
  var offset = $('#point-wrap').position();
  var imgB = document.getElementById('point-wrap');
  var xx = Math.round(x - imgB.offsetLeft + offset.left);
  var yy = Math.round(y - imgB.offsetTop + offset.top);

  // set the offset for the point we just added
  $('.marker-user:last').offset({
    left: xx,
    top: yy
  });

  $('.marker-user:last').css('visibility', 'visible');
}

function genInterval(k) {
  var maxInterval = (Math.pow(2, k) - 1) * 1000;
  if (maxInterval > 30 * 1000) {
    maxInterval = 30 * 1000; // If the generated interval is more than 30 seconds, truncate it down to 30 seconds.
  }
  // generate the interval to a random number between 0 and the maxInterval determined from above
  return Math.random() * maxInterval;
}

window.onload = function createWebSocket() {
  if (!window.WebSocket) {
    //If the user's browser does not support WebSockets, give an alert message
    alert("Your browser does not support the WebSocket API!");
  } else {

    $('#image-set').find('i.fa').text(' Image ' + imgSet);

    // setup the websocket connection
    var wsurl = "ws://104.131.13.159:5000";
    //get clickable elements
    var submitBtn = document.getElementById('submit-btn');
    var clickArea = document.getElementById('point-wrap');
    // the default realm for our protocol
    var commRealm = 'robotics';
    // create the websocket object
    var webSock = new WebSocket(wsurl, ["protocolOne", "protocolTwo"]);

    // Handle any errors that occur.
    webSock.onerror = function(error) {
      console.log('WebSocket Error: ' + error);
      console.dir(error);
      var time = genInterval(attempts);
      setTimeout(function() {
        // We've tried to reconnect so increment the attempts by 1
        attempts++;
        // Connection has closed so try to reconnect every 10 seconds.
        createWebSocket();
      }, time);
    };

    webSock.onopen = function(event) {
      // do stuff when the connection opens
      attempts = 1;
      $('#connstatus').find('i:first').css('color', 'green').text(' Connected');;
      console.log('Connection opened with ' + wsurl);
    };

    webSock.onmessage = function(event) {
      // parse the packet
      try {
        msg = JSON.parse(event.data);
        if (msg.realm == commRealm) {
          // create an empty response message initially
          var res = new Msg('', '', commRealm);
          var replyNeeded = false;
          console.log(msg);

          // handle the corresponding event
          switch (msg.proto) {
            case "add_user_cords":
              // // set the offset
              placePoint(msg.data.cords.x, msg.data.cords.y);
              // update the color
              $('.marker-user:last').css('color', 'red');
              $('.tags').hide().show();
              break;

            case "renew_num_clients":
              $('#num-users').find('i.fa-user').text(' ' + msg.data + ' current users').hide().show();
              break;

            case "clear_points":
              $('div.atags').remove()
              break;

            case "reset_set":
              $('div.atags').remove();
              imgSet = msg.data;
              $('div.tags').find('i.marker:first').removeClass('marked').hide().show();
              $('#image-set').find('i.fa').text(' Image ' + imgSet);
              $('#wait-state').hide();
              isFree = true;
              console.log('reset');
              break;

            default:
              console.log("Received unknown protocol message:");
              console.log(event.data);
              break;
          }

          if (replyNeeded) {
            // send a reply if we need to by the protocol standards that we defined
          }
        }
        console.log(event.data);

      } catch (err) {
        console.dir(err);
      }
    };

    webSock.onclose = function(event) {
      // do stuff when the connection closes
      $('#connstatus').find('i.circle').css('color', 'red').text(' Not Connected');
      console.log('Connection closed with ' + wsurl);
    };

    submitBtn.onclick = function(e) {
      // make sure we have valid coordinates to send
      if ($('#form_x').val() != null && $('#form_y').val() != null) {
        if (webSock) {
          // check to see if the websocket object exists
          // $('.marker:first').css('color', 'blue');
          $('.marker:first').addClass('marked');
          // create our data object to send
          var data = {
            cords: {
              x: $('#form_x').val(),
              y: $('#form_y').val()
            },
            set: imgSet
          };
          // construct a message object, placing the data as the payload
          var msg = new Msg('submit_cords', data, commRealm);
          // Send the msg object as a JSON-formatted string.
          webSock.send(JSON.stringify(msg));
          isFree = false;
          $('#wait-state').show();
        } else {
          console.log("No socket connection");
        }
      } else {
        console.log("No coordinates set");
      }
    };

    $('#point-wrap').click(function(e) {
      // e = e || window.event;
      // e = jQuery.event.fix(e);

      // get the offset value that is hidden relative to the 
      // top left corner of the image
      var offset = $(this).position()
      var imgB = document.getElementById('point-wrap');
      // console.dir(imgB);
      var x = Math.round(e.offsetX);
      var y = Math.round(e.offsetY);
      // update our value if we haven't already submitted
      if (isFree) {
        $('#form_x').val(x);
        $('#form_y').val(y);

        var point = $('div.tags').find('.marker:first');
        point.offset({
          top: y + offset.top - imgB.offsetTop,
          left: x + offset.left - imgB.offsetLeft
        });
        point.css('visibility', 'visible');
      }
    });

    $('#point-wrap').mousemove(function(e) {
      // console.log('client: (' + e.clientX + ',' + e.clientY + ')\noffset: (' + e.offsetX + ',' + e.offsetY + ')\npage: (' + e.pageX + ',' + e.pageY + ')\nscreen: (' + e.screenX + ',' + e.screenY + ')\n');
    });

    // bind the enter key for submission
    $(document).keypress(function(e) {
      // Enter
      if (e.which == 13) {
        submitBtn.click();
      }
      // Spacebar
      if (e.which == 32) {
        $('.atags').remove();
        return false;
      }

      // ? + nextEn
      if (e.which == 63 && nextEn == true) {
        // reset everyone's screen for next image
        if (webSock) {
          // construct a message object, placing the data as the payload
          imgSet = imgSet + 1;
          var msg = new Msg('request_next_set', imgSet, commRealm);
          isFree = true;
          // Send the msg object as a JSON-formatted string.
          webSock.send(JSON.stringify(msg));
          console.log('Resetting realm');
        }
      }

      // ^ + nextEn
      if (e.which == 94 && nextEn == true) {
        for (i = 0; i < 200; ++i) {
          var x = Math.floor(Math.random() * $('img').width());
          var y = Math.floor(Math.random() * $('img').height());
          $('#form_x').val(x);
          $('#form_y').val(y);
          placePoint(x, y);

          $('#submit-btn').trigger("click");
        }
      }

      // n + shift + alt = enable nextEn state
      if (e.which == 78) {
        nextEn = true;
        console.log('mode enabled');
      } else {
        nextEn = false;
      }

      console.log(nextEn);
    });

  }
}