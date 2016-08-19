/// <reference path="../typings/globals/chart.js/index.d.ts" />

import * as trc from "trclib/trc2";
import * as html from "trclib/trchtml";
import * as trcFx from "trclib/trcfx";

declare var $:any; 

export class MyPlugin {
    private sheet:trc.Sheet;
    private opts:trc.PluginOptionsHelper;
    private info:trc.ISheetInfoResult;
    private data:trc.SheetContents;

    public constructor(sheet:trc.Sheet, opts:trc.PluginOptionsHelper) {
        this.sheet = sheet;    
        this.opts = opts;
    }

    public static BrowserEntry(
        sheet:trc.ISheetReference,
        opts:trc.IPluginOptions,
        next:(plugin : MyPlugin) => void 
    ):void {

        let trcSheet = new trc.Sheet(sheet),
            options = trc.PluginOptionsHelper.New(opts, trcSheet),
            plugin = new MyPlugin(trcSheet, options);

        next(plugin);
    }

    public loadSheetContents(): void {
        this.fetchDeltas();        
    }

    public refresh() {
        this.fetchDeltas();
    }

    private fetchDeltas() : void {
        this.sheet.getDeltas((segment)=> {
            this.onDeltasReceived(segment);
        }); 
    }

    private onDeltasReceived(segment:any) { //HACK: IHistorySegment appears to not be exported
        $("#contents").text("got " + segment.Results.length + " deltas to reduce");
        
        var chartData = MyPlugin.transform(segment.Results);
        var chartConfig:ChartConfiguration = {
            type: "bar",
            data: chartData
        };
        var canvas = document.createElement("canvas");
        var container = document.getElementById("contents");
        container.appendChild(canvas);
        var ctx = canvas.getContext("2d");
        var chart = new Chart(ctx, chartConfig);
    }

    private static transform(deltas:trc.IDeltaInfo[]):LinearChartData {
        let dictionary = deltas.reduce(MyPlugin.pivot, {}),
            barData:LinearChartData = {"labels":[], "datasets":[{
                "label": "",
                "data":[]
            }]};
        
        MyPlugin.map(dictionary, barData);

        return barData;
    }

    private static map(dictionary:any, target:LinearChartData):void {
        for(var key in dictionary) {
            target.labels.push(key);
            let d = target.datasets[0].data as Array<number>; // working around TS
            d.push(dictionary[key]);
        }
    }


    private static pivot(previous:any, current:any):any {
        var x = MyPlugin.determineXValue(current);

        if (!previous[x]) {
        previous[x] = 1;
        } else {
        previous[x]++;
        }
        return previous;
    }
  
    private static determineXValue(value:trc.IDeltaInfo) {
		let theDate = new Date(value.Timestamp),
  		    theYear = theDate.getFullYear(),
    	    theMonth = theDate.getMonth() + 1,
    	    theDay = theDate.getDate();
        return `${theYear}-${theMonth}-${theDay}`;
	}
}