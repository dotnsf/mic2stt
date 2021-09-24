window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

window.onload = function(){
}

var processor = null;
var num = 0;
var duration = 0.0;
var length = 0;
var sampleRate = 0;
var floatData = null;
function handleSuccess( stream ){
  var source = context.createBufferSource();
  var input = context.createMediaStreamSource( stream );
  processor = context.createScriptProcessor( 1024, 1, 1 );
  
  input.connect( processor );
  processor.onaudioprocess = function( e ){
    //. 音声データ
    var inputdata = e.inputBuffer.getChannelData(0);

    if( !num ){
      num = e.inputBuffer.numberOfChannels;
      floatData = new Array(num);
      for( var i = 0; i < num; i ++ ){
        floatData[i] = [];
      }
      sampleRate = e.inputBuffer.sampleRate;
    }
    
    var float32Array = e.inputBuffer.getChannelData( 0 );
    if( availableData( float32Array ) ){
      duration += e.inputBuffer.duration;
      length += e.inputBuffer.length;
      for( var i = 0; i < num ; i ++ ){
        float32Array = e.inputBuffer.getChannelData( i );
        Array.prototype.push.apply( floatData[i], float32Array );
      }
    }
  };
  processor.connect( context.destination );
}

function startRec(){
  $('#recBtn').css( 'display', 'none' );
  $('#stopBtn').css( 'display', 'block' );

  navigator.mediaDevices.getUserMedia( { audio: true } ).then( handleSuccess );
}

function stopRec(){
  $('#recBtn').css( 'display', 'block' );
  $('#stopBtn').css( 'display', 'none' );

  if( processor ){
    processor.disconnect();
    processor.onaudioprocess = null;
    processor = null;
    
    var audioBuffer = context.createBuffer( num, length, sampleRate );
    for( var i = 0; i < num; i ++ ){
      audioBuffer.getChannelData( i ).set( floatData[i] );
    }
    
    //console.log( audioBuffer ); //. これを再生する
    
    var source = context.createBufferSource();

    source.buffer = audioBuffer;           //. オーディオデータの実体（AudioBuffer インスタンス）
    source.loop = false;                   //. ループ再生するか？
    source.loopStart = 0;                  //. オーディオ開始位置（秒単位）
    source.loopEnd = audioBuffer.duration; //. オーディオ終了位置（秒単位）
    source.playbackRate.value = 1.0;       //. 再生速度＆ピッチ

    source.connect( context.destination );

    //. for lagacy browsers
    source.start( 0 );
    source.onended = function( event ){
      //. イベントハンドラ削除
      source.onended = null;
      document.onkeydown = null;
      num = 0;
      duration = 0.0;
      length = 0;

      //. オーディオ終了
      source.stop( 0 );

      console.log( 'audio stopped.' );
    };
  }
}

function availableData( arr ){
  var b = false;
  for( var i = 0; i < arr.length && !b; i ++ ){
    b = ( arr[i] != 0 );
  }
  
  return b;
}
