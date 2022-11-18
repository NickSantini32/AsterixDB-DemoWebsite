import React, { PureComponent, useRef, useState, useEffect } from 'react';
import { PieChart, Pie, Sector, Cell, ResponsiveContainer } from 'recharts';

import {Feature, Map, Overlay, View} from 'ol/index';
import {OSM, Vector as VectorSource} from 'ol/source';
import {Point} from 'ol/geom';
import {Style, Circle, Fill} from 'ol/style';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {fromLonLat} from 'ol/proj';

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

    const map = new Map({
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        this.createVectorLayer()
      ],
      //target: 'map',
    })

    this.state.map = map;

  }

  componentDidMount(){
    this.state.map.setTarget("map-container");
  }

  createVectorLayer(){
    let features = [];
    this.state.data.forEach((item, i) => {
      features.push(new Feature({
        geometry: new Point(fromLonLat([
          item.long, item.lat
        ]))
      }));
    });

    // create the source and layer for random features
    const vectorSource = new VectorSource({
      features
    });
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        image: new Circle({
          radius: 2,
          fill: new Fill({color: 'red'})
        })
      })
    });

    return vectorLayer;
  }

  render(){

    console.log("state", this.state.data);
    this.state.map.setLayers([
      new TileLayer({
        source: new OSM(),
      }),
      this.createVectorLayer()
    ])


    //TODO: Change all width and heights to maxwidth maxhight and make it a function of vh and vw
    let style = {width: 600, height: 400};
    return (
      <div id="map-container" style={style}></div>
    );
  }
}
