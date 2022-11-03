import React, { PureComponent, useRef, useState, useEffect } from 'react';
import { PieChart, Pie, Sector, Cell, ResponsiveContainer } from 'recharts';
import * as ol from "ol";
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';


//TODO: Define this globally somewhere, maybe JSON
var dbName = "csv_set"

class OutputTableCell extends PureComponent {
  constructor(props){
    super(props);
    this.state = { data: [] }
  }

  formatQueryResponse(queryResponse){
    if (!queryResponse)
      return

    //console.log(queryResponse);
    if (this.props.field){
      let fieldToDisplay = this.props.field;
      this.setState( {data:
        queryResponse.map((item, i) => {
          return (item[fieldToDisplay]);
        })
      });
    }
    else{
      //console.log("response: ", queryResponse);
    }


  }

  componentWillReceiveProps(nextProps){
    this.formatQueryResponse(nextProps.queryResponse);
    //console.log(this.props.field);
    //console.log(this.state);
  }
}

export class OutputPieChart extends OutputTableCell {
  constructor(props){
    super(props);
  }

  formatQueryResponse(queryResponse){
    if (!queryResponse)
      return

    let fieldToDisplay = this.props.field;
    let newData = [];

    queryResponse.forEach((item, i) => {
      let fieldName = item[fieldToDisplay];
      let result = newData.find(obj => { return obj.name === fieldName; })
      if (result){
        result.value += 1;
      } else {
        newData.push({name: fieldName, value: 1});
      }
    });


    this.setState( {data: newData});
  }

  // componentWillReceiveProps(nextProps){
  //   this.formatQueryResponse(nextProps.queryResponse);
  // }

  render() {
    if (this.state.data.length == 0)
      return(<div/>);

    return (
      <div >
      <label className="form-label">{"Distribution of " + this.props.name + "'s"}</label>
      <PieChart width={300} height={300}>
        <Pie
          dataKey="value"
          startAngle={-180}
          endAngle={180}
          data={this.state.data}
          cx={150}
          cy={150}
          outerRadius={80}
          fill="#8884d8"
          label
        />
      </PieChart>
      </div>
    );
  }
}


export class MapWrapper extends OutputTableCell{
  constructor(props){
    super(props);
  }

  render(){
    const map = new Map({
      view: new View({
        center: [0, 0],
        zoom: 1,
      }),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      target: 'map',
    });

    let style = {width: 600, height: 400};
    return (
      <div id="map" style={style}></div>
    );
  }
}
