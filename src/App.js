import React from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import {Button, Col, Row} from 'react-bootstrap';
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
    this.outputTables = new Map();
    this.tableSetup = this.constructTablesFromJSON();
  }

  //create query where clause from input tables and pass the select object to all output components through props
  submitQuery = () => {
    let queryWhereAndFrom = squel.select()//.from(jsonMasterFileData.dataset);
    this.inputTables.forEach((ref) => {
      queryWhereAndFrom = ref.current.getQueryWhereClause(queryWhereAndFrom);
    });

    this.setState({ queryWhereAndFrom: queryWhereAndFrom });
  }

  render(){
    return(
      <div>
        <h1 className="mb-0 pb-0" >LAPD Crime Data Filters</h1>
        <label>Select how you want to filter the dataset</label>
        {this.convertStoredTablesToJSX()}
      </div>
    );
  }

  /**
  *   constructs this.tableSetup from JSON input. Also stores refs for input and output rows
  *
  *   @return {[[[cellObject]]]} - 3D array, The levels are Tables, rows, cellObjects
  *   @see table layout in tableConfigs.json for object structure
  */
  constructTablesFromJSON(){
    let tableSetup = jsonMasterFileData.tableLayout.map((table, i) => {
      let newRef = React.createRef();
      if (table.isSubmitButton){
        return table;
      }
      else if (table.isInputTable){ //assign ref to table if its an input table
        this.inputTables.set(i, newRef);
      }
      else {
        this.outputTables.set(i, newRef);
      }
      return table.rows;
    });
    return tableSetup;
  }

  /**
  *   Supplies the proper JSX entries for all tables defined in this.tableSetup
  *
  *   @return {JSX} - Tables to render
  */
  convertStoredTablesToJSX(){
    //for each table in tableSetup, define a JSX table
    let ret = this.tableSetup.map((table, i) => {
      if (table.isSubmitButton){
        return <SubmitButton submitQuery={this.submitQuery} ref={React.createRef()} key={i}/>
      }

      let newRef = this.inputTables.has(i) ? this.inputTables.get(i) : this.outputTables.get(i);
      return <Table tableConfig={table} queryWhereAndFrom={this.state.queryWhereAndFrom} ref={newRef} key={i}/>
    });

    return ret;
  }
}

//Button to submit query
class SubmitButton extends React.Component {

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
          <Row className="justify-content-md-center my-3" id="buttons" key={i}>
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
          if (this.props.tableConfig[i][j].fieldIsFromSeparateDataset){
            let conf = this.props.tableConfig[i][j];
            query.from(conf.externalDataset)
            query.where(conf.joinCondition)
          }
        }
      });
    });
    query.from(jsonMasterFileData.dataset);
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
      let maxWidth = (type !== OutputComps.MapWrapper) ? "50%" : "100%"

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
