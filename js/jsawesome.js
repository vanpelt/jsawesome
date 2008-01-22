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
		this.delay = (delay -= 20) 
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
	    m.push(new Element('div', {'class':'error'}).adopt(n))
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
	    newname = name.replace(/^[_#]/,'').replace(/_/g,' ').capitalize()
	  return (newname == false ? null : new Element('label', {'for':wafor, 'html':newname}))
	},
	validate: function(e) {
	  return this.validations.every(function(r){
	    var checking = $(this.name).getElement('.'+r.replace(/^[_#~*]/,''))
	    var error = checking.getParent('.error')
	    var invalid = this._check(checking)
	    if(invalid) {
	      invalid[1].set('style', 'background:#d88b7e')
	      if(error.getChildren().getLast().innerHTML != invalid[0]) {
	        var mes = new Element('div', {
	          style: 'color:red',
	          html:invalid[0]
	        }).inject(error)
	      }
	      invalid[1].addEvent(invalid[2] ? 'change' : 'blur', function(){
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
	      return false
	    } else 
	      return true
	  }, this)
	},
	_check: function(element) {
	  var invalid = false
	  var label = this.labels[element.get('class')]
	  if(element.get('tag') == 'div') {
      invalid = !element.getChildren().every(function(c){
        element = c
        return !(c.get('value') === "")
      });
      if(invalid) return ["This is a required field", element, true]
    } else if(label['required'] && element.get('value') === "")
      return ["This is a required field", element]
    else if(label['validation'] && element.get('value') !== "") {
      var args = $splat(label['validation'][0])
      var regex = new RegExp(args[0], args[1])
      return (regex.test(element.get('value')) ? false : [label['validation'][1], element])
    }
	},
	_process: function(cur, names, nested) {
	  names = $splat(names);    
	  switch($type(cur)) {
	    //a select tag
	    case 'array':	    
	      this.in_select = true
	      var root = !this.level
	      if(cur.length > 1)
	        cur = ["Choose "+(this.level==0 ? "Category" : "Subcategory")].concat(cur)
	      else if(this.level <= 1 && cur.length > 0)
	        root = true
	      var name = this.name+"_"+names[0]
	      var klass = [names[0],this.level].join("_")
	      var els = []
	      if(!root) {
	        //Add the subcategory dropdown
	        var store = klass
	        if(names.getLast() == "_") {
	          var classes = klass.split('_')
	          //Go back one level
	          store = classes.concat([classes.pop().toInt() - 1]).join('_')
	          names.pop()
	        }
	        this._store(store, names.getLast(), cur, klass, name)
	        this.in_select = false
	        return null
	      } else {
	        if(this.level==0)
	          els.push(this.label(names[0], name))
	        if(!nested)
	          klass += ' '+names[0]
	        els = els.concat(this._nested(name, cur, klass))
	        this.in_select = false
  	      return els
	      }
	    case 'object':
	      cur = $H(cur)
	      var t = [this._process(cur.getKeys(), names, true)]
	      this.level += 1
	      t.push(this._process(["Choose Subcategory"], names.concat(['_']), true))
	      return new Element('div', {'class':names.join('_')}).adopt(t.concat(cur.getValues().map(function(v){
	        return this._process(v, names.concat([cur.keyOf(v)]), true)
	      }, this)));
	    case 'string':
	      var name = names.join("_");
	      var e = null
	      if(this.in_select) {
	        var val = cur.replace(/Choose (Sub)?Category/i,'')
	        e = new Element('option', {html: cur.replace(/^~/,''), value: val})
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
	        } 
	        else e = new Element('input', {type: 'text', 'class': name, name: this.name+'_'+name, value: cur})
	        if(!name.test(/^_/))
	          e = [this.label(name, e.name), e]
	      }
	      return e
	    default: return false
	  }
	},
	_custom: function(name, klass) {
	  var val = this.labels['~'] || "Custom..."
	  return new Element('input', {
      'class':(this.level > 1 ? klass+' sub' : klass)+' custom', 
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
	_store: function(store, key, options, klass, name) {
	  name = name+'_sub'+this.level
	  if(key.test(/^~/))
      var type = "custom"
    else
      var type = options.length == 0 ? "disabled" : "select"
	  this.nested[store] = this.nested[store] || {}
    this.nested[store][key] = this.nested[store][key] || []
    this.nested[store][key].push(this._nested(name, options, klass, type))
	},
	_nested: function(name, options, klass, type) {
	  type = type || 'select'
	  if(type == "custom") {
	    return this._custom(name, klass)
	  } else {
	    var select = new Element("select", {
        name: name,
        'class': this.level > 1 ? klass+' sub' : klass,
        events: {
          change: function(event){
            var e = event.target
            var classes = e.get('class').split('_')
            var level = classes.pop().toInt()+1
            var klass = classes.concat([level]).join('_')
            var it = e.get('value')
            //Dispose namespaced in a wrapper
            if(level < 3)
              $E('#'+this.name+' .'+classes.join('_')).getElements((level < 2 ? '' : '.custom')+'.sub').dispose()
            //Add a custom input...
            if(it.test(/^~/) && level > 1)
              this._custom(name, klass+' sub').inject(e, 'after')
            if(!this.nested[klass]) return
            var child = this.nested[klass][it]
            if(!child) return
            var made = child[0].replaces($(this.name).getElement('.'+klass))
            //Restore the old value instead of an empty select
            if(child.length > 1) {
              if(made.selectedIndex > 0)
                var child = this.nested[classes.concat([level+1]).join('_')][made.get('value')]
              child.getLast().inject(made, 'after')
            }
            //$E('#'+this.name+' .'+classes.join('_')).getElements('select').fireEvent('change')      
          }.bind(this)
        }
      })
      if(type == "disabled")
        select.set('style', 'display:none').set('disabled', 'disabled')
      return select.adopt(options.map(
        function(o){
          return this._process(o, klass)
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