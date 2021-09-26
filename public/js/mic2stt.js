window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = null;
var processor = null;
var stt_result_texts = {};
function handleSuccess( stream ){
  var mic = context.createMediaStreamSource( stream );
  processor = context.createScriptProcessor( 1024, 2, 2 );
  mic.connect( processor );
  processor.connect( context.destination );
  processor.onaudioprocess = function( e ){
    //. ここが適宜実行されるようにはなった
    //var sampleRate = e.inputBuffer.sampleRate; // 48000
    //socketio.emit( 'mic_rate', sampleRate );
    socketio.emit( 'mic_input', { uuid: uuid, voicedata: e.inputBuffer.getChannelData(0) } );
  };

  socketio.emit( 'mic_start', uuid );
}

function startRec(){
  $('#recBtn').css( 'display', 'none' );
  $('#stopBtn').css( 'display', 'block' );

  stt_result_texts = {};
  context = new AudioContext();
  navigator.mediaDevices.getUserMedia( { audio: true } ).then( handleSuccess );
}

function stopRec(){
  $('#recBtn').css( 'display', 'block' );
  $('#stopBtn').css( 'display', 'none' );

  if( processor ){
    processor.disconnect();
    processor.onaudioprocess = null;
    processor = null;
  }
}


var uuid = generateUUID();
var socketio = null;

var base_url = location.origin + '/';

$(function(){
  socketio = io.connect();
  init();
});

function init(){
  //. 初期化を通知
  var msg = {
    uuid: uuid,
    timestamp: ( new Date() ).getTime()
  };
  socketio.emit( 'init_client', msg );

  socketio.on( 'init_client_view', function( msg ){
  });

  socketio.on( 'stt_result', function( evt ){
    //console.log( 'stt_result', evt );
    /*
    evt = {
      result_index: 1,
      results: [
        {
          final: false,
          alternatives: [
            {
              transcript: "xxx xxxx xx xxxxxx ...",
              timestamps: [
                [ "xxx", 15.55, 16.04 ],
                [ "xxxx", 16.25, 16.6 ],
                [ "xx", 16.6, 16.71 ],
                [ "xxxxxx", 16.71, 17.21 ],
                  :
              ]
            }
          ]
        }
      ]
    }
    */

    try{
      var idx = '' + evt.result_index;
      var text = evt.results[0].alternatives[0].transcript;
      var final = evt.results[0].final;
      var idxtext = { index: '' + evt.result_index, text: evt.results[0].alternatives[0].transcript, final: evt.results[0].final };
      if( !( idx in stt_result_texts ) ){
        stt_result_texts[idx] = { final: false, text: '' };
      }
      if( !stt_result_texts[idx].final ){
        stt_result_texts[idx].final = final;
        stt_result_texts[idx].text = text;
      }

      $('#stt_results').html( '' );
      Object.keys( stt_result_texts ).forEach( function( key ){
        var li = '<li id="li_' + key + '">' + stt_result_texts[key].text + '</li>';
        $('#stt_results').append( li );
      });
    }catch( e ){
    }
  });

  socketio.on( 'stt_error', function( evt ){
    //. タイムアウト（？）エラーになったらマイク停止
    stopRec();
  });
}

function generateUUID(){
  //. Cookie の値を調べて、有効ならその値で、空だった場合は生成する
  var did = null;
  cookies = document.cookie.split(";");
  for( var i = 0; i < cookies.length; i ++ ){
    var str = cookies[i].split("=");
    var une = unescape( str[0] );
    if( une == " deviceid" || une == "deviceid" ){
      did = unescape( unescape( str[1] ) );
    }
  }

  if( did == null ){
    var s = 1000;
    did = ( new Date().getTime().toString(16) ) + Math.floor( s * Math.random() ).toString(16);
  }

  var dt = ( new Date() );
  var ts = dt.getTime();
  ts += 1000 * 60 * 60 * 24 * 365 * 100; //. 100 years
  dt.setTime( ts );
  var value = ( "deviceid=" + did + '; expires=' + dt.toUTCString() + '; path=/' );
  if( isMobileSafari() ){
    $.ajax({
      url: '/setcookie',
      type: 'POST',
      data: { value: value },
      success: function( r ){
        //console.log( 'success: ', r );
      },
      error: function( e0, e1, e2 ){
        //console.log( 'error: ', e1, e2 );
      }
    });
  }else{
    document.cookie = ( value );
    //console.log( 'value: ', value );
  }

  return did;
}

function isMobileSafari(){
  return ( navigator.userAgent.indexOf( 'Safari' ) > 0 && navigator.userAgent.indexOf( 'Mobile' ) > 0 );
}
