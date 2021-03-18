/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Wait for the deviceready event before using any of Cordova's device APIs.
// See https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready

"use strict";


let _imgURL = ""; //url dell'immagine appena scattata
let lat = "";
let lng = "";

$(document).ready(function(){
    document.addEventListener('deviceready', onDeviceReady);

    function onDeviceReady() {
        //SCATTA FOTO E SALVA IN CLOUD 
        let _wrapper = $("#wrapper")[0];
        let _upload = $("#upload");
        _upload.css("visibility","hidden");
        _upload.css("disabled",true);

        let _textArea = $("#Note");
        let cameraOptions ={
            "quality":50
        }

        $("#fotocamera").on("click",function(){
            cameraOptions.sourceType  = Camera.PictureSourceType.CAMERA;
            cameraOptions.DestinationType = Camera.DestinationType.DATA_URL; //mi da img in formato base64
            navigator.camera.getPicture(success,error,cameraOptions);
        })

        $("#CercaFoto").on("click", function () {
            cameraOptions.sourceType = Camera.PictureSourceType.SAVEDPHOTOALBUM;
            cameraOptions.destinationType = Camera.DestinationType.DATA_URL;
            navigator.camera.getPicture(success, error, cameraOptions);
        });

        



        //viene iniettata l'immagine scattata
        function success(img){ //img è già in base64
            let _img = $("<img>");
            _img.css({
                "height":200
            });
            if(cameraOptions.DestinationType == Camera.DestinationType.DATA_URL)
            {
                _img.prop("src","data:image/jpeg;base64,"+img);
                _imgURL = "data:image/jpeg;base64,"+img;
            }
                
            else
            {
                _img.prop("src",img);
                _imgURL = img;
            }
            _img.appendTo($("#imageTaken"));
            // DI CONSEGUENZA , UNO CLICCHERA' SUL BOTTONE UPLOAD, E AUTOMATICAMENTE VERRA' CARICATO SU CLOUD
            
            //Dopo che ho scattato la foto, voglio che mi mostri subito la posizione di dove l'ho scattato, sulla mappa.
            navigator.geolocation.getCurrentPosition(geolocationSuccess,error);

        }




        //GEOLOCATION
        let currentMap = null;
        let currentMarker = null;

        /* PROVA
        let pos = google.maps.LatLng(45,4773,9,1815);
        let mapOptions={
            "zoom":8,
            "center":pos,
            "mapTypeId": google.maps.MapTypeId.HYBRID
        }
        currentMap = new google.maps.Map(document.getElementById("map"),mapOptions);

        currentMarker = new google.maps.Marker(  
            {  
                "position": pos,  
                "map": currentMap,
                "title":"My current position"
            });
        */



        function geolocationSuccess(position){
            /*
            alert('Latitude: '          + position.coords.latitude          + '\n' +
            'Longitude: '         + position.coords.longitude         + '\n' +
            'Altitude: '          + position.coords.altitude          + '\n' +
            'Accuracy: '          + position.coords.accuracy          + '\n' +
            'Altitude Accuracy: ' + position.coords.altitudeAccuracy  + '\n' +
            'Heading: '           + position.coords.heading           + '\n' +
            'Speed: '             + position.coords.speed             + '\n' +
            'Timestamp: '         + position.timestamp                + '\n');
            */

            let currentPos = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);


            if(currentMap == null)
            {
                let mapOptions={
                    "zoom":8,
                    "center":currentPos,
                    "mapTypeId": google.maps.MapTypeId.HYBRID
                }
                currentMap = new google.maps.Map(document.getElementById("map"),mapOptions);

                currentMarker = new google.maps.Marker(  
                    {  
                        "position": currentPos,  
                        "map": currentMap,
                        "title":"My current position"
                    });
            }
            else   
                currentMarker.setPosition(currentPos);
              
            //salvo la latitudine e longitudine su una variabile

            lat =position.coords.latitude;
            lng = position.coords.longitude;
            _upload.css("visiblity","visible");
            _upload.css("disabled",false);
        }


        
        $("#upload").on("click",uploadImage(_imgURL,lat,lng));




        function uploadImage(img,_lat,_lng){
            if(_textArea.html() != "")
            {
                let _note = _textArea.html(); 
                let request = inviaRichiesta("POST","/api/upload",{"img":img,"lat":_lat,"lng":_lng,"note":_note}); 
                request.fail(errore);
                request.done(function(data){
                    alert("Upload effettuato correttamente");
                    console.log(data);
                })
            }
            else
                alert("Mancano le note");
            
        }


        /**************BASIC FUNCTIONS********/

        function error(err){
            if(err.code)
                notifica("Errore: "+ err.code+ " - "+err.message);

        }
        
        function notifica(msg){
            navigator.notification.alert(
                msg,
                function(){},
                "Info",
                "Ok"
            );
        }
    }

})
