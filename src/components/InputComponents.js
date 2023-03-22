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

    if(this.props.fieldIsFromSeparateDataset){
      let conf = this.props
      query = squel.select()
                .distinct()
                .field(conf.externalDataset + "." + field)
                .from(jsonMasterFileData.dataset)
                .join(conf.externalDataset, null, conf.joinCondition)
                .toString();
      console.log(query)
    }

    var url = jsonMasterFileData.url;
    let prefix = jsonMasterFileData.datasetPrefix ? jsonMasterFileData.datasetPrefix : "";

    let posting = $.post(url, { statement: prefix + query.toString() });

    posting.done((data) => {
      this.setState({
        //unpacks the query response and stores the array of distinct values in state.distinct
        distinct: data.results.map((item, i) => { return item[field]; })
      });
    }).fail((data) => {
      console.error("query failed: ");
      console.log(data);
    })
  }

  /**
  * @return {String} - Where clause derived from parameters of the cell
  */
  getSqlQuery(){
    let fields = this.getFieldPossibleValues();

    var query = ""
    let dataset = jsonMasterFileData.dataset;
    if (fields.length > 0){
      fields.forEach((item, i) => {
        (this.props.fieldIsFromSeparateDataset) ?
        query += this.props.externalDataset + "." + this.props.field + " = \"" + item + "\"" : //clause if field is from a separate dataset
        query += dataset + "." + this.props.field + " = \"" + item + "\"" ; //default clause

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
    throw new Error("Abstract class ImputComponent can't be instantiated.");
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
        <input className="form-control" ref={this.state.listRef} list={this.props.field}
        placeholder="Type to search..." onChange={this.onChange}/>
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

    if (this.state.startDate && this.state.endDate){
      let dataset = jsonMasterFileData.dataset;
      return "date(" + dataset + "." + this.props.field + ") >= date(\"" + this.state.startDate + "\") AND date(" + dataset + "." + this.props.field + ") <= date(\"" + this.state.endDate + "\")";
    }

    return "";
  }
}
