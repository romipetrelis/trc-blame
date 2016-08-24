/// <reference path="../typings/globals/chart.js/index.d.ts" />


import * as trc from "trclib/trc2";
import * as html from "trclib/trchtml";
import * as trcFx from "trclib/trcfx";
import {DeltasPerDate} from "./deltas-per-date";
import {DeltasPerUser} from "./deltas-per-user";
import {DeltasPerField} from "./deltas-per-field";

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
        
        MyPlugin.fetchDeltas(trcSheet);
        next(plugin);
    }

    private static fetchDeltas(sheet:trc.Sheet) : void {
        sheet.getDeltas((segment)=> {
            MyPlugin.onDeltasReceived(segment);
        }); 
    }

    private static onDeltasReceived(segment:any) { //HACK: IHistorySegment appears to not be exported
        MyPlugin.addBarChart(DeltasPerDate.transform(segment.Results));
        MyPlugin.addBarChart(DeltasPerUser.transform(segment.Results));
        let fieldChartDatas = DeltasPerField.transform(segment.Results);
        for(let fieldChartData of fieldChartDatas) {
            MyPlugin.addBarChart(fieldChartData);
        }
    }

    private static addBarChart(chartData:LinearChartData):void {
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
}