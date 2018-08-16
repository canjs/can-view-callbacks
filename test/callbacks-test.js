var QUnit = require('steal-qunit');
var callbacks = require('can-view-callbacks');
var nodeLists = require('can-view-nodelist');
var can = require('can-namespace');
var canSymbol = require('can-symbol');
var clone = require('steal-clone');
var testHelpers = require("can-test-helpers/lib/dev");
var Scope = require("can-view-scope");
var domMutate = require('can-dom-mutate');
var domMutateNode = require('can-dom-mutate/node');
var globals = require('can-globals');

function afterMutation(cb) {
	var doc = globals.getKeyValue('document');
	var div = doc.createElement("div");
	domMutate.onNodeInsertion(div, function(){
		doc.body.removeChild(div);
		setTimeout(cb, 5);
	});
	domMutateNode.appendChild.call(doc.body, div);
}

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

testHelpers.devOnlyTest("Show warning if in tag name a hyphen is missed, but still create handler", function () {
	var tagName = "foobar";
	var teardown = testHelpers.willWarn("Custom tag: " + tagName.toLowerCase() + " hyphen missed");

	// make sure tag doesn't already exist
	callbacks.tag(tagName, null);

	// add tag
	callbacks.tag(tagName, function(el) {
		var textNode = document.createTextNode("This is the " + tagName + " tag");
		el.appendChild(textNode);
	});

	equal(teardown(), 1, "got warning");

	var el = document.createElement(tagName);
	callbacks.tagHandler(el, tagName, {});

	QUnit.stop();
	afterMutation(function() {
		QUnit.start();
		QUnit.equal(el.innerHTML, "This is the " + tagName + " tag");
	});
});

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


testHelpers.devOnlyTest("should warn if attr callback defined after attr requested (#57)", function () {
	var attrName = "masonry-wall";
	var teardown = testHelpers.willWarn("can-view-callbacks: " + attrName+ " custom attribute behavior requested before it was defined.  Make sure "+attrName+" is defined before it is needed.");

	// calback attr requested
	callbacks.attr(attrName);

	// callback attr provided
	callbacks.attr(attrName, function(){});

	equal(teardown(), 1, "got warning");
});

testHelpers.devOnlyTest("should warn if RegExp attr callback defined after attr requested (#57, #84)", function () {
	var attrName = "masonry-wall";
	var attrMatch = /masonry[- ]?wall/;
	var teardown = testHelpers.willWarn("can-view-callbacks: " + attrName+ " custom attribute behavior requested before it was defined.  Make sure "+attrName+" is defined before it is needed.");

	// calback attr requested
	callbacks.attr(attrName);

	// callback attr provided
	callbacks.attr(attrMatch, function() {});

	equal(teardown(), 1, "got warning");
});

QUnit.test("tag method should return default callback when valid tag but not registered", function () {
	equal(callbacks.tag('not-exist'), callbacks.defaultCallback, "used default noop function")
});

QUnit.test("tag method should return undefined when invalid tag and not registered", function () {
	notOk(callbacks.tag('notexist'), "used default noop function")
});

QUnit.test("should return callback (#60)", function(){
	var handler = function() {};
	callbacks.attr('foo', handler);

	var fooHandler = callbacks.attr('foo');
	equal(fooHandler, handler, 'registered handler returned');
});

if(document.registerElement) {
	testHelpers.devOnlyTest("should warn about missing custom elements (#56)", function(){
		var customElement = document.createElement('custom-element');
		var restore = testHelpers.willWarn(/no custom element found for/i);
		testTagHandler(customElement);
		equal(restore(), 1);
	});

	testHelpers.devOnlyTest("should not warn about defined custom elements (#56)", function(){
		document.registerElement('custom-element', {});
		var customElement = document.createElement('custom-element');
		var restore = testHelpers.willWarn(/no custom element found for/i);
		testTagHandler(customElement);
		equal(restore(), 0);
	});
}

function testTagHandler(customElement){
	callbacks.tagHandler(customElement, customElement.tagName, {
		scope: new Scope({})
	});
}

QUnit.test("can read tags from templateContext.tags", function() {
	var globalHandler = function() {
		QUnit.ok(false, 'global handler should not be called');
		return 'global data';
	};
	callbacks.tag('foo', globalHandler);

	var scope = new Scope({});
	var localHandler = function() {
		QUnit.ok(true, 'local handler called');
		return 'local data';
	};
	scope.templateContext.tags.set('foo', localHandler);

	var el = document.createElement('div');
	var fooHandler = callbacks.tagHandler(el, 'foo', {
		scope: scope
	});
});

QUnit.test("Passes through nodeList", function(){
	QUnit.expect(2);

	var nodeList = nodeLists.register([], null, true, false);

	var scope = new Scope({});

	callbacks.tag("nodelist-tag", function(){
		return {};
	});
	var el = document.createElement("div");
	callbacks.tagHandler(el, "nodelist-tag", {
		scope: scope,
		parentNodeList: nodeList,
		subtemplate: function(scope, helpers, localNodeList){
			QUnit.ok(localNodeList, "nodeList was provided");
			QUnit.equal(localNodeList.parentList, nodeList, "it is our provided nodeList");
			return "<div></div>";
		}
	});
});

QUnit.test("tag handler is called automatically when elements are inserted into the page", function() {
	var fixture = document.getElementById('qunit-fixture');

	callbacks.tag("the-el", function(el) {
		el.innerHTML = "This is the el";
	});

	// <the-el />
	// <div>
	//   <the-el />
	//   <the-el />
	// </div>
	var elOne = document.createElement("the-el");
	var div = document.createElement("div");
	var elTwo = document.createElement("the-el");
	var elThree = document.createElement("the-el");

	div.appendChild(elTwo);
	div.appendChild(elThree);

	fixture.appendChild(elOne);
	fixture.appendChild(div);

	QUnit.stop();
	afterMutation(function() {
		QUnit.start();
		var els = fixture.getElementsByTagName("the-el");

		for (var i=0; i<els.length; i++) {
			QUnit.equal(els[i].innerHTML, "This is the el", "<the-el>[" + i + "] rendered correctly");
		}
	});
});

QUnit.test("tag handler is not called again when elements are inserted into the page if it has been called already", function() {
	var fixture = document.getElementById('qunit-fixture');

	callbacks.tag("another-el", function(el) {
		var textNode = document.createTextNode("This is another el");
		el.appendChild(textNode);
	});

	// <another-el />
	// <div>
	//   <another-el />
	//   <another-el />
	// </div>
	var elOne = document.createElement("another-el");
	var div = document.createElement("div");
	var elTwo = document.createElement("another-el");
	var elThree = document.createElement("another-el");

	callbacks.tagHandler(elOne, "another-el", {});
	callbacks.tagHandler(elTwo, "another-el", {});
	callbacks.tagHandler(elThree, "another-el", {});

	div.appendChild(elTwo);
	div.appendChild(elThree);

	fixture.appendChild(elOne);
	fixture.appendChild(div);

	QUnit.stop();
	afterMutation(function() {
		QUnit.start();
		var els = fixture.getElementsByTagName("another-el");

		for (var i=0; i<els.length; i++) {
			QUnit.equal(els[i].innerHTML, "This is another el", "<another-el>[" + i + "] not rendered");
		}
	});
});

QUnit.test("when tagHandler is registered, it is called automatically for elements already in the page", function() {
	var fixture = document.getElementById('qunit-fixture');

	// <existing-el />
	// <div>
	//   <existing-el />
	//   <existing-el />
	// </div>
	var elOne = document.createElement("existing-el");
	var div = document.createElement("div");
	var elTwo = document.createElement("existing-el");
	var elThree = document.createElement("existing-el");

	div.appendChild(elTwo);
	div.appendChild(elThree);

	fixture.appendChild(elOne);
	fixture.appendChild(div);

	callbacks.tag("existing-el", function(el) {
		el.innerHTML = "This is an existing el";
	});

	QUnit.stop();
	afterMutation(function() {
		QUnit.start();
		var els = fixture.getElementsByTagName("existing-el");

		for (var i=0; i<els.length; i++) {
			QUnit.equal(els[i].innerHTML, "This is an existing el", "<existing-el>[" + i + "] rendered correctly");
		}
	});
});

QUnit.test("creating a tag for `content` should work", function() {
	var fixture = document.getElementById('qunit-fixture');

	callbacks.tag("content", function(el) {
		var textNode = document.createTextNode("This is the content");
		el.appendChild(textNode);
	});

	ok(true, "did not throw error");

	var contentEl = document.createElement("content");
	callbacks.tagHandler(contentEl, "content", {});

	QUnit.stop();
	afterMutation(function() {
		QUnit.start();
		QUnit.equal(contentEl.innerHTML, "This is the content");
	});
});

QUnit.test("registering the same tag twice should work", function() {
	var fixture = document.getElementById('qunit-fixture');

	callbacks.tag("the-tag", function() {});

	callbacks.tag("the-tag", function(el, tagData) {
		QUnit.equal(typeof tagData, "object", "tagHandler is passed a tagData object");
		var textNode = document.createTextNode("This is the the-tag");
		el.appendChild(textNode);
	});

	ok(true, "did not throw error");

	var theManuallyHandledTag = document.createElement("the-tag");
	callbacks.tagHandler(theManuallyHandledTag, "the-tag", {});

	var theAutomaticallyHandledTag = document.createElement("the-tag");
	fixture.appendChild(theAutomaticallyHandledTag);

	QUnit.stop();
	afterMutation(function() {
		QUnit.start();
		QUnit.equal(theManuallyHandledTag.innerHTML, "This is the the-tag");
		QUnit.equal(theAutomaticallyHandledTag.innerHTML, "This is the the-tag");
	});
});

QUnit.test("registering, deleting, registering again should work", function() {
	var fixture = document.getElementById('qunit-fixture');

	callbacks.tag("the-same-tag", function() {});

	// remove the tag by passing null as the tagHandler
	callbacks.tag("the-same-tag", null);

	callbacks.tag("the-same-tag", function(el, tagData) {
		QUnit.equal(typeof tagData, "object", "tagHandler is passed a tagData object");
		var textNode = document.createTextNode("This is the the-same-tag");
		el.appendChild(textNode);
	});

	ok(true, "did not throw error");

	var theManuallyHandledTag = document.createElement("the-same-tag");
	callbacks.tagHandler(theManuallyHandledTag, "the-same-tag", {});

	var theAutomaticallyHandledTag = document.createElement("the-same-tag");
	fixture.appendChild(theAutomaticallyHandledTag);

	QUnit.stop();
	afterMutation(function() {
		QUnit.start();
		QUnit.equal(theManuallyHandledTag.innerHTML, "This is the the-same-tag");
		QUnit.equal(theAutomaticallyHandledTag.innerHTML, "This is the the-same-tag");
	});
});

QUnit.test("Works in environments without MutationObserver", function() {
	var oldMO = globals.getKeyValue("MutationObserver");
	var oldCE = globals.getKeyValue("customElements");
	globals.setKeyValue("MutationObserver", null);
	globals.setKeyValue("customElements", null);

	var fixture = document.getElementById('qunit-fixture');
	var autoHandled = document.createElement("no-mutation-observer");
	fixture.appendChild(autoHandled);

	callbacks.tag("no-mutation-observer", function() {
		QUnit.ok(true, "tag was called");
	});

	QUnit.stop();
	afterMutation(function(){
		globals.setKeyValue("MutationObserver", function(){
			return oldMO;
		});
		globals.setKeyValue("customElements", function(){
			return oldCE;
		});
		QUnit.start();
	});
});

QUnit.test("automounting doesn't happen if the data-can-automount flag is set to false", function() {
	var fixture = document.getElementById('qunit-fixture');
	document.documentElement.dataset.canAutomount = "false";

	callbacks.tag("automount-false", function(el) {
		var textNode = document.createTextNode("This is the automount-false");
		el.appendChild(textNode);
		ok(false, "this shouldn't have been mounted :(");
	});

	var theAutomaticallyHandledTag = document.createElement("automount-false");
	fixture.appendChild(theAutomaticallyHandledTag);

	QUnit.stop();
	afterMutation(function() {
		QUnit.equal(theAutomaticallyHandledTag.innerHTML, "");
		delete document.documentElement.dataset.canAutomount;
		fixture.innerHTML = "";
		QUnit.start();
	});
});


QUnit.test("attrs takes a Map of attr callbacks", function(){
	var doc = globals.getKeyValue('document');
	var map = new Map();
	map.set("foo", function(el, attrData) {
		el.appendChild(doc.createTextNode("foo"));
	});
	map.set(/bar/, function(el, attrData) {
		el.appendChild(doc.createTextNode("bar"));
	});

	callbacks.attrs(map);

	var el1 = doc.createElement("span");
	el1.setAttribute("foo", "");

	var el2 = doc.createElement("span");
	el2.setAttribute("bar", "");

	callbacks.attr("foo")(el1);
	callbacks.attr("bar")(el2);

	QUnit.equal(el1.firstChild.nodeValue, "foo");
	QUnit.equal(el2.firstChild.nodeValue, "bar");
});

QUnit.test("attrs will use can.callbackMap symbol if available.", function(){
	var doc = globals.getKeyValue('document');
	var map = new Map();
	map.set("foo2", function(el, attrData) {
		el.appendChild(doc.createTextNode("foo"));
	});
	map.set(/bar2/, function(el, attrData) {
		el.appendChild(doc.createTextNode("bar"));
	});

	var bindings = {
		bindings: map
	};
	bindings[canSymbol.for("can.callbackMap")] = map;
	callbacks.attrs(bindings);

	var el1 = doc.createElement("span");
	el1.setAttribute("foo2", "");

	var el2 = doc.createElement("span");
	el2.setAttribute("bar2", "");


	callbacks.attr("foo2")(el1);
	callbacks.attr("bar2")(el2);

	QUnit.equal(el1.firstChild.nodeValue, "foo");
	QUnit.equal(el2.firstChild.nodeValue, "bar");
});

QUnit.test("Prevent throwing when there is no documentElement in tag() #100", function() {
	var realDoc = globals.getKeyValue("document");
	var newDoc = realDoc.implementation.createHTMLDocument('test');
	globals.setKeyValue("document", newDoc);

	// Destroy the documentElement
	newDoc.removeChild(newDoc.documentElement);

	try {
		callbacks.tag("please-dont-blow-up", function(){});
		QUnit.ok(true, "it worked");
	} catch(err) {
		QUnit.ok(false, err);
	} finally {
		globals.setKeyValue("document", realDoc);
	}

});
