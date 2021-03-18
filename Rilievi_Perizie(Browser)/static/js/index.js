"use strict";

let markerID = null;
let MAP = null;
$(document).ready(function(){

    // GOOGLE MAPS
    let _map = $("#map");
    _map.css("visibility","hidden");
    initMap();
    //$(".navbar-link").eq(2).on("click",initMap);
    //PHOTOS 
    $(".navbar-link").eq(1).on("click",function(){
      let request =  inviaRichiesta("GET","/api/Photos");
      request.fail(errore);
      request.done(function(data){
        console.log(data);
      })
    });


    $(".navbar-link").eq(3).on("click",function(){
      let request = inviaRichiesta("POST","/api/logout");
      request.fail(errore);
      request.done(function(data){
        alert("Logout successo");
        window.location.reload();
      })
    })


    $("#btnCrea").on("click",function(){
      let _name = $("#name").val();
      let _surname = $("#surname").val();
      let _username = $("#username").val();
      let _mail=$("#mail").val();
      let _password = $("#pwd").val();

      let json={
        "name":_name,
        "surname":_surname,
        "username":_username,
        "password":_password,
        "mail":_mail,
        "uploads":[]
      }
        let request = inviaRichiesta("POST","/api/AddUser",json);
        request.fail(errore);
        request.done(function(data){
          console.log(data);
          alert("Utente aggiunto correttamente");
        });
    });


    $("#GetPhotos").on("click",function(){
      let request = inviaRichiesta("GET","/api/ALLPhotos_Details");
      request.fail(errore);
      request.done(function(data){
        console.log(data);

       
        let src;
        for(let i=0;i<data.length;i++)
        {
          for(let j=0;j<data[i]["uploads"].length;j++)
          {
              let _div = $("<div>");
              _div.addClass("photos col-xl-6 mr-3 shadow mg-5 rounded");
              _div.css("width","100px");
              let _img = $("<img>");
                src = data[i]["uploads"][j]["Image"];
                _img.prop("src",src);
                _img.css("height","100");
                _img.appendTo(_div);
                _div.appendTo($("#items"));
          }

        }
        
      })
    })







    //.........................................GOOGLE MAPS......................................
    function initMap(){ 
      
      _map.css("visibility","visible");

      let request = inviaRichiesta("GET","/api/ALL_Details");
      request.fail(errore);
      request.done(function(data){
        console.log(data);

        

        MAP = new google.maps.Map(document.getElementById('map'), {
          zoom: 6,
          center: new google.maps.LatLng(42.1350339,9.1776237),
          mapTypeId: google.maps.MapTypeId.ROADMAP
        });

        let lat;
        let lng;
        for(let i=0;i<data.length;i++){
          lat=parseInt(data[i]["lat"]);
          lng=parseInt(data[i]["lng"]);
          let id = data[i]["marker"];
          addMarker({lat:lat,lng:lng,},id);
        }





        //add marker function
        function addMarker(coords,id){
            let marker = new google.maps.Marker({
                position:coords,
                map:MAP,
                id:id,
            });

            let infoWindow = new google.maps.InfoWindow({
              content: "Click the map to get Lat/Lng!",
              position: coords,
            });

            marker.addListener("click", (mapsMouseEvent) => {
              MAP.setZoom(9);
              MAP.setCenter(marker.getPosition());
              let aus;

              infoWindow = new google.maps.InfoWindow({
                position: mapsMouseEvent.latLng,
              });
              infoWindow.setContent(
                aus =JSON.stringify(mapsMouseEvent.latLng.toJSON())
              );
              infoWindow.open(MAP);

              let request = inviaRichiesta("GET","/api/ALL_Details");
              request.fail(errore);
              request.done(function(data){
                let _lat = $("#lat");
                let _lng = $("#lng");
                let _note = $("#note");
                let _img = $("#_img");


                _lat.html("");
                _lng.html("");
                _note.html("");
                _img.prop("src","");
                _img.css("border","7px double darkblue");
                _note.css("font-weight","bold");
                _note.css("font-family","arial");
                

                markerID= marker.get('id');
                for(let i =0;i < data.length;i++)
                {
                    if(markerID == data[i]["marker"])
                    {  
                      _lat.html("LATITUDINE : "+data[i]["lat"]);
                      _lng.html("LONGITUDINE : "+data[i]["lng"]);
                      _note.prop("disabled",false);
                      _note.html(" NOTA :"+data[i]["note"]);
                      _img.prop("src",data[i]["Image"]);

                      
                    }
                }

              })
            });            
        }

       

        $("#percorso").on("click",function(){

          let geocoder = new google.maps.Geocoder();

          //ARRIVO
          let _lat = $("#lat").html().split(':');
          let _lng = $("#lng").html().split(':');
          let LatLng_Arrivo = {
             lat:parseFloat(_lat[1]),
             lng:parseFloat(_lng[1])
          };

          let posArrivo = new google.maps.LatLng(LatLng_Arrivo);
          
          let latLng_partenza={};
          let PosPartenza;
          
          //PARTENZA
          if(navigator.geolocation) 
          {
              navigator.geolocation.getCurrentPosition(
              (position) => {
                latLng_partenza= {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };
                PosPartenza = new google.maps.LatLng(latLng_partenza);
                geocoder.geocode({ "location": PosPartenza }, function (resultsP, statusP) {
                  if (statusP == google.maps.GeocoderStatus.OK) {
                      geocoder.geocode({ "location": posArrivo }, function (resultsA, statusA) {
                          if (statusA == google.maps.GeocoderStatus.OK) {
                              let coordP = resultsP[0]["geometry"]["location"];
                              let coordA = resultsA[0]["geometry"]["location"];
                              visualizzaPercorso(coordP, coordA);
                          }
                          else{
                              alert("Posizione di Arrivo non valida");
                          }
                      })
                  }
                  else{
                      alert("Posizione di Partenza non valida");
                  }
                 })
              })
              
          } 


          
        
        })

        function visualizzaPercorso(coordP, coordA) {
            console.log("Coordinate: "+coordP+"-"+coordA);
            let mapOptions = {
                "center":coordP,
                "zoom":15,
                "mapTypeId":google.maps.MapTypeId.ROADMAP
            }
            let directionsService = new google.maps.DirectionsService();
            let directionsRenderer = new google.maps.DirectionsRenderer();
            let percorso = {
                "origin":coordP,
                "destination":coordA,
                "travelMode":google.maps.TravelMode.DRIVING
            }
            //Calcola il percorso
            directionsService.route(percorso, function (routes, status) {
                if(status==google.maps.DirectionsStatus.OK){
                    //Disegna percorso
                    directionsRenderer.setDirections(routes);
                    directionsRenderer.setMap(MAP);
                    directionsRenderer.setPanel(panel);
                    //Distanza e tempo di percorrenza
                    let distanza = routes.routes[0].legs[0].distance.text;
                    let tempo = routes.routes[0].legs[0].duration.text;
                    msg.html("Distanza: "+distanza+"<br>"+"Tempo: "+tempo);
                }
            })
         }


        $("#SaveNote").on("click",function(){
          let note =$("#note").html();
          let request = inviaRichiesta("POST","/api/SaveNote",{"note":note,"id":markerID});
          request.fail(errore);
          request.done(function(data){
            console.log(data);
            $(this).removeClass("btn-primary");
            $(this).addClass("btn-success");
            alert("NOTE SALVATO CORRETTAMENTE");
          })

            
        })



        
      })


     
    } 


    
})