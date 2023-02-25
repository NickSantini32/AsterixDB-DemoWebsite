import React from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import {Form, Dropdown} from 'react-bootstrap';
import $ from 'jquery';
import squel from 'squel'

const jsonMasterFileData = require('./../tableConfigs.json');

//Super class for all input components
class InputTableCell extends React.Component {
  constructor(props){
    super(props);
    this.state = { distinct: []};
  }

  componentDidMount(){
    this.loadDistinctFields();
  }

  /**
  *   Loads all unique options for the field speccified in props
  */
  loadDistinctFields(){
    var field = this.props.field;

    var query = squel.select()
              .distinct()
              .field(field)
              .from(jsonMasterFileData.dataset)
              .toString();

    var url = jsonMasterFileData.url;
    var posting = $.post(url, { statement: query });

    posting.done((data) => {
      this.setState({
        //unpacks the query response and stores the array of distinct values in state.distinct
        distinct: data.results.map((item, i) => { return item[field]; })
      });
    }).fail((data) => {
      console.log("Query Failed: ");
      console.log(data);
    })
  }

  /**
  * @return {String} - Where clause derived from parameters of the cell
  */
  getSqlQuery(){
    let fields = this.getFieldPossibleValues();

    var query = ""
    if (fields.length > 0){
      fields.forEach((item, i) => {
        query += this.props.field + " = \"" + item + "\"";
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
    this.state.listRef = React.createRef();
  }

  onChange = () => {
    console.log(this)
    this.state.text = this.state.listRef.current.value;
  }

  render() {
    return (
      <div>
        <h4 htmlFor="exampleDataList" className="form-label">{this.props.name}</h4>
        <label htmlFor="exampleDataList" className="form-label">{this.props.desc}</label>
        <input className="form-control"
        ref={this.state.listRef} list={this.props.field} placeholder="Type to search..." onChange={this.onChange}/>
        <datalist id={this.props.field}>
          {this.state.distinct.map((item, i) => {
            return <option value={item} key={i}/>;
          })}
        </datalist>
      </div>
    );
  }

  /**
  * @see function definition in parent class
  */
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
    this.state.selected = new Set();
  }

  click = (item) => {
    console.log(item);
    if (this.state.selected.has(item)){
      this.state.selected.delete(item);
    } else{
      this.state.selected.add(item);
    }
    console.log(this.state.selected);
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

  /**
  * @see function definition in parent class
  */
  getFieldPossibleValues(){
    return Array.from(this.state.selected);
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

  /**
  * @see function definition in parent class
  */
  getFieldPossibleValues(){
    if (this.state.currentSelection === "Any"){
      return [];
    }
    else {
      return [this.state.currentSelection];
    }
  }
}


export class DateRange extends InputTableCell{
  constructor(props) {
    super(props);
    this.state.startDate = null;
    this.state.endDate = null;
  }

  render() {
    return (
      <div>
        <h4 htmlFor="exampleDataList" className="form-label">{this.props.name}</h4>
        <label htmlFor="exampleDataList" className="form-label">{this.props.desc}</label>
        <div className="row">
          <div className="col" onChange={(e) => {this.setState({startDate: e.target.value}); }}>
            <h6>Start Date</h6>
            <Form.Control type="date" name='start date'/>
          </div>
          <div className="col" onChange={(e) => {this.setState({endDate: e.target.value}); }}>
            <h6>End Date</h6>
            <Form.Control type="date" name='end date'/>
          </div>
        </div>
      </div>
    );
  }

  /**
  * @see function definition in parent class
  */
  getSqlQuery(){
    squel.select();

    if (this.state.startDate && this.state.endDate)
      return "date(" + this.props.field + ") >= date(\"" + this.state.startDate + "\") AND date(" + this.props.field + ") <= date(\"" + this.state.endDate + "\")";

    return "";
  }
}
