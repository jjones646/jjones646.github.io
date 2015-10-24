var isFree = true;

function pointIt(event) {
  if (isFree) {
    var offsetPtr = $('#pointer-div').offset();
    var pos_x = event.offsetX ? (event.offsetX + offsetPtr.left) : event.pageX - offsetPtr.left;
    var pos_y = event.offsetY ? (event.offsetY + offsetPtr.top) : event.pageY - offsetPtr.top;
    var mrkElem = $('.marker:first');
    var offsetVal = mrkElem.width() / 2;
    mrkElem.offset({
      top: (pos_y - offsetVal),
      left: (pos_x - offsetVal)
    });
    mrkElem.css("visibility", "");
    $('#form_x').val(pos_x);
    $('#form_y').val(pos_y);
  }
}

// Convert the normalized coordinates for the user's current display settings
// normalized units are assumed to be in the range from 0 to 1000.
function decLoc(x, y) {
  var myW = $('#pointer-div').width();
  var myH = $('#pointer-div').height();
  var dims = {
    x: "",
    y: ""
  };

  dims.x = Math.round((x * myW) / 1000);
  dims.y = Math.round((y * myH) / 1000);
  return dims;
}

// encode the location before sending it over the websocket connection
function encLoc(x, y) {
  var myW = $('#pointer-div').width();
  var myH = $('#pointer-div').height();
  var dims = {
    x: "",
    y: ""
  };

  dims.x = Math.round((x / myW) * 1000);
  dims.y = Math.round((y / myH) * 1000);
  return dims;
}

function clearTags() {
  $('div.atags').remove()
}

window.onload = function() {
  if (!window.WebSocket) {
    //If the user's browser does not support WebSockets, give an alert message
    alert("Your browser does not support the WebSocket API!");
  } else {

    // setup the websocket connection
    var wsurl = "ws://104.131.13.159:5000";
    //get status element
    var connstatus = document.getElementById("connectionstatus");
    var submitBtn = document.getElementById('submit-btn');
    // the default realm for our protocol
    var commRealm = 'robotics';
    // create the websocket object
    var webSock = new WebSocket(wsurl, ["protocolOne", "protocolTwo"]);

    // Handle any errors that occur.
    webSock.onerror = function(error) {
      console.log('WebSocket Error: ' + error);
    };

    webSock.onopen = function(event) {
      // do stuff when the connection opens
      console.log(event);
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
              // not used client-side
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
              var dims = decLoc(msg.data.cords.x, msg.data.cords.y);
              // set the offset
              $('.marker-user:last').offset({
                top: dims.y,
                left: dims.x
              });
              console.log("Added coordinate to image.");
              break;

            case "renew_num_clients":
              $('#num-users').text(msg.data);
              console.log("Updating number of users");
              break;

            case "clear_points":
              clearTags();
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
      }
    };

    webSock.onclose = function(event) {
      // do stuff when the connection closes
    };

    submitBtn.onclick = function(e) {
      var cord_x = document.getElementById("form_x").value;
      var cord_y = document.getElementById("form_y").value;
      var image_set = 1;

      // make sure we have valid coordinates to send
      if (cord_x != null && cord_y != null) {
        // check to see if the websocket object exists
        if (webSock) {
          // encode the dimensions for global normalization
          var dims = encLoc(cord_x, cord_y);
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

    // bind the enter key for submission
    $(document).keypress(function(e) {
      if (e.which == 13) {
        submitBtn.click();
      }
    });

  }
}