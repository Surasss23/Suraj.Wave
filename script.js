window.AudioContext = window.AudioContext || window.webkitAudioContext;
window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

var context = null;
var recorder = null;
var mediaStream = null;

var ggwave = null;
var parameters = null;
var instance = null;

var txData = document.getElementById("txData");
var chatBox = document.getElementById("chat-box");

ggwave_factory().then(function(obj) {
    ggwave = obj;
    init();
});

function convertTypedArray(src, type) {
    var buffer = new ArrayBuffer(src.byteLength);
    var baseView = new src.constructor(buffer).set(src);
    return new type(buffer);
}

function init() {
    if (!context) {
        context = new AudioContext({sampleRate: 48000});
        parameters = ggwave.getDefaultParameters();
        parameters.sampleRateInp = context.sampleRate;
        parameters.sampleRateOut = context.sampleRate;
        instance = ggwave.init(parameters);

        // Start microphone capture
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
            mediaStream = context.createMediaStreamSource(stream);
            var bufferSize = 1024;
            var numberOfInputChannels = 1;
            var numberOfOutputChannels = 1;

            recorder = context.createScriptProcessor(bufferSize, numberOfInputChannels, numberOfOutputChannels);
            recorder.onaudioprocess = function (e) {
                var source = e.inputBuffer;
                var res = ggwave.decode(instance, convertTypedArray(new Float32Array(source.getChannelData(0)), Int8Array));

                if (res && res.length > 0) {
                    res = new TextDecoder("utf-8").decode(res);
                    var messageElement = document.createElement("div");
                    messageElement.className = "message received";
                    messageElement.textContent = res;
                    chatBox.appendChild(messageElement);
                    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to bottom
                }
            };

            mediaStream.connect(recorder);
            recorder.connect(context.destination);
        }).catch(function (e) {
            console.error("Microphone access denied:", e);
        });
    }
}

function onSend() {
    if (!context) return;

    var waveform = ggwave.encode(instance, txData.value, ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FAST, 10);
    var buf = convertTypedArray(waveform, Float32Array);
    var buffer = context.createBuffer(1, buf.length, context.sampleRate);
    buffer.getChannelData(0).set(buf);
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0);

    // Display sent message in chat box
    var messageElement = document.createElement("div");
    messageElement.className = "message sent";
    messageElement.textContent = txData.value;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to bottom
    txData.value = "";
}
