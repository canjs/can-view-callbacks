/*can-view-callbacks@3.0.0-pre.0#can-view-callbacks*/
var ObserveInfo = require('can-observe-info');
var dev = require('can-util/js/dev/dev');
var getGlobal = require('can-util/js/global/global');
var domMutate = require('can-util/dom/mutate/mutate');
var attr = function (attributeName, attrHandler) {
    if (attrHandler) {
        if (typeof attributeName === 'string') {
            attributes[attributeName] = attrHandler;
        } else {
            regExpAttributes.push({
                match: attributeName,
                handler: attrHandler
            });
        }
    } else {
        var cb = attributes[attributeName];
        if (!cb) {
            for (var i = 0, len = regExpAttributes.length; i < len; i++) {
                var attrMatcher = regExpAttributes[i];
                if (attrMatcher.match.test(attributeName)) {
                    cb = attrMatcher.handler;
                    break;
                }
            }
        }
        return cb;
    }
};
var attributes = {}, regExpAttributes = [], automaticCustomElementCharacters = /[-\:]/;
var tag = function (tagName, tagHandler) {
    if (tagHandler) {
        if (getGlobal().html5) {
            getGlobal().html5.elements += ' ' + tagName;
            getGlobal().html5.shivDocument();
        }
        tags[tagName.toLowerCase()] = tagHandler;
    } else {
        var cb = tags[tagName.toLowerCase()];
        if (!cb && automaticCustomElementCharacters.test(tagName)) {
            cb = function () {
            };
        }
        return cb;
    }
};
var tags = {};
var callbacks = {
    _tags: tags,
    _attributes: attributes,
    _regExpAttributes: regExpAttributes,
    tag: tag,
    attr: attr,
    tagHandler: function (el, tagName, tagData) {
        var helperTagCallback = tagData.options.get('tags.' + tagName, { proxyMethods: false }), tagCallback = helperTagCallback || tags[tagName];
        var scope = tagData.scope, res;
        if (tagCallback) {
            res = ObserveInfo.notObserve(tagCallback)(el, tagData);
        } else {
            res = scope;
        }
        if (res && tagData.subtemplate) {
            if (scope !== res) {
                scope = scope.add(res);
            }
            var result = tagData.subtemplate(scope, tagData.options);
            var frag = typeof result === 'string' ? can.view.frag(result) : result;
            domMutate.appendChild.call(el, frag);
        }
    }
};
module.exports = callbacks;