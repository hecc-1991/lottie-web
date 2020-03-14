self.addEventListener('message', function (e) {
    var data = e.data;
    switch (data.type) {
      case 'load':
          console.log(`to load ${data.args}`);
          
        self.postMessage({type:'loaddone','args':'this is video reader'});
        break;
      case 'stop':
        self.close(); // Terminates the worker.
        break;
      default:
        break;
    };
  }, false);