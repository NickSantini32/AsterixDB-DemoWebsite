import React, { Component }  from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import {Button, Form, Dropdown, Collapse, Col, Row} from 'react-bootstrap';
import $ from 'jquery';
import * as OutputComps from './components/OutputComponents';
import * as CellTypes from './components/InputComponents';
import squel from 'squel'

//TODO: DEFINE DATABASE ELEMENTS GLOBALLY

//homepage display class
export default class Page extends React.Component {
  constructor(props){
    super(props);
    this.state = { queryResponse: {}  };
  }

  //create query where clause from input components and pass that object to all output components
  //TODO: Rename queryResponse to queryWhereAndFrom
  submitQuery = () => {
    let queryWhereAndFrom = this.refs.tableUno.submitQuery();
    this.setState({ queryResponse: queryWhereAndFrom });

    return queryWhereAndFrom;
  }

  render(){
    return(
      <div>
        <h1 class="mb-0 pb-0" >LAPD Crime Data Filters</h1>
        <label class="mb-4">Select how you want to filter the dataset</label>
        <Table tableConfig={outputConfig} queryResponse={this.state.queryResponse}/>
        <Table tableConfig={inputConfig} ref="tableUno"/>
        <br/>
        <SubmitButton submitQuery={this.submitQuery}/>
        <Table tableConfig={outputConfig1} queryResponse={this.state.queryResponse}/>
      </div>
    );
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
//TODO: change table ref to be correct

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

  constructQuery(){
    //TODO: define use csv and csv_set somewhere globally
    let finQuery = squel.select().from("csv.csv_set");

    //gather all query restrictions from input comps and add them to finQuery with a WHERE clause
    this.children.forEach((row, i) => {
      row.forEach((cell, j) => {
        let queryPart = cell.current.getChildQuery();
        if (queryPart !== "") {
          finQuery.where(queryPart);
        }
      });
    });
    console.log(finQuery.toString());
    return finQuery;
  }

  submitQuery(){
    let query = this.constructQuery();
    //TODO: define this URL higher in the higherarchy
    let url = "http://localhost:19002/query/service";

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
      let MyComponent = this.props.type;
      return(
        //<div className="col sm={2}" align="center">
        <Col align="center" style={{maxWidth: "50%"}}>
          <MyComponent {... this.props} ref={this.child}/>
        </Col>
      );
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
    { name: "Area Name", desc:"The area in which the event was reported", field: "Area_Name", type: CellTypes.DataList },
    { name: "Victim Descent", desc:"The ethnicity of the victim", field: "Vict_Descent", type: CellTypes.RadioButtons },
    { name: "Victim Sex", desc:"The gender of the victim", field: "Vict_Sex", type: CellTypes.TableDropDown }
  ],
  [
    { name: "Date Range", desc:"Pick a date range for the data", field: "Datetime_OCC", type: CellTypes.DateRange },
    { name: "Zip Code Filter", desc:"Pick a zip code for the data", field: "Datetime_OCC", type: CellTypes.ZipcodeFilter },
  ]
];

const outputConfig = [
  [
    { name: "Area Name", desc:"Breakdown of all ", field: "ZCTA5CE10", type: OutputComps.OutputPieChart }
  ]
];

const outputConfig1 = [
  [
    { name: "Area Name", desc:"Breakdown of all ", fields: ["lat", "long"], geometry: "g", geometryLabel: "ZCTA5CE10", geomDataset: "csv_zipset", type: OutputComps.MapWrapper }
  ]
];
