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
		this.validatables = []
		this.validations = $H(labels).getKeys().filter(function(f){
		  return labels[f]['required'] || labels[f]['validation']
		})
	},
	to_html: function() {
	  var m = []
	  $A(this.json).each(function(p,i){
	    var n = []
	    //Allows you to reference previous selects...
	    if($type(p[1])=="number" && this.json[p[1]])
	      p[1] = this.json[p[1]][1]
	    if($type(p[0])=="array"){
	      n.push(p.map(function(r){
	        r = $splat(r)
	        n.push(this.extra('before', r[0]))
	        return new Element('div', {style:'float:left;margin-right:5px'}).adopt(this._process(r[1],r[0]))
	      }, this))
	      n.push(new Element('br', {style:'clear:left'}))
	      n.push(this.extra('after', $splat(p.getLast())[0]))
	    } else {
	      n.push(this.extra('before', p[0]))
	      n.push(this._process(p[1],p[0]))
	      n.push(this.extra('after', p[0]))
	    }
	    var klass = $type(p[0]) == "string" ? this._clean(p[0]) : "row_"+(i+1)
	    m.push(new Element('div', {'class':'error '+klass}).adopt(n))
	  }, this);
	  var adopted = $(this.name).adopt(m.concat($(this.name).getChildren().dispose()))
	  adopted.getElements('select').each(function(e){
	    e.fireEvent('change', {target:e})
	  })
	 return adopted
	},
	extra: function(where, what) {
	  return this.labels[where+'_'+what] ? new Element('div', {html: this.labels[where+'_'+what]}) : null
	},
	label: function(name, wafor) {
	  var newname = null
	  name = this._clean(name)
	  if($defined(this.labels[name])) {
	    if($defined(this.labels[name]['label']))
	      newname = this.labels[name]['label']
	    else
	      newname = this.labels[name]
	    if($type(newname) == "object")
	      newname = null
	  }
	  if(!$defined(newname))
	    newname = this._capitalize(name.replace(/_/g,' '))
	  return ($type(wafor) == "element" ? wafor.set('html', newname) : new Element('label', {'for':this._id(wafor), 'html':newname}))
	},
	addValidation: function(wha){
	  if(wha) {
	    this.validatables.each(function(v){
	      //There is an undefined element in IE for some sick reason
	      if(v && v.test(wha)) {
	        this.validatables.erase(v)
	        this.validations.push(v)
	      }
	    }, this)
	  } else {
	    this.validater = this.validate.bind(this)
	    $(this.name).getParent('form').addEvent('submit', this.validater)
	  }
	},
	stopValidation: function(wha){
	  if(wha) {
	    this.validations.each(function(v){
	      //There is an undefined element in IE for some sick reason
	      if(v && v.test(wha)) {
	        this.validations.erase(v)
	        this.validatables.push(v)
	      }
	    }, this)
	  } else
	    $(this.name).getParent('form').removeEvent('submit', this.validater)
	},
	validate: function(e) {
	  return this.validations.filter(function(r){
	    var checking = $(this.name).getElement('div .'+this._clean(r))
	    var error = checking.getParent('.error')
	    var invalid = this._check(checking)
	    if(invalid) {
	      this.delay = (delay -= 20)
	      invalid[1].set('style', 'background:#d88b7e')
	      if(error.getChildren().getLast().innerHTML != invalid[0]) {
	        var mes = new Element('span', {
	          style: 'color:red;display:block',
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
	      return true
	    } else 
	      return false
	  }, this).length == 0
	},
	_reset: function() { delay = 100 },
	_check: function(element) {
	  var invalid = false
	  var label = this.labels[element.get('class')]
	  //Validate chained selects
	  if(element.get('tag') == 'select') {
      invalid = element.getParent().getElements("select, .custom").some(function(c){
        element = c
        return c.get('value') === ""
      });
      if(invalid) return ["This is a required field", element, 'change']
    } else if(element.get('type') == "radio" && label['required']) {
      var radios = element.getParent('fieldset').getElements('input')
      if(radios.some(function(r){return r.get('value')}))
        return false
      else
        return ["You must choose an option", new Elements(radios), 'click']
    } else if(element.get('type') == "checkbox" && label['required']) {
      if(element.checked)
        return false
      else
        return ["You must check this box", element, 'click']
    } else if(label['required'] && element.get('value') === "")
      return ["This is a required field", element]
    else if(label['validation']) {
      var args = $splat(label['validation'][0])
      var regex = new RegExp(args[0], args[1])
      if(!label['required'] && element.get('value').test(/^\s*$/))
        return false
      return (regex.test(element.get('value')) ? false : [label['validation'][1], element])
    }
	},
	_process: function(cur, name, parent) {
	  var select_default = this.labels['{}'] || ["Choose Category", "Choose Subcategory"]
	  switch($type(cur)) {
	    //a select tag or group of radios/checkboxes
	    case 'array':
	      if(name.test(/^[*^]/)) {
	        return new Element('fieldset').adopt(
	          [this.label(this._clean(name), new Element('legend'))].concat(cur.map(function(c){
	            c = $splat(c)
	            return this._process(c[0], name, c.getLast());
	          }, this))
	        );
	      } else {          
          //Sort the options, and make the other / custom field go to the end... if it's a nested select
          if(parent) {
            cur = cur.sort()
            var other = false
            cur.some(function(a){ return a.test(/~/) ? other = a : other})
            if(other)
              cur.erase(other).push(other)
          }
          //Add the default header
          if(cur.length > 1)
	          cur = [parent ? select_default[1] : select_default[0]].concat(cur)
	        var level = parent ? parent.getParent().retrieve('level') : null
	        var klass = [name,level].clean().join("_")
	        if(parent && cur.length > 0) {
	          parent.store('extra', this._select(name, cur, klass, level))
	          return null
	        } else if(cur.length > 0)
	          return [this.label(name, name),this._select(name, cur, klass, level)]
	        else return null
	      }
	    case 'object':
	      cur = $H(cur)
	      var t = [this._process(cur.getKeys(), name, parent)]
	      var root = parent ? parent.retrieve('extra') : t[0][1]
	      t.push(this._process([select_default[1]], name, root.getElement('option')))
	      return t.concat(cur.getValues().map(function(v){
	        var val = cur.keyOf(v).split('|').getLast()
	        var parent = root.getElement('option[value='+val+']')
	        return this._process(v, name, parent)
	      }, this));
	    default:
	      var e = null
        //Ugggggg
	      if($type(cur)=="string") {
	        //There should be a better way to do this
	        var reversed = [].concat(select_default).reverse()
	        var val = cur.split('|').getLast().replace(new RegExp(reversed.join("|")),'')
	        cur = this._clean(cur.split('|')[0])
	      }
	      if($type(parent) == "element") {
	        //Allows for custom values
	        e = new Element('option', {html: cur, value: this._clean(val)})
	        if(val.test(/^~/))
            e.store('extra', this._custom(parent.get('name').replace(/(.+)\[(.+)\]/, '$1[$2_other]'), parent.get('class')))
	      } else {
	        if(name.test(/^#/)) {
	          e = new Element('textarea', {
	            name: this._name(name),
	            id: this._id(name),
	            'class':this._clean(name), 
	            html: cur})
	        } else if(name.test(/^_/)) {
	          e = this._input('hidden', name, cur)
	        } else if(name.test(/^\*/)) {
            e = this.label(cur, name).grab(
              this._input('radio', name, val), 'top')
          } else if(name.test(/^\^/)) {
            //handles both grouped checkboxes and individual ones... Kindof a Mind FFFF
            if($defined(parent))
              var tname = cur
            else {
              parent = cur
              var tname = name
            }
            e = this.label(tname, val || tname).grab(
              this._input('checkbox', (val || tname), parent === true), 'top')
	        } else e = this._input('text', name, cur)
	        //For duplication...
	        if(name.test(/^.?\+/))
	          e = [e, new Element('a', {html:' +', href:'#', events:{click:this.duplicate}, 'class':'plus'})]
	        if(!name.test(/^[_*^]/))
	          e = [this.label(name, name), e]
	      }
	      return e
	  }
	},
	duplicate: function(e) {
	  e.stop()
	  var orig = e.target.getPrevious()
	  if(!orig.name.test(/\[\]$/))
	    orig.name = orig.name+"[]"
	  orig.clone().inject(orig, 'after')
	  new Element('br').inject(orig, 'after')
	},
	_capitalize: function(string){
		return string.replace(/^[a-z]/, function(match){ return match.toUpperCase() });
	},
	_clean: function(name) {
	  return name.replace(/^[_#*^~]?\+?/,'')
	},
	_name: function(name) {
	  return this.name+'['+this._clean(name)+']'
	},
	_id: function(name) {
	  return this.name+'_'+this._clean(name)
	},
	_input: function(type, name, val) {
	  var e = new Element('input', {type: type, 'class': this._clean(name), name: this._name(name), id: (type =='radio' ? '' : this._id(name))})
    if(type == "checkbox") {
      e.set('checked', val ? "checked" : "")
      e.set('value', 'true')
      e = new Element('span').adopt([e, this._input('hidden', name, 'false')])
    } else
      e.set('value', val)
    return e
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
	_select: function(name, options, klass, level) {
	  var level = level || 0
	  var leveled = level > 0 ? name + '_' + level : name
	  var select = new Element("select", {
      name: this._name(leveled),
      id: this._id(leveled),
      'class': klass,
      events: {
        change: function(event){
          var e = event.target
          var option = e[e.selectedIndex]
          var klass = e.get('class').split(' ')[0]
          var verify = new RegExp("("+name+')_\\d+$')
          var next = klass.test(verify) ? klass.replace(verify, '$1_'+(level+1)) : klass+'_'+(level+1) 
          //Dispose namespaced in a wrapper
          $$('#'+this.name+' .'+klass.replace(verify,'$1'))[0].getElements('.custom, select').each(function(i){
            if(i.hasClass('custom') || i.retrieve('level') > level+1)
              i.dispose()
          })
          if(!option.retrieve('extra')) return
          var test = $(this.name).getElement('.'+next)
          //Replace or add the extras
          if(test)
            var made = option.retrieve('extra').replaces(test)
          else
            var made = option.retrieve('extra').inject(e, "after")
          made.fireEvent('change', {target:made})
        }.bind(this)
      }
    })    
    select.store('level', (level || 0) + 1)
    return select.adopt(options.map(
      function(o){
        return this._process(o, klass, select)
      },this)
    )
	}
});