JazzMint.defineConfig({

  specDir : './Spec', //this should point to where your Spec Files are located
  sourceDir : './Source',
  jazzMintDir : './lib/JazzMint',

  appendJSToTestSuiteFiles : true,
  appendSpecToTestSuiteFiles : true

});

JazzMint.defineSuite('all',{

  specFiles : [
    'hello_spec.js'
  ],

  sourceFiles : [
    'hello.js'
  ]

});
