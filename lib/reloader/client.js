;(function () {
  var serverAddress =
    'ws://' +
    (window.liveReloadHost || window.location.host || 'localhost').split(
      ':'
    )[0] +
    ':%WEBSOCKET_PORT%'

  console.log('Live-reload client connecting to', serverAddress)

  var ws

  function connectSocket() {
    ws = new WebSocket(serverAddress)
    ws.onmessage = function (e) {
      var data = JSON.parse(e.data)
      if (data.reload) location.reload()
      else if (data.reloadCSS) refreshCSS()
    }
  }

  function refreshCSS() {
    var sheets = document.getElementsByTagName('link')

    console.log('Reload CSS')

    for (var i = 0; i < sheets.length; i++) {
      var elem = sheets[i]
      var rel = elem.rel
      var reloadThis =
        elem.href &&
        elem.href.substring(0, 5) !== 'data:' &&
        (typeof rel != 'string' ||
          rel.length == 0 ||
          rel.toLowerCase() == 'stylesheet')
      if (!reloadThis) continue
      var url = elem.href.replace(/(&|\?)_cacheOverride=\d+/, '')
      elem.href =
        url +
        (url.indexOf('?') >= 0 ? '&' : '?') +
        '_cacheOverride=' +
        new Date().valueOf()
    }
  }

  var max = 3
  var attempts = 0
  var timer = setInterval(trySocket, 3000)

  function trySocket() {
    if (ws && ws.readyState === 1) {
      console.log('Live-reload client connected')
      clearInterval(timer)
      return
    }
    if (attempts > 0) console.log('Live-reload client connecting..')
    attempts++
    if (attempts > max) {
      console.log('Live-reload client failed to connect to server')
      return clearInterval(timer)
    }
    connectSocket()
  }

  trySocket()
})()
