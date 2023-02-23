import React, { Component }  from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import {Button, Form, Dropdown, Collapse, Col, Row} from 'react-bootstrap';
import $ from 'jquery';
import * as OutputComps from './components/OutputComponents';
import * as InputComps from './components/InputComponents';
import squel from 'squel'

//TODO: DEFINE DATABASE ELEMENTS GLOBALLY
const jsonMasterFileData = require('./tableConfigs.json');

//homepage display class
export default class Page extends React.Component {
  constructor(props){
    super(props);
    this.state = { queryResponse: {} };
    this.inputTables = new Map();
    this.tableSetup = this.constructTablesFromJSON();
    console.log(jsonMasterFileData);
  }

  //create query where clause from input components and pass that object to all output components
  //TODO: Rename queryResponse to queryWhereAndFrom
  submitQuery = () => {
    let queryWhereAndFrom = squel.select().from(jsonMasterFileData.dataset);
    this.inputTables.forEach((ref) => {
      queryWhereAndFrom = ref.current.submitQuery(queryWhereAndFrom);
    });

    this.setState({ queryResponse: queryWhereAndFrom });

    return queryWhereAndFrom;
  }

  render(){
    return(
      <div>
        <h1 class="mb-0 pb-0" >LAPD Crime Data Filters</h1>
        <label class="mb-4">Select how you want to filter the dataset</label>
        {this.convertStoredTablesToJSX()}
      </div>
    );
  }

  // <Table tableConfig={outputConfig} queryResponse={this.state.queryResponse}/>
  // <Table tableConfig={inputConfig} ref="tableUno"/>
  // <br/>
  // <SubmitButton submitQuery={this.submitQuery}/>
  // <Table tableConfig={outputConfig1} queryResponse={this.state.queryResponse}/>

  //constructs this.tableSetup from JSON input. Also logs refs for input rows
  constructTablesFromJSON(){
    let ret = jsonMasterFileData.tableLayout.map((row, i) => {
      if (row[0].isInputRow){ //assign ref to row if it is for input components
        let newRef = React.createRef();
        this.inputTables.set(i, newRef);
      }
      return row;
    });

    return ret;
  }


  //supplies the proper JSX items entries for all tables defined in this.tableSetup
  convertStoredTablesToJSX(){
    let ret = this.tableSetup.map((row, i) => {
      let elem
      if (row[0].type == "SubmitButton"){
        return <SubmitButton submitQuery={this.submitQuery}/>
      }

      if (row[0].isInputRow){
        let newRef = this.inputTables.get(i);
        return <Table tableConfig={[row]} queryResponse={this.state.queryResponse} ref={newRef}/>
      }
      return <Table tableConfig={[row]} queryResponse={this.state.queryResponse}/>
    });

    return ret;
  }
}

//Button to submit query
class SubmitButton extends React.Component {
  constructor(props){
    super(props);
    this.state = { isLoading: false };
  }

  onClick = () => {
    let posting = this.props.submitQuery();

    //TODO: Come back to button loading later
    // this.setState( {isLoading: true} );

    // posting.done((data) => {
    //   this.setState( {isLoading: false} );
    // }).fail((data) => {
    //   console.log("fail");
    // });
  }

  render(){
    return (
      <Button
        id="submit"
        className="btn btn-primary rounded m-2"
        disabled={this.state.isLoading}
        onClick={this.onClick}
      >{this.state.isLoading ? 'Loading…' : 'Submit'}</Button>
    );
  }
}

//TODO: add constructor check to make sure no field is quereied twice in table config

//Table wrapper class meant to contain exclusively input or all output components
class Table extends React.Component {
  constructor(props){
    super(props);
    this.children = [];

    //create refs to all table cells in this.children to be assinged in render
    this.props.tableConfig.forEach((row, i) => {
      this.children.push([]);
      row.forEach((cell, j) => {
        this.children[i].push(React.createRef())
      });
    });
  }

  render(){
    return(
      <div className="container">
      {this.props.tableConfig.map((row, i) => {
        return (
          <Row className="justify-content-md-center" id="buttons" key={i}>
            {row.map((cellData, j) => {
              return <TableCol {... cellData} queryResponse={this.props.queryResponse} key={j} ref={this.children[i][j]}/>;
            })}
          </Row>
        )
      })}
      </div>
    );
  }

  constructQuery(query){
    //TODO: define use csv and csv_set somewhere globally
    // let finQuery = squel.select().from("csv.csv_set");

    //gather all query restrictions from input comps and add them to finQuery with a WHERE clause
    this.children.forEach((row, i) => {
      row.forEach((cell, j) => {
        let queryPart = cell.current.getChildQuery();
        if (queryPart !== "") {
          query.where(queryPart);
        }
      });
    });
    console.log(query.toString());
    return query;
  }

  submitQuery(query){
    query = this.constructQuery(query);
    //TODO: define this URL higher in the higherarchy
    // let url = "http://localhost:19002/query/service";

    return query
  }
}

//wrapper for each cell to display dynamically declared components defined within table props
class TableCol extends React.Component {
  constructor(props){
    super(props);

    //assign ref to child component
    this.child = React.createRef();
  }

  render(){
    if (this.props.type){
      let type = this.props.type;

      if (OutputComps[type]){
        type = OutputComps[type];
      }
      else if (InputComps[type]){
        type = InputComps[type];
      }
      else {
        console.error("Error: type improperly defined: ", type);
      }

      let MyComponent = type;//OutputComps.OutputPieChart;
      let ret = (
        <Col align="center" style={{maxWidth: "50%"}}>
          <MyComponent {... this.props} ref={this.child}/>
        </Col>
      );
      return ret;
    }

    return(
      <div className="col" align="center">e</div>
    );
  }

  getChildQuery(){
    return this.child.current.getSqlQuery();
  }
}


//Configs for each table. Will be moved to JSON eventually
const inputConfig = [
  [
    { name: "Area Name", desc:"The area in which the event was reported", field: "Area_Name", type: InputComps.DataList },
    { name: "Victim Descent", desc:"The ethnicity of the victim", field: "Vict_Descent", type: InputComps.RadioButtons },
    { name: "Victim Sex", desc:"The gender of the victim", field: "Vict_Sex", type: InputComps.TableDropDown }
  ],
  [
    { name: "Date Range", desc:"Pick a date range for the data", field: "Datetime_OCC", type: InputComps.DateRange },
    { name: "Zip Code Filter", desc:"Pick a zip code for the data", field: "ZCTA5CE10", type: InputComps.TableDropDown },
  ]
];

const outputConfig = [
  [
    { name: "Area Name", desc:"Breakdown of all ", field: "ZCTA5CE10", type: "OutputPieChart" }
  ]
];

const outputConfig1 = [
  [
    { name: "Area Name", desc:"Breakdown of all ", fields: ["lat", "long"], geometry: "g", geometryLabel: "ZCTA5CE10", geomDataset: "csv_zipset", type: "MapWrapper" }
  ]
];
