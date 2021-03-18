const http = require("http");
const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const cors = require("cors");



const bcrypt = require("bcrypt");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const async = require("async");



let mongodb = require("mongodb");
let mongoClient = mongodb.MongoClient;
let ObjectId = mongodb.ObjectId;
const CONNECTIONOPTIONS = {useNewUrlParser: true, useUnifiedTopology: true};

const CONNECTIONSTRING_Cloud = "mongodb+srv://LookAtOmkar:OmkarSingh19@cluster0.6whso.mongodb.net/test";
const TTL_Token = 300; //espresso in sec 

let mainURL = "http://localhost:1337";


//cloudinary
const cloudinary = require("cloudinary").v2;
const CLOUDINARY_URL = "cloudinary://635869489658487:UfZkBHCRGNXVHUzyL70mz2hMetc@dsuv8riok"
cloudinary.config({
    cloud_name: 'dsuv8riok',
    api_key: '635869489658487',
    api_secret: 'UfZkBHCRGNXVHUzyL70mz2hMetc'
});


let paginaErrore;

const privateKey = fs.readFileSync("keys/privateKey.pem", "utf8");
const certificate = fs.readFileSync("keys/certificate.pem", "utf8");
const credentials = { "key": privateKey, "cert": certificate }; 


const PORT= process.env.PORT || 1337;
const DB_NAME = "Rilevi_Perizie";
let JWTKey;

const server= http.createServer(credentials,app);

server.listen(PORT, function () {
	console.log("Server started at " + mainURL);
	
	fs.readFile("./static/error.html", function (err, data)
    {
        if (!err)
            paginaErrore = data.toString();
        else
            paginaErrore = "<h1>Risorsa non trovata</h1>";
    });

    fs.readFile("./keys/private.key", function (err, data) {
        if (!err) {
            JWTKey = data.toString();
        }
        else {
            //Richiamo la route di gestione degli errori
            console.log("File mancante: private.key");
            server.close();
        }
    })

	app.response.log = function(message){
		console.log("Errore: "+message);
	}
});


app.use(cors());
 
//Log della richiesta
app.use('/', function (req, res, next)
{
    //originalUrl contiene la risorsa richiesta
    console.log(">>>>>>>>>> " + req.method + ":" + req.originalUrl);
    next();
});


app.get("/",function(req,res,next){
    controllaToken(req,res,next);
})


app.get("/index.html",function(req,res,next){
    controllaToken(req,res,next);
})
app.get("/Luoghi.html",function(req,res,next){
    controllaToken(req,res,next);
})
app.get("/Photo.html",function(req,res,next){
    controllaToken(req,res,next);
})

app.use("/",express.static("./static"));
app.use("/",express.static("./static/js"));

//Route di lettura dei parametri post
app.use(bodyParser.urlencoded({"extended": false}));
app.use(bodyParser.json());


//Log dei parametri
app.use("/", function (req, res, next)
{
    if (Object.keys(req.query).length > 0)
    {
        console.log("Parametri GET: " + JSON.stringify(req.query));
    }
    if (Object.keys(req.body).length > 0)
    {
        console.log("Parametri BODY: " + JSON.stringify(req.body));
    }
    next();
});


//Route per fare in modo che il server risponda a qualunque richiesta anche extra-domain.
app.use("/", function (req, res, next)
{
	res.setHeader("Access-Control-Allow-Origin", "*");
	next();
})	


app.post("/signup", function (req, res) {

    mongoClient.connect(CONNECTIONSTRING_Cloud,CONNECTIONOPTIONS,function(error,client){
        
        if(error)
        {
            res.status(503).send("Errore di connessione Mongo : "+error.message);
        }
        else
        {
            let database = client.db(DB_NAME);

            let username = req.body.username;
            let name= req.body.name;
            let surname = req.body.surname;
            let mail = req.body.mail;
            let password = req.body.password;

            database.collection("users").findOne({
                $or: [{
                    "mail": mail
                }, {
                    "username": username
                }]
            }, function (err, user) {
                if(err)
                {
                    res.status(500).send("Errore di esecuzione query: "+err.message);
                }
                else
                {
                    if (user == null) 
                    {
                        bcrypt.hash(password,10,function(err,hash){
                            database.collection("users").insertOne({
                                "name":name,
                                "surname":surname,
                                "username": username,
                                "password": hash,
                                "mail": mail,
                                "uploads":[]
                            }, function (error, data) {
                                if(error)
                                {
                                    res.status(500).send("Error : "+error.message);
                                }
                                else
                                {
                                    res.status(200).send({"Ris":data});
                                    console.log(data);
                                }
                                client.close();
                            });
                        });
                    } 
                    else {
                        res.json({
                            "status": "error",
                            "message": "Esiste Utente."
                        });
                    }
                    
                }   
                
            });
        }

    })
    
});


app.post("/login",function(req,res){

    let username = req.body.username;
    mongoClient.connect(CONNECTIONSTRING_Cloud, CONNECTIONOPTIONS, function (err, client)
    {
        if (err)
        {
	        res.status(503).send("Errore di connessione al DB").log(err.message);
        }
        else
        {
            let db = client.db(DB_NAME);
            let collection = db.collection("users"); 
            //Verificare che email e password corrispondono a quelli presenti sul database

            collection.findOne({"username":username},function(err,dbUser){
                if(err)
                {
                    res.status(500).send("Login Fallito").log(err.message);
                }
                else
                {
                    if(dbUser==null)
                    {
                        res.status(401).send("Username e/o password invalidi");
                    }
                    else
                    {
                        //req.body.password --> password in chiaro inserita dall'utente
                        //dbUser.password --> password cifrata contenuta nel DB
                        //il metodo compare() cifra req.body.password e la va a confrontare con dbUser-password
                        let password = req.body.password;
                        bcrypt.compare(password,dbUser.password,function(err,ok){
                            if(err)
                            {
                                res.status(500).send("Internal Error in bcrypt compare").log(err.message);
                            }
                            else
                            {
                                if(ok ==null) //ok==null
                                {
                                    res.status(401).send("Username e/o Password non validi");
                                }
                                else
                                {
                                    let token = createToken(dbUser);
                                    writeCookie(res,token);
                                    res.status(200).send({"Ris":"ok"});
                                }
                            }
                        })
                    }
                }
                client.close();
            })
        }
    });
})


app.post("/api/logout", function (req, res, next) {
    res.set("Set-Cookie", `token="";max-age=-1;path=/;`);
    res.send({ "ris": "ok" });
});

app.post("/api/upload",function(req,res){
    mongoClient.connect(CONNECTIONSTRING_Cloud,CONNECTIONOPTIONS ,function (error, client) {
        if(error)
        {
            res.status(500).send("Error to connect at server");
        }
        else
        {
            let database= client.db(DB_NAME);
            let currentID= req.payload["_id"];
            let image="";
            let lat =req.body.lat;
            let lng = req.body.lng;
            let note = req.body.note;

            cloudinary.uploader.upload(req.body.img,{
                "folder":"Rilievi_Perizie"
              },function(error,ris){
                if(!error)
                    image = ris.url;
                else
                    res.status(500).send("Error to upload on cloudinary : "+error.message);

                database.collection("users").updateOne({"_id":currentID},{$push:{"uploads":{
                    "Image":image,
                    "lat":lat,
                    "lng":lng,
                    "note":note
                }}},function(err,data){
                    if(err)
                    {
                        res.status(500).send("Error to upload on db : "+err.message);
                    }
                    else
                    {
                        res.status(200).send({"Ris":data});
                        console.log(data);
                    }
                    client.close();
                });
            })
        }


    });
})

app.get("/api/ALLPhotos_Details",function(req,res){
    //riceverò il link della foto, la latitudine , longitudine , e le note
    //Caricherò questi dati , su Photo.html 
    mongoClient.connect(CONNECTIONSTRING_Cloud,CONNECTIONOPTIONS,function(err,client){
        if(err)
        {
            res.status(503).send("Errore di connessione al server Mongodb: "+err.message);
        }
        else
        {
            let database = client.db(DB_NAME);
            let collection = database.collection("users");
            collection.aggregate([
                {"$project":{"uploads":1}}
            ]).toArray(function(err,data){
                if(err)
                {
                    res.status(500).send("Errore esecuzione query: "+err.message);
                }
                else
                {
                    res.status(200).send(data);
                }
                client.close();
            })
        }
        
    })
})
app.get("/api/ALL_Details",function(req,res){
    //riceverò il link della foto, la latitudine , longitudine , e le note
    //Caricherò questi dati , su Photo.html 
    mongoClient.connect(CONNECTIONSTRING_Cloud,CONNECTIONOPTIONS,function(err,client){
        if(err)
        {
            res.status(503).send("Errore di connessione al server Mongodb: "+err.message);
        }
        else
        {
            let database = client.db(DB_NAME);
            let collection = database.collection("users");
            collection.distinct("uploads", function(err,data){
                if(err)
                {
                    res.status(500).send("Errore esecuzione query: "+err.message);
                }
                else
                {
                    res.status(200).send(data);
                }
                client.close();
            })
        }
        
    })
})


app.post("/api/SaveNote",function(req,res){
    mongoClient.connect(CONNECTIONSTRING_Cloud,CONNECTIONOPTIONS,function(err,client){
        if(err)
        {
            res.status(503).send("Errore di connessione al server Mongodb: "+err.message);
        }
        else
        {
            let database = client.db(DB_NAME);
            let collection = database.collection("users");
            let id= req.body.marker;
            let note = req.body.note;
            collection.updateOne(
                {"uploads.marker":id},
                {$set:{"note":note}}
                , function(err,data){
                if(err)
                {
                    res.status(500).send("Error : "+err.message);
                }
                else
                {
                    res.status(200).send({"Ris":"ok"});
                }
            })
        }
        
    })
})


app.post("/api/AddUser",function(req,res){
    mongoClient.connect(CONNECTIONSTRING_Cloud,CONNECTIONOPTIONS,function(err,client){
        if(err)
        {
            res.status(503).send("Errore di connessione al server mongodb: "+err.message);
        }
        else
        {
            let database= client.db(DB_NAME);
            let collection = database.collection("users");

            let _password = req.body.password;
            bcrypt.hash(_password,10,function(err,hash){
                collection.insertOne({
                    "name":req.body.name,
                    "surname":req.body.surname,
                    "username": req.body.username,
                    "password": hash,
                    "mail": req.body.mail,
                    "uploads":[]
                },function(error,data){
                    if(error)
                    {   
                        res.status(500).send("Error: "+error.message);
                        console.log(error.message);
                    }
                    else
                    {
                        res.status(200).send({"Ris":"ok"});
                        console.log(data);
                    }
                    client.close();
                })
            });            
        }
        
    })
})



/*----------------------------------FUNCTIONS-------------------------------*/
function controllaToken(req,res,next){
    let token = readCookie(req);
    if(token == "")
    {
        inviaErrore(req,res,403,"Token mancante");
    }
    else
    {
        jwt.verify(token,JWTKey,function(err,payload){
            if(err)
            {
                inviaErrore(req,res,403,"Token scaduto o corrotto");
            }
            else
            {
                let newToken = createToken(payload);
                writeCookie(res,newToken);
                req.payload = payload; //salvo il payload req in modo che le api successive lo possano leggere e ricalete i dati dell'utente loggato
                next(); 
            }
        })
    }
}

app.use("/api",function(req,res,next){
    controllaToken(req,res,next);
})



function inviaErrore(req,res,cod,errorMessage){
    if(req.originalUrl.startsWith("/api/")){
        res.status(cod).send(errorMessage).log(err.message);
    }
    else
    {
        res.sendFile(__dirname + "/static/login.html");
    }
}

function readCookie(req){
    let valoreCookie = "";
    if(req.headers.cookie){
        let cookies = req.headers.cookie.split(';');
        for(let item of cookies){
            item = item.split('='); //item = chiave=valore --> split -->[chiave,valore];
            if(item[0].includes("token")){
                valoreCookie = item[1];
                break;
            }
        }
    }
    return valoreCookie;
}

//data --> record dell'utente
function createToken(data){
    //sign() --> aspetta come parametro un json con i parametri che si vogliono mettere nel token 
    let json = {
        "_id":data["_id"],
        "username":data["username"],
        "iat": data["iat"] || Math.floor((Date.now() / 1000)),
        "exp": ((Math.floor(Date.now() / 1000))+ TTL_Token)
    }
    
    let token = jwt.sign(json,JWTKey);
    //console.log(token);
    return token;
}


function writeCookie(res,token){
    //set() --> metodo di express che consente di impostare una o più intestazioni nella risposta HTTP
    res.set("Set-Cookie", `token=${token};max-age=${TTL_Token};path=/;httponly=true`);
}

/*-------------------------------------------------------------------------------------------------------- */



/********** Route di gestione degli errori **********/


app.use("/", function (req, res, next)
{
    res.status(404);
    if (req.originalUrl.startsWith("/api/")) 
    {
        //res.send('"Risorsa non trovata"'); //non va così bene, perchè content-type viene messo = "text"
        res.json("Risorsa non trovata"); //La serializzazione viene fatta dal metodo json()
        //res.send({"ris":"Risorsa non trovata"});
    }
    else
    {
        res.send(paginaErrore);
    }
});


app.use(function (err, req, res, next)
{
    if (!err.codice)
    {
        console.log(err.stack);
        err.codice = 500;
        err.message = "Internal Server Error";
    }
    res.status(err.codice);
    res.send(err.message);
});

app.use(function (err, req, res, next) {
    console.log(err.stack);
});