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
        
        trcSheet.getInfo((result:trc.ISheetInfoResult)=> {
            MyPlugin.fetchDeltas(trcSheet, result);
        });

        next(plugin);
    }

    private static fetchDeltas(sheet:trc.Sheet, sheetInfo:trc.ISheetInfoResult) : void {
        sheet.getDeltas((segment)=> {
            MyPlugin.onDeltasReceived(segment, sheetInfo);
        }); 
    }

    private static onDeltasReceived(segment:any, sheetInfo:trc.ISheetInfoResult) { //HACK: IHistorySegment appears to not be exported
        let deltas:trc.IDeltaInfo[] = segment.Results;

        MyPlugin.addBarChart(DeltasPerDate.transform(deltas));
        let userChart = MyPlugin.addBarChart(DeltasPerUser.transform(deltas));
        let columnTransformer = new DeltasPerField(deltas, sheetInfo.Columns);
        let fieldChartDatas = columnTransformer.transform();
        
        for(let fieldChartData of fieldChartDatas) {
            MyPlugin.addBarChart(fieldChartData);
        }
    }
    
    private static addBarChart(chartData:LinearChartData):void {
        MyPlugin.addColor(chartData.datasets[0]);

        let chartOptions:ChartOptions = {
            responsive: true,
            maintainAspectRatio:true,
            onClick: undefined
        };

        let chartConfig:ChartConfiguration = {
                    type: "bar",
                    data: chartData,
                    options: chartOptions
                };
        
        let canvas = document.createElement("canvas");
        let container:HTMLDivElement = document.createElement("div");
        container.className = "col-xs-12 col-md-6";
        container.appendChild(canvas);
        let contents = document.getElementById("contents");
        contents.appendChild(container);
        let ctx = canvas.getContext("2d");
        let chart = new Chart(ctx, chartConfig);

        canvas.onclick = MyPlugin.onClick(chart);
    }
    
    private static onClick(chart:any) {
        return (e:any) => {
            console.log("hello from invocation of the click handler");
            let elem = chart.getElementAtEvent(e);
            console.log(elem);
        };
    }

    private static addColor(target:ChartDataSets):void {
        let colors:Array<string> = new Array<string>();
        for(let i=0; i< target.data.length; i++) {
            colors.push(MyPlugin.randomColor());
        }
        target.backgroundColor = colors;
    }

    private static randomColor():string {
        return "#" + Math.random().toString(16).slice(2, 8);
    }
}