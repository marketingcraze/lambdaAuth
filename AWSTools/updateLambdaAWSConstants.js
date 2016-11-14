#!/usr/bin/env node
const path = require('path');
const awsc = require(path.join(__dirname, 'awscommonutils'));
const fs = require('fs');

var YAML = require('yamljs');
var argv = require('yargs')
.usage('Create a json description of constants needed to access AWS services.\nUsage: $0 [options]')
.alias('l','lambdaDefinitionsDir')
.describe('l','directory containing lambda definition yaml files')
.default('l','./lambdas')
.alias('s','baseDefinitionsFile')
.describe('s','yaml file that containes information about your dynamodb (dynamodbInfo)')
.default('s','./base.definitions.yaml')
.alias('o','outputFilename')
.describe('o','name of file that will be added to each lambda directory')
.default('o','AWSConstants.json')
.alias('n','lambdaName')
.describe('n','update handler event params for only this lambda directory')
.help('h')
.alias('h', 'help')
.argv;

if (!fs.existsSync(argv.baseDefinitionsFile)) {
  console.log("Base definitions file \"" + argv.baseDefinitionsFile + "\" not found.")
  yargs.showHelp("log");
  process.exit(1);
}
var baseDefinitions = YAML.load(argv.baseDefinitionsFile);

// required --lambdaDefinitionsDir directory
// required --outputFilename
// optional --lambdaName

// the "paths" component is in the lambdaDefinitions
// at apiInfo.path

forEachLambdaDefinition(function (fileName) {
  console.log("Processing: " + fileName)
  var definitions = YAML.load(path.join(argv.lambdaDefinitionsDir,fileName));
  var verifyResult;
  var skip = false;
  var logfunction = function (err1){
    console.log(err1.toString());
  }
  constantsJson = {};
  awsc.verifyPath(definitions,['lambdaInfo', 'awsResources', 'type'], {oneOfs:['dynamodbInfo','cognitoIdentityPoolInfo']}, "definition file \"" + fileName + "\"").callbackOnError(logfunction);
  awsc.verifyPath(definitions,['lambdaInfo', 'awsResources', 'resourceName'], 's', "definition file \"" + fileName + "\"").callbackOnError(logfunction);
  definitions.lambdaInfo.awsResources.forEach(function (resource) {
    console.log("... adding resouce " + resource.type + ": " + resource.resourceName)
    awsc.verifyPath(baseDefinitions,[resource.type, resource.resourceName, 'lambdaAliases', 'resource'], 's', "definition file \"" + argv.baseDefinitionsFile + "\"").callbackOnError(logfunction)

    var resourceRoot;
    switch (resource.type) {
      case 'dynamodbInfo':
        if (typeof constantsJson['DYNAMO_DB'] != 'object') {
          constantsJson['DYNAMO_DB'] = {}
        }
        resourceRoot = constantsJson['DYNAMO_DB'];
      break;
      case 'cognitoIdentityPoolInfo':
        if (typeof constantsJson['COGNITO'] != 'object') {
          constantsJson['COGNITO'] = {}
        }
        resourceRoot = constantsJson['COGNITO'];
      break;
    }
    var source = baseDefinitions[resource.type][resource.resourceName].lambdaAliases;

    // attach any attributes here
    if (typeof source.attributes == 'object') {
      resourceRoot[source.resource] = source.attributes;
    } else {
      resourceRoot[source.resource] = {};
    }
    resourceRoot[source.resource]['name'] = resource.resourceName;

    // custom required stuff here
    switch (resource.type) {
      case 'dynamodbInfo':
      break;
      case 'cognitoIdentityPoolInfo':
        resourceRoot[source.resource]['authProviders'] = baseDefinitions[resource.type][resource.resourceName].authProviders;
        resourceRoot[source.resource]['identityPoolId'] = baseDefinitions[resource.type][resource.resourceName].identityPoolId;
      break;
    }
    var outFname = path.join(argv.lambdaDefinitionsDir,definitions.lambdaInfo.functionName,argv.outputFilename);
    fs.writeFile(outFname, JSON.stringify(constantsJson,null, '\t'));
  })



});


function forEachLambdaDefinition (callback) {
  fs.readdir(argv.lambdaDefinitionsDir, function (err, files) {
    if (err) {
      throw err;
    }

    for (var index = 0; index < files.length; index++) {
      var fileName = files[index];
      var fileNameComponents = fileName.split('.');
      if ((fileNameComponents.length == 3) && (fileNameComponents[1] === "definitions") && (fileNameComponents[2] === "yaml")) {
        console.log("Reading: " + fileName);
        var writeOut = true;
        if ((typeof argv.lambdaName == 'string') && (argv.lambdaName !== fileNameComponents[0])) {
          console.log("Not target lambda. Skipping.");
          writeOut = false;
        }
        if (writeOut) {
          callback(fileName)
        }
      }
    }
  });
}
