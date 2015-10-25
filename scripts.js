var isFree = true;
var attempts = 1;

jQuery.fn.extend({
  encode: function(x, y) {
    var dims = {
      x: "",
      y: ""
    };
    dims.x = Math.round((x / $(this).width()) * 1000);
    dims.y = Math.round((y / $(this).height()) * 1000);
    return dims;
  },
  decode: function(x, y) {
    var dims = {
      left: "",
      top: ""
    };
    dims.left = Math.round((x * $(this).width()) / 1000);
    dims.top = Math.round((y * $(this).height()) / 1000);
    return dims;
  }
});

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

    // setup the websocket connection
    var wsurl = "ws://104.131.13.159:5000";
    // var wsurl = "ws://localhost:5000";
    //get status element
    // var connstatus = document.getElementById('connstatus');
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
            case "submit_cords":
              break;

            case "add_user_cords":
              var aTags = $('div.tags');
              // if this is the first addition, create the div wrapper for others
              if (!aTags.find('div').length) {
                aTags.append('<div></div>');
                aTags.find('div').addClass('atags');
              }
              // clone a placement marker
              var rootTag = $('.marker:first');
              rootTag.addClass('marker-user').clone().appendTo(aTags.find('div'));
              rootTag.removeClass('marker-user');

              // compute our local placement dimensions
              var dims = $('#point-wrap').decode(msg.data.cords.x, msg.data.cords.y);

              // set the offset
              $('.marker-user:last').offset(dims);
              $('.marker-user:last').css('color', 'red');
              $('.tags').hide().show();
              console.log("Added coordinate to image.");
              break;

            case "renew_num_clients":
              $('#num-users').find('i.fa-user').text(' ' + msg.data + ' current users');
              console.log("Updating number of users");
              break;

            case "clear_points":
              $('div.atags').remove()
              console.log("Clearing current points.");
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
        console.log(err);
        console.dir(err);
      }
    };

    webSock.onclose = function(event) {
      // do stuff when the connection closes
      $('#connstatus').find('i.circle').css('color', 'red').text(' Not Connected');
      console.log('Connection closed with ' + wsurl);
    };


    submitBtn.onclick = function(e) {
      var cord_x = document.getElementById("form_x").value;
      var cord_y = document.getElementById("form_y").value;
      var image_set = 1;

      // make sure we have valid coordinates to send
      if (cord_x != null && cord_y != null) {
        // check to see if the websocket object exists
        $('.marker:first').css('color', 'green');

        if (webSock) {
          // encode the dimensions for global normalization
          var dims = $('#point-wrap').encode(cord_x, cord_y);
          // create our data object to send
          var data = {
            cords: dims,
            set: image_set
          };
          // construct a message object, placing the data as the payload
          var msg = new Msg('submit_cords', data, commRealm);
          // Send the msg object as a JSON-formatted string.
          webSock.send(JSON.stringify(msg));
          // isFree = false;
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
      if (isFree) {
        var x = Math.round(e.offsetX);
        var y = Math.round(e.offsetY);
        $('#form_x').val(x);
        $('#form_y').val(y);
      }

      var point = $('.marker:first');
      // console.log(point.position());
      point.offset({
        top: y,
        left: x
      });

      $('.tags').show();
      console.dir($(this));
      // console.log(e);
    });

    $('#point-wrap').mousemove(function(e) {
      //   e = e || window.event;
      //   e = jQuery.event.fix(e);
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
        clearTags();
      }
      // c or C
      if (e.which == 99 || e.which == 67) {
        //console.log('Opening connection to ' + wsurl);
      }
      console.log('pressed ' + e.which);
    });

  }
}