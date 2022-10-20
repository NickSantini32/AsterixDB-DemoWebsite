import $ from 'jquery';

var url = "http://localhost:19002/query/service";

export function loadDistinctFields(field){
  var query = "use csv;\n select distinct " + field + "\n from csv_set;";
  // console.log(query);
  // console.log("aaaaaaaaaaa");

  // Send the data using post
  return $.post(url, { statement: query });

  // posting.done((data) => {
  //   console.log(props.field + " distinct query completed");
  //   console.log(data.results);
  //   this.setState({distinct: data.results});
  // }).fail((data) => {
  //   console.log("Query Failed: ", data);
  // })
  // console.log(this.state.distinct);

  // Put the results in a div
  // posting.done(function (data) {
  //   // console.log(field + " distinct query completed");
  //   console.log(data);
  //   return data
  //   //console.log(data.results);
  //
  //   //check type of HTML feature
  //   //if dropdown menu
  //   // if ($("#"+fields[i]).hasClass("dropdown-menu")){
  //   //
  //   // }
  //   // //checkbox handler
  //   // else if ($("#"+fields[i]).hasClass("switch-container")){
  //   //
  //   // }
  //   // // datalist filler
  //   // else if ($("#"+fields[i]).is("datalist")){
  //   //
  //   // }
  //
  //
  // }).fail(function (data) {
  //   console.log("Query Failed: ", data);
  //   return null
  //   //$("#result").css("color","red").empty().append(JSON.stringify(data, null, 2));
  // });


}
