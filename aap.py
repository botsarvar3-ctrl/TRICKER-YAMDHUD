from flask import Flask, request, render_template_string
from flask_socketio import SocketIO, send, disconnect
import eventlet

eventlet.monkey_patch()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

# Allowed tokens
VALID_TOKENS = {
    "12345": "Ali",
    "67890": "Ahmed",
    "abcde": "Sara"
}

html = """
<!DOCTYPE html>
<html>
<head>
<title>Offline Token Group Chat</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.js"></script>
</head>
<body>
<h2>Offline Token Based Group Chat</h2>

<input id="token" placeholder="Enter Token">
<button onclick="connectUser()">Join</button>

<ul id="messages"></ul>

<input id="message" placeholder="Type message">
<button onclick="sendMessage()">Send</button>

<script>
var socket;
var username;

function connectUser(){
    var token = document.getElementById("token").value;
    socket = io({query: "token=" + token});

    socket.on("connect_error", function(){
        alert("Invalid Token!");
    });

    socket.on("message", function(msg){
        var li = document.createElement("li");
        li.innerText = msg;
        document.getElementById("messages").appendChild(li);
    });
}

function sendMessage(){
    var msg = document.getElementById("message").value;
    socket.send(msg);
    document.getElementById("message").value = "";
}
</script>
</body>
</html>
"""

@app.route("/")
def index():
    return render_template_string(html)

@socketio.on("connect")
def verify_token():
    token = request.args.get("token")
    if token not in VALID_TOKENS:
        return False  # Reject connection
    print("Connected:", VALID_TOKENS[token])

@socketio.on("message")
def handle_message(msg):
    token = request.args.get("token")
    username = VALID_TOKENS.get(token, "Unknown")
    send(f"{username}: {msg}", broadcast=True)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
