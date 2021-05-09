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
  
  let titles = []
  let titleLinks = []

  let dailyNasaImg = {}
  let nasa = ''
  let nowPage = 1

  if (event.message.type === 'text' ) {
    try {
      await axios
      .get(`https://cons.judicial.gov.tw/jcc/zh-tw/jep03?interYear=&interNo=&interKeyword=${encodeURI(event.message.text)}&startDate=&endDate=&submit=`)
      .then(function(response){
        const $ = cheerio.load(response.data)
        page = $('.pagination .PagedList-pageCountAndLocation').find('a').text()
        $("body > div.container.blocky_container.footer_fix > div.container.blocky_container.footer_fix > div > table > tbody > tr > td:nth-child(2)")
        .each(function(index, element){
          titles.push($(element).text().trim())
          titleLinks.push($(element).find('a').attr('href'))
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
              $("body > div.container.blocky_container.footer_fix > div.container.blocky_container.footer_fix > div > table > tbody > tr > td:nth-child(2)")
              .each(function(index, element){
                titles.push($(element).text().trim())
                titleLinks.push($(element).find('a').attr('href'))
              })
              nowPage++
            }
          )}
      }
      let totalData = {}
      function resultLink(){
        titles.forEach(function(item, index){ 
          totalData[titles[index]] = titleLinks[index]
        })
      }
      resultLink()
      let replyStr = ''
      for(let i=0; i<titles.length; i++){
        replyStr += `⚆ ${titles[i]}\n`
      }
      let imgBubble
      if(event.message.text === 'nasa'){
        try{
          await axios.get('https://api.nasa.gov/planetary/apod?api_key=aT15TABGgY6emL35mceWI7HtuZPHQwAagQm0numc')
          .then(function(response){
            // console.log(response.data)
            dailyNasaImg['title'] = response.data.title
            dailyNasaImg['date'] = response.data.date
            dailyNasaImg['explanation'] = response.data.explanation
            dailyNasaImg['url'] = response.data.url
            dailyNasaImg['copyright'] = response.data.copyright
            nasa += `Title: ${dailyNasaImg.title},\n Date: ${dailyNasaImg.date},\n Explanation: ${dailyNasaImg.explanation}, \n Copyright: ${dailyNasaImg.copyright} \n${dailyNasaImg.url}`
          })
          imgBubble = {        
              "type": "flex",
              "altText": "This is NASA daily image",
              "contents":
              {
                "type": "bubble",
                "size": "mega",
                "direction": "ltr",
                "hero": {
                  "type": "image",
                  "url": dailyNasaImg.url,
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
                    "text": dailyNasaImg.title,
                    "weight": "bold",
                    "size": "xl"
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
                          "text": "Detail",
                          "color": "#aaaaaa",
                          "size": "sm",
                          "flex": 1
                        },
                        {
                          "type": "text",
                          "text": dailyNasaImg.explanation,
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
                          "text": "Credit",
                          "color": "#aaaaaa",
                          "size": "sm",
                          "flex": 1,
                          "weight": "regular"
                        },
                        {
                          "type": "text",
                          "text": dailyNasaImg.copyright,
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
                    "label": "WEBSITE",
                    "uri": "https://apod.nasa.gov/apod/astropix.html"
                  }
                },
                {
                  "type": "spacer",
                  "size": "sm"
                }
              ],
              "flex": 0
            },
            "action": {
              "type": "message",
              "label": "action",
              "text": "hello"
            }
            }
          }
        }
        catch(error){
          console.log('nasa 發生錯誤')
          console.log(error)
        }
      }
      switch(event.message.text){
        case 'nasa':
          event.reply(
            imgBubble
          )
          break
        case '阿國':
          event.reply(
            {
              "type": "text",
              "text": '我來啦~~~ε≡ﾍ( ´∀`)ﾉ'
            }
          )
          break
        case '自我介紹':
          event.reply(            
            {
            "type": "text",
            "text": `哈囉~~我叫阿國，\n\n我的創造者之前也是位國考生，在幾次的登陸失敗後，她毅然決然躍入另一個火坑（還好~~不然你們就看不到我了_(:3 」∠ )_)...\n\n她說不管你是已上岸的也好，或是快擱淺了(誤)，儘管我仍有點兩光兩光，但還是希望多少能幫助到你，也謝謝你願意給我這個表現機會！ԅ(¯﹃¯ԅ)\n\n另外，偷偷跟你說，輸入 "nasa" 會有小彩蛋喔！\n\n"我們都是唯一的，像星星一樣，我們都是最好的。"\n　　　　—— 林達陽．暗中發光"`
            }
          )
          break
        default:
          event.reply(
            `🔎 搜尋結果:\n${replyStr}`
          )
      }
      // if(event.message.type === 'text' && event.message.text === 'nasa'){
      //   event.reply(
      //     imgBubble
      //   )
      // }else{
      // event.reply(
      //   `🔎 搜尋結果:\n${replyStr}`
      // )}
      
      }catch (error) {
      console.log('發生錯誤')
      console.log(error)
    }
  }  
})
