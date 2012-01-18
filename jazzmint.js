var JazzMint = {};

JazzMint.extend = function(object,args) {
  for(var i in args) {
    object[i] = args[i];
  }
  return object;
};

JazzMint.joinPath = function() {
  var path = '';
  for(var i=0;i<arguments.length;i++) {
    if(path.length > 0 && path.substr(path.length-1) != '/') {
      path += '/';
    }
    path += arguments[i];
  }
  return path;
};

JazzMint.define = function(args) {
  for(var i in args) {
    JazzMint[i] = args[i];
  }
};

JazzMint.loadJavaScriptAsset = function(src,onload,onerror) {
  var script = document.createElement('script');
  script.src = src;
  script.type = 'text/javascript';
  script.onerror = onerror;

  if (typeof script.onreadystatechange != 'undefined'){
    script.onreadystatechange = function() {
      var state = this.readyState;
      if(state == 'loaded' || 'complete') {
        onload();
      }
    }
  } else {
    script.onload = onload;
  }

  document.getElementsByTagName('head')[0].appendChild(script);
  return script;
};

JazzMint.loadStylesheetAsset = function(src,onload,onerror) {

  var elm = document.createElement('link');
  elm.rel = 'stylesheet';
  elm.type = 'text/css';
  elm.href = src;
  elm.id = 'JazzMint-Stylesheet-' + Math.random();

  var delay = 100, timer, tries = 0, maxTries = 100;
  var checker = (function() {
    clearInterval(timer);

    var sheets = document.styleSheets;
    for(var i=0;i<sheets.length;i++) {
      var file = sheets[i];
      var owner = file.ownerNode ? file.ownerNode : file.owningElement;
      if(owner && owner.id == elm.id) {
        onload();
        return;
      }
      else {
        tries++;
        if(tries>maxTries) {
          onerror();
          return;
        }
      }
    }

    timer = setTimeout(checker,delay);
  });

  document.getElementsByTagName('head')[0].appendChild(elm);
  timer = setTimeout(checker,delay);
};

JazzMint.Class = function(args) {
  var object = {};
  object.$functions = {};
  for(var i in args) {
    var member = args[i];
    if(typeof member == 'function') {
      object.$functions[i]=member;
      var fn = function() {
        var member = object.$functions[arguments.callee.fnName];
        return member.apply(object,arguments);
      }
      fn.fnName = i;
      object[i] = fn;
    }
    else {
      object[i] = member;
    }
  }

  object.addEvent = function(event,fn) {
    if(!object.$events) {
      object.$events = {};
    }
    if(!object.$events[event]) {
      object.$events[event] = [];
    }
    object.$events[event].push(fn);
  };

  object.removeEvent = function(event) {
    try {
      delete object.$events[event];
    }
    catch(e) {}
  };

  object.options = {};

  object.setOptions = function(options) {
    for(var i in options) {
      var option = options[i];
      if(i.substr(0,2) == 'on' && typeof(option) == 'function') {
        var fnName = i.charAt(2).toLowerCase() + i.substr(3);
        object.addEvent(fnName,option);
        delete options[i];
      }
      else {
        options[i]=option;
      }
    };
  };

  object.fireEvent = function() {
    return (function(event,args) {
      var events = [];
      try {
        events = this.$events[event];
      }
      catch(e) {
        return;
      }

      for(var i=0;i<events.length;i++) {
        var e = events[i];
        if(e) {
          e();
        }
      }
    }).apply(object,arguments);
  }

  object.initialize = object.initialize || function() { };

  return function() {
    object.initialize.apply(object,arguments);
    return object;
  }
};

JazzMint.SpecFile = new JazzMint.Class({

  initialize : function(src) {
    this.src = src;
  },

  getSrc : function() {
    return this.src;
  },

  isLoaded : function() {
    return this.loaded;
  },

  hasFailed : function() {
    return this.failed;
  },

  onReady : function() {
    this.loaded = true;
    this.fireEvent('ready');
  },

  onFailure : function() {
    this.failed = true;
    this.fireEvent('failed');
  },

  load : function() {
    var that = this;
    JazzMint.loadJS(this.getSrc(),function() {
        that.onReady.apply(that);
      },
      function() {
        that.onFailure.apply(that);
      }
    );
  }

});

JazzMint.define({

  config : {
    useConfigFile : true,
    configFilePath : './jazzmint.config.example.js',
    jazzMintPath : './JazzMint',
    jasminePath : './jasmine',
    specDir : './Spec',
    sourceDir : './Source',

    jasmineFiles : {
      'jasmine' : '/lib/jasmine-core/jasmine.js',
      'jasmine-html' : '/lib/jasmine-core/jasmine-html.js',
      'jasmine-css' : '/lib/jasmine-core/jasmine.css'
    },

    assets : {
    }
  },

  init : function(onReady) {
    this.callbacks = {
      onReady : onReady
    };
    if(!this.isReady()) {
      this.loadLibraries();
    }
    else {
      this.onReady();
    }
  },

  loadLibraries : function() {
    var order = [];
    var assets = {};

    var jasmineFiles = this.getConfig().jasmineFiles;
    for(var i in jasmineFiles) {
      var file = this.config.jasminePath + jasmineFiles[i];
      assets[i] = file;
    }

    if(this.config.useConfigFile) {
      order.push('config');
      assets['config'] = this.config.configFilePath;
    }
    order = order.concat(['jasmine','jasmine-html','jasmine-css']);
    for(var i in assets) {
      if(order.indexOf(i)==-1) {
        order.push(i);
      }
    }

    this.totalLibraries = order.length;
    this.loadedLibraries = 0;

    var that = this;
    for(var i=0;i<order.length;i++) {
      var key = order[i];
      var asset = assets[key];
      var method = asset.match(/\.css(\?|\#)?.*$/) ? 'loadStylesheetAsset' : 'loadJavaScriptAsset';
      JazzMint[method](asset,
        function() { //success
          that.onLibraryLoaded.apply(that,[key]);
        },
        function() { //fail
          that.onLibraryFailed.apply(that,[key]);
        }
      );
    }
  },

  isReady : function() {
    return this.ready;
  },

  defineConfig : function(config) {
    this.config = JazzMint.extend(this.config,config);
  },

  setConfigValue : function(key,value) {
    this.config[key]=value;
  },

  getConfigValue : function(key) {
    return this.getConfig()[key];
  },

  getConfig : function() {
    return this.config;
  },

  hasTestSuite : function(name) {
    return !! this.getTestSuite(name);
  },

  getTestSuite : function(name) {
    return this.getTestSuites()[name];
  },

  getTestSuites : function() {
    if(!this.testSuites) {
      this.testSuites = {};
    }
    return this.testSuites;
  },

  onReady : function() {
    this.ready = true;
    this.callbacks.onReady();
  },

  onLibraryLoaded : function(key) {
    if(!this.loadedLibraries) {
      this.loadedLibraries = 0;
    }
    this.loadedLibraries++;
    if(this.loadedLibraries >= this.totalLibraries) {
      this.onReady();
    }
  },

  onLibraryFailed : function(key) {
  },

  defineSuite : function(name,options) {
    this.getTestSuites()[name] = options;
  },

  preloadTestSuite : function(test,options) {
    var suite = this.getTestSuite(test);
    if(!suite) {
      (options.onUndefined || function() { })();
      return;
    }

    var onReady = options.onReady || function() { };
    var onFailure = options.onFailure || function() { };

    var specs = suite.specFiles;
    for(var i=0;i<specs.length;i++) {
      specs[i] = JazzMint.joinPath(this.getConfig().specDir,specs[i]);
    }

    var sources = suite.sourceFiles;
    for(var i=0;i<sources.length;i++) {
      sources[i] = JazzMint.joinPath(this.getConfig().sourceDir,sources[i]);
    }

    var assets = specs.concat(sources);
    var total = assets.length;
    var count = 0;

    for(var i=0;i<total;i++) {
      JazzMint.loadJavaScriptAsset(assets[i],
        function() {
          count += 1;
          if(count >= total && onReady) {
            onReady();
            onReady = null;
          }
        },
        function() {
          onReady = null;
          onFailure();
          onFailure = null;
        }
      );
    }
  }

});

JazzMint.Runner = new JazzMint.Class({

  initialize : function(testName,options) {
    if(typeof(testName) != 'string') {
      options = testName;
      testName = 'all';
    }

    this.testName = testName;
    this.setOptions(options);
  },

  getTestSuiteName : function() {
    return this.testName;
  },

  getConfig : function() {
    return JazzMint.getConfig();
  },

  onMissingTestSuite : function(test) {
    this.fireEvent('missingTestSuite',[test]);
  },

  isTestingAllSpecs : function() {
    return this.getTestSuiteName() == 'all';
  },

  isReady : function() {
    return this.ready;
  },

  onReady : function() {
    this.ready = true;
    this.fireEvent('ready');
    this.run();
  },

  isLoading : function() {
    return this.loading;
  },

  onLoading : function() {
    this.loading = true;
    this.fireEvent('loading');
  },

  onFailure : function() {
    alert('fail');
  },

  load : function() {
    var that = this;
    var test = this.getTestSuiteName();
    if(!JazzMint.hasTestSuite(test)) {
      this.onMissingTestSuite(test);
    }
    else {
      JazzMint.preloadTestSuite(test,{
        onReady : function() {
          that.onReady.apply(that);
        },
        onFailure : function() {
          that.onFailure.apply(that);
        }
      });
      this.onLoading();
    }
  },

  start : function() {
    if(!this.isReady()) {
      this.load();
    }
    else {
      this.run();
    }
  },

  run : function() {
    jasmine.getEnv().addReporter(new jasmine.TrivialReporter());
    jasmine.getEnv().execute();
  },

  pause : function() {

  },

  onComplete : function() {

  }

});
