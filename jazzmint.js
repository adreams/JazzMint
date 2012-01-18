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
    jasminePath : './jasmine/lib/jasmine-core',
    specDir : './Spec',
    sourceDir : './Source',

    jasmineFiles : {
      'jasmine' : 'jasmine.js',
      'jasmine-html' : 'jasmine-html.js',
      'jasmine-css' : 'jasmine.css'
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

  setConfigFilePath : function(path) {
    this.getConfig().configFilePath = path;
  },

  getConfigFilePath : function() {
    return this.getConfig().configFilePath;
  },

  hasConfigFile : function() {
    try {
      return this.getConfigFilePath().length > 0;
    }
    catch(e) {
      return false;
    }
  },

  loadLibraries : function() {
    var assets = {};
    var jasmineFiles = this.getConfig().jasmineFiles;
    for(var i in jasmineFiles) {
      var file = JazzMint.joinPath(this.config.jasminePath,jasmineFiles[i]);
      assets[i] = file;
    }

    var assetFiles = this.getConfig().assets;
    for(var i in assetFiles) {
      assets[i] = assetFiles[i];
    }

    var order = [];
    if(this.hasConfigFile()) {
      order.push('config');
      assets['config'] = this.getConfigFilePath();
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

  defineTestSuite : function(name,options) {
    options = JazzMint.extend(this.getConfig(),options);
    this.getTestSuites()[name] = new JazzMint.TestSuite(name,options);
  }

});

JazzMint.TestSuite = new JazzMint.Class({

  initialize : function(name,config) {
    this.name = name;
    this.config = config || {};

    this.setSpecFiles(this.config.specFiles);
    delete this.config.specFiles;

    this.setSourceFiles(this.config.sourceFiles);
    delete this.config.sourceFiles;
  },

  getConfig : function() {
    return this.config;
  },

  getSpecDir : function() {
    return this.getConfig().specDir;
  },

  getSourceDir : function() {
    return this.getConfig().sourceDir;
  },

  getName : function() {
    return this.name;
  },

  setSpecFiles : function(files) {
    var appendSpec = this.getConfig().appendSpecToFiles;
    var appendJS = this.getConfig().appendJSToFiles;
    var querystring = this.getSpecFilesQuerystring();

    if(typeof(files) == 'string') {
      files = files.split(',');
    }
    for(var i=0;i<files.length;i++) {
      var file = files[i];
      file = JazzMint.joinPath(this.getSpecDir(),file);
      if(appendJS) {
        file += file.indexOf('.js') >= 0 ? '' : '.js';
      }
      if(appendSpec) {
        file = file.replace(/(?:_spec)?\.(css|js)/,"_spec.$1");
      }
      if(querystring) {
        file = file.replace(/\.(css|js)\??/,".$1?" + querystring + '&');
      }
      files[i] = file;
    }
    this.specFiles = files;
  },

  getSpecFiles : function() {
    return this.specFiles;
  },

  getSpecFilesQuerystring : function() {
    var qs = this.getConfig().queryString;
    if(qs && typeof(qs) != 'string') {
      qs = qs.specFiles;
    }
    if(qs == 'random') {
      qs = Math.random()+'';
    }
    return qs && qs.length > 0 ? qs : null;
  },

  getSourceFilesQuerystring : function() {
    var qs = this.getConfig().queryString;
    if(qs && typeof(qs) != 'string') {
      qs = qs.sourceFiles;
    }
    if(qs == 'random') {
      qs = Math.random()+'';
    }
    return qs && qs.length > 0 ? qs : null;
  },

  setSourceFiles : function(files) {
    var appendJS = this.getConfig().appendJSToFiles;
    var querystring = this.getSourceFilesQuerystring();

    if(typeof(files) == 'string') {
      files = files.split(',');
    }
    for(var i=0;i<files.length;i++) {
      var file = files[i];
      file = JazzMint.joinPath(this.getSourceDir(),file);
      if(appendJS) {
        file += file.indexOf('.js') >= 0 ? '' : '.js';
      }
      if(querystring) {
        file = file.replace(/\.(css|js)\??/,".$1?" + querystring + '&');
      }
      files[i] = file;
    }
    this.sourceFiles = files;
  },

  getSourceFiles : function() {
    return this.sourceFiles;
  },

  getFiles : function() {
    return this.getSourceFiles().concat(this.getSpecFiles());
  },

  isReady : function() {
    return this.ready;
  },

  preload : function(onReady,onFailure) {
    var files = this.getFiles();
    var total = files.length;
    var count = 0;

    for(var i=0;i<total;i++) {
      var file = files[i];
      var method = file.match(/\.css(\?|\#)?.*$/) ? 'loadStylesheetAsset' : 'loadJavaScriptAsset';
      JazzMint[method](file,
        function() {
          count += 1;
          if(count >= total && onReady) {
            onReady();
            onReady = null;
          }
        },
        function() {
          count += 1;
          onFailure();
          if(count >= total && onReady) {
            onReady();
            onReady = null;
          }
        }
      );
    }
  }

});

JazzMint.Runner = new JazzMint.Class({

  initialize : function(testName,options) {
    if((testName == null && options == null) || typeof(testName) != 'string') {
      options = testName || {};
      testName = null;
    }

    this.testName = testName || 'all';
    this.setOptions(options);
  },

  getTestSuiteName : function() {
    return this.testName;
  },

  getTestSuite : function() {
    return JazzMint.getTestSuite(this.getTestSuiteName());
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
    this.fireEvent('failure');
  },

  load : function() {
    var that = this;
    var suite = this.getTestSuite();
    if(!suite) {
      this.onMissingTestSuite(test);
    }
    else {
      suite.preload(
        function() {
          that.onReady.apply(that);
        },
        function() {
          if(suite.getConfig().quitWhenLoadFailure) {
            that.onReady = function() { };
          }
          that.onFailure.apply(that);
        }
      )
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

  getJasmineReporter : function() {
    if(!this.jasmineReporter) {
      this.jasmineReporter = new jasmine.TrivialReporter(); 
    }
    return this.jasmineReporter;
  },

  getJasmineRunner : function() {
    return this.getJasmineEnv().currentRunner();
  },

  getJasmineEnv : function() {
    return this.getJasmine().getEnv();
  },

  getJasmine : function() {
    return jasmine;
  },

  run : function() {
    var that = this;
    var env = this.getJasmineEnv();
    this.totalSpecs = env.currentRunner().specs().length;
    env.addReporter(this.getJasmineReporter());
    env.afterEach(function() {
      that.onAfterEach.apply(that,arguments);
    });
    env.beforeEach(function() {
      that.onBeforeEach.apply(that,arguments);
    });

    this.specCounter = 0;
    this.onStart();
    env.execute();
  },

  onAfterEach : function() {
    this.fireEvent('afterEach');
    this.specCounter++;
    if(this.specCounter >= this.totalSpecs) {
      this.onFinish();
    }
  },

  onBeforeEach : function() {
    this.fireEvent('beforeEach');
  },

  onStart : function() {
    this.fireEvent('start',[this.totalSpecs]);
  },

  onFinish : function() {
    this.fireEvent('finish',[this.totalSpecs]);
  }

});
