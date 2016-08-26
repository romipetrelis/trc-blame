import * as trc from "trclib/trc2";

export class Transformer {

    static transform(deltas:trc.IDeltaInfo[]):any {
        let viewData = {
            "records": {},
            "dailyEditCounts": {},
            "userEditCounts": {},
            "columnEditCounts": {},
            "columnValueCounts": {},
            "locations": {}
        };        
        return deltas.reduce(Transformer.map, viewData);
    }

    private static map(previous:any, current:trc.IDeltaInfo):any {
        let thisDelta = current;
        let thisValue:trc.ISheetContents = current.Value;
        let recId = thisValue["RecId"][0];
        let deltaDayString = Transformer.toDayString(new Date(thisDelta.Timestamp));
        
        if (!previous.records[recId]) previous.records[recId] = {};
        var thisRecord = previous.records[recId];
        
        if (!previous.userEditCounts[thisDelta.User]) previous.userEditCounts[thisDelta.User] = 0; 
        var userEditCounts = previous.userEditCounts;
        
        if (!previous.dailyEditCounts[deltaDayString]) previous.dailyEditCounts[deltaDayString] = 0;
        var dailyEditCounts = previous.dailyEditCounts;
        
        if (thisDelta.GeoLat && thisDelta.GeoLong) {
            // update location edit counter
            var locationKey = "".concat(thisDelta.GeoLat, thisDelta.GeoLong);
            if (!previous.locations[locationKey]) {
                previous.locations[locationKey] = { "count": 0 };            
                previous.locations[locationKey]["coords"] = {"geoLat": thisDelta.GeoLat, "geoLong": thisDelta.GeoLong};
            }
            previous.locations[locationKey]["count"]++;        
        }
        
        // loop thru columns in this delta
        for(let columnName in thisValue) {
            if(columnName === "RecId") continue;
            
            if (!thisRecord[columnName]) {
                thisRecord[columnName] = {
                    "currentValue": "",                
                    "changeHistory": [],
                    "changeHistoryCount": 0
                }
            }
            
            // assumes that the results are in ascending order, where the last 
            // change is the most recent change and is, therefore, the current value
            var columnValue = thisValue[columnName][0];
            thisRecord[columnName]["currentValue"] = columnValue;
            let historyItem = Transformer.toHistoryItem(thisDelta, columnValue, deltaDayString);
            thisRecord[columnName].changeHistory.push(historyItem);
            thisRecord[columnName]["changeHistoryCount"]++;
            
            // update user edit counter
            userEditCounts[thisDelta.User]++;
            
            // update column edit counter
            if (!previous.columnEditCounts[columnName]) previous.columnEditCounts[columnName] = 0;
            var columnEditCounts = previous.columnEditCounts;
            columnEditCounts[columnName]++;

            // update column value counter
            if (!previous.columnValueCounts[columnName]) previous.columnValueCounts[columnName] = {};
            var columnValueCounts = previous.columnValueCounts[columnName];
            if (!columnValueCounts[columnValue]) columnValueCounts[columnValue] = 0;
            columnValueCounts[columnValue]++;
            
            // update daily edit counter
            dailyEditCounts[deltaDayString]++;
        }
        
        return previous;
    }

    private static toHistoryItem(delta:trc.IDeltaInfo, columnValue:any, deltaDayString:string) {
        return {
        "version" : delta.Version,
        "user": delta.User,
        "changedOn": delta.Timestamp,
        "changedOnDay": deltaDayString,
        "geoLat": delta.GeoLat,
        "geoLong": delta.GeoLong,
        "userIp": delta.UserIp,
        "app": delta.App,
        "value": columnValue
        };
    }

    private static toDayString(dateValue:Date) {
        var theYear = dateValue.getFullYear(),
            theMonth = dateValue.getMonth() + 1,
            theDay = dateValue.getDate();
        return `${theYear}-${theMonth}-${theDay}`;
    }
}
