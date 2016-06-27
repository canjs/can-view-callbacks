@typedef {{}} can-view-callbacks.tagData tagData

The data passed to [can-view-callbacks.tag].


@option {can.view.renderer} [subtemplate] If the special tag has content,
the content can be rendered with subtemplate.  For example:

    callbacks.tag("foo-bar", function(el, tagData){
      var frag = tagData.subtemplate(tagData.scope, tagData.options);
      $(el).html(frag);
    })
    
@option {can-view-scope} scope The scope of the element.  

@option {can.view.Options} options The mustache helpers and other non-data values passed to the template.
