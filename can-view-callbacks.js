var Observation = require('can-observation');

var dev = require('can-util/js/dev/dev');
var getGlobal = require('can-util/js/global/global');
var domMutate = require('can-util/dom/mutate/mutate');
var namespace = require('can-util/namespace');

var attr = function (attributeName, attrHandler, includeSubtemplate) {
	if(attrHandler) {
		if (typeof attributeName === "string") {
			attributes[attributeName] = attrHandler;
		} else {
			regExpAttributes.push({
				match: attributeName,
				handler: attrHandler
			});
		}
		if(includeSubtemplate) {
			attrHandler.includeSubtemplate = true;
		}
	} else {
		var cb = attributes[attributeName];
		if( !cb ) {

			for( var i = 0, len = regExpAttributes.length; i < len; i++) {
				var attrMatcher = regExpAttributes[i];
				if(attrMatcher.match.test(attributeName)) {
					cb = attrMatcher.handler;
					break;
				}
			}
		}
		return cb;
	}
};

var attributes = {},
	regExpAttributes = [],
	automaticCustomElementCharacters = /[-\:]/;

var tag = function (tagName, tagHandler) {
	if(tagHandler) {
		//!steal-remove-start
		if (typeof tags[tagName.toLowerCase()] !== 'undefined') {
			dev.warn("Custom tag: " + tagName.toLowerCase() + " is already defined");
		}
		if (!automaticCustomElementCharacters.test(tagName) && tagName !== "content") {
			dev.warn("Custom tag: " + tagName.toLowerCase() + " hyphen missed");
		}
		//!steal-remove-end
		// if we have html5shive ... re-generate
		if (getGlobal().html5) {
			getGlobal().html5.elements += " " + tagName;
			getGlobal().html5.shivDocument();
		}

		tags[tagName.toLowerCase()] = tagHandler;
	} else {
		var cb = tags[tagName.toLowerCase()];
		if(!cb && automaticCustomElementCharacters.test(tagName)) {
			// empty callback for things that look like special tags
			cb = function(){};
		}
		return cb;
	}

};
var tags = {};

var callCallbackAndRender = function(el, callback, data){
	// If this was an element like <foo-bar> that doesn't have a component, just render its content
	var scope = data.scope,
		res;

	if(callback) {
		res = Observation.ignore(callback)(el, data);
	} else {
		res = scope;
	}



	// If the tagCallback gave us something to render with, and there is content within that element
	// render it!
	if (res && tagData.subtemplate) {

		if (scope !== res) {
			scope = scope.add(res);
		}
		var result = tagData.subtemplate(scope, tagData.options);
		var frag = typeof result === "string" ? can.view.frag(result) : result;
		domMutate.appendChild.call(el, frag);
	}
};

var callbacks = {
	_tags: tags,
	_attributes: attributes,
	_regExpAttributes: regExpAttributes,
	tag: tag,
	attr: attr,
	attrHandler: function(el, attrName, attrData){
		var attrCallback = attr(attrName);
		callCallbackAndRender(el, attrCallback, attrData);
	},
	// handles calling back a tag callback
	tagHandler: function(el, tagName, tagData){
		var helperTagCallback = tagData.options.get('tags.' + tagName,{proxyMethods: false}),
			tagCallback = helperTagCallback || tags[tagName];

		//!steal-remove-start
		if (!tagCallback) {
			dev.warn('can/view/scanner.js: No custom element found for ' + tagName);
		}
		//!steal-remove-end

		callCallbackAndRender(el, tagCallback, data);
	}
};

namespace.view = namespace.view || {};
module.exports = namespace.view.callbacks = callbacks;
