/// <reference path="../typings/globals/chart.js/index.d.ts" />

import * as trc from "trclib/trc2";
import {Transformer} from "./transformer";

export class Blame {
    private sheet:trc.Sheet;
    private viewData:any;
    private pluginContainer:HTMLElement;

    public constructor(sheet:trc.Sheet, opts:trc.IPluginOptions) {
        this.sheet = sheet; 

        let optsAsAny = opts as any;
        if (optsAsAny && optsAsAny["container"]) { 
            this.pluginContainer = optsAsAny["container"]
        } else {
            this.pluginContainer = document.getElementsByTagName("body")[0];
        }
    }

    public static BrowserEntry(
        sheet:trc.ISheetReference,
        opts:trc.IPluginOptions,
        next:(plugin : Blame) => void 
    ):void {

        let trcSheet = new trc.Sheet(sheet),
            plugin = new Blame(trcSheet, opts);
        
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

        let chartsPanel = Blame.addChartsPanel("Charts", this.pluginContainer);
        let chartsContainer = chartsPanel.querySelector(".panel-body");
        
        let dailyData = Blame.createChartData(this.viewData.dailyEditCounts, "# Edits per Day");
        let dailyChart = this.addBarChart("changedOnDay", dailyData, chartsContainer)

        let userData = Blame.createChartData(this.viewData.userEditCounts, "# Edits per User");
        let userChart = this.addBarChart("user", userData, chartsContainer);
        
        let fields = this.viewData.columnValueCounts;

        let skip = ["Comments", "RecId"];
        for(let field in fields) {
            if (skip.indexOf(field)>-1) continue;

            let fieldData = Blame.createChartData(fields[field], field);
            let fieldChart = this.addBarChart(field, fieldData, chartsContainer);
        }

        Blame.addRecordsTable(sheetInfo, this.viewData.records, this.pluginContainer);
    };

    private static addRecordsTable = (sheetInfo:trc.ISheetInfoResult, records:any, parent:Element) => {
        let recordsTable = Blame.createRecordsTable(sheetInfo, records);
        
        let gridPanel = Blame.createPanel("Changed Records");
        parent.appendChild(gridPanel);

        let gridPanelBody = gridPanel.querySelector(".panel-body");
        gridPanelBody.appendChild(recordsTable);
    }

    private static addChartsPanel = (title:string, parent:Element):Element => {
        let chartsPanel = Blame.createPanel("Charts");
        let panelBody = chartsPanel.querySelector(".panel-body");
        let instructions = document.createElement("p");
        instructions.innerHTML = "Click a bar to filter the Records Table that appears below (wip)";
        panelBody.appendChild(instructions);

        parent.appendChild(chartsPanel);
        return chartsPanel;
    }

    private static createRecordsTable = (sheetInfo:trc.ISheetInfoResult, records:any):HTMLTableElement  => {
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
        for(let recId in records) {
            let tr = document.createElement("tr");
            
            for(let columnName of columnNames) {
                let td = document.createElement("td");
                if (columnName == "RecId") {
                    td.innerText = recId;
                } else {
                    let cell = records[recId][columnName];
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

    private addBarChart = (name:string, data:LinearChartData, parent:Element):void => {
        Blame.addColor(data.datasets[0]);

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
        Blame.handleCanvasCreated(canvas, parent);
        
        let ctx = canvas.getContext("2d");
        let chart = new Chart(ctx, chartConfig);

        this.handleChartCreated(name, chart, canvas);
    }

    private static addColor(target:ChartDataSets):void {
        let colors:Array<string> = new Array<string>();
        for(let i=0; i< target.data.length; i++) {
            colors.push(Blame.randomColor());
        }
        target.backgroundColor = colors;
    }

    private static randomColor():string {
        return "#" + Math.random().toString(16).slice(2, 8);
    }

    private static handleCanvasCreated = (canvas:HTMLCanvasElement, parent:Element) => {
        let chartDiv = document.createElement("div");
        chartDiv.className = "col-xs-12 col-md-6";
        chartDiv.appendChild(canvas);

        parent.appendChild(chartDiv);
    }

    private static createPanel(title?:string):HTMLDivElement {
        let panel = document.createElement("div");
        panel.className = "panel panel-default";
        let panelHeading = document.createElement("div");
        panelHeading.className = "panel-heading";
        panel.appendChild(panelHeading);
        let panelTitle = document.createElement("h3");
        panelTitle.className = "panel-title";
        panelTitle.innerText = title;
        panelHeading.appendChild(panelTitle);
        let panelBody = document.createElement("div");
        panelBody.className = "panel-body";
        panel.appendChild(panelBody);

        return panel;
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