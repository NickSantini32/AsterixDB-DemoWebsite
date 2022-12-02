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

//Super class for all output components
class OutputTableCell extends PureComponent {
  constructor(props){
    super(props);
    this.state = { data: [] }
  }

  //query the dataset with the input parameter and set the result to state variable
  makeQuery(query){
    let url = "http://localhost:19002/query/service";
    let posting = $.post(url, { statement: query.toString() });

    posting.done((data) => {
      this.setState({ data: data.results });
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

  //if a query object (where clause only) is passed from the table, we query for what we need using it
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

  renderLabel(entry) {
    return entry.name + ": " + entry.value;
  }

  render() {
    if (this.state.data.length == 0)
      return(<div/>);

    const COLORS = ["#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#7FDBFF", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC", "#01FF70", "#85144b", "#F012BE", "#3D9970", "#111111", "#AAAAAA"];

    let width = 400;
    let height = 300;
    return (
      <div >
      <label className="form-label">{"Given the criteria, the pie chart shows the number of crimes committed for each " + this.props.name}</label><br/>
      <label className="form-label">{"Format: {" + this.props.name + ", number of crimes committed}"}</label>
      <PieChart width={width} height={height}>
        <Pie
          label={this.renderLabel}
          dataKey="value"
          startAngle={-180}
          endAngle={180}
          data={this.state.data}
          cx={width/2}
          cy={height/2}
          outerRadius={80}
          fill="#8884d8"
        >{
          	this.state.data.map((entry, i) => <Cell fill={COLORS[i % COLORS.length]}/>)
          }
        </Pie>
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
    let avgCenter = [0,0];

    //if lat and long have been queried for then plot them on the map
    this.state.data.forEach((item, i) => {
      if (item.long && item.lat){
        avgCenter[0] += item.long;
        avgCenter[1] += item.lat;
        features.push(new Feature({
          geometry: new Point(fromLonLat([
            item.long, item.lat
          ]))
        }));
      }
    });
    console.log(this.state.data);
    //set view to be inclusive of all points
    //avgCenter[0] /= this.state.data.size();
    //avgCenter[1] /= this.state.data.size();
    // this.state.map.setView(new View({
    //   center: avgCenter,
    //   zoom: 2,
    // }));

    // create the source and layer for point features
    const vectorSource = new VectorSource({
      features
    });
    //define how points will be plotted
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        image: new Circle({
          radius: 4,
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
