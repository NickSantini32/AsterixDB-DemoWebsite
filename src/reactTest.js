'use strict';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// const e = React.createElement;

class Table extends React.Component {
  constructor(props){
    super(props);
  }
  render(){
    let ret = [];
    this.props.tableConfig.forEach((row, i) => {
      console.log(row)
      ret.push(<TableRow cells={row} />)
    });

    return(
      <div class="container">
        ret
      </div>
    );
  }
}

class TableRow extends React.Component {
  constructor(props){
    super(props);
  }
  render(){
    return(
      <div class="row" id="buttons"></div>
    );
  }
}


// class TableCell extends React.Component {
//   constructor(props){
//     super(props);
//   }
//   render(){
//     return(
//       <div class="col" align="center"></div>
//     );
//   }
// }
//

//
// class DataList extends React.Component {
//   constructor(props) {
//     super(props);
//     // this.props = { field : "" };
//     loadDistinctFields(props.field);
//   }
//
//   render() {
//     return (
//       <div>
//         <label htmlFor="exampleDataList" className="form-label">Area Name</label>
//         <input className="form-control" list="Area_Name" id="exampleDataList" placeholder="Type to search..."></input>
//         <datalist id="Area_Name"></datalist>
//       </div>
//     );
//   }
// }

// const domContainer = document.querySelector('#reactTest');
// const root = ReactDOM.createRoot(domContainer);
// root.render(e(Table));
