var QUnit = require('steal-qunit');
var callbacks = require('can-view-callbacks');
var dev = require('can-util/js/dev/dev');
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

QUnit.test("Show warning if in tag name a hyphen is missed", function () {
	var tagName = "foobar";
	var oldlog = dev.warn;
	dev.warn = function(text) {
		ok(text, "got warning");
		equal(text, "Custom tag: " + tagName.toLowerCase() + " hyphen missed");
		dev.warn = oldlog;
	};
	callbacks.tag(tagName, function(){});
});
