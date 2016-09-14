import * as trc from "trclib/trc2";
export class DownloadHelper {
    public static appendDownloadCsvButton = (parent:Element, getData:()=>trc.ISheetContents) => {
        let button = document.createElement("input");
        button.type = "image";
        button.src = "https://trcanvasdata.blob.core.windows.net/publicimages/export-csv.png";
        button.addEventListener("click", (e)=> {
            let data = getData();
            let colKeys = Object.keys(data);
            let grid = [];
            let rowCount = data[colKeys[0]].length;
            let index = 0;

            grid.push(colKeys);

            while (index < rowCount) {
                let row = [];
                for(let colKey of colKeys) {
                    row.push(data[colKey][index]);
                }
                grid.push(row);
                index++;
            }

            let content = "data:text/csv;charset=utf-8,";
            grid.forEach((arr, index) => {
                let row = arr.join(",");
                content += index < grid.length ? row + "\r\n" : row;                 
            });

            console.log(data);

            let uri = encodeURI(content);
            var link = document.createElement("a");
            link.setAttribute("href", uri);
            link.setAttribute("download", "data.csv");
            parent.appendChild(link);
            link.click();
      });
      parent.appendChild(button);
    }
}