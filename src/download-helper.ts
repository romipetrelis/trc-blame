import * as trc from "trclib/trc2";
export class DownloadHelper {
    public static appendDownloadCsvButton = (parent:Element, getData:()=>trc.ISheetContents) => {
        let button = document.createElement("input");
        button.type = "image";
        button.src = "https://trcanvasdata.blob.core.windows.net/publicimages/export-csv.png";
        button.addEventListener("click", (e)=> {
            let data = getData() as any;
            let colKeys = Object.keys(data);
            let grid = [];
            let rowCount = data[colKeys[0]].length;
            let index = 0;

            grid.push(colKeys);

            while (index < rowCount) {
                let row = [];
                for(let colKey of colKeys) {
                    let colValue = data[colKey][index] && data[colKey][index].hasOwnProperty("currentValue") ? data[colKey][index].currentValue : data[colKey][index];
                    row.push(colValue);
                }
                grid.push(row);
                index++;
            }

            let content = "";

            grid.forEach((arr, index) => {
                let row = arr.join(",");
                content += index < grid.length ? row + "\r\n" : row;                 
            });

            if (window.navigator.msSaveBlob) {
                console.debug("using msSaveBlob");
                window.navigator.msSaveBlob(new Blob([content], {type:"text/csv;charset=utf-8;"}), "data.csv");
            } else {            
                console.debug("using download attr");
                let uri = encodeURI("data:text/csv;charset=utf-8," + content);
                var link = document.createElement("a");
                link.setAttribute("href", uri);
                link.setAttribute("download", "data.csv");
                parent.appendChild(link);
                link.click();
            }
      });
      parent.appendChild(button);
    }
}