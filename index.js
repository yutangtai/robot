import linebot from 'linebot'
import dotenv from 'dotenv'
import axios from 'axios'
import cheerio from 'cheerio'
// 讓套件讀取 .env 檔案
// 讀取後可以用 process.env.變數 使用
dotenv.config()

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
})
bot.listen('/', process.env.PORT, () => {
  console.log('機器人啟動')
})
/*
/共(\d+)頁/g.exec('第7頁 / 共41頁')
(2) ["共41頁", "41", index: 6, input: "第7頁 / 共41頁", groups: undefined]
0: "共41頁"
1: "41"
groups: undefined
index: 6
input: "第7頁 / 共41頁"
length: 2
__proto__: Array(0)
*/
/*
  /釋字第(\d+)號/g.exec('釋字第802號')
  (2) ["釋字第802號", "802", index: 0, input: "釋字第802號", groups: undefined]
  0: "釋字第802號"
  1: "802"groups: undefined
  index: 0
  input: "釋字第802號"
  length: 2
  __proto__: Array(0)
*/
bot.on('message', async event => {
  let page
  let totalPageNum
  let title = ''
  let titleLink = ''
  let dailyNasaImg = {}
  let nasa = ''
  let nowPage = 1
  let nasaDetail = [{
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": `${dailyNasaImg['url']}`,
      "size": "full",
      "aspectRatio": "20:13",
      "aspectMode": "cover",
      "action": {
        "type": "uri",
        "uri": "http://linecorp.com/"
      }
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "APOD",
          "weight": "bold",
          "size": "xl"
        },
        {
          "type": "box",
          "layout": "baseline",
          "margin": "md",
        },
        {
          "type": "box",
          "layout": "vertical",
          "margin": "lg",
          "spacing": "sm",
          "contents": [
            {
              "type": "box",
              "layout": "baseline",
              "spacing": "sm",
              "contents": [
                {
                  "type": "text",
                  "text": "Date",
                  "color": "#aaaaaa",
                  "size": "sm",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": `${dailyNasaImg['date']}`,
                  "wrap": true,
                  "color": "#666666",
                  "size": "sm",
                  "flex": 5
                }
              ]
            },
            {
              "type": "box",
              "layout": "baseline",
              "spacing": "sm",
              "contents": [
                {
                  "type": "text",
                  "text": "Explanation",
                  "color": "#aaaaaa",
                  "size": "sm",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": `${dailyNasaImg['explanation']}`,
                  "wrap": true,
                  "color": "#666666",
                  "size": "sm",
                  "flex": 5
                }
              ]
            }
          ]
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "style": "link",
          "height": "sm",
          "action": {
            "type": "uri",
            "label": "CALL",
            "uri": "https://linecorp.com"
          }
        },
        {
          "type": "button",
          "style": "link",
          "height": "sm",
          "action": {
            "type": "uri",
            "label": "WEBSITE",
            "uri": "https://linecorp.com"
          }
        },
        {
          "type": "spacer",
          "size": "sm"
        }
      ],
      "flex": 0
    }
  }]
  if (event.message.type === 'text') {
    try {
      await axios
      .get(`https://cons.judicial.gov.tw/jcc/zh-tw/jep03?interYear=&interNo=&interKeyword=${encodeURI(event.message.text)}&startDate=&endDate=&submit=`)
      .then(function(response){
        const $ = cheerio.load(response.data)
        page = $('.pagination .PagedList-pageCountAndLocation').find('a').text()
          $('.blocky_body').each((index, element) => {
            const getTitle = $(element).find('a').text()
            title += getTitle
          })
      })
      if(page !== ''){
        console.log(page)
        totalPageNum = parseInt(/共(\d+)頁/g.exec(page)[1])
        while (nowPage <= totalPageNum) {
          await axios.get(`https://cons.judicial.gov.tw/jcc/zh-tw/jep03?page=${nowPage}&interKeyword=${encodeURI(event.message.text)}`)
          .then(function(response){
            const $ = cheerio.load(response.data)
              console.log(nowPage)
              $('.blocky_body').each((index, element) => {
                const getTitle = `${$(element).find('a').text()}\n`
                const link = $(element).contents('a')
                console.log(getTitle)
                console.log(titleLink)
                title += getTitle
                titleLink += link
              })
              nowPage++
            }
          )}
      }
      await axios.get('https://api.nasa.gov/planetary/apod?api_key=aT15TABGgY6emL35mceWI7HtuZPHQwAagQm0numc')
      .then(function(response){
        console.log(response.data)
        dailyNasaImg['title'] = response.data.title
        dailyNasaImg['date'] = response.data.date
        dailyNasaImg['explanation'] = response.data.explanation
        dailyNasaImg['url'] = response.data.url
        dailyNasaImg['copyright'] = response.data.copyright
        nasa += `Title: ${dailyNasaImg.title},\n Date: ${dailyNasaImg.date},\n Explanation: ${dailyNasaImg.explanation}, \n Copyright: ${dailyNasaImg.copyright} \n${dailyNasaImg.url}`
      })
      console.log(title)
      event.reply(nasa)        
    } catch (error) {
      console.log('發生錯誤')
      console.log(error)
    }
  }
})
