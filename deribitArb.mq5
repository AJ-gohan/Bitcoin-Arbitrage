//+------------------------------------------------------------------+
//|                                                   deribitArb.mq5 |
//|                        Copyright 2018, MetaQuotes Software Corp. |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2018, MetaQuotes Software Corp."
#property link      "https://www.mql5.com"
#property version   "1.00"
#include<Trade\Trade.mqh>
#include<Trade\AccountInfo.mqh>
//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
double askPrice = 0, bidPrice = 0; // previous ask bid price

int OnInit()
  {
//---
   /*
   if(OrdersTotal() == 0)
      trade("BTCUSD", ORDER_TYPE_SELL, 0.01);*/
   EventSetMillisecondTimer(50);
   openPrinted = false; closePrinted = false; wasInTrade = false;
   
   Print(wasInTrade);
   MqlTick p; // Structure to get the latest prices      
   SymbolInfoTick("BTCUSD", p);
   
   if (p.ask != askPrice || p.bid != bidPrice) {
      
      sendPrice(p.ask, p.bid);
      sendPrice(p.ask, p.bid);
      askPrice = p.ask; bidPrice = p.bid;}
   
//---
   return(INIT_SUCCEEDED);
  }
//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
//---
   
  }
  
  bool openPrinted = false, closePrinted = false, wasInTrade = false;
  string type = "buy";
void OnTimer(){

   Print("called1");
   string p = getPosition();
   string command = StringSubstr(p, 0, 1);
   double vol = StringToDouble(StringSubstr(p, 1, StringLen(p)-1)) * 0.01;
   double preVol = 0;
   
   PositionSelect("BTCUSD");
   double curVol = PositionGetDouble(POSITION_VOLUME);
   while(command == "n" && (OrdersTotal() != 0 || PositionsTotal() != 0)) {
   
      
      openPrinted = false;
      closeOrder("BTCUSD");
      preVol = 0;
      
      }
   if(command == "l" && (OrdersTotal() == 0 && PositionsTotal() == 0)) {
      Print("l Called");
      trade("BTCUSD", ORDER_TYPE_SELL, vol);
      closePrinted = false;
      wasInTrade = true;
      type = "sell";
      
      }
      
   if(command == "l" && PositionsTotal() != 0 && ((curVol - vol) > 0.0001) && vol != preVol) {
      CTrade trade;
      trade.PositionClosePartial("BTCUSD", curVol - vol);
      preVol = vol;
   }

   
   if(command == "s" && (OrdersTotal() == 0 && PositionsTotal() == 0)) {
      Print("s called");
      trade("BTCUSD", ORDER_TYPE_BUY, vol);
      closePrinted = false;
      wasInTrade = true;
      type = "buy";
      
      }
      
   if(command == "s" && PositionsTotal() != 0 && ((curVol - vol) > 0.0001) && vol != preVol){
      CTrade trade;
      trade.PositionClosePartial("BTCUSD", curVol - vol);
      preVol = vol;
   }
      
      
      
    if(!openPrinted && PositionsTotal() != 0) {
      PositionSelect("BTCUSD");
      sendTicket(type, "open", PositionGetDouble(POSITION_PRICE_OPEN), PositionGetDouble(POSITION_VOLUME));
      Print("stuck 2");
      openPrinted = true;
    }
    if(wasInTrade && !closePrinted && PositionsTotal() == 0 && OrdersTotal() == 0) {
      Print(wasInTrade);
      Print("Called");
      HistorySelect(0, TimeCurrent());
      ulong tk = HistoryOrderGetTicket(HistoryOrdersTotal()-1);
      if(type == "sell") {type = "buy";} else {type = "sell";}
      sendTicket(type, "close", HistoryOrderGetDouble(tk, ORDER_PRICE_CURRENT), HistoryOrderGetDouble(tk, ORDER_VOLUME_INITIAL));
      closePrinted = true;
    }
}
//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
//---

   MqlTick p; // Structure to get the latest prices      
   SymbolInfoTick("BTCUSD", p);
   
   if (p.ask != askPrice || p.bid != bidPrice) {
      sendPrice(p.ask, p.bid);
      askPrice = p.ask; bidPrice = p.bid;}
  }
  
  string getPosition(){
   string headers, priceParse; char post[],result[]; 
   string url = "http://localhost/trade";  
   ResetLastError(); 
   int res = WebRequest("GET",url,"",500,post,result,headers); 
   return CharArrayToString(result);
  }

  void sendTicket(string dir, string oc, double price, double quan){
  
   string headers; char post[], result[]; 
   string url = "http://localhost/tradeHistory/coinexx/" + dir + "/" + oc + "/" + DoubleToString(price) + "/" + DoubleToString(quan);  
   Print(url);
   
   ResetLastError(); 
   
   int res = WebRequest("GET",url,"",500,post,result,headers); 
   
   Print(res);
   Print(CharArrayToString(result));
   
  }
  
  void sendPrice(double ask, double bid){
  
   string headers; char post[], result[]; 
   string url = "http://localhost/coinexx/" + DoubleToString(ask) + "/" + DoubleToString(bid);  
   Print(url);
   ResetLastError(); 
   int res = WebRequest("GET",url,"",500,post,result,headers); 
   Print(res);
   Print(CharArrayToString(result));
  }
  
  
  struct CurPrice{
   double ask;
   double bid;
  };
  
  CurPrice getPrice(){
   CurPrice c;
   string headers, priceParse; char post[],result[]; 
   string url = "http://localhost/";  
   ResetLastError(); 
   int res = WebRequest("GET",url,"",500,post,result,headers); 
   priceParse = CharArrayToString(result);
   //starts always 12
   //Print(StringSubstr(priceParse, 12, 2));
   
   int askE = StringFind(priceParse, ",", 12),
      bidE = StringFind(priceParse, "]", askE);
   c.ask = StringToDouble(StringSubstr(priceParse, 12, askE-12));
   c.bid = StringToDouble(StringSubstr(priceParse, askE + 1, bidE - (askE + 1)));
   
   return c;
  }
  
  
  //function for opening trades, sl and tp is 10000 points above and below
void trade(string symbol, ENUM_ORDER_TYPE orderType, double lots){

  CTrade  trade;
   int    digits=(int)SymbolInfoInteger(symbol,SYMBOL_DIGITS);
   double point=SymbolInfoDouble(symbol,SYMBOL_POINT);
   double price;
   if(orderType == ORDER_TYPE_BUY)
      price = SymbolInfoDouble(symbol,SYMBOL_ASK);
   else if(orderType == ORDER_TYPE_SELL)
      price = SymbolInfoDouble(symbol, SYMBOL_BID);
//--- calculate and normalize SL and TP levels
   double SL, TP;
   if(orderType == ORDER_TYPE_BUY){
      SL = NormalizeDouble(price-10000*point,digits);
      TP = NormalizeDouble(price+10000*point,digits);
   }
   if(orderType == ORDER_TYPE_SELL){
      SL = NormalizeDouble(price+10000*point,digits);
      TP = NormalizeDouble(price-10000*point,digits);
   }
//--- filling comments
   string comment;
   if(orderType == ORDER_TYPE_BUY)
    comment = "Buy " + symbol + " " + DoubleToString(lots, 2) + " at "+DoubleToString(price,digits);
    else
    comment = "Sell " + symbol + " " + DoubleToString(lots, 2) + " at "+DoubleToString(price,digits);
//--- everything is ready, trying to open a buy position
   if(!trade.PositionOpen(symbol,orderType,lots,price, NULL, NULL, comment))
     {
      //--- failure message
      
      Print("PositionOpen() method failed. Return code=",trade.ResultRetcode(),
            ". Code description: ",trade.ResultRetcodeDescription());
     }
   else
     {
     
      Print("PositionOpen() method executed successfully. Return code=",trade.ResultRetcode(),
            " (",trade.ResultRetcodeDescription(),")");
     }
     
 }

//function for closing orders
 void closeOrder(string symbol){
   CTrade trade;
    if(!trade.PositionClose(symbol))
     {
      //--- failure message
      Print("PositionClose() method failed. Return code=",trade.ResultRetcode(),
            ". Code description: ",trade.ResultRetcodeDescription());
     }
   else
     {
      Print("PositionClose() method executed successfully. Return code=",trade.ResultRetcode(),
            " (",trade.ResultRetcodeDescription(),")");
     }
}
//+------------------------------------------------------------------+
