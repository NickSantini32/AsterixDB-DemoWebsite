import React, { PureComponent, useRef, useState, useEffect } from 'react';
import { PieChart, Pie, Sector, Cell, ResponsiveContainer } from 'recharts';

import {Feature, Map, Overlay, View} from 'ol/index';
import {OSM, Vector as VectorSource} from 'ol/source';
import {Point, Polygon, LineString, MultiPolygon} from 'ol/geom';
import {fromExtent} from 'ol/geom/Polygon';
import {Style, Circle, Fill, Stroke} from 'ol/style';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {fromLonLat} from 'ol/proj';
import {Extent} from 'ol/extent';

import $ from 'jquery';
import squel from 'squel'

const COLORS = ["#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#7FDBFF", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC", "#01FF70", "#85144b", "#F012BE", "#3D9970", "#111111", "#AAAAAA"];

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

  /**
  * returns an array of color indecies for all distinct values
  * @param {String} - the field to query for value
  * @return {String[]} - array of distinct values
  */
  getUniqueFields(field){
    if (this.props.queryResponse && !$.isEmptyObject(this.props.queryResponse)){
      let query = this.props.queryResponse.clone();
      query.field(field).distinct();

      let url = "http://localhost:19002/query/service";
      let posting = $.ajax({
         type: "GET",
         url: url,
         data: { statement: query.toString() },
         async: false,
      });

      let ret = [];
      posting.done((data) => {
        ret = data.results.map(x => x[field]);
      }).fail((data) => {
        console.error("query failed: ", query.toString());
      });
      return ret;
    }
  }

  //if a query object (where clause only) is passed from the table, we query for what we need using it
  componentDidUpdate(prevProps){
    //if props are new make the relevant query
    if (this.props != prevProps){
      this.makeQuery(this.constructQuery(this.props.queryResponse.clone()));
    }
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
        >
        {
          	this.populateGraph()
        }
        </Pie>
      </PieChart>
      </div>
    );
  }

  //returns array of pie cells with unique colors
  populateGraph(){
    var id = this.props.field;
    var colorIndecies = this.getUniqueFields(id);

    return this.state.data.map((entry) => {
      let colorIndex = colorIndecies.indexOf(entry.name);
      return <Cell fill={COLORS[colorIndex % COLORS.length]}/>;
    })
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
        //this.createPointLayer()
      ],
      //target: 'map',
    })

    this.state.map = map;
    this.state.geomData = [];

  }

  componentDidMount(){
    this.state.map.setTarget("map-container");
  }

  //creates layer for points on map
  createPointLayer(){
    let features = [];

    //if lat and long have been queried for then plot them on the map
    this.state.data.forEach((item, i) => {
      if (item.long && item.lat){
        features.push(new Feature({
          geometry: new Point(fromLonLat([
            item.long, item.lat
          ]))
        }));
      }
    });

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

    //autozoom on points
    if (this.state.map != null && features.length > 0){
        var ext = fromExtent(vectorSource.getExtent());
        ext.scale(1.2);
        this.state.map.getView().fit(ext, {size: this.state.map.getSize()});
    }

    return vectorLayer;
  }

  //populates map with geometry layers
  createGeomLayer(){

    if (this.state.geomData){
      var id = this.props.geometryLabel;
      var colorIndecies = this.getUniqueFields(id);

      this.state.geomData.forEach((item, i) => {
        let colorIndex = colorIndecies.indexOf(item[id]);
        let color = 'rgba(0, 0, 255, 0.1)';
        let opacityHexValue = "4D";
        if (colorIndex > -1) {
          color = COLORS[colorIndex % COLORS.length] + opacityHexValue;
        }

        var style = new Style({
          stroke: new Stroke({
            color: 'blue',
            width: 3,
          }),
          fill: new Fill({
            color: color,
          })
        });

        var polygonFeature;

        if (item.g.type == "Polygon"){
          //convert lon lat to OL coords
          let newCoords = item.g.coordinates[0].map(x => fromLonLat(x));
          //make feature from polygon
          polygonFeature = new Feature(
              new Polygon([newCoords]));
          //add poly to feature array

          let layer = new VectorLayer({
                  source: new VectorSource({
                      features: [polygonFeature]
                  }),
                  style: style
          });
          this.state.map.addLayer(layer);
        }
        else if (item.g.type == "MultiPolygon"){
          let geomFeatures = [];
          //for each poly
          item.g.coordinates.forEach((multiPoly, i) => {
            //convert lon lat to OL coords
            let newCoords = multiPoly[0].map(x => fromLonLat(x));
            //make feature from polygon
            polygonFeature = new Feature(
              new Polygon([newCoords]));
            //add poly to feature array
            geomFeatures.push(polygonFeature);
          });
          let layer = new VectorLayer({
                  source: new VectorSource({
                      features: geomFeatures
                  }),
                  style: style
          });
          this.state.map.addLayer(layer);
        }
        else {
          console.log(item.g.type);
        }

      });
    }

    return;
  }

  constructQuery(query){
    //get geometries if they exist
    if (this.props.geometry){
      let q = "use csv; \n" +
              squel.select()
              .field(this.props.geometry)
              .field(this.props.geometryLabel)
              .from(this.props.geomDataset)
              .toString();

      console.log(q)
      let url = "http://localhost:19002/query/service";
      let posting = $.post(url, { statement: q });

      posting.done((data) => {
        this.setState({ geomData: data.results });
      }).fail((data) => {
        console.log("query failed: ", query.toString());
      });
    }

    //then query normally (points done here)
    return super.constructQuery(query);
  }

  render(){

    this.state.map.setLayers([
      new TileLayer({
        source: new OSM(),
      }),
      this.createPointLayer(),

    ])

    this.createGeomLayer()
    //TODO: Change all width and heights to maxwidth maxhight and make it a function of vh and vw
    let style = {width: 600, height: 400};
    return (
      <div id="map-container" style={style}></div>
    );
  }
}
