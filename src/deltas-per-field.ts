/// <reference path="../typings/globals/chart.js/index.d.ts" />
import * as trc from "trclib/trc2";

export class DeltasPerField {
    private deltas:trc.IDeltaInfo[];
    private columns:trc.IColumnInfo[];
    private fieldsWeCareAbout:string[];
    private static FIELDS_TO_IGNORE:string[] = ["Comments", "RecId"];

    constructor(deltas:trc.IDeltaInfo[], columns:trc.IColumnInfo[]) {
        this.deltas = deltas;
        this.columns = columns;
        this.fieldsWeCareAbout = columns.reduce(DeltasPerField.columnNamesReducer, []);
    }

    private static columnNamesReducer(previous:string[], current:trc.IColumnInfo) {
        let toReturn = previous.slice(0);
        let thisColumn = current.Name;
        
        console.log(current);
        if (DeltasPerField.FIELDS_TO_IGNORE.indexOf(thisColumn) >= 0) return toReturn;

        toReturn.push(current.Name);
        return toReturn;
    }

    transform():LinearChartData[] {
        let dictionary = this.deltas.reduce(this.pivot, {});
        let toReturn = new Array<LinearChartData>();
        
        for(let field in dictionary) {
            let target = DeltasPerField.newBarData(`${this.findColumnName(field)} Changes`);
            DeltasPerField.map(dictionary[field], target);
            toReturn.push(target);
        }

        return toReturn;
    }

    private pivot = (previous:any, current:any) => { //instance arrow function preserves 'this' in callback
        let record = current.Value;
        
        for(let fieldName of this.fieldsWeCareAbout) {
            if (fieldName in record) {
                if (!previous[fieldName]) {
                    previous[fieldName] = {};
                }
                let fieldValues = record[fieldName];
                for(let fieldValue of fieldValues) {
                    if (!previous[fieldName][fieldValue]) {
                        previous[fieldName][fieldValue] = 1;
                    } else {
                        previous[fieldName][fieldValue]++;
                    }
                }
            }
        }
        return previous;
    };

    private findColumnName(field:string):string {
        for(let col of this.columns) {
            if (col.Name == field) {
                return col.DisplayName;
            }
        }
        return "";
    }

    private static map(dictionary:any, target:LinearChartData):void {
        for(let key in dictionary) {
            target.labels.push(key || "{empty}");
            let d = target.datasets[0].data as Array<number>; // working around TS
            d.push(dictionary[key]);
        }
    }    

    private static newBarData(title:string):LinearChartData {
        let toReturn:LinearChartData = {"labels":[], "datasets":[{
                "label": title,
                "data":[]
            }]};
        return toReturn;
    }
}