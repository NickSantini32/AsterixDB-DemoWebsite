var url = "http://localhost:19002/query/service";
var fields = ["Area_Name", "Vict_Sex", "Vict_Descent"];

loadDropDowns();


//on form load
// document.addEventListener('DOMContentLoaded', function() {
//   $(".btn-secondary").each(function(){
//     //console.log($(this).text());
//     var e = $(this).next();
//     console.log($(this).next()[0].childNodes);
//     //$(this).text()
//     //$(this).text() =
//   });
//
//
//
//
//   // fields.forEach((item, i) => {
//   //
//   //   $("#buttons").append('<div class="col"></div>');
//   // });
// }, false);



function loadDropDowns(){

  for (let i = 0; i < fields.length; i++){
    var query = "use csv;\n select distinct " + fields[i] + "\n from csv_set;";
    console.log(query);

    // Send the data using post
    var posting = $.post(url, { statement: query });

    // Put the results in a div
    posting.done(function (data) {
      console.log("Drop down query completed");
      //aconsole.log(data.results);

      //check type of HTML feature
      //if dropdown menu
      if ($("#"+fields[i]).hasClass("dropdown-menu")){
        //add initial element
        var ele = document.createElement("a");
        ele.classList = "dropdown-item active";
        ele.href = "#";
        ele.innerText = "Any";
        document.getElementById(fields[i]).appendChild(ele);

        //populate from dataset
        data.results.forEach((item, index) => {
          //console.log("item", item);
          //console.log(document.getElementById(fields[i]));
          //console.log(i);
          ele = document.createElement("a");
          ele.classList = "dropdown-item";
          ele.href = "#";
          ele.innerText = item[fields[i]];
          document.getElementById(fields[i]).appendChild(ele);
        });
      }
      //checkbox handler
      else if ($("#"+fields[i]).hasClass("switch-container")){
        data.results.forEach((value, index) => {
          $("#"+fields[i])[0].insertAdjacentHTML("beforeend",
          `<div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" role="switch" id="${value[fields[i]]}">
            <label class="form-check-label" for="flexSwitchCheckDefault">${value[fields[i]]}</label>
          </div>`);
        });
      }
      // datalist filler
      else if ($("#"+fields[i]).is("datalist")){
        data.results.forEach((value, index) => {
          $("#"+fields[i])[0].insertAdjacentHTML("beforeend",
          `<option value="${value[fields[i]]}">`);
        });
      }


    }).fail(function (data) {
      console.log("Query Failed: ", data);
      //$("#result").css("color","red").empty().append(JSON.stringify(data, null, 2));
    });
  }

}

//polls the form and constructs a query
function submitQuery(event){
  // Stop form from submitting normally
  event.preventDefault();

  var query = "use csv;\n SELECT *\n FROM csv_set\n WHERE";

  //go through each item
  fields.forEach((item, i) => {
    //if dropdown, iterate through children and modify query accordingly
    if ($("#"+fields[i]).hasClass("dropdown-menu")){
      $("#"+item).children().each(function(){
        if ($(this).hasClass("active") && $(this).text() != "Any"){
          query += " " + item + " = \"" + $(this).text()+ "\"";
        }
      });
    }
    //if check buttons, do the same
    else if ($("#"+fields[i]).hasClass("switch-container")){
      query += " ("
      $("#"+item).children().each(function(){
        var box = $(this).children()[0]
        if (box.checked){
          query += " " + item + " = \"" + box.id + "\" or";
        }
      });
      if (query.substring(query.length-2, query.length) == "or"){
        query = query.slice(0,-3)
      }
      if (query.substring(query.length-1, query.length) == "("){
        query = query.slice(0,-2)
      }else {
        query = query + ")"
      }
    }
    //if datalist
    else if ($("#"+fields[i]).is("datalist")){
      if ($("#"+fields[i]).prev().val() != ""){
        query += " " + item + " = \"" + ($("#"+fields[i]).prev().val()) + "\"";
      }
    }
    if (i < fields.length-1 && query.substring(query.length-3, query.length) != "and"){
      query += " and"
    }

  });
  if (query.substring(query.length-3,query.length) == "and"){
    query = query.slice(0,-4);
  }
  if (query.substring(query.length-5,query.length) == "WHERE"){
    query = query.slice(0,-6);
  }

  console.log("query:\n", query);

  // Send the data using post
  var posting = $.post(url, { statement: query });

  // Put the results in a div
  posting.done(function (data) {
    var out = "";
    data.results.forEach((item, i) => {
      out += JSON.stringify(item.csv_set, null, 2);
    });
    $("#result").css("color","black").empty().append(out);
    //$("#result").css("color","black").empty().append(JSON.stringify(data, null, 2));
  }).fail(function (data) {
    //console.log(data);
    $("#result").css("color","red").empty().append(JSON.stringify(data, null, 2));
  });
}

$("#submit").on('click', function(){
  alert("aaaaa");
});

//change dropdown active item
$(function(){
    $(".dropdown-menu").click(function(event){
      $(event.currentTarget).children().each(function(){
        if ($(this).hasClass("active")){
          $(this).removeClass("active");
        }
      });
      $(event.target).addClass("active");
      //console.log($(event.currentTarget).prev().text());
      $(event.currentTarget).prev().text($(event.target).text());
   });
});
