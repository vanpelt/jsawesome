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
	        return new Element('div', {style:'float:left;margin-right:5px'}).adopt(this._process(r[1],r[0]))
	      }, this))
	      n.push(new Element('br', {style:'clear:left'}))
	    } else
	      n.push(this._process(p[1],p[0]))
	    var klass = $type(p[0]) == "string" ? p[0].replace(/^[_#*^]/,'') : "row_"+i+1
	    m.push(new Element('div', {'class':'error '+klass}).adopt(n))
	    this.level = 0
	  }, this);
	  var adopted = $(this.name).adopt(m)
	  adopted.getElements('select').each(function(e){
	    e.fireEvent('change', {target:e})
	  })
	 return adopted
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
	addValidation: function(){
	  this.validater = this.validate.bind(this)
	  $(this.name).getParent('form').addEvent('submit', this.validater)
	},
	stopValidation: function(){
	  $(this.name).getParent('form').removeEvent('submit', this.validater)
	},
	validate: function(e) {
	  return this.validations.filter(function(r){
	    var checking = $(this.name).getElement('div .'+r.replace(/^[_#~*^]/,''))
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
    else if(label['validation'] && element.get('value') !== "") {
      var args = $splat(label['validation'][0])
      var regex = new RegExp(args[0], args[1])
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
	          [this.label(name.replace(/^[*^]/,''), new Element('legend'))].concat(cur.map(function(c){
	            c = $splat(c)
	            return this._process(c[0], name, c.getLast());
	          }, this))
	        );
	      } else {
          //Sort the options, and make the other / custom field go to the end...
          cur = cur.sort()
          var other = false
          cur.some(function(a){ return a.test(/~/) ? a : other})
          if(other)
            cur.remove(other).push(other)
          //Add the default header
	        cur = [parent ? select_default[1] : select_default[0]].concat(cur)
	        var level = parent ? parent.getParent().$attributes.level : null
	        var klass = [name,level].clean().join("_")
	        if(parent) {
	          parent.$attributes.extra = this._select(name, cur, klass)
	          return null
	        } else
	          return [this.label(name, this.name+'_'+name),this._select(name, cur, klass)]
	      }
	    case 'object':
	      cur = $H(cur)
	      var t = [this._process(cur.getKeys(), name, parent)]
	      var root = parent ? parent.$attributes.extra : t[0][1]
	      t.push(this._process([], name, root.getElement('option')))
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
	        cur = cur.split('|')[0].replace(/^[~*]/,'')
	      }
	      if($type(parent) == "element") {
	        //Allows for custom values
	        e = new Element('option', {html: cur, value: val.replace(/^~/,'')})
	        if(val.test(/^~/))
            e.$attributes.extra = this._custom(parent.get('name')+'_other', parent.get('name'))
	      } else {
	        if(name.test(/^#/)) {
	          e = new Element('textarea', {
	            name: this.name+'_'+name.substring(1), 
	            'class':name.substring(1), 
	            html: cur})
	        } else if(name.test(/^_/)) {
	          e = this._input('hidden', name.substring(1), cur)
	        } else if(name.test(/^\*/)) {
            e = this.label(cur, this.name+'_'+name.substring(1)).grab(
              this._input('radio', name.substring(1), val), 'top')
          } else if(name.test(/^\^/)) {
            //handles both grouped checkboxes and individual ones... Kindof a Mind FFFF
            if($defined(parent))
              var tname = cur
            else {
              parent = cur
              var tname = name.substring(1)
            }
            e = this.label(tname, this.name+'_'+(val || tname)).grab(
              this._input('checkbox', (val || tname), parent === true), 'top')
	        } else e = this._input('text', name, cur)
	        if(!name.test(/^[_*^]/))
	          e = [this.label(name, e.name), e]
	      }
	      return e
	  }
	},
	_input: function(type, name, val) {
	  e = new Element('input', {type: type, 'class': name, name: this.name+'_'+name})
    if(type == "checkbox")
      e.set('checked', val ? "checked" : "")
    else
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
	_select: function(name, options, klass) {
	  var level = klass.split("_").pop().toInt() || 0
	  var select = new Element("select", {
      name: this.name + '_' + (level > 0 ? name + '_' + level : name),
      'class': klass,
      events: {
        change: function(event){
          var e = event.target
          var option = e[e.selectedIndex]
          var level = e.$attributes.level
          var klass = e.get('class').split(' ')[0]
          var next = klass.test(/\d+$/) ? klass.replace(/\d+$/, level) : klass+'_'+level 
          //Dispose namespaced in a wrapper
          $E('#'+this.name+' .'+klass.replace(/_\d+$/,'')).getElements('.custom, select').each(function(i){
            if(i.hasClass('custom') || i.$attributes.level > level)
              i.dispose()
          })
          if(!option.$attributes.extra) return
          var test = $(this.name).getElement('.'+next)
          //Replace or add the extras
          if(test)
            var made = option.$attributes.extra.replaces(test)
          else
            var made = option.$attributes.extra.inject(e, "after")
          made.fireEvent('change', {target:made})
        }.bind(this)
      }
    })    
    select.$attributes.level = (level || 0) + 1
    return select.adopt(options.map(
      function(o){
        return this._process(o, klass, select)
      },this)
    )
	}
});