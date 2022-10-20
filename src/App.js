import React, { Component }  from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import {Button, Form, Dropdown} from 'react-bootstrap';
import $ from 'jquery';
import * as OutputComps from './components/OutputComponents';
import * as CellTypes from './components/InputComponents';


function App() {
  return (
    <Page/>
  );
}

export default App;

class Page extends React.Component {
  constructor(props){
    super(props);
    this.state = { queryResponse: {}  };
  }

  submitQuery = () => {
    let posting = this.refs.tableUno.submitQuery();

    posting.done(function (data) {
      console.log(data);
      this.setState({ queryResponse: data });
    }).fail(function (data) {
      console.log("fail");
      console.log(data);
      this.setState({ queryResponse: {} });
    });

    return posting;
  }

  render(){
    return(
      <div>
        <h1>LAPD Crime Data Filters</h1>
        <Table tableConfig={inputConfig} ref="tableUno"/>
        <SubmitButton submitQuery={this.submitQuery}/>
        <Table tableConfig={outputConfig}/>
      </div>
    );
  }


}

class SubmitButton extends React.Component {
  constructor(props){
    super(props);
    this.state = { isLoading: false };
  }

  onClick = () => {
    let posting = this.props.submitQuery();
    this.setState( {isLoading: true} );

    posting.done((data) => {
      this.setState( {isLoading: false} );
    }).fail((data) => {
      console.log("fail");
    });
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
class Table extends React.Component {
  constructor(props){
    super(props);
    this.children = [];

    //assign refs to table cells
    this.props.tableConfig.rows.forEach((row, i) => {
      this.children.push([]);
      row.forEach((cell, j) => {
        this.children[i].push(React.createRef())
      });
    });
  }
//return <TableCol name={cell.name} field={cell.field} type={cell.type} key={j} ref={this.children[i][j]}/>;
  render(){
    return(
      <div className="container">
      {this.props.tableConfig.rows.map((row, i) => {
        return (
          <div className="row" id="buttons" key={i}>
            {row.map((cell, j) => {
              return <TableCol {... cell} key={j} ref={this.children[i][j]}/>;
            })}
          </div>
        )

      })}
      </div>
    );
  }

  constructQuery(){
    let queries = []

    this.children.forEach((row, i) => {
      row.forEach((cell, j) => {
        let queryPart = cell.current.getChildQuery();
        if (queryPart !== "") {
          queries.push(queryPart);
        }
      });
    });

    if (queries.length == 0){
      return "use csv;\n SELECT * FROM csv_set";
    }

    let finQuery = "use csv;\n" +
    "SELECT * FROM csv_set WHERE\n";

    queries.forEach((item, i) => {
      finQuery += item + "\n";
      if (i < queries.length - 1){ finQuery += "AND "; }
    });

    console.log(finQuery);
    return finQuery;
  }

  submitQuery(){
    let query = this.constructQuery();
    let url = "http://localhost:19002/query/service";

    // Send the data using post
    return $.post(url, { statement: query });
  }
}

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
        <div className="col" align="center">
          <MyComponent {... this.props} ref={this.child}/>
        </div>
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

const inputConfig = {
  rows: [
    [ { name: "Area Name", field: "Area_Name", type: CellTypes.DataList },
      { name: "Area Name", field: "Area_Name", type: CellTypes.RadioButtons },
      { name: "Area Name", field: "Area_Name", type: CellTypes.TableDropDown }
    ]//,
    // [ { name: "Area Name", field: "Area_Name", type: DataList },
    //   { name: "Area Name", field: "Area_Name", type: RadioButtons },
    //   { name: "Area Name", field: "Area_Name", type: TableDropDown }
    // ],
  ]
};

const outputConfig = {
  rows: [
    [ { name: "Area Name", field: "Area_Name", type: OutputComps.OutputPieChart },
      // { name: "Area Name", field: "Area_Name", type: CellTypes.RadioButtons },
      // { name: "Area Name", field: "Area_Name", type: CellTypes.TableDropDown }
    ]//,
    // [ { name: "Area Name", field: "Area_Name", type: DataList },
    //   { name: "Area Name", field: "Area_Name", type: RadioButtons },
    //   { name: "Area Name", field: "Area_Name", type: TableDropDown }
    // ],
  ]
};
