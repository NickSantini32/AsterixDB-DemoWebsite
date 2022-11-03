import React, { Component }  from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import {Button, Form, Dropdown} from 'react-bootstrap';
import $ from 'jquery';
import squel from 'squel'

//abstract base class for all cell components
//contains the database query functions that all subclasses will use
class InputTableCell extends React.Component {
  constructor(props){
    super(props);
    this.state = { distinct: []};
    this.loadDistinctFields(props.field);
  }

  //TODO: Convert this to SQL API
  loadDistinctFields(field){
    var url = "http://localhost:19002/query/service";

    var query = "use csv;\n select distinct " + field + "\n from csv_set;";
    var posting = $.post(url, { statement: query });

    posting.done((data) => {
      this.setState({
        distinct: data.results.map((item, i) => { return item[field]; })
      });
    }).fail((data) => {
      console.log("Query Failed: ");
      console.log(data);
    })
  }

  getSqlQuery(){
    let fields = this.getFieldPossibleValues();

    var query = ""
    if (fields.length > 0){
      fields.forEach((item, i) => {
        query += this.props.field + " = " + "\"" + item + "\"";
        if (i < fields.length - 1){ query += " OR "; }
      });
    }
    return query;
  }

  /**
  * Returns an array of all posible query field values
  * @return {string[]}
  */
  getFieldPossibleValues(){
    //subclasses must implement
    throw new Error("Abstract classes can't be instantiated.");
  }
}

export class DataList extends InputTableCell {
  constructor(props) {
    super(props);
    this.state.text = "";
  }

  onChange = () => {
    this.state.text = this.refs.woah.value;
  }

  //TODO: Change woah ref
  render() {
    return (
      <div>
        <h4 htmlFor="exampleDataList" className="form-label">{this.props.name}</h4>
        <label htmlFor="exampleDataList" className="form-label">{this.props.desc}</label>
        <input className="form-control"
        ref="woah" list={this.props.field} placeholder="Type to search..." onChange={this.onChange}/>
        <datalist id={this.props.field}>
          {this.state.distinct.map((item, i) => {
            return <option value={item} key={i}/>;
          })}
        </datalist>
      </div>
    );
  }

  getFieldPossibleValues(){
    // input checking
    if (this.state.distinct.includes(this.state.text)){
      return [this.state.text];
    }
    return [];
  }
}

export class RadioButtons extends InputTableCell{
  constructor(props){
    super(props);
    this.state.selected = [];
  }

  click = (item) => {
    if (this.state.selected.includes(item)){
      this.state.selected.pop(item);
    } else{
      this.state.selected.push(item);
    }
  }

  render(){
    let style = {display: 'inline-block'}
    return(
      <>
        <h4 htmlFor="exampleDataList" className="form-label ">{this.props.name}</h4>
        <label htmlFor="exampleDataList" className="form-label">{this.props.desc}</label>
        <br/>
        <Form style={style}>
          {this.state.distinct.map((item, i) => {
            return(
              <Form.Check
                label={item}
                name="group1"
                type="switch"
                key={i}
                onChange={e => this.click(item)}
              />
            );
          })}
        </Form>
    </>
    );
  }

  getFieldPossibleValues(){
    return this.state.selected;
  }
}

export class TableDropDown extends InputTableCell{
  constructor(props) {
    super(props);
    this.state.currentSelection = "Any";
  }

  click(s){
    this.setState( {currentSelection: s} );
  }

  render(){
    let style = {display: 'inline-block'}
    return(
    <div style={style}>
    <h4 htmlFor="exampleDataList" className="form-label">{this.props.name}</h4>
    <label htmlFor="exampleDataList" className="form-label">{this.props.desc}</label>
    <br/>
      <Dropdown style={style}>
        <Dropdown.Toggle variant="secondary" id="dropdown-basic">
          {this.state.currentSelection}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item onClick={()=>this.click("Any")}>Any</Dropdown.Item>
          {this.state.distinct.map((item, i) => {
            return(
              <Dropdown.Item onClick={()=>this.click(item)} key={i}>
                {item}
              </Dropdown.Item>
            );
          })}
        </Dropdown.Menu>
      </Dropdown>
    </div>
    );
  }

  getFieldPossibleValues(){
    if (this.state.currentSelection == "Any"){
      return [];
    }
    else {
      return [this.state.currentSelection];
    }
  }
}

export class ZipcodeFilter extends InputTableCell{
  constructor(props) {
    super(props);
    this.state.text = "";
  }

  onChange = () => {
    this.state.text = this.refs.woah.value;
  }

  //TODO: Change woah ref
  render() {
    return (
      <div>
        <h4 htmlFor="exampleDataList" className="form-label">{this.props.name}</h4>
        <label htmlFor="exampleDataList" className="form-label">{this.props.desc}</label>
        <input className="form-control"
        ref="woah" list={this.props.field} placeholder="Type to search..." onChange={this.onChange}/>
        <datalist id={this.props.field}>
          {this.state.distinct.map((item, i) => {
            return <option value={item} key={i}/>;
          })}
        </datalist>
      </div>
    );
  }

  getFieldPossibleValues(){
    // input checking
    if (this.state.distinct.includes(this.state.text)){
      return [this.state.text];
    }
    return [];
  }
}
