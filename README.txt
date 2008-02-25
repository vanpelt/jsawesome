Jsawesome

Description:
    JSAwesome provides a powerful JSON based DSL for creating interactive forms.

Example:
    new JSAwesome('rad', [['cool','neat'], ['^neat',true]], {'cool':{label:'Cool man', validation:'cool'}).to_html()
    =>
      <label for="rad_cool">Cool man</label>
      <input type="text" name="rad_cool" value="neat"/>
      <label for="rad_neat"><input type="checkbox" name="rad_neat" checked="checked"/> Neat</label>
      
    See the functional tests for detailed examples of what is possible

More information:
    http://github.com/vanpelt/jsawesome/tree/master
    
Author:
    Chris Van Pelt, vanpelt@doloreslabs.com