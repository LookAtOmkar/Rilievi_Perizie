"use strict";


$(document).ready(function(){
	let _username = $("#username");
	let _pwd = $("#pwd");
	let _mail = $("#mail");
	let _name = $("#name");
	let _surname = $("#surname");
	
	
	_mail.css("visibility","hidden");
	_name.css("visibility","hidden");
	_surname.css("visibility","hidden");


	$("#formFooter a").on("click",function(){
		enableSignUp();
	})

	$("#LogIn").on("click",function(){
		if($(this).val()=="Log In")
		{
			let request = inviaRichiesta("POST","/login",{"username":_username.val() ,"password":_pwd.val()});
			request.fail(errore);
			request.done(function(data){
				console.log(data);
				alert("Login effettuato correttamente");
				window.location.href="index.html";
			})
		}
		else if($(this).val()=="Sign Up")
		{
			alert("ok");
			let request = inviaRichiesta("POST","/signup",{"username":_username.val() ,"password":_pwd.val(),"name":_name.val(),"surname":_surname.val(),"mail":_mail.val()});
			request.fail(errore);
			request.done(function(data){
				console.log(data);
				alert("Account creato correttamente ");
				alert("Ora effettua il login");
				disableSignUp();
			})
		}
	})


	function enableSignUp(){
		$("#LogIn").val("Sign Up"); //button
		_mail.css("visibility","visible");
		_name.css("visibility","visible");
		_surname.css("visibility","visible");
	}
	function disableSignUp(){
		$("#LogIn").val("Log In");
		_mail.css("visibility","hidden");
		_name.css("visibility","hidden");
		_surname.css("visibility","hidden");
	}
	
});