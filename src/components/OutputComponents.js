import React, { PureComponent } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import {Form} from 'react-bootstrap';

import {Feature, Map as OLMap, View} from 'ol/index';
import {OSM, Vector as VectorSource} from 'ol/source';
import {Point, Polygon} from 'ol/geom';
import {fromExtent} from 'ol/geom/Polygon';
import {Style, Circle, Fill, Stroke} from 'ol/style';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {fromLonLat} from 'ol/proj';

import $ from 'jquery';
import squel from 'squel'

const jsonMasterFileData = require('./../tableConfigs.json');
const COLORS = ["#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#7FDBFF", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC",
"#01FF70", "#85144b", "#F012BE", "#3D9970", "#111111", "#AAAAAA"];

//Super class for all output components
class OutputTableCell extends PureComponent {
  constructor(props){
    super(props);
    this.state = { data: [] }
  }

  /**
  * query the dataset with the given squel object and set the result to state variable
  * @param {squel} - query squel object
  */
  makeQueryAndSetData(query){
    let promise = this.makeQuery(query);
    promise.then((result) => {
      this.setState({ data: result });
    });
  }

  /**
  * query the dataset with the given squel object and return result
  * @param {squel} - query squel object
  * @return {Promise} - promise which on completions returns the query results
  */
  makeQuery (query) {
    return new Promise((resolve, reject) => {
      let url = jsonMasterFileData.url;
      let prefix = jsonMasterFileData.datasetPrefix ? jsonMasterFileData.datasetPrefix : "";

      let posting = $.post(url, { statement: prefix + query.toString() });

      posting.done((data) => {
        resolve(data.results);
      }).fail((data) => {
        console.error("query failed: ", query.toString());
        reject();
      });
    });
  }

  /**
  * Adds field to query object based on props.field/s
  * override this to construct queries if different behavior is required
  * keep in mind, the arg will be changed as javascript passes by reference
  * @param {squel} - query squel object
  * @return {squel} - updated query squel object
  */
  constructQuery(query){
    if (this.props.field){
      query.field(jsonMasterFileData.dataset + '.' + this.props.field);
    }
    else {
      this.props.fields.forEach((cellField) => {
        query.field(jsonMasterFileData.dataset + '.' + cellField);
      });
    }

    return query;
  }

  /** 
  * if new props are recieved, requery the output field. Make any independent queries if makeIndependentQueries is defined
  * @param {Object} - previous props (only care about props.queryWhereAndFrom which is a squel object with a where clause)
  */
  componentDidUpdate(prevProps){
    //if props are new, make the relevant query
    if (this.props !== prevProps){
      let q = this.constructQuery(this.props.queryWhereAndFrom.clone());

      console.log("Output query for", this.props.type, "\n\n", q.toString());
      this.makeQueryAndSetData(q);
      if (typeof this.makeIndependentQueries === "function"){
        this.makeIndependentQueries();
      }
    }
  }

}

export class OutputPieChart extends OutputTableCell {
  constructor(props){
    super(props);
    this.state.colorIndecies = [];
  }

  /** 
  * @override of OutputTableCell.constructQuery
  */
  constructQuery(query){
    if (this.props.field){
      let dataset = this.props.fieldIsFromSeparateDataset ? this.props.externalDataset : jsonMasterFileData.dataset;

      if (this.props.fieldIsFromSeparateDataset && !query.toString().includes("FROM " + this.props.externalDataset)) {
        query.from(this.props.externalDataset); 
      }
      if (this.props.fieldIsFromSeparateDataset){
        query.where(this.props.joinCondition);
      }

      query.field(dataset + '.' + this.props.field + " as name")
          .field("COUNT(*) AS `value`")
          .group(dataset + '.' + this.props.field);

    }
    else {
      throw new Error("Used fields instead of field in pie chart");
    }

    return query;
  }

  //return label for pie chart based on entry object
  renderLabel(entry) {
    return entry.name + ": " + entry.value;
  }

  render() {
    if (this.state.data.length === 0)
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
    return this.state.data.map((entry, i) => {
      return <Cell fill={COLORS[i % COLORS.length]} key={i}/>;
    })
  }

}


export class MapWrapper extends OutputTableCell{
  constructor(props){
    super(props);
    this.state.geomPointCount = new Map();

    this.state.geomButtonRef = React.createRef();
    //layer variables
    this.state.pointLayer = this.createPointLayer();
    this.state.geomLayer = this.createGeomLayer();

    const map = new OLMap({
      view: new View({
        //center is at los angeles
        center: fromLonLat( [-118.2437, 34.0522] ),
        zoom: 10,
        maxZoom: 12,
      }),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        this.state.pointLayer,
        this.state.geomLayer
      ]
    })

    this.state.map = map;
    this.state.geomData = [];

  }

  //after mounting, sets the map target and gets the geometries for the cloropleth map
  componentDidMount(){
    this.state.map.setTarget("map-container");

    //get geometries if they are defined
    if (this.props.geometry){
      let q = squel.select()
              .field(this.props.geometry)
              .field(this.props.geometryLabel)
              .from(this.props.geomDataset);

      console.log("Get geometries and names for", this.props.type, "\n\n", q.toString());
      let promise = this.makeQuery(q)
      promise.then((result) => {
        this.setState({ geomData: result }, () => { 
          this.refreshGeomLayer();
        });
      })
    }

  }

  //this function is designed to make any queries outside of the main field query
  makeIndependentQueries(){
    this.queryAndSetGeomPointCount();
  }

  /**
  * called on construct, creates layer for points on map
  * @returns {VectorLayer} - layer for points on map
  */
  createPointLayer(){

    //define how points will be plotted
    let vectorLayer = new VectorLayer({
      // source: vectorSource,
      style: new Style({
        image: new Circle({
          radius: 4,
          fill: new Fill({color: 'red'})
        })
      })
    });
    // this.state.map.addLayer(vectorLayer);
    return vectorLayer;
  }

  //refreshes the point layer based on props
  refreshPointLayer(){
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
    let vectorSource = new VectorSource({
      features
    });

    //autozoom on points
    if (this.state.map != null && features.length > 0){
        var ext = fromExtent(vectorSource.getExtent());
        ext.scale(1.2);
        this.state.map.getView().fit(ext, {size: this.state.map.getSize()});
    }

    this.state.pointLayer.setSource(vectorSource);
  }

  /**
  * called on construct, populates map with geometry layers
  * @returns {VectorLayer} - choropleth layer for points on map
  */
  createGeomLayer(){

      //define style function based on layer how many points in layer
      let cloroplethStyle = (feature) => {

          // let red = [233, 54, 54];
          // let green = [124,252,0];
          let blue = [54, 158, 255];
          let red = [255,0,0];
          let green = [0,255,0];
          // let blue = [0,0,255];

          let max = Math.max(...this.state.geomPointCount.values());
          let w1 = feature.pointsContained / max;

          let color1 = blue;
          let color2 = green;

          if (w1 > 0.5){
            color1 = red;
            color2 = blue;
            w1 -= 0.5
          }
          w1 *= 2;
          let w2 = 1 - w1;

          var rgb = [Math.round(color1[0] * w1 + color2[0] * w2),
            Math.round(color1[1] * w1 + color2[1] * w2),
            Math.round(color1[2] * w1 + color2[2] * w2)];
          rgb.push(feature.pointsContained > 0 ? 0.8 : 0.2); //opacity 0.8 if points contained, 0.2 if not

          let ret = new Style({
            stroke: new Stroke({
              color: 'blue',
              width: 3,
            }),
            fill: new Fill({
              color: rgb,
            })
          });

          return ret;
      }

      //create layer for features and add it
      let layer = new VectorLayer({
              style: cloroplethStyle
      });
      layer.setVisible(false);
      return layer;
  }

  //refreshes the geom layer based on props
  refreshGeomLayer(){

    if (this.state.geomData){
      let geomFeatures = [];

      this.state.geomData.forEach((item, i) => {

        var polygonFeature;
        let points = this.state.geomPointCount.get(item[this.props.geometryLabel]);

        if (item.g.type === "Polygon"){
          //convert lon lat to OL coords
          let newCoords = item.g.coordinates[0].map(x => fromLonLat(x));
          //make feature from polygon
          polygonFeature = new Feature(
              new Polygon([newCoords])
          );

          polygonFeature.pointsContained = points ? points : 0;

          geomFeatures.push(polygonFeature);
        }
        else if (item.g.type === "MultiPolygon"){

          //for each poly
          item.g.coordinates.forEach((multiPoly, i) => {
            //convert lon lat to OL coords
            let newCoords = multiPoly[0].map(x => fromLonLat(x));
            //make feature from polygon
            polygonFeature = new Feature(
              new Polygon([newCoords]));

            polygonFeature.pointsContained = points ? points : 0;
            geomFeatures.push(polygonFeature);
          });

        }
        else {
          console.log(item.g.type);
        }

      });

      this.state.geomLayer.setSource(new VectorSource({
          features: geomFeatures
      }));
    }
  }

  //queries for how many points are contained in each geometry, then sets geomPointCount, then refreshes the layer
  queryAndSetGeomPointCount(){
    let query = this.props.queryWhereAndFrom.clone();
    let geomDataset = this.props.geomDataset;
    let geom = this.props.geometry;
    let geomLabel = this.props.geometryLabel;
    let coords = this.props.fields;
    let dataset = jsonMasterFileData.dataset;
    let countName = "cnt";

    query.field("count(*) as " + countName + ", " + geomDataset + "." + geomLabel)
      .where("st_contains(" + geomDataset + "." + geom + ", st_make_point(" + dataset + "." + 
        coords[1] + ", " + dataset + "." + coords[0] + "))")
      .group(geomDataset + "." + geomLabel);

    if (!query.toString().includes("FROM " + geomDataset)){ query.from(geomDataset); }

    console.log("Choropleth query", this.props.type, "\n\n", query.toString());
    let promise = this.makeQuery(query);
    promise.then((result) => {
      let ret = new Map();
      // convert to map with geomLabel as key and count as value
      result.forEach((entry) => { ret.set(entry[geomLabel], entry[countName]); });

      this.setState({ geomPointCount: ret }, () => {
        this.refreshGeomLayer();
      });
    });
  }
  
  /** 
  * does the same as super.componentDidUpdate, but refreshes the point layer on setState callback
  * @param {Object} - previous props
  */
  componentDidUpdate(prevProps){
    //if props are new, make the relevant query
    if (this.props !== prevProps){
      let q = this.constructQuery(this.props.queryWhereAndFrom.clone());
      console.log("Output query for", this.props.type, "\n\n", q.toString());
      let promise = this.makeQuery(q);
      promise.then((result) => {
        this.setState({ data: result }, () => {
          this.refreshPointLayer();
        });
      });
      this.makeIndependentQueries();
    }
  }

  render(){

    let style = {width: "60vw", height: "60vh"};
    let buttonStyle = {display: 'inline-block'}
    let buttonPress = (e) => {
       let checked = this.state.geomButtonRef.current.checked;

       this.state.pointLayer.setVisible(!checked);
       this.state.geomLayer.setVisible(checked);
     };
    let label = "Show map choropleth by " + this.props.geometryName

    return (
      <>
        <Form style={buttonStyle}>
          <Form.Check
            label={label}
            type="switch"
            onChange={ e => buttonPress(e) }
            ref = {this.state.geomButtonRef}
          />
        </Form>
        <div id="map-container" style={style}></div>
      </>
    );
  }
}
