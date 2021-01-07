const sqlite3 = require('sqlite3').verbose()
const path = require('path')
let fs = require('fs')

let dataCache = null

let getDataPath = new Promise(function (resolve) {
    // 这里如果不实用 Promise 会导致返回值为 undefined
    mozPath = path.join(process.env.APPDATA, 'Mozilla/Firefox/Profiles')
    fs.readdirSync(mozPath).forEach(function (ele, index) {
        if (fs.statSync(path.join(mozPath, ele)).isDirectory) {
            let dbPath = path.join(mozPath, ele, 'places.sqlite')
            if (fs.existsSync(dbPath)) {
                resolve(dbPath)
            }
        }
    })
})

function getFirefoxData(firefoxDataPath) {
    // 一般来说 ff 历史记录保持在 "%appdata%/Mozilla/Firefox/Profiles/.*/places.sqlite中"
    let ffData = [];
    let db_sqlite3 = new sqlite3.Database(firefoxDataPath)
    db_sqlite3.all("SELECT title, url, description, visit_date FROM moz_places a JOIN moz_historyvisits b on a.id = b.id WHERE a.title is not null ORDER BY visit_date DESC;", function (err, rows) {
        // 这里按时间进行排序，时间近的排在前面
        if (err) throw err;
        rows.forEach(c => {
            ffData.push({
                title: c.title,
                description: c.description || c.url, // 如果 description 为 null ，就用 url
                icon: "./icon.png",
                url: c.url,
                lowcaseTitle: c.title.toLowerCase(),
                visitDate: c.visit_date // 访问的时间
            })
        })
    })
    db_sqlite3.close()
    dataCache = ffData
}

window.exports = {
    "ff_history": {
        mode: "list",
        args: {
            enter: (action, callbackSetList) => {
                getDataPath.then(function (el) {
                    getFirefoxData(el)
                    return callbackSetList(dataCache)
                })
            },
            search: (action, searchWord, callbackSetList) => {
                searchWord = searchWord.trim()
                return callbackSetList(dataCache.filter(x => x.lowcaseTitle.includes(searchWord) | x.url.includes(searchWord)))
                // 在进行过滤时，使用 title 和 url 进行过滤
            },
            select: (action, itemData, callbackSetList) => {
                window.utools.hideMainWindow()
                const url = itemData.url
                require('electron').shell.openExternal(url)
                window.utools.outPlugin()
            }
        }
    }
}