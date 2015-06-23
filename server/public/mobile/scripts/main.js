var LEFT = 74; //j
var RIGHT = 76; //l
var UP = 73; //i
var DOWN = 75; //k
var ON = "ON";
var OFF = "OFF";
var WS_URL = "ws://" + window.location.href.split("/")[2].split(":")[0] + ":4113/";
var STREAM_URL = "http://" + window.location.href.split("/")[2].split(":")[0] + ":4114/stream.mjpg";
var HTTP_URL = "http://" + window.location.href.split("/")[2].split(":")[0] + ":8080/";

var keysdown = {};
var websocket = null;

function keypressHandle(e){
	if(e.type == "keydown"){
		if(!keysdown[e.keyCode]){
			keysdown[e.keyCode] = true;
			sendState();
		}
	}
	else if(e.type == "keyup"){
		keysdown[e.keyCode] = false;
		sendState();
	}
	else console.error(e);
}

function sendState(){
	if(websocket != null){
		var left = (keysdown[LEFT] === true) ? ON : OFF;
		var right = (keysdown[RIGHT] === true) ? ON : OFF;
		var up = (keysdown[UP] === true) ? ON : OFF;
		var down = (keysdown[DOWN] === true) ? ON : OFF;
		
		var cmd = "up=" + up + "&down=" + down + "&left=" + left + "&right=" + right;
		websocket.send(cmd);
	}
}

function wsConnection(){
	if(websocket != null){
		websocket.close();
	}
	else{
		var token = 123;
		var query = encodeURI("token=" + token + "&name=" + $("select#cars_list").val());
		websocket = new WebSocket(WS_URL);
		
		websocket.onopen = function(evt){
			$("button#ws_connect").text("Disconnect");
			$("#status").text("Connected to " + $("select#cars_list").val());
			$("#stream").attr("src", encodeURI(STREAM_URL + "?token=" + token + "&name=" + $("select#cars_list").val()));
			websocket.send(query);
		};
		
		websocket.onclose = function(evt){
			$("button#ws_connect").text("Connect");
			$("#status").text("Close reason: " + evt.reason);
			$("#stream").attr("src", "http://www.joomlaworks.net/images/demos/galleries/abstract/7.jpg");
			websocket = null;
		};
		
		websocket.onmessage = function(evt){
			console.log(evt.data);
		};
		
		websocket.onerror = function(evt){
			$("#status").text("ERROR: " + evt);
			console.log(evt);
		};
	}
}

function refreshCarsList(){
	var URL = HTTP_URL + "cars_list";
	$("select#cars_list").empty();
	$.ajax({
		url: URL,
		success: function(data, textStatus, jqXHR){
			data.forEach(function(d){
				$("select#cars_list").append("<option value='" + d + "'>" + d + "</option>");
			});
		},
		error: function(jqXHR, status, error){
			console.log(status + " " + error);
		}
	});
}

$(document).ready(function() {
	$(window).keydown(keypressHandle).keyup(keypressHandle);
	$("button#ws_connect").click(wsConnection);
	$("button#refresh").click(refreshCarsList);
	refreshCarsList();
});