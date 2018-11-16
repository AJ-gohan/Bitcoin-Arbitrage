const express = require('express');
const app = express();
var path = require('path');
const moment = require('moment');
const math = require('mathjs');

app.use(express.json());
app.set('view engine', 'pug');
console.log('v1.0');



let plus = 7.0, minus = 10.5;

let data = new Array(5);
let data2 = new Array(7);

let tradeMarks = new Array(), tradeMarksT = new Array(), tradeMarksC = new Array(), tradeMarksS = new Array();
let openGapT = new Array(), openGap = new Array(), closeGapT = new Array(), closeGap = new Array(), profitHistory = new Array();
let timePeriod = 110; //in minutes


let price = {
    deribit: [3.0, 3.1],
    coinexx: [2.0, 2.1]
};



let coinexxTradeHistory = new Array();

let deribitTradeHistory = new Array();


let hisT = [], derGraphA = [], derGraphB = [], 
    coinexxGraphA = [], coinexxGraphB = [];

let isInTrade = 'none';


//---------------



let toPass;
let gapAvg = 0.00;
let deribitHasSet = false;


setInterval(updateAvg, 60000);
  
function updateAvg(){
    if(coinexxGraphA.length != 0)
    gapAvg = Math.abs(math.mean(coinexxGraphA.map((item, index) => {
        return item - derGraphA[index];
    })));
}



//-------------------------

let dhasOpened = false, dhasClosed = true, chasOpened = false, chasClosed = true;
let derOpen, derProfit, coinOpen, coinProfit, slippedByO, theoPrice = 0;
let derHasSet = false, coinHasSet = false;
let slippedBy;
let trade = {
    deribit: 0,
    coinexx: 0,
};

app.get('/tradeHistory/:broker/:dir/:oc/:price/:quan', (req, res) => {

    res.send();

    let dir = req.params.dir;
    let broker = req.params.broker;
    let oc = req.params.oc;
    let price = parseFloat(req.params.price);
    let quan = parseFloat(req.params.quan);
    
    console.log(`received ${broker} ${dir} ${oc} ${price} ${quan}`);


    //buy = star-triangle-up
      //sell = star-triangle-down

      //deribit open = #b6eae2
      //deribit close = #047563
      //coinexx open = #efd8a7
      //coinexx close = #9e6b03

    if(broker === 'deribit'){
        if(oc === 'open' && !dhasOpened){
            tradeMarksT.push(new Date());
            tradeMarks.push(price);
            tradeMarksC.push('#b6eae2');

            if(dir === 'buy'){

                tradeMarksS.push('star-triangle-up');

                theoPrice = price + (gapAvg + plus);
            }
            else if(dir === 'sell') {

                
                tradeMarksS.push('star-triangle-down');

                theoPrice = price - (gapAvg + plus);

            }
            derOpen = price;

            trade.deribit = price;
            derHasSet = true;
            deribitTradeHistory.push(`${new Date().toISOString()} D ${oc} ${dir} ${quan}contracts at ${(price).toFixed(2)} theo Coin ${(theoPrice).toFixed(2)}`);

            dhasOpened = true;
            dhasClosed = false;
        }
        else if(oc === 'close' && !dhasClosed){

            tradeMarksT.push(new Date());
            tradeMarks.push(price);
            tradeMarksC.push('#047563');

            if(dir === 'buy'){

                
                tradeMarksS.push('star-triangle-up');

                
                theoPrice = price - (gapAvg - minus);
                derProfit = derOpen - price;
                

            }
            else if(dir === 'sell') {


                tradeMarksS.push('star-triangle-down');

                
                theoPrice = price + (gapAvg - minus);
                derProfit = price - derOpen;

            }

            trade.deribit = price;
            derHasSet = true;
            deribitTradeHistory.push(`${new Date().toISOString()} D ${oc} ${dir} ${quan}contracts at ${(price).toFixed(2)} theo Coin ${(theoPrice).toFixed(2)}`);

            dhasClosed = true;    
            dhasOpened = false;
        }
    }

    else if(broker === 'coinexx') {
        if(oc === 'open' && !chasOpened){

            tradeMarksT.push(new Date());
            tradeMarks.push(price);
            tradeMarksC.push('#efd8a7');

            if(dir === 'buy'){
                
                tradeMarksS.push('star-triangle-up');



            }
            else if(dir === 'sell') {
                
                tradeMarksS.push('star-triangle-down');



            }
            coinOpen = price;

            trade.coinexx = price;
            coinexxTradeHistory.push(`${new Date().toISOString()} C ${oc} ${dir} ${quan}lots at ${(price).toFixed(2)}`);
            coinHasSet = true;

            chasOpened = true;
            chasClosed = false;
        }
        else if(oc === 'close' && !chasClosed){

            tradeMarksT.push(new Date());
            tradeMarks.push(price);
            tradeMarksC.push('#9e6b03');

            if(dir === 'buy'){
                
                tradeMarksS.push('star-triangle-up');

                coinProfit = coinOpen - price;

            }
            else if(dir === 'sell') {
                

                tradeMarksS.push('star-triangle-down');

                coinProfit = price - coinOpen;

            }


            trade.coinexx = price;
            coinexxTradeHistory.push(`${new Date().toISOString()} C ${oc} ${dir} ${quan}lots at ${(price).toFixed(2)}`);
            coinHasSet = true;

            chasClosed = true;
            chasOpened = false;
        }
    }

    if(derHasSet && coinHasSet){

        if(dir === 'buy'){
            //theoPrice = trade.deribit - (gapAvg + plus);
            slippedBy = trade.coinexx - theoPrice;
            
            console.log(`${theoPrice}, ${slippedBy}`);
        }
        else if(dir === 'sell') {
            //theoPrice = trade.deribit + (gapAvg + plus);
            slippedBy = theoPrice - trade.coinexx;
            console.log(`${theoPrice}, ${slippedBy}`);
        }
        
        if(oc === 'open'){
            openGapT.push(new Date());
            openGap.push(trade.coinexx - trade.deribit);
            slippedByO = slippedBy;
            console.log(`open slip set at ${slippedByO}`);
        }
        else if(oc === 'close'){
            closeGapT.push(new Date());
            closeGap.push(trade.coinexx - trade.deribit);

            console.log(`close slip set at ${slippedBy}`);
            profitHistory.push(`Profit ${(coinProfit+derProfit+2.92).toFixed(2)} (Net slip ${(slippedByO+slippedBy).toFixed(2)})`);
        }
        
        
        derHasSet = false, coinHasSet = false;
    }
        
});



app.get('/gapAverage', function(req, res){
    res.send(gapAvg.toString());
});




app.get('/summary', function (req, res) {
    //console.log(toPass.d1);
    //----

    
    /*
    data[0] = {
        x: [1,2,3,4],
        y: [2,2,2,2],
        fill: 'none',
        type: 'scatter',
        mode: 'lines',
        line: {
            color:'#27dbbf',
        }
      };
      
      data[1] = {
        x: [1,2,3,4],
        y: [3,3,3,3],
        fill: 'tonexty',
        type: 'scatter',
        mode: 'lines',
        line: {
            color:'#27dbbf',
        }
      };
    
      data[2] = {
        x: [1,2,3,4],
        y: [4,4,4,4],
        fill: 'none',
        type: 'scatter',
        mode: 'lines',
        line: {
            color:'#ffbe35',
        }
      };
      
      data[3] = {
        x: [1,2,3,4],
        y: [5,5,5,5],
        fill: 'tonexty',
        type: 'scatter',
        mode: 'lines',
        line: {
            color:'#ffbe35',
        }
      };

      
      data[4] = {
        x: [1,2,3,4],
        y: [3,3,4,4],
        type: 'scatter',
        mode: 'markers',
        marker: {
          color: ['#b6eae2', '#047563', '#efd8a7', '#9e6b03'], //green
          size: 15,
          symbol: ['bowtie', 'y-down', 'star-square', 'star'],
          line:{
              color: 'black',
              width: 2,
          }
        
        }};*/

        if(tradeMarksT.length != 0)
        while(new Date().getTime() - tradeMarksT[0].getTime() > timePeriod*60*1000) {
            tradeMarksT.shift(); tradeMarks.shift(); tradeMarksC.shift(); tradeMarksS.shift();
            if(tradeMarksT.length == 0) break;
        }

        if(openGapT.length != 0)
        while(new Date().getTime() - openGapT[0].getTime() > timePeriod*60*1000){
            openGapT.shift(); openGap.shift();
            if(openGapT.length == 0) break;
        }

        if(closeGapT.length != 0)
        while(new Date().getTime() - closeGapT[0].getTime() > timePeriod*60*1000){
            closeGapT.shift(); closeGap.shift();
            if(closeGapT.length == 0) break;
        }
      
      data[0] = {
        x: hisT,
        y: derGraphA.map((item, index) => {
            return item - 0.5;
        }),
        fill: 'none',
        type: 'scatter',
        mode: 'lines',
        line: {
            color:'#27dbbf',
        }
      };
      
      data[1] = {
        x: hisT,
        y: derGraphA,
        fill: 'tonexty',
        type: 'scatter',
        mode: 'lines',
        line: {
            color:'#27dbbf',
        }
      };
    
      data[2] = {
        x: hisT,
        y: coinexxGraphB,
        fill: 'none',
        type: 'scatter',
        mode: 'lines',
        line: {
            color:'#ffbe35',
        }
      };
      
      data[3] = {
        x: hisT,
        y: coinexxGraphA,
        fill: 'tonexty',
        type: 'scatter',
        mode: 'lines',
        line: {
            color:'#ffbe35',
        }
      };

      data[4] = {
        x: tradeMarksT,
        y: tradeMarks,
        type: 'scatter',
        mode: 'markers',
        marker: {
          color: tradeMarksC, //green
          size: 15,
          symbol: tradeMarksS,
          line:{
            color: 'black',
            width: 2,
        }
        }};


        /*

    data[5] = {
        x: openSellT,
        y: openSell,
        type: 'scatter',
        mode: 'markers',
        marker: {
            color: '#42f456',
            size: 15,
            symbol: 'triangle-down',
        }};

    data[6] = {
        x: closeBuyT,
        y: closeBuy,
        type: 'scatter',
        mode: 'markers',
        marker: {
            color: '#f45042', //red
            size: 15,
            symbol: 'triangle-up',
        }};

    data[7] = {
        x: closeSellT,
        y: closeSell,
        type: 'scatter',
        mode: 'markers',
        marker: {
            color: '#f45042',
            size: 15,
            symbol: 'triangle-down',
        }};*/
                
          
      
      
      data2[0] = {
        x: hisT,
        y: coinexxGraphB.map((item, index) => {
            return item - derGraphA[index];
        }),
        mode: 'lines',
        line: {color: '#3eeed8'}
      };
    
      data2[1] = {
        x: hisT,
        y: coinexxGraphA.map((item, index) => {
            return item - derGraphB[index];
        }),
        mode: 'lines',
        line: {color: '#ffbe35'}
      };
    
      data2[2] = {
        x: hisT,
        y: new Array(hisT.length).fill(0),
        mode: 'lines',
        line: {color: '#c7c7c7'}
      };
    
      data2[3] = {
        x: hisT,
        y: new Array(hisT.length).fill(gapAvg + plus),
        mode: 'lines',
        line: {color: '#ddd9d9'}
      };
    
      data2[4] = {
        x: hisT,
        y: new Array(hisT.length).fill(-(gapAvg + plus)),
        mode: 'lines',
        line: {color: '#ddd9d9'}
      }; 

      data2[5] = {
        x: openGapT,
        y: openGap,
        type: 'scatter',
        mode: 'markers',
        marker: {
          color: '#8af2e6', //green
          size: 15,
          symbol: 'star-square',
          line:{
            color: 'black',
            width: 2,
        }
        }};

    data2[6] = {
        x: closeGapT,
        y: closeGap,
        type: 'scatter',
        mode: 'markers',
        marker: {
            color: '#e8a58b', //red
            size: 15,
            symbol: 'star-square',
            line:{
                color: 'black',
                width: 2,
            }
        }};
    
      
      
      
      
    
      
    
    
      
      //var data2 = [trace6];
      
      //tradeHistory.push('history1 goes here');
      //tradeHistory.push('history2 goes here');
    
      toPass = {
          d1:data,
          d2:data2,
          d3:coinexxTradeHistory,
          d4:deribitTradeHistory,
          d5:profitHistory,
      }
   
    res.render('index', {passing:toPass});
  });


app.get('/', (req, res) => {
    res.send(price);
});

app.get('/:broker/:ask/:bid', (req, res) => {
    

    /*
    if(hisT.length > 10) {
        hisT.shift(); derGraphA.shift(); derGraphB.shift();
        coinexxGraphA.shift(); coinexxGraphB.shift();
    } */
    if(hisT.length != 0)
    while(new Date().getTime() - hisT[0].getTime() > timePeriod*60*1000) {
        hisT.shift(); derGraphA.shift(); derGraphB.shift();
        coinexxGraphA.shift(); coinexxGraphB.shift();
    }


    hisT.push(new Date());

    if(req.params.broker === 'deribit') {
        price.deribit = [parseFloat(req.params.ask), parseFloat(req.params.bid)];


        if(price.coinexx[0] > 100) {
            derGraphA.push(parseFloat(req.params.ask));
            derGraphB.push(parseFloat(req.params.ask)-0.5);
            coinexxGraphA.push(price.coinexx[0]);
            coinexxGraphB.push(price.coinexx[1]);
            }
    }
    else if (req.params.broker === "coinexx") {
        price.coinexx = [parseFloat(req.params.ask), parseFloat(req.params.bid)];

        if(price.deribit[0] > 100 ) {
            derGraphA.push(price.deribit[0]);
            derGraphB.push(price.deribit[1]);
            coinexxGraphA.push(req.params.ask);
            coinexxGraphB.push(req.params.bid);
        }
    }


    /*
    console.log('--------');
    console.log(hisT);
    console.log(derGraphA);
    console.log(derGraphB);
    console.log(coinexxGraphA);
    console.log(coinexxGraphB);*/
    



      //console.log(toPass.d1);
      res.send(price);
});

app.get('/trade', (req, res) => {
    res.send(isInTrade);
})

app.get('/trade/:setTrade', (req, res) => {
    isInTrade = req.params.setTrade;
    res.send(isInTrade);
})

app.put('/', (req, res) => {
    if(req.body.id = 'deribit') {
        price.deribit = req.body.val;
    }
    else if (req.body.id = 'coinexx') {
        price.coinexx = req.body.val;
    }
    res.send(price);
});

app.get('/plotly.min.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/plotly.min.js'));
});


app.get('/graph2.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/graph2.js'));
});



app.listen(80, () => console.log('listening on 80'));