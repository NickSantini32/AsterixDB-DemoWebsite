import React, { Component }  from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import {Button, Form, Dropdown, Collapse, Col, Row} from 'react-bootstrap';
import $ from 'jquery';
import * as OutputComps from './components/OutputComponents';
import * as InputComps from './components/InputComponents';
import squel from 'squel'

const jsonMasterFileData = require('./tableConfigs.json');

//homepage display class
export default class Page extends React.Component {
  constructor(props){
    super(props);
    this.state = { queryWhereAndFrom: {} };
    this.inputTables = new Map();
    this.tableSetup = this.constructTablesFromJSON();
  }

  //create query where clause from input tables and pass the select object to all output components through props
  submitQuery = () => {
    let queryWhereAndFrom = squel.select().from(jsonMasterFileData.dataset);
    this.inputTables.forEach((ref) => {
      queryWhereAndFrom = ref.current.getQueryWhereClause(queryWhereAndFrom);
    });

    this.setState({ queryWhereAndFrom: queryWhereAndFrom });

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

  /**
  *   Supplies the proper JSX entries for all tables defined in this.tableSetup
  *
  *   @return {JSX} - Tables to render
  */
  convertStoredTablesToJSX(){
    //for each table in tableSetup, define a JSX table
    let ret = this.tableSetup.map((row, i) => {
      if (row[0].type == "SubmitButton"){
        return <SubmitButton submitQuery={this.submitQuery}/>
      }

      if (row[0].isInputRow){
        let newRef = this.inputTables.get(i);
        return <Table tableConfig={[row]} queryWhereAndFrom={this.state.queryWhereAndFrom} ref={newRef}/>
      }
      return <Table tableConfig={[row]} queryWhereAndFrom={this.state.queryWhereAndFrom}/>
    });

    return ret;
  }
}

//Button to submit query
class SubmitButton extends React.Component {
  constructor(props){
    super(props);
  }

  //Click function defined by submitQuery prop passed in
  onClick = () => {
    this.props.submitQuery();
  }

  render(){
    return (
      <Button
        id="submit"
        className="btn btn-primary rounded m-2"
        onClick={this.onClick}
      >Submit</Button>
    );
  }
}

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
              return <TableCol {... cellData} queryWhereAndFrom={this.props.queryWhereAndFrom} key={j} ref={this.children[i][j]}/>;
            })}
          </Row>
        )
      })}
      </div>
    );
  }

  /**
  *   This function is only to be called on tables flagged as Input tables
  *
  *   @param {squel.select()} - initial squel select object
  *   @return {squel.select()} - squel select object with updated where clause
  */
  getQueryWhereClause(query){
    //gather all query restrictions from input comps and add them to query with a WHERE clause
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
      let type = this.getComponent(this.props.type);
      let MyComponent = type;
      //map gets more max width
      let maxWidth = (type != OutputComps.MapWrapper) ? "50%" : "100%"

      return (
        <Col align="center" style={{maxWidth: maxWidth}}>
          <MyComponent {... this.props} ref={this.child}/>
        </Col>
      );
    }

    return(
      <div className="col" align="center">e</div>
    );
  }

  /**
  * @return {String} - Where clause for the child component within the column
  */
  getChildQuery(){
    return this.child.current.getSqlQuery();
  }

  /**
  * @param {String} - the name of the desired component
  * @return {Object} - The component which matches the name given
  */
  getComponent(type){
    if (OutputComps[type]){
      return OutputComps[type];
    }
    else if (InputComps[type]){
      return InputComps[type];
    }
    else {
      console.error("Error: type improperly defined: ", type);
    }
    return {};
  }
}
