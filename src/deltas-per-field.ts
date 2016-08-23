/// <reference path="../typings/globals/chart.js/index.d.ts" />
import * as trc from "trclib/trc2";

export class DeltasPerField {
    private static FIELDS_WE_CARE_ABOUT:string[] = ["Gender","Party","Supporter","ResultOfContact"];

    static transform(deltas:trc.IDeltaInfo[]):LinearChartData[] {
        let dictionary = deltas.reduce(DeltasPerField.pivot, {});
        let toReturn = new Array<LinearChartData>();

        for(let field in dictionary) {
            let target = DeltasPerField.newBarData(`${DeltasPerField.toTitle(field)} Changes`);
            DeltasPerField.map(dictionary[field], target);
            toReturn.push(target);
        }

        return toReturn;
    }

    private static toTitle(fieldName:string):string {
        switch(fieldName) {
            case "ResultOfContact":
                return "Result of Contact";
            default:
                return fieldName;
        }
    }

    private static pivot(previous:any, current:any) {
        var record = current.Value;
    
        for(let fieldName of DeltasPerField.FIELDS_WE_CARE_ABOUT) {
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
    }

    private static newBarData(title:string):LinearChartData {
        let toReturn:LinearChartData = {"labels":[], "datasets":[{
                "label": title,
                "data":[]
            }]};
        return toReturn;
    }

    private static map(dictionary:any, target:LinearChartData):void {
        for(let key in dictionary) {
            target.labels.push(key || "{empty}");
            let d = target.datasets[0].data as Array<number>; // working around TS
            d.push(dictionary[key]);
        }
    }
}