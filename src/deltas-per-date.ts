/// <reference path="../typings/globals/chart.js/index.d.ts" />
import * as trc from "trclib/trc2";

export class DeltasPerDate {

    static transform(deltas:trc.IDeltaInfo[]):LinearChartData {
        let dictionary = deltas.reduce(DeltasPerDate.pivot, {}),
            barData:LinearChartData = {"labels":[], "datasets":[{
                "label": "Deltas by Date",
                "data":[]
            }]};
        
        DeltasPerDate.map(dictionary, barData);

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
        var x = DeltasPerDate.determineXValue(current);

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