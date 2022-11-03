import React, { PureComponent, useRef, useState, useEffect } from 'react';
import { PieChart, Pie, Sector, Cell, ResponsiveContainer } from 'recharts';
import * as ol from "ol";
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import $ from 'jquery';
import squel from 'squel'


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

  makeQuery(query){
    let url = "http://localhost:19002/query/service";
    let posting = $.post(url, { statement: query.toString() });

    posting.done((data) => {
      this.setState({ data: data.results });
      // console.log(query.toString());
      // console.log(this.props);
      // console.log(data.results);
    }).fail((data) => {
      console.log("query failed: ", query.toString());
    });

    return
  }

  //override this to construct queries if different behavior is required
  constructQuery(query){
    //Get which fields should be queried from tableConfig
    if (this.props.field){
      query.field(this.props.field);
    }
    else {
      this.props.fields.forEach((cellField) => {
        query.field(cellField);
      });
    }

    return query;
  }

  componentWillReceiveProps(nextProps){
    this.makeQuery(this.constructQuery(nextProps.queryResponse.clone()));
  }
}

export class OutputPieChart extends OutputTableCell {
  constructor(props){
    super(props);
  }

  constructQuery(query){
    if (this.props.field){
      query.field(this.props.field + " as name");
      query.field("COUNT(*) AS `value`");
      query.group(this.props.field);
    }
    else {
      throw new Error("Used fields instead of field in pie chart");
    }

    return query;
  }

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

    console.log(this.state.data);

    let features = [];
    this.state.data.forEach((item, i) => {
      features.push(new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([
          item.lat, item.long
        ]))
      }));
    });

    // create the source and layer for random features
    const vectorSource = new ol.source.Vector({
      features
    });
    const vectorLayer = new ol.layer.Vector({
      source: vectorSource,
      style: new ol.style.Style({
        image: new ol.style.Circle({
          radius: 2,
          fill: new ol.style.Fill({color: 'red'})
        })
      })
    });

    const map = new Map({
      view: new View({
        center: [0, 0],
        zoom: 1,
      }),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer
      ],
      target: 'map',
    });

    let style = {width: 600, height: 400};
    return (
      <div id="map" style={style}></div>
    );
  }
}
