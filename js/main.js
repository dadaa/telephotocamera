/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var R_EARTH = 63578150;
var FLICKR_API_KEY = "dc15879092110f7c29ec831325067b50";

var Main = {
  toRadian: function(degree) {
    return degree * Math.PI / 180.0;
  },

  toDegree: function(radian) {
    return radian * 180.0 / Math.PI;
  },

  middlize: function(height, component) {
    var hOfComponent = component.offsetHeight;
    var yOfComponent = (height - component.offsetHeight) / 2;
    component.style.top = yOfComponent+"px";
  },

  init: function() {
    var audio = new Audio("../resources/sounds/shutter.ogg");

    //centering ---
    var height = window.innerWidth > window.innerHeight ? window.innerHeight : window.innerWidth;
    Main.middlize(height, document.getElementById("take-button"));
    Main.middlize(height, document.getElementById("distance"));
    //-------------


    Main.latitude = 0;
    Main.longitude = 0;
    Main.heading = 0;
    Main.distance = 0;

    var LAT_METER = 2*Math.PI*R_EARTH / 360;

    document.getElementById("take-button").addEventListener("click", function(e) {
      audio.play();
      document.getElementById("photo").src = "";
      document.getElementById("place").textContent = "";
      document.getElementById("message").textContent = "";

      var latitude = Main.latitude;
      var longitude = Main.longitude;
      var heading = Main.heading + 90;
      var distance = Main.distance;
      distance *= 1000;

      //radian 
      var radLatitude = Main.toRadian(latitude);
      var radLongitude = Main.toRadian(longitude);
      var radHeading = Main.toRadian(heading);

      var dLongitude = distance * Math.cos(radHeading) / R_EARTH * Math.cos(radLatitude);
      var dLatitude = dLongitude * Math.tan(radHeading)  * Math.cos(radLatitude);

      var targetRadLatitude = radLatitude + dLatitude;
      var targetRadLongitude = radLongitude - dLongitude;

      var targetLatitude = Main.toDegree(targetRadLatitude);
      var targetLongitude = Main.toDegree(targetRadLongitude);

      var targetLatitudeContainer = document.getElementById("target-latitude");
      var targetLongitudeContainer = document.getElementById("target-longitude");
      targetLatitudeContainer.textContent = targetLatitude;
      targetLongitudeContainer.textContent = targetLongitude;

      //find from flickr
      var searchurl = "http://www.flickr.com/services/rest/?"
              + "api_key="+FLICKR_API_KEY
              + "&method=flickr.photos.search"
              + "&per_page=3"
              + "&format=json"
              + "&jsoncallback=Main.loadPhotos"
              + "&lon="+targetLongitude
              + "&lat="+targetLatitude
              + "&radius=30";
      var scriptElement = document.createElement("script");
      scriptElement.src = searchurl;
      document.body.appendChild(scriptElement);

      //find location
      var placeurl = "http://www.flickr.com/services/rest/?"
      + "api_key="+FLICKR_API_KEY
      + "&method=flickr.places.findByLatLon"
      + "&format=json"
      + "&jsoncallback=Main.loadPlace"
      + "&lon="+targetLongitude
      + "&lat="+targetLatitude;
      var placeScriptElement = document.createElement("script");
      placeScriptElement.src = placeurl;
      document.body.appendChild(placeScriptElement);
    }, true);

    navigator.geolocation.watchPosition(function(position) {
      var latitude = position.coords.latitude;
      var longitude = position.coords.longitude;
      var heading = position.coords.heading;

      var latitudeContainer = document.getElementById("latitude");
      var longitudeContainer = document.getElementById("longitude");
      var headingContainer = document.getElementById("heading");
      latitudeContainer.textContent = latitude;
      longitudeContainer.textContent = longitude;
      headingContainer.textContent = heading;

      Main.latitude = latitude;
      Main.longitude = longitude;
      if (heading) {
        Main.heading = heading;
      }
    });

    var container = document;
    /*
    container.addEventListener("touchstart", function(e) {
      var distance = Main.getDistanceFromTouch(e);
      if (distance != -1) {
        return;
      }
      Main.startDrag(distance);
    }, true, true);
    */
    container.addEventListener("touchmove", function(e) {
      var distance = Main.getDistanceFromTouch(e);
      if (distance != -1) {
        if (Main.isdrag != true) {
          Main.startDrag(distance);
        } else {
          Main.dragging(distance);
        }
      }
    }, true, true);

    container.addEventListener("touchend", function(e) {
      Main.endDrag(0);
    }, true, true);

    container.addEventListener("mousedown", function(e) {
      Main.startDrag(e.layerY);
    }, true);

    container.addEventListener("mousemove", function(e) {
      Main.dragging(e.layerY);
    }, true);

    container.addEventListener("mouseup", function(e) {
      Main.endDrag(e.layerY);
    }, true);

  },

  getDistanceFromTouch: function(e) {
    var touches = e.changedTouches;
    if (2 != touches.length) {
      return -1;
    }
    var touch1 = touches[0];
    var x1 = touch1.pageX;
    var y1 = touch1.pageY;
    var touch2 = touches[1];
    var x2 = touch2.pageX;
    var y2 = touch2.pageY;
    var distance = Math.sqrt(Math.pow(x2-x1, 2)+Math.pow(y2-y1, 2));
    return Math.round(distance);
  },

  startDrag: function(y) {
    Main.isdrag = true;
    Main.previousy = y;
  },

  dragging: function(y) {
    if (Main.isdrag != true) {
      return;
    }
    var dy = Main.previousy - y;
    Main.previousy = y;
    Main.distance -= dy;
    if (Main.distance < 0) {
      Main.distance = 0;
    }
    document.getElementById("distance").textContent = Main.distance;
  },

  endDrag: function(y) {
    Main.isdrag = false;
  },

  loadPhotos: function(data) {
    if (! data) {
      Main.log("no photos response");
      return;
    }
    if (! data.photos) {
      Main.log(data.message);
      return;
    };
    var photos = data.photos.photo;
    if ( ! photos || ! photos.length || photos.length == 0) {
      Main.log("photos not found");
      return;
    };

    var photo = photos[0];
    var imageurl = 'http://static.flickr.com/'+photo.server+'/'+photo.id+'_'+photo.secret+'.jpg';

    document.getElementById("photo").src = imageurl;
  },

  loadPlace: function(data) {
    if (! data) {
      Main.log("no place response");
      return;
    }
    if (! data.places) {
      Main.log(data.message);
      return;
    };
    var places = data.places.place;
    if ( ! places || ! places.length || places.length == 0) {
      Main.log("places not found");
      return;
    };
    var place = places[0];
    document.getElementById("place").textContent = place.name;
  },

  log: function(log) {
    document.getElementById("message").textContent = log;
  }
}

Main.init();