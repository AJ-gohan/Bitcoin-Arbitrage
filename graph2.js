function getData(){
    return Math.random();
}

console.log(pass);






Plotly.plot('chart', pass.d1, {showlegend: false});
Plotly.plot('second', pass.d2, {showlegend: false});

/*
var layout = {
    showlegend: false
  };




console.log(pass.d1[0].x);  
Plotly.plot('chart', pass.d1, layout);




  
  
  
Plotly.plot('second', pass.d2, layout);*/
  
//Plotly.plot('second', pass.d2, layout);

  /*
  setInterval(()=>{
    ++d;
    data = [trace5];
    Plotly.extendTraces('chart', data, layout);

  }, 100);*/
  
  

  /*
  var layout = {
    xaxis: {domain: [0, 0.45]},
    yaxis2: {anchor: "x2"},
    xaxis2: {domain: [0.55, 1]}
  };*/
  /*
  var graphOptions = {layout: layout};
  Plotly.plot(data, graphOptions, function (err, msg) {
      console.log(msg);
  });*/

//Plotly.plot('chart', data);



/*
var cnt = 0;

setInterval(function(){
    Plotly.extendTraces('chart', { y:[[getData()]]}, [0]);
    ++cnt;

    if(cnt > 500){
        Plotly.relayout('chart', {
            xaxis:{

                range:[cnt-500, cnt]
            }

        });
    }

}, 15);*/