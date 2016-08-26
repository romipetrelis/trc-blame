/// <reference path="../typings/globals/chart.js/index.d.ts" />

import * as trc from "trclib/trc2";
import {Transformer} from "./transformer";

export class MyPlugin {
    private sheet:trc.Sheet;
    private opts:trc.PluginOptionsHelper;
    private viewData:any;

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
            plugin.fetchDeltas(trcSheet, result);
        });

        next(plugin);
    }

    private fetchDeltas = (sheet:trc.Sheet, sheetInfo:trc.ISheetInfoResult):void => {
        sheet.getDeltas((segment)=> {
            this.onDeltasReceived(segment, sheetInfo);
        });
    };

    private onDeltasReceived = (segment:any, sheetInfo:trc.ISheetInfoResult):void => {
        let deltas:trc.IDeltaInfo[] = segment.Results;
        this.viewData = Transformer.transform(deltas);

        let dailyData = MyPlugin.createChartData(this.viewData.dailyEditCounts, "# Edits per Day");
        let dailyChart = MyPlugin.createBarChart("changedOnDay", dailyData, MyPlugin.handleCanvasCreated, MyPlugin.handleChartCreated)

        let userData = MyPlugin.createChartData(this.viewData.userEditCounts, "# Edits per User");
        let userChart = MyPlugin.createBarChart("user", userData, MyPlugin.handleCanvasCreated, MyPlugin.handleChartCreated);
        
        let fields = this.viewData.columnValueCounts;

        let skip = ["Comments", "RecId"];
        for(let field in fields) {
            if (skip.indexOf(field)>-1) continue;
            
            let fieldData = MyPlugin.createChartData(fields[field], field);
            let fieldChart = MyPlugin.createBarChart(field, fieldData, MyPlugin.handleCanvasCreated, MyPlugin.handleChartCreated);
        }
    };

    private static createChartData = (dictionary:any, title?:string):LinearChartData => {
        let toReturn:LinearChartData = { "labels":[], "datasets":[ { "label": title, "data":[] }]};

        let dataArray = toReturn.datasets[0].data as Array<number>;        
        for(let key in dictionary) {
            toReturn.labels.push(key);
            dataArray.push(dictionary[key]);
        }
        return toReturn;
    }

    private static createBarChart(
        name:string, 
        data:LinearChartData, 
        onCanvasCreated:(canvas:HTMLCanvasElement)=>void, 
        onChartCreated?:(chartName:string, chart:{}, canvas:HTMLCanvasElement)=>void):void {

        MyPlugin.addColor(data.datasets[0]);

        let options:ChartOptions = {
            responsive: true,
            maintainAspectRatio:true,
            onClick: undefined
        };

        let chartConfig:ChartConfiguration = {
            type: "bar",
            data: data,
            options: options
        };
        
        let canvas = document.createElement("canvas");
        onCanvasCreated(canvas);
        
        let ctx = canvas.getContext("2d");
        let chart = new Chart(ctx, chartConfig);

        if (onChartCreated) onChartCreated(name, chart, canvas);
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

    private static handleCanvasCreated(canvas:HTMLCanvasElement) {
        let container = document.createElement("div");
        container.className = "col-xs-12 col-md-6";
        container.appendChild(canvas);
        let allCharts = document.getElementById("all-charts");
        allCharts.appendChild(container);
    }

    private static handleChartCreated(name:string, chart:{}, canvas:HTMLCanvasElement) {
        let clickHandler = (aChart:any) => {return (e:any)=> {
            let a = aChart.getElementAtEvent(e);
            if (a && a.length > 0) {
                let model = a[0]._model;
                console.log(`where [${name}] = ${model.label}`);
            }
        }};

        canvas.onclick = clickHandler(chart);
    }
    
    // private onDeltasReceivedOld(segment:any, sheetInfo:trc.ISheetInfoResult) { //HACK: IHistorySegment appears to not be exported
    //     let deltas:trc.IDeltaInfo[] = segment.Results;
    //     this.viewData = Transformer.transform(deltas);

    //     MyPlugin.createBarChart("Timestamp", DeltasToDateChartData.transform(deltas), MyPlugin.handleCanvasCreated, MyPlugin.handleChartCreated);
    //     MyPlugin.createBarChart("User", DeltasToUserChartData.transform(deltas), MyPlugin.handleCanvasCreated, MyPlugin.handleChartCreated);
    //     let columnTransformer = new DeltasToFieldChartDatas(deltas, sheetInfo.Columns);
    //     let fieldChartDataContainers = columnTransformer.transform();
        
    //     for(let container of fieldChartDataContainers) {
    //        MyPlugin.createBarChart(container.name, container.data, MyPlugin.handleCanvasCreated, MyPlugin.handleChartCreated);
    //     }
    // }
}