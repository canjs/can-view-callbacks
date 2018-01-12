var ObservationRecorder = require('can-observation-recorder');

var dev = require('can-log/dev/dev');
var getGlobal = require('can-globals/global/global');
var domMutate = require('can-dom-mutate/node');
var namespace = require('can-namespace');
var nodeLists = require('can-view-nodelist');
var makeFrag = require("can-util/dom/frag/frag");
var canSymbol = require("can-symbol");

//!steal-remove-start
var requestedAttributes = {};
//!steal-remove-end

var tags = {};

var viewmodelSymbol = canSymbol.for("can.viewModel");

// WeakSet containing elements that have been mounted already
// and therefore do not need to be mounted again
var mountedElements = new WeakSet();

var mountNodeAndChildrenIfNecessary = function(node) {
	var tagName = node.tagName && node.tagName.toLowerCase();
	var tagHandler = tags[tagName];
	var children;

	// skip elements that already have a viewmodel or elements whose tags don't match a registered tag
	// or elements that have already been mounted
	if (!node[viewmodelSymbol] && tagHandler && !mountedElements.has(node)) {
		tagHandler(node, tagName, {});
	}

	if (node.getElementsByTagName) {
		children = node.getElementsByTagName("*");
		for (var k=0, child; (child = children[k]) !== undefined; k++) {
			mountNodeAndChildrenIfNecessary(child);
		}
	}
};

var mutationObserverEnabled = false;
var enableMutationObserver = function() {
	if (mutationObserverEnabled) {
		return;
	}

	var mutationHandler = function(mutationsList) {
		var addedNodes;

		for (var i=0, mutation; (mutation = mutationsList[i]) !== undefined; i++) {
			if (mutation.type === "childList") {
				addedNodes = mutation.addedNodes;

				for (var j=0, addedNode; (addedNode = addedNodes[j]) !== undefined; j++) {
					// skip elements that have already been mounted
					if (!mountedElements.has(addedNode)) {
						mountNodeAndChildrenIfNecessary(addedNode);
					}
				}
			}
		}
	};

	var obs = new MutationObserver(mutationHandler);
	obs.observe(getGlobal().document.documentElement, { childList: true, subtree: true });

	mutationObserverEnabled = true;
};

var mountExistingElements = function(tagName) {
	var nodes = getGlobal().document.getElementsByTagName(tagName);

	for (var i=0, node; (node = nodes[i]) !== undefined; i++) {
		mountNodeAndChildrenIfNecessary(node);
	}
};

var attr = function (attributeName, attrHandler) {
	if(attrHandler) {
		if (typeof attributeName === "string") {
			attributes[attributeName] = attrHandler;
			//!steal-remove-start
			if(requestedAttributes[attributeName]) {
				dev.warn("can-view-callbacks: " + attributeName+ " custom attribute behavior requested before it was defined.  Make sure "+attributeName+" is defined before it is needed.");
			}
			//!steal-remove-end
		} else {
			regExpAttributes.push({
				match: attributeName,
				handler: attrHandler
			});

			//!steal-remove-start
			Object.keys(requestedAttributes).forEach(function(requested){
				if(attributeName.test(requested)) {
					dev.warn("can-view-callbacks: " + requested+ " custom attribute behavior requested before it was defined.  Make sure "+attributeName+" is defined before it is needed.");
				}
			});
			//!steal-remove-end
		}
	} else {
		var cb = attributes[attributeName];
		if( !cb ) {

			for( var i = 0, len = regExpAttributes.length; i < len; i++) {
				var attrMatcher = regExpAttributes[i];
				if(attrMatcher.match.test(attributeName)) {
					return attrMatcher.handler;
				}
			}
		}
		//!steal-remove-start
		requestedAttributes[attributeName] = true;
		//!steal-remove-end

		return cb;
	}
};

var attributes = {},
	regExpAttributes = [],
	automaticCustomElementCharacters = /[-\:]/;
var defaultCallback = function () {};

var tag = function (tagName, tagHandler) {
	if(tagHandler) {
		var GLOBAL = getGlobal();

		//!steal-remove-start
		if (typeof tags[tagName.toLowerCase()] !== 'undefined') {
			dev.warn("Custom tag: " + tagName.toLowerCase() + " is already defined");
			return;
		}
		if (!automaticCustomElementCharacters.test(tagName) && tagName !== "content") {
			dev.warn("Custom tag: " + tagName.toLowerCase() + " hyphen missed");
			return;
		}
		//!steal-remove-end

		// if we have html5shiv ... re-generate
		if (GLOBAL.html5) {
			GLOBAL.html5.elements += " " + tagName;
			GLOBAL.html5.shivDocument();
		}

		tags[tagName.toLowerCase()] = tagHandler;

		// automatically mount elements that have tagHandlers
		// If browser supports customElements, register the tag as a custom element
		if ("customElements" in GLOBAL) {
			var CustomElement = function() {
				return Reflect.construct(HTMLElement, [], CustomElement);
			};

			CustomElement.prototype.connectedCallback = function() {
				// don't re-mount an element that has been mounted already
				if (!mountedElements.has(this)) {
					tagHandler(this, tagName, {});
				}
			};

			Object.setPrototypeOf(CustomElement.prototype, HTMLElement.prototype);
			Object.setPrototypeOf(CustomElement, HTMLElement);

			customElements.define(tagName, CustomElement);
		}
		// If browser doesn't support customElements, set up MutationObserver for
		// mounting elements when they are inserted in the page
		// and mount elements that are already in the page
		else {
			enableMutationObserver();
			mountExistingElements(tagName);
		}
	} else {
		var cb;

		// if null is passed as tagHandler, remove tag
		if (tagHandler === null) {
			delete tags[tagName.toLowerCase()];
		} else {
			cb = tags[tagName.toLowerCase()];
		}

		if(!cb && automaticCustomElementCharacters.test(tagName)) {
			// empty callback for things that look like special tags
			cb = defaultCallback;
		}
		return cb;
	}

};

var callbacks = {
	_tags: tags,
	_attributes: attributes,
	_regExpAttributes: regExpAttributes,
	defaultCallback: defaultCallback,
	tag: tag,
	attr: attr,
	mountedElements: mountedElements,
	// handles calling back a tag callback
	tagHandler: function(el, tagName, tagData){
		var helperTagCallback = tagData.scope.templateContext.tags.get(tagName),
			tagCallback = helperTagCallback || tags[tagName];

		// If this was an element like <foo-bar> that doesn't have a component, just render its content
		var scope = tagData.scope,
			res;

		if(tagCallback) {
			res = ObservationRecorder.ignore(tagCallback)(el, tagData);
		} else {
			res = scope;
		}

		//!steal-remove-start
		if (!tagCallback) {
			var GLOBAL = getGlobal();
			var ceConstructor = GLOBAL.document.createElement(tagName).constructor;
			// If not registered as a custom element, the browser will use default constructors
			if (ceConstructor === GLOBAL.HTMLElement || ceConstructor === GLOBAL.HTMLUnknownElement) {
				dev.warn('can-view-callbacks: No custom element found for ' + tagName);
			}
		}
		//!steal-remove-end

		// If the tagCallback gave us something to render with, and there is content within that element
		// render it!
		if (res && tagData.subtemplate) {

			if (scope !== res) {
				scope = scope.add(res);
			}

			var nodeList = nodeLists.register([], undefined, tagData.parentNodeList || true, false);
			nodeList.expression = "<" + el.tagName + ">";

			var result = tagData.subtemplate(scope, tagData.options, nodeList);
			var frag = typeof result === "string" ? makeFrag(result) : result;
			domMutate.appendChild.call(el, frag);
		}
	}
};

namespace.view = namespace.view || {};

if (namespace.view.callbacks) {
	throw new Error("You can't have two versions of can-view-callbacks, check your dependencies");
} else {
	module.exports = namespace.view.callbacks = callbacks;
}
