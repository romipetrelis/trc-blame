/// <reference path="../typings/globals/chart.js/index.d.ts" />
import * as trc from "trclib/trc2";

export class DeltasToUserChartData {

    static transform(deltas:trc.IDeltaInfo[]):LinearChartData {
        let dictionary = deltas.reduce(DeltasToUserChartData.pivot, {}),
            barData:LinearChartData = {"labels":[], "datasets":[{
                "label": "Edits per User",
                "data":[]
            }]};
        
        DeltasToUserChartData.map(dictionary, barData);

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
        var x = DeltasToUserChartData.determineXValue(current);

        if (!previous[x]) {
        previous[x] = 1;
        } else {
        previous[x]++;
        }
        return previous;
    }
  
    private static determineXValue(value:trc.IDeltaInfo) {
		return value.User;
	}
}