/// <reference path="../typings/globals/chart.js/index.d.ts" />

import * as trc from "trclib/trc2";
import {Transformer} from "./transformer";
import * as moment from "moment";

export class Blame {
    private deltas:trc.IDeltaInfo[];
    private pluginContainer:HTMLElement;
    private filters:any;
    private sheetInfo:trc.ISheetInfoResult;

    public constructor(sheet:trc.Sheet, container:HTMLElement) {
        this.pluginContainer = container;
        this.filters = {
            "startDate": undefined,
            "endDate": moment().format("YYYY-MM-DD"),
            "changedOnDay": undefined,
            "user": undefined,
            "columns": []
        };
    }

    public static BrowserEntry(
        sheet:trc.ISheetReference,
        container:HTMLElement,
        opts:trc.IPluginOptions,
        next:(plugin : Blame) => void 
    ):void {

        let trcSheet = new trc.Sheet(sheet),
            plugin = new Blame(trcSheet, container);
        
        trcSheet.getInfo((result:trc.ISheetInfoResult)=> {
            plugin.sheetInfo = result;
            plugin.fetchDeltas(trcSheet);
        });

        next(plugin);
    }

    private fetchDeltas = (sheet:trc.Sheet):void => {
        sheet.getDeltas((segment)=> {
            this.deltas = segment.Results;
            this.filters.startDate = this.deltas.length > 0 ? moment(this.deltas[0].Timestamp).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD");
            this.render();
        });
    };

    private render = () => {
        this.init(this.pluginContainer, this.filters);
        let filteredDeltas = Blame.filterDeltas(this.deltas, this.filters);
        this.bind(filteredDeltas);
    };

    private  init = (parent:Element, filters:any) => {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }

        let panel = Blame.createPanel("Filters");
        parent.appendChild(panel);
        let panelBody = panel.querySelector(".panel-body");

        let inlineWrapper = document.createElement("div");
        inlineWrapper.className = "form-inline";
        panelBody.appendChild(inlineWrapper);

        let startDateGroup = Blame.addFormGroup(inlineWrapper, "start-date", "From", "date", undefined, filters.startDate);
        let endDateGroup = Blame.addFormGroup(inlineWrapper, "end-date", "To", "date", undefined, filters.endDate);
        let filterButton = document.createElement("button");
        filterButton.className = "btn btn-default";
        filterButton.setAttribute("aria-label", "Filter");
        filterButton.type = "button";
        let span = document.createElement("span");
        span.className = "glyphicon glyphicon-filter";
        span.setAttribute("aria-hidden", "true");
        filterButton.appendChild(span);
        filterButton.addEventListener("click", (e:any)=> {
            let startDateInput = this.pluginContainer.querySelector("#start-date") as HTMLInputElement;
            this.filters.startDate = startDateInput.value;
            let endDateInput = this.pluginContainer.querySelector("#end-date") as HTMLInputElement;
            this.filters.endDate = endDateInput.value;
            this.render();
        });
        inlineWrapper.appendChild(filterButton);
        
        let filterLabels = new Array<string>();
        if (filters.changedOnDay) {
            filterLabels.push(`Changed On = ${filters.changedOnDay}`);
        } else {
            if (filters.startDate) {
                filterLabels.push(`Start Date >= ${filters.startDate}`);
            }
            if (filters.endDate) {
                filterLabels.push(`End Date >= ${filters.endDate}`);
            }
        }
        if (filters.user) {
            filterLabels.push(`User = ${filters.user}`);
        }

        for(let column of filters.columns) {
            let c:any = column as any;
            filterLabels.push(`${c.name} = ${c.value}`);
        }

        let filterWell = document.createElement("p");
        filterWell.innerText = filterLabels.join(" & ");
        panelBody.appendChild(filterWell);
    };

    private static filterDeltas = (source:trc.IDeltaInfo[], filters:any):trc.IDeltaInfo[] => {
        return source.filter((value:trc.IDeltaInfo):boolean => {
            var theTimestampMoment = moment(value.Timestamp);
            if (filters.changedOnDay) {
                if (theTimestampMoment.format("YYYY-MM-DD") !== filters.changedOnDay) return false;
            } else {
                if (filters.startDate) {
                    if (theTimestampMoment.isBefore(moment(filters.startDate))) return false;
                }
                if (filters.endDate) {
                    if (theTimestampMoment.isAfter(moment(filters.endDate))) return false;
                }
            }
            if (filters.user) {
                if (value.User != filters.user) return false;
            }
            for(let column of filters.columns) {
                let c:any = column as any;
                if (!value.Value[c.name] || value.Value[c.name].indexOf(c.value) == -1) return false;
            }

            return true;
        })
    }

    private static addFormGroup = (parent:Element, name:string, labelText:string, inputType?:string, placeholder?:any, value?:any):HTMLDivElement => {
        let formGroup = document.createElement("div");
        formGroup.className = "form-group";
        let label = document.createElement("label");
        label.setAttribute("for", name);
        label.innerText = labelText;
        formGroup.appendChild(label);
        let input = document.createElement("input");
        input.type = inputType || "text";
        input.className = "form-control";
        input.id = name;
        if (value) input.value = value;
        if (placeholder) input.placeholder = placeholder;
        formGroup.appendChild(input);
        parent.appendChild(formGroup);

        return formGroup;
    }

    private bind(deltas:trc.IDeltaInfo[]):void {
        let viewData = Transformer.transform(deltas);

        let chartsPanel = Blame.addChartsPanel("Charts", this.pluginContainer);
        let chartsContainer = chartsPanel.querySelector(".panel-body");
        
        let dailyData = Blame.createChartData(viewData.dailyEditCounts, "# Edits per Day");
        let dailyChart = this.addBarChart("changedOnDay", dailyData, chartsContainer)

        let userData = Blame.createChartData(viewData.userEditCounts, "# Edits per User");
        let userChart = this.addBarChart("user", userData, chartsContainer);
        
        let fields = viewData.columnValueCounts;

        let skip = ["Comments", "RecId"];
        for(let field in fields) {
            if (skip.indexOf(field)>-1) continue;

            let fieldData = Blame.createChartData(fields[field], field);
            let fieldChart = this.addBarChart(field, fieldData, chartsContainer);
        }

        Blame.addRecordsTable(this.sheetInfo, viewData.records, this.pluginContainer);
    }

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
                if (name in this.filters) {
                    this.filters[name] = model.label;
                } else {
                    this.filters.columns.push({ "name": name, "value": model.label});
                }
                this.render();
            }
        }};

        canvas.onclick = clickHandler(chart);
    }
}