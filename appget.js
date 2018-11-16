//const http = require('https');
const request = require('request');
const RestClient = require("deribit-api").RestClient;
const fs = require('fs');

var restClient = new RestClient('4kQgwkUUenGFD', 'XGBLU7I6CPWD542436SSZE2Q54RYDQ57');
//var restClient = new RestClient('CrmmfBG7PKtW', 'H56H7PNQJJSZG5GUYTT4N4YKXDJSXQMS', 'https://test.deribit.com');
var ws = fs.createWriteStream('pricelogEv10.txt');

console.log('v1.3');


let openGap = 7.0, closeGap = 4.0, proxVol = 7, ratio = 6, plus = 7.0, minus = 10.5;
let startTimer;

let openPrinted = false, closePrinted = false;

let SorderId = 0, BorderId = 0, pbPrice = 0, psPrice;
let cancelOnce = false, canCont = true, wasInTrade = false, setTimer = false, editOnly = false;
let derVol = 0, coinexxVol = 0;
let primeNums = [2, 3, 5, 7, 11, 13, 17, 19];

let price = {
    deribit: [3.0, 3.1],
    coinexx: [2.0, 2.1]
};

let priceprev = {
    deribit: [3.0, 3.1],
    coinexx: [2.0, 2.1]
};



setInterval(checkDer, 200);
setInterval(checkPosition, 300);
setInterval(updatePrice, 100);
setInterval(updateGap, 60000);



function updateGap(){
    if(!wasInTrade) //gaps cannot be updated in trade
    request(`http://localhost:80/gapAverage`, (err, res, body) => {
            if (err) {return console.log(err);}
            openGap = parseFloat(body) + plus;
            closeGap = openGap - minus;
            }); 
}


function updateParam(){
    
    if(price.deribit[0] < 100 || price.coinexx[0] < 100) return;
    ratio = (0.01/price.coinexx[0]) * (price.deribit[0]) * (price.deribit[0]) / 10;
    let optimal = 0, newRatio = 0, leftOver = 0, optLeftOver = 10, multiplier = 1;

    for(let i = 0; i < primeNums.length; ++i){
        if(primeNums[i] <= proxVol){
            newRatio = ratio*primeNums[i];
            leftOver = newRatio - Math.floor(newRatio);
            if(leftOver > 0.5) leftOver = 1 - leftOver;
            if(leftOver < optLeftOver){
                optLeftOver = leftOver;
                optimal = primeNums[i];
            }}}
    
    multiplier = Math.floor(proxVol/optimal);
    coinexxVol = optimal*multiplier;
    derVol = Math.round(ratio*optimal)*multiplier;
    
}



function cancelAll(){
    canCont = false;
    restClient.cancelall().then((result) => {
        if (validate(result)){
        console.log('cancelled all orders');
        canCont = true;
        } else {
            setTimeout((res) => {
                console.log('failed to cancel, keep trying');
                //console.log(res);
                cancelAll();}, 500);
            }
        }).catch(() => {
        setTimeout((res) => {
        console.log('failed to cancel, keep trying');
        //console.log(res);
        cancelAll();}, 500);
    });
}

function validate(result){
    if(result == null) return false;
    return (result.success === true);
}

function checkPosition(){
if(price.deribit[0] > 100 && price.coinexx[0] > 100 && canCont){
    canCont = false;
restClient.positions().then((result) => {
    if(validate(result)) {
    if(result.result.length != 0 && result.result.length != 1){
        canCont = true;
        return;
    }
    if(result.result.length != 0) { //position opened
        wasInTrade = true;
        sorderId = 0;
        let quan = Math.abs(result.result[0].size);
            if(quan != derVol) {
                derVol = quan;
                ratio = (0.01/price.coinexx[0]) * (price.deribit[0]) * (price.deribit[0]) / 10;
                coinexxVol = Math.abs(Math.round(derVol/ratio));
                console.log(`none optimal quantity executed, new vol set at ${ratio}/${coinexxVol}/${derVol}`);
                editOnly = false;
            }

            if(!cancelOnce) {
                cancelAll();
                cancelOnce = true;
            }
            else {
            if (result.result[0].direction === 'sell'){ //position is in sell
                request(`http://localhost:80/trade/s${coinexxVol}`, (err, res, body) => {
                if (err) {return console.log(err);}
                }); 
                restClient.getopenorders().then((result) =>{ 
                    if(validate(result)) {
                    if(result.result.length == 0 && !editOnly) {
                        restClient.buy("BTC-PERPETUAL", derVol, price.coinexx[1] + closeGap, true).then((result) => {
                            let l = (new Date()).getTime().toString() + ` Close BUY ${result.result.order.price} opt vol set at ${ratio}/${coinexxVol}/${derVol}`;
                                console.log(l);
                                ws.write(l + '\n');
                        BorderId = result.result.order.orderId;
                        canCont = true;
                    }).catch(()=>{canCont = true;})}
                    else{
                        restClient.edit(BorderId, derVol, price.coinexx[1] + closeGap, true).then((result) => {
                            if (result.result.order.price != pbPrice) {
                                editOnly = true;
                                let l = (new Date()).getTime().toString() + ` Edit close BUY ${result.result.order.price} opt vol set at ${ratio}/${coinexxVol}/${derVol}`;
                                console.log(l);
                                ws.write(l + '\n');
                                pbPrice = result.result.order.price;
                            }
                            canCont = true;
                        }).catch(() => {canCont = true;})
                    }}
                    else {
                        console.log("error in retrieving open orders");
                        canCont = true;
                    }}).catch(() => {canCont = true});
            }
            else { //position is in buy
                request(`http://localhost:80/trade/l${coinexxVol}`, (err, res, body) => {
                if (err) {return console.log(err);}
                }); 
                restClient.getopenorders().then((result) =>{ 
                    if(validate(result)) {
                    if(result.result.length == 0 && !editOnly) {
                        restClient.sell("BTC-PERPETUAL", derVol, price.coinexx[0] - closeGap, true).then((result) => {
                            let l = (new Date()).getTime().toString() + ` Close SELL ${result.result.order.price} opt vol set at ${ratio}/${coinexxVol}/${derVol}`;
                                console.log(l);
                                ws.write(l + '\n');
                        SorderId = result.result.order.orderId;
                        canCont = true;
                    }).catch(()=>{canCont = true;})}
                    else{
                        restClient.edit(SorderId, derVol, price.coinexx[0] - closeGap, true).then((result) => {
                            if (result.result.order.price != psPrice) {
                                editOnly = true;
                                let l = (new Date()).getTime().toString() + ` Edit close SELL ${result.result.order.price} opt vol set at ${ratio}/${coinexxVol}/${derVol}`;
                                console.log(l);
                                ws.write(l + '\n');
                                psPrice = result.result.order.price;
                            }
                            canCont = true;
                        }).catch(() =>{canCont = true;})
                    }}
                    else {
                        console.log("error in retrieving open orders");
                        canCont = true;
                    }}).catch(()=>{canCont = true;})  
                }}
            


            if(!openPrinted) {
                closePrinted = false;

                request(`http://localhost:80/tradeHistory/deribit/${result.result[0].direction}/open/${result.result[0].averagePrice}/${Math.abs(result.result[0].size)}`, (err, res, body) => {
                if (err) {return console.log(err);
                    } else {}
                });
                openPrinted = true;
                
                
            }
            /*
            console.log(res.result[0].side);
            console.log(res.result[0].price);
            console.log(res.result[0].quantity);
            console.log(new Date(res.result[0].timeStamp).toString()); */
            
            
        
        }
        else { //no positions open
            request(`http://localhost:80/trade/none`, (err, res, body) => {
                if (err) {return console.log(err);}
            }); 
            if(wasInTrade){
                if(!setTimer) {
                    cancelAll();
                    startTimer = new Date().getTime();
                    setTimer = true;
                    openPrinted = false;
                    canCont = true;
                    console.log("In after trade timeout.");
                    if(!closePrinted) {
                        restClient.tradehistory(1).then((res) =>{
                            if(validate(res)) {
                                request(`http://localhost:80/tradeHistory/deribit/${res.result[0].side}/close/${res.result[0].price}/${res.result[0].quantity}`, (err, res, body) => {
                                if (err) {return console.log(err);
                                    } else {closePrinted = true;}
                                });
                            }
                        }).catch((result) => {
                            console.log(result);
                        });
                    }
                    return;
                } else{
                    if(new Date().getTime() - startTimer < 60000) {
                        canCont = true;
                        return;}
                }
            }
            setTimer = false; wasInTrade = false; editOnly = false;
            restClient.getopenorders().then((result) =>{ 
                if (validate(result)) {
                if (result.result.length != 0 && SorderId == 0) {
                    
                    cancelAll();
                }
                else if(result.result.length == 1){
                    
                    cancelAll();
                }
                else if(result.result.length == 0) { //no open orders
                        
                        cancelOnce = false;
                        updateParam();
                        
                    restClient.sell("BTC-PERPETUAL", derVol, price.coinexx[0] + openGap, true).then((result) => {
                        let l = (new Date()).getTime().toString() + ` Open SELL ${result.result.order.price} opt vol set at ${ratio}/${coinexxVol}/${derVol}`;
                            console.log(l);
                            ws.write(l + '\n');
                        SorderId = result.result.order.orderId;
                        canCont = true;
                    }).catch(()=>{canCont = true;})
                    restClient.buy("BTC-PERPETUAL", derVol, price.coinexx[1] - openGap, true).then((result) => {
                        let l = (new Date()).getTime().toString() + ` Open BUY ${result.result.order.price} opt vol set at ${ratio}/${coinexxVol}/${derVol}`;
                            console.log(l);
                            ws.write(l + '\n');
                        BorderId = result.result.order.orderId;
                        canCont = true;
                    }).catch(()=>{canCont = true;})}
                else {
                    updateParam();
                    restClient.edit(SorderId, derVol, price.coinexx[0] + openGap, true).then((result) => {
                        if (result.result.order.price != psPrice) {
                            let l = (new Date()).getTime().toString() + ` Edit open SELL ${result.result.order.price} opt vol set at ${ratio}/${coinexxVol}/${derVol}`;
                            console.log(l);
                            ws.write(l + '\n');
                            psPrice = result.result.order.price;
                        }
                        canCont = true;
                    }).catch(() => {canCont = true;})
                    restClient.edit(BorderId, derVol, price.coinexx[1] - openGap, true).then((result) => {
                        if (result.result.order.price != pbPrice) {
                            let l = (new Date()).getTime().toString() + ` Edit open BUY ${result.result.order.price} opt vol set at ${ratio}/${coinexxVol}/${derVol}`;
                            console.log(l);
                            ws.write(l + '\n');
                            pbPrice = result.result.order.price;
                        }
                        canCont = true;
                    }).catch(()=>{canCont = true;})
                }}
                else {
                    console.log("error in retrieving open orders");
                    canCont = true;}
            }).catch(()=>{canCont = true;})}}
    else {
            console.log("error in position retrieve");
            canCont = true;}
}).catch(()=>{canCont = true});}}


function validate(result){
    if(result == null) return false;
    return (result.success === true);
}

let a = 0, b = 0, ap = 0, bp = 0;
function checkDer(){
    restClient.getorderbook('BTC-PERPETUAL').then((result) => {
        b = result.result.bids[0].price;
        a = result.result.asks[0].price;
        //console.log(`${a}  ${b}\n`);
        if ( a != ap || b != bp ){
            updateDer(a, b);
            ap = a; bp = b;
        }
    });
}

function updateDer(a, b){
    request(`http://localhost:80/deribit/${a}/${b}`, (err, res, body) => {
        if (err) {return console.log(err);}
        //console.log('connecting');
    }); 
}


function updatePrice() {
    
    request('http://localhost:80',  (err, res, body) => {
        if (err) {return console.log(err);}

        let x = JSON.parse(body);
        price.deribit = x.deribit;
        price.coinexx = x.coinexx;
        price.coinexx[0] = Math.round(price.coinexx[0]*2)/2;
        price.coinexx[1] = Math.round(price.coinexx[1]*2)/2;


        //console.log(price);
    });

    if(price.deribit[0] != priceprev.deribit[0] ||
        price.deribit[1] != priceprev.deribit[1] ||
        price.coinexx[0] != priceprev.coinexx[0] ||
        price.coinexx[1] != priceprev.coinexx[1]) {
        if(price.deribit[0] > 100 && price.coinexx[0] > 100){
            let l = (new Date()).getTime().toString() + JSON.stringify(price);
            ws.write(l + "\n");
            console.log(l);
            
        }}

    priceprev.deribit[0] = price.deribit[0];
    priceprev.deribit[1] = price.deribit[1];
    priceprev.coinexx[0] = price.coinexx[0];
    priceprev.coinexx[1] = price.coinexx[1];
    
}

/*
request({ url: 'http://localhost:80', 
    method: 'PUT', 
    json: {id: 'deribit', val: [2.5, 4.1]}},

    (err, res, body) => {
    console.log(body);
});*/


/*
request('http://localhost:80/deribit/19.4/24.5', (err, res, body) => {
    if (err) {return console.log(err);}
    console.log('connecting');
    console.log(body);
}); */

/*
request('http://localhost:80',  (err, res, body) => {
    if (err) {return console.log(err);}
    console.log('connecting');
    console.log(body);
}); */


/*
function updatePrice() {
    
    request('http://localhost:80',  (err, res, body) => {
        if (err) {return console.log(err);}

        let x = JSON.parse(body);
        price.deribit = x.deribit;
        price.coinexx = x.coinexx;
        //console.log(price);
    });

    if(price.deribit[0] != priceprev.deribit[0] ||
        price.deribit[1] != priceprev.deribit[1] ||
        price.coinexx[0] != priceprev.coinexx[0] ||
        price.coinexx[1] != priceprev.coinexx[1]) {
        if(price.deribit[0] > 100 && price.coinexx[0] > 100){
        
        //console.log("moved");
        restClient.positions((result) => {
            if(result != null) {
            if(result.result.length == 0) { //no positions open
                request(`http://localhost:80/trade/none`, (err, res, body) => {
                    if (err) {return console.log(err);}
                }); 
                openedOrderP = false;
                restClient.getopenorders().then((result) =>{ 
                    if(result != null) {
                    if (result.result.length != 0 && SorderId == 0) {
                        restClient.cancelall();
                    }
                    else if(result.result.length == 0) { //no open orders
                            cancelOnce = false;
                        restClient.sell("BTC-PERPETUAL", 2, price.coinexx[1] + openGap, true).then((result) => {
                            console.log("Open sell limit at " + result.result.order.price);
                            SorderId = result.result.order.orderId;})
                        restClient.buy("BTC-PERPETUAL", 2, price.coinexx[0] - openGap, true).then((result) => {
                            console.log("Open buy limit at " + result.result.order.price);
                            BorderId = result.result.order.orderId;})
                            openedOrderO = true;
                        }
                    else {
                        restClient.edit(SorderId, 2, price.coinexx[1] + openGap, true).then((result) => {
                            console.log("Edit open sell limit at " + result.result.order.price);
                        })
                        restClient.edit(BorderId, 2, price.coinexx[0] - openGap, true).then((result) => {
                            console.log("Edit open buy limit at " + result.result.order.price);
                        })
                    }}
                    else {
                        console.log("error in retrieving open orders");}
                })}}
            else {
                console.log("error in position retrieve");}
            })}}

    priceprev.deribit[0] = price.deribit[0];
    priceprev.deribit[1] = price.deribit[1];
    priceprev.coinexx[0] = price.coinexx[0];
    priceprev.coinexx[1] = price.coinexx[1];
    
}*/