/**
 * 参考：
 * https://cloud.tencent.com/developer/ask/187017
 * https://support.mozilla.org/en-US/kb/bookmarks-firefox#w_how-do-i-find-my-bookmarks
 */

const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')

const historyQuerySql = "SELECT title, url, description FROM moz_places a JOIN moz_historyvisits b on a.id = b.place_id WHERE a.title is not null ORDER BY visit_date DESC;"
const bookMarksQuerySql = "SELECT a.title, b.url, b.description FROM moz_bookmarks a JOIN moz_places b ON a.fk = b.id ORDER BY b.last_visit_date DESC;"

let resultList = []

let getDataPath = new Promise(resolve => {
    // 这里如果不使用 Promise 会导致返回值为 undefined
    mozPath = path.join(process.env.APPDATA, 'Mozilla/Firefox/Profiles')
    fs.readdirSync(mozPath).forEach((ele, index) => {
        if (fs.statSync(path.join(mozPath, ele)).isDirectory) {
            let dbPath = path.join(mozPath, ele, 'places.sqlite')
            if (fs.existsSync(dbPath)) {
                resolve(dbPath)
            }
        }
    })
})

const tryDecodeURI = (URI) => {
    try {
        let str = decodeURI(URI)
        return str
    } catch (err) {
        return URI
    }
}

function getFirefoxData(firefoxDataPath, querySql) {
    let db_sqlite3 = new sqlite3.Database(firefoxDataPath)
    db_sqlite3.all(querySql, (err, rows) => {
        if (err) throw err
        rows.forEach(item => {
            // 防止 item.title 导致插件无法被加载
            if(item.title===null) return;
            resultList.push({
                title: item.title,
                // description: item.description || item.url, // 如果 description 为 null ，就用 url
                description: tryDecodeURI(item.url),
                icon: "./icon.png",
                url: item.url,
                lowcaseTitle: item.title.toLowerCase(),
                lowcaseUrl: item.url.toLowerCase()
            })
        })
    })
    db_sqlite3.close()
}

let searchAction = (action, searchWord, callbackSetList) => {
    searchWord = searchWord.trim()
    let keywords = searchWord.split(' ')

    return callbackSetList(resultList.filter(item => {
        let result = true
        keywords.forEach(key => {
            result = result & (item.lowcaseTitle.includes(key) | item.lowcaseUrl.includes(key))
        })
        return result
    }))
    // 在进行过滤时，使用 title 和 url 进行过滤
}

let selectAction = (action, itemData, callbackSetList) => {
    window.utools.hideMainWindow()
    const url = itemData.url
    require('electron').shell.openExternal(url)
    window.utools.outPlugin()
}

window.exports = {
    "ff_history": {
        mode: "list",
        args: {
            enter: (action, callbackSetList) => {
                resultList = []
                getDataPath.then(path => getFirefoxData(path, historyQuerySql))
            },
            search: searchAction,
            select: selectAction
        }
    },
    "ff_bookmarks": {
        mode: "list",
        args: {
            enter: (action, callbackSetList) => {
                resultList = []
                getDataPath.then(path => getFirefoxData(path, bookMarksQuerySql))
            },
            search: searchAction,
            select: selectAction
        }
    },
    "ff_all": {
        mode: "list",
        args: {
            enter: (action, callbackSetList) => {
                resultList = []
                getDataPath.then(path => {
                    getFirefoxData(path, historyQuerySql)
                    getFirefoxData(path, bookMarksQuerySql)
                })
            },
            search: searchAction,
            select: selectAction
        }
    }
}