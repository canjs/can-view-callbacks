var QUnit = require('steal-qunit');
var callbacks = require('can-view-callbacks');
var dev = require('can-util/js/dev/dev');
var can = require('can-namespace');
var clone = require('steal-clone');
var devUtils = require("can-test-helpers/lib/dev");

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

if (System.env.indexOf('production') < 0) {
	QUnit.test("Show warning if in tag name a hyphen is missed", function () {
		var tagName = "foobar";
		var oldlog = dev.warn;
		dev.warn = function(text) {
			ok(text, "got warning");
			equal(text, "Custom tag: " + tagName.toLowerCase() + " hyphen missed");
			dev.warn = oldlog;
		};

		// make sure tag doesn't already exist
		callbacks.tag(tagName, null);

		// add tag
		callbacks.tag(tagName, function(){});
	});
}

QUnit.test("remove a tag by passing null as second argument", function() {
	var tagName = "my-tag";
	var handler = function() {
		console.log('this is the handler');
	};
	callbacks.tag(tagName, handler);

	equal(callbacks.tag(tagName), handler, 'passing no second argument should get handler');
	notEqual(callbacks.tag(tagName, null), handler, 'passing null as second argument should remove handler');
});

QUnit.test('should throw if can-namespace.view.callbacks is already defined', function() {
	stop();
	clone({
		'can-namespace': {
			default: {
				view: {
					callbacks: {}
				}
			},
			__useDefault: true
		}
	})
	.import('can-view-callbacks')
	.then(function() {
		ok(false, 'should throw');
		start();
	})
	.catch(function(err) {
		var errMsg = err && err.message || err;
		ok(errMsg.indexOf('can-view-callbacks') >= 0, 'should throw an error about can-view-callbacks');
		start();
	});
});


if (System.env.indexOf('production') < 0) {
	QUnit.test("should warn if attr callback defined after attr requested (#57)", function () {
		var attrName = "masonry-wall";
		var oldlog = dev.warn;
		dev.warn = function(text) {
			ok(text, "got warning");
			equal(text, "can-view-callbacks: " + attrName+ " custom attribute behavior requested before it was defined.  Make sure "+attrName+" is defined before it is needed.");
			dev.warn = oldlog;
		};

		// calback attr requested
		callbacks.attr(attrName);

		// callback attr provided
		callbacks.attr(attrName, function(){});
	});

	QUnit.test("should warn if RegExp attr callback defined after attr requested (#57)", function () {
		var attrName = "masonry-wall";
		var attrMatch = /masonry[- ]?wall/;
		var oldlog = dev.warn;
		dev.warn = function(text) {
			ok(text, "got warning");
			equal(text, "can-view-callbacks: " + attrName+ " custom attribute behavior requested before it was defined.  Make sure "+attrMatch.toString()+" is defined before it is needed.");
			dev.warn = oldlog;
		};

		// calback attr requested
		callbacks.attr(attrName);

		// callback attr provided
		callbacks.attr(attrMatch, function(){});
	});

	QUnit.test("tag method should return default callback when valid tag but not registered", function () {
		equal(callbacks.tag('not-exist'), callbacks.defaultCallback, "used default noop function")
	});

	QUnit.test("tag method should return undefined when invalid tag and not registered", function () {
		notOk(callbacks.tag('notexist'), "used default noop function")
	});
}

QUnit.test("should return callback (#60)", function(){
	var handler = function() {};
	callbacks.attr('foo', handler);
	
	var fooHandler = callbacks.attr('foo');
	equal(fooHandler, handler, 'registered handler returned');
});

if(document.registerElement) {
	devUtils.devOnlyTest("should warn about missing custom elements (#56)", function(){
		var customElement = document.createElement('custom-element');
		var restore = devUtils.willWarn(/no custom element found for/i);
		testTagHandler(customElement);
		equal(restore(), 1);
	});	

	devUtils.devOnlyTest("should not warn about defined custom elements (#56)", function(){
		document.registerElement('custom-element', {});
		var customElement = document.createElement('custom-element');
		var restore = devUtils.willWarn(/no custom element found for/i);
		testTagHandler(customElement);
		equal(restore(), 0);
	});	
}

function testTagHandler(customElement){
	callbacks.tagHandler(customElement, customElement.tagName, {
		options: {
			get: function noop(){}
		}
	});
}
