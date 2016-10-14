/// <reference path="../typings/modules/bluebird/index.d.ts" />
import * as trc from "trclib/trc2";
import * as Promise from "bluebird";

export class TrcHelper {
    public static getInfo(sheet:trc.Sheet):Promise<trc.ISheetInfoResult>  {
        return new Promise<trc.ISheetInfoResult>((resolve:any,reject:any)=> {
            sheet.getInfo(resolve);
        });
    }
}
