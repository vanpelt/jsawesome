//Globals...
Scroller = null
delay = 100
window.addEvent('load', function(){
  Scroller = new Fx.Scroll(window, {link:'chain', offset:{x:0,y:-25}})
})
JSAwesome = new Class({
	initialize: function(name, json, labels){
	  this.name = name
		this.json = json
		this.labels = labels || {}
		this.validations = $H(labels).getKeys().filter(function(f){
		  return labels[f]['required'] || labels[f]['validation']
		})
		this.level = 0 
		this.in_select = false
		this.nested = {}
	},
	to_html: function() {
	  var m = []
	  $A(this.json).each(function(p){
	    var n = []
	    //Allows you to reference previous selects...
	    if($type(p[1])=="number" && this.json[p[1]])
	      p[1] = this.json[p[1]][1]
	    if($type(p[0])=="array"){
	      n.push(p.map(function(r){
	        return new Element('div', {style:'float:left;margin-right:5px'}).adopt(this._process(r[1],r[0]))
	      }, this))
	      n.push(new Element('br', {style:'clear:left'}))
	    } else
	      n.push(this._process(p[1],p[0]))
	    m.push(new Element('div', {'class':'error '+p[0]}).adopt(n))
	    this.level = 0
	  }, this);
	 return $(this.name).adopt(m)
	},
	label: function(name, wafor) {
	  var newname = null
	  if($defined(this.labels[name])) {
	    if($defined(this.labels[name]['label']))
	      newname = this.labels[name]['label']
	    else
	      newname = this.labels[name]
	    if($type(newname) == "object")
	      newname = null
	  }
	  if(!$defined(newname))
	    newname = name.replace(/^[_#*^]/,'').replace(/_/g,' ').capitalize()
	  return ($type(wafor) == "element" ? wafor.set('html', newname) : new Element('label', {'for':wafor, 'html':newname}))
	},
	validate: function(e) {
	  return this.validations.every(function(r){
	    var checking = $(this.name).getElement('.'+r.replace(/^[_#~*^]/,''))
	    var error = checking.getParent('.error')
	    var invalid = this._check(checking)
	    if(invalid) {
	      this.delay = (delay -= 20)
	      invalid[1].set('style', 'background:#d88b7e')
	      if(error.getChildren().getLast().innerHTML != invalid[0]) {
	        var mes = new Element('div', {
	          style: 'color:red',
	          html:invalid[0]
	        }).inject(error)
	      }
	      invalid[1].addEvent(invalid[2] || 'blur', function(){
	        var check = this._check(checking)
	        if(!check || invalid[1] != check[1]) {
	          invalid[1].set('style', 'background:')
	          if(mes){
	            mes.dispose()
	            mes = false
	          }
	        }
	      }.bind(this))
	      if(this.delay > 0)
	        Scroller.toElement.delay(this.delay, Scroller, checking)
	      else
	        this._reset.delay(500)
	      return false
	    } else 
	      return true
	  }, this)
	},
	_reset: function() { delay = 100 },
	_check: function(element) {
	  var invalid = false
	  var label = this.labels[element.get('class')]
	  if(element.get('tag') == 'div') {
      invalid = !element.getChildren().every(function(c){
        element = c
        return !(c.get('value') === "")
      });
      if(invalid) return ["This is a required field", element, 'change']
    } else if(element.get('type') == "radio" && label['required']) {
      var radios = element.getParent('fieldset').getElements('input')
      if(radios.some(function(r){return r.get('value')}))
        return false
      else
        return ["You must choose an option", new Elements(radios), 'click']
    } else if(label['required'] && element.get('value') === "")
      return ["This is a required field", element]
    else if(label['validation'] && element.get('value') !== "") {
      var args = $splat(label['validation'][0])
      var regex = new RegExp(args[0], args[1])
      return (regex.test(element.get('value')) ? false : [label['validation'][1], element])
    }
	},
	_process: function(cur, name, parent) {
	  switch($type(cur)) {
	    //a select tag
	    case 'array':
	      if(name.test(/^\*/)) {
	        return new Element('fieldset').adopt(
	        [this.label(names[0].substring(1), new Element('legend'))].concat(cur.map(function(c){
	          return this._process(c, names);
	        }, this)));
	      } else {
	        cur = cur.sort()
	        //Make the other / custom field go to the end...
	        var other = false
	        cur.some(function(a){ return a.test(/~/) ? a : other})
	        if(other)
	          cur.remove(other).push(other)
	        if(cur.length > 1)
	          cur = ["Choose "+(parent ? "Subcategory" : "Category")].concat(cur)
	        var named = this.name+"_"+name
	        var level = parent ? parent.$attributes.level : null
	        var klass = [named,level].clean().join("_")
	        var els = []
	        if(parent) {
	          //DO SOMETHING TO REFERENCE SUB SELECTS
	          parent.$attributes.children = this._nested(name, cur, klass, level)
	          return null
	        } else {
	          els.push(this.label(name, named))
	          return els.concat(this._nested(name, cur, klass, level))
	        }
	      }
	    case 'object':
	      cur = $H(cur)
	      var t = [this._process(cur.getKeys(), names, parent)]
	      t.push(this._process(["Choose Subcategory"], names.concat(['_']), true))
	      return t.concat(cur.getValues().map(function(v){
	        return this._process(v, names.concat([cur.keyOf(v).split('|').getLast()]), true)
	      }, this));
	    default:
	      var name = names.join("_");
	      var e = null
	      //AKA not a checkbox
	      if($type(cur)=="string") {
	        var val = cur.split('|').getLast().replace(/Choose (Sub)?Category/i,'')
	        cur = cur.split('|')[0].replace(/^[~*]/,'')
	      }
	      if(parent) {
	        //Allows for custom values
	        e = new Element('option', {html: cur, value: val})
	        if(val.test(/^~/))
            e.$attributes.extra = this._custom(parent.get('name')+'_other', 'rad')
	      } else {
	        if(name.test(/^#/)) {
	          e = new Element('textarea', {
	            name: this.name+'_'+name.substring(1), 
	            'class':name.substring(1), 
	            html: cur})
	        } else if(name.test(/^_/)) {
	          e = new Element('input', {
	            type: 'hidden',
	            'class': name.substring(1),
	            name: this.name+'_'+name.substring(1), 
	            value: cur
	          })
	        } else if(name.test(/^\*/)) {
            e = this.label(cur, this.name+'_'+name.substring(1)).grab(new Element('input', {
              type: 'radio',
              'class': name.substring(1),
              name: this.name+'_'+name.substring(1),
              value: val
            }), 'top')
          } else if(name.test(/^\^/)) {
            e = this.label(name, this.name+'_'+name.substring(1)).grab(new Element('input', {
              type: 'checkbox',
              'class': name.substring(1),
              name: this.name+'_'+name.substring(1),
              checked: (cur ? "checked" : "")
            }), 'top')
	        } else e = new Element('input', {type: 'text', 'class': name, name: this.name+'_'+name, value: cur})
	        if(!name.test(/^[_*^]/))
	          e = [this.label(name, e.name), e]
	      }
	      return e
	  }
	},
	_custom: function(name, klass) {
	  var val = this.labels['~'] || "Custom..."
	  return new Element('input', {
      'class':klass+' custom', 
      type: 'text', 
      name: name, 
      value: val,
      events: {
        'focus': function(){
          if(this.value == val)
            this.set('value', "")
        }
      }
    })
	},
	_nested: function(name, options, klass, level, type) {
	  type = type || 'select'
	  if(type == "custom") {
	    return this._custom(name, klass)
	  } else {
	    var select = new Element("select", {
        name: name,
        'class': level > 1 ? klass+' sub' : klass,
        events: {
          change: function(event){
            var e = event.target
            var it = e.get('value')
            var option = e[e.selectedIndex]
            //Dispose namespaced in a wrapper
            $E('#'+this.name+' .'+classes.join('_')).getElements('.custom, .sub').dispose()
            if(!option.$attributes.extra) return
            var test = $(this.name).getElement('.'+klass)
            //Replace or add the extras
            if(test)
              var made = option.$attributes.extra.replaces(test)
            else
              var made = option.$attributes.extra.inject(e.getParent())
            //Restore the old value instead of an empty select
          //  if(child.length > 1) {
          //    if(made.selectedIndex > 0)                
          //      var child = this.nested[classes.concat([level+1]).join('_')][made.get('value')]
          //    child.getLast().inject(made, 'after')
          //  }
            //$E('#'+this.name+' .'+classes.join('_')).getElements('select').fireEvent('change')      
          }.bind(this)
        }
      })
      select.$attributes.level = (level || -1) + 1
      if(type == "disabled")
        select.set({style: 'display:none',disabled:'disabled')
      return select.adopt(options.map(
        function(o){
          return this._process(o, klass, select)
        },this)
      )
    }
	}
});

/*
{'text':'',
  '#textarea':'Default text',
  '_hidden':'invisible', 
  {'sub_cats': 
    {'rad': ['cool', 'neat'], 
     'awesome': 
       {'crazy': ['indeed', 'man'],
        'way': ['oh', 'yeah']}
    }
  },
  {'drop': ['single', 'dude']}} =>
  <input type="text" name="text" value=""/>
  <textarea name="textarea">Default text</textarea>
  <input type="hidden" name="hidden" value="invisible"/>
  <select name="sub_cats" class="sub_cats_0">
    <option>Choose Category</option>
    <option>rad</option>
    <option>awesome</option>
  </select>
  <select name="sub_cats_0" class="sub_cats_1">
    <option>Choose Subcategory</option>
  </select>
  <select name="sub_cats_rad" class="sub_cats_1" style="display:none">
    <option>cool</option>
    <option>neat</option>
  </select>
  <select name="sub_cats_awesome" class="sub_cats_1" style="display:none">
    <option>crazy</option>
    <option>way</option>
  </select>
  <select name="sub_cats_awesome_0" class="sub_cats_2" style="display:none">
    <option>Choose Subcategory</option>
  </select>
  <select name="sub_cats_awesome_crazy" class="sub_cats_2" style="display:none">
    <option>indeed</option>
    <option>man</option>
  </select>
  <select name="sub_cats_awesome_way" class="sub_cats_2" style="display:none">
    <option>oh</option>
    <option>yeah</option>
  </select>
  <select name="drop">
    <option>single</option>
    <option>dude</option>
  </select>
  */