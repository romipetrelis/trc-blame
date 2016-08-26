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
        let dailyChart = this.createBarChart("changedOnDay", dailyData)

        let userData = MyPlugin.createChartData(this.viewData.userEditCounts, "# Edits per User");
        let userChart = this.createBarChart("user", userData);
        
        let fields = this.viewData.columnValueCounts;

        let skip = ["Comments", "RecId"];
        for(let field in fields) {
            if (skip.indexOf(field)>-1) continue;

            let fieldData = MyPlugin.createChartData(fields[field], field);
            let fieldChart = this.createBarChart(field, fieldData);
        }

        let recordsTable = this.createRecordsGrid(sheetInfo);
        
        let gridPanel = document.createElement("div");
        gridPanel.className = "panel panel-default";
        let gridPanelHeading = document.createElement("div");
        gridPanelHeading.className = "panel-heading";
        gridPanel.appendChild(gridPanelHeading);
        let gridPanelTitle = document.createElement("h3");
        gridPanelTitle.className = "panel-title";
        gridPanelTitle.innerText = "Record Changes";
        gridPanelHeading.appendChild(gridPanelTitle);
        let gridPanelBody = document.createElement("div");
        gridPanelBody.className = "panel-body";
        gridPanel.appendChild(gridPanelBody);
        gridPanelBody.appendChild(recordsTable);

        //HACK: attach it where we want it
        let temp = document.getElementById("main2");
        temp.appendChild(gridPanel);
    };

    private createRecordsGrid = (sheetInfo:trc.ISheetInfoResult):HTMLTableElement  => {
        let table = document.createElement("table");
        table.className = "table table-striped blame-grid"
        let thead = document.createElement("thead");
        table.appendChild(thead);
        let header = document.createElement("tr");
        thead.appendChild(header);
        let columnNames = new Array<string>();
        for(let colDef of sheetInfo.Columns) {
            if (colDef.IsReadOnly === true && colDef.Name != "RecId") continue;
            columnNames.push(colDef.Name);

            let th = document.createElement("th")
            th.innerText = colDef.DisplayName;
            header.appendChild(th);
        }
        let tbody = document.createElement("tbody");
        table.appendChild(tbody);
        for(let recId in this.viewData.records) {
            //TODO: create a row and add the cells
            let tr = document.createElement("tr");
            
            for(let columnName of columnNames) {
                let td = document.createElement("td");
                if (columnName == "RecId") {
                    td.innerText = recId;
                } else {
                    let cell = this.viewData.records[recId][columnName];
                    if (cell) td.innerText = cell.currentValue;
                }
                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        }

        return table;
    }

    private static createChartData = (dictionary:any, title?:string):LinearChartData => {
        let toReturn:LinearChartData = { "labels":[], "datasets":[ { "label": title, "data":[] }]};

        let dataArray = toReturn.datasets[0].data as Array<number>;        
        for(let key in dictionary) {
            toReturn.labels.push(key);
            dataArray.push(dictionary[key]);
        }
        return toReturn;
    }

    private createBarChart = (name:string, data:LinearChartData):void => {

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
        this.handleCanvasCreated(canvas);
        
        let ctx = canvas.getContext("2d");
        let chart = new Chart(ctx, chartConfig);

        this.handleChartCreated(name, chart, canvas);
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

    private handleCanvasCreated = (canvas:HTMLCanvasElement) => {
        let chartDiv = document.createElement("div");
        chartDiv.className = "col-xs-12 col-md-6";
        chartDiv.appendChild(canvas);

        //TODO: require the plugin-consumer to pass in a 'container' element. 
        //we'll then put the panel stuff in that and create an "inner" container in the panel-body
        let allCharts = document.getElementById("all-charts");
        allCharts.appendChild(chartDiv);
    }

    private handleChartCreated = (name:string, chart:{}, canvas:HTMLCanvasElement) => {
        let clickHandler = (aChart:any) => {return (e:any)=> {
            let a = aChart.getElementAtEvent(e);
            if (a && a.length > 0) {
                let model = a[0]._model;
                console.log(`where [${name}] = ${model.label}`);
                //TODO: filter this.viewData.records
            }
        }};

        canvas.onclick = clickHandler(chart);
    }
}