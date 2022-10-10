'use strict';

class Form extends React.Component {
  filterOptional() {
    if(this.props.showOptional) {
      Object.values(this.props.schema.properties).forEach(v => {
        Object.values(v.properties).forEach(v2 => {
          if(Array.isArray(v2.type)) v2.type = v2.type[0];
        });
      });
      return { ...this.props.schema, required: Object.keys(this.props.schema.properties) };
    } 
    const requiredSchema = { type: 'object', properties: {} };
    Object.entries(this.props.schema.properties).reduce((m,[k,v]) => {
      if(v.required) {
        v.required.forEach(r => {
          if(!m[k]) m[k] = { type: 'object', properties: {} };
          m[k].properties[r] = v.properties[r];
          if(Array.isArray(m[k].properties[r].type)) {
            m[k].properties[r].type = m[k].properties[r].type[0];
          }
        });
        m[k].required = v.required;
      }
      return m;
    }, requiredSchema.properties);
    return requiredSchema;
  }
  render() {
    if(!this.props.schema) return null;
    const validate = this.props.validate || undefined;
    try {
      return <JSONSchemaForm.default 
        id={this.props.id} 
        schema={this.filterOptional()} 
        formData={this.props.formData} 
        validate={validate} 
        extraErrors={this.props.extraErrors} 
        onSubmit={this.props.onSubmit} 
        onError={this.onError} />
    } catch(e) {
      console.error(e);
      return null;
    }
  }
  onError() {
    alert('There are errors on the page, please check before submitting again');
  }
}