var QUnit = require('steal-qunit');
var callbacks = require('can-view-callbacks');
var can = require("can-util/namespace");

QUnit.module('can-view-callbacks');

QUnit.test('Initialized the plugin', function(){
  var handler = function(){

  };
  callbacks.attr(/something-\w+/, handler);
  equal(callbacks.attr("something-else"), handler);
});

QUnit.test("Placed as view.callbacks on the can namespace", function(){
	equal(callbacks, can.view.callbacks, "Namespace value as can.view.callbacks");
});
