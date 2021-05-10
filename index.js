import linebot from 'linebot'
import dotenv from 'dotenv'
import axios from 'axios'
import cheerio from 'cheerio'
import line from '@line/bot-sdk'

const client = new line.Client({
  channelAccessToken:
    '0PVC5v3GXKU5BKqsdLywm6UbeVYi12E3c2rJ+ETS9+TYz552NyoTHsiPqJzVQ/ELFIu2OThkdtASihFb0wCYAXZWdgEESzuncvGMvQsyDGccwlKyeDBZxbJH6GtioqEdq79US+VhdU2r+vr7GdosawdB04t89/1O/w1cDnyilFU='
})

const richmenu = {
  size: {
    width: 2500,
    height: 1686
  },
  selected: false,
  name: 'Nice richmenu',
  chatBarText: '主選單',
  areas: [
    {
      bounds: {
        x: 0,
        y: 0,
        width: 2500,
        height: 1686
      },
      action: {
        type: 'postback',
        data: 'action=buy&itemid=123'
      }
    }
  ]
}
client.createRichMenu(richmenu).then(richMenuId => console.log(richMenuId))

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
  (2)["釋字第802號", "802", index: 0, input: "釋字第802號", groups: undefined]
  0: "釋字第802號"
  1: "802"groups: undefined
  index: 0
  input: "釋字第802號"
  length: 2
  __proto__: Array(0)
*/
bot.on('message', async event => {
  // 直接輸入 EXXX 所需變數-------------->
  let userTypeStr = event.message.text
  let userTypeArr = userTypeStr.split('')
  let userTypeNumStr = ''
  let finalNum
  let expnoResponse = {}
  function exponNum() {
    userTypeArr.splice(0, 1)
    for (let i = 0; i < userTypeArr.length; i++) {
      userTypeNumStr += userTypeArr[i]
      finalNum = parseInt(userTypeNumStr)
    }
  }
  exponNum()

  // 直接輸入關鍵字所需變數------------->
  let page
  let nowPage = 1
  let totalPageNum

  let titles = []
  let titleLinks = []

  // 直接輸入'nasa'所需變數 -------------->
  let dailyNasaImg = {}
  let nasa = ''

  if (event.message.type === 'text') {
    try {
      // 輸入關鍵字----------------------->
      await axios
        .get(`https://cons.judicial.gov.tw/jcc/zh-tw/jep03?interYear=&interNo=&interKeyword=${encodeURI(event.message.text)}&startDate=&endDate=&submit=`)
        .then(function (response) {
          const $ = cheerio.load(response.data)
          page = $('.pagination .PagedList-pageCountAndLocation').find('a').text()
          $('body > div.container.blocky_container.footer_fix > div.container.blocky_container.footer_fix > div > table > tbody > tr > td:nth-child(2)').each(
            function (index, element) {
              titles.push($(element).text().trim())
              titleLinks.push($(element).find('a').attr('href'))
            }
          )
        })
      if (page !== '') {
        console.log(page)
        totalPageNum = parseInt(/共(\d+)頁/g.exec(page)[1])
        while (nowPage <= totalPageNum) {
          await axios
            .get(`https://cons.judicial.gov.tw/jcc/zh-tw/jep03?page=${nowPage}&interKeyword=${encodeURI(event.message.text)}`)
            .then(function (response) {
              const $ = cheerio.load(response.data)
              console.log(nowPage)
              $(
                'body > div.container.blocky_container.footer_fix > div.container.blocky_container.footer_fix > div > table > tbody > tr > td:nth-child(2)'
              ).each(function (index, element) {
                titles.push($(element).text().trim())
                titleLinks.push($(element).find('a').attr('href'))
              })
              nowPage++
            })
        }
      }
      let totalData = {}
      function resultLink() {
        titles.forEach(function (item, index) {
          totalData[titles[index]] = titleLinks[index]
        })
      }
      resultLink()
      let replyStr = ''
      for (let i = 0; i < titles.length; i++) {
        replyStr += `⚆ ${titles[i]}\n`
      }
      // 輸入 'Exxx' 字串---------------------------->
      let exponBubble
      if (event.message.text === `E${finalNum}`) {
        await axios.get(`https://cons.judicial.gov.tw/jcc/zh-tw/jep03/show?expno=${finalNum}`).then(function (response) {
          const $ = cheerio.load(response.data)
          expnoResponse.interpretation = $('#preExpTitle').text()
          expnoResponse.argument = `　　${$('#secEleven > div.content.pure_text > pre').text()}`
          expnoResponse.critique = $('#secOne > div.content.pure_text > ul > li > pre').text()
          expnoResponse.link = `https://cons.judicial.gov.tw/jcc/zh-tw/jep03/show?expno=${finalNum}`
          let inteArr
          let newInteStr = ''
          if (expnoResponse.interpretation.split('').length > 7) {
            function newInterpretationStr() {
              inteArr = expnoResponse.interpretation.split('')
              inteArr.splice(0, 7)
              console.log(inteArr)
              for (let i = 0; i < inteArr.length; i++) {
                newInteStr += inteArr[i]
              }
            }
            newInterpretationStr()
          } else {
            newInteStr += '--------'
          }
          console.log(expnoResponse)
          exponBubble = {
            type: 'flex',
            altText: 'This is expon box!',
            contents: {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: `🚩 釋字第 ${finalNum} 號`,
                    weight: 'bold',
                    size: 'xl'
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    margin: 'md',
                    contents: [
                      {
                        type: 'text',
                        text: newInteStr,
                        size: 'md',
                        color: '#5B5B5B',
                        margin: 'none',
                        flex: 0,
                        weight: 'bold',
                        wrap: true
                      }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'lg',
                    spacing: 'sm',
                    contents: [
                      {
                        type: 'box',
                        layout: 'baseline',
                        spacing: 'sm',
                        contents: [
                          {
                            type: 'text',
                            text: '爭點',
                            color: '#aaaaaa',
                            size: 'sm',
                            flex: 1
                          },
                          {
                            type: 'text',
                            text: expnoResponse.argument,
                            wrap: true,
                            color: '#666666',
                            size: 'sm',
                            flex: 5
                          }
                        ]
                      },
                      {
                        type: 'box',
                        layout: 'baseline',
                        spacing: 'sm',
                        contents: [
                          {
                            type: 'text',
                            text: '解釋文',
                            color: '#aaaaaa',
                            size: 'sm',
                            flex: 1
                          },
                          {
                            type: 'text',
                            text: expnoResponse.critique,
                            wrap: true,
                            color: '#666666',
                            size: 'sm',
                            flex: 5
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  {
                    type: 'button',
                    style: 'link',
                    height: 'sm',
                    action: {
                      type: 'uri',
                      label: '理由書',
                      uri: expnoResponse.link
                    }
                  },
                  {
                    type: 'spacer',
                    size: 'sm'
                  }
                ],
                flex: 0
              }
            }
          }
        })
      }
      // 輸入 'nasa'---------------------------->
      let imgBubble
      if (event.message.text === 'nasa') {
        try {
          await axios.get('https://api.nasa.gov/planetary/apod?api_key=aT15TABGgY6emL35mceWI7HtuZPHQwAagQm0numc').then(function (response) {
            // console.log(response.data)
            dailyNasaImg.title = response.data.title
            dailyNasaImg.date = response.data.date
            dailyNasaImg.explanation = response.data.explanation
            dailyNasaImg.url = response.data.url
            dailyNasaImg.copyright = response.data.copyright
            nasa += `Title: ${dailyNasaImg.title},\n Date: ${dailyNasaImg.date},\n Explanation: ${dailyNasaImg.explanation}, \n Copyright: ${dailyNasaImg.copyright} \n${dailyNasaImg.url}`
          })
          imgBubble = {
            type: 'flex',
            altText: 'This is NASA daily image',
            contents: {
              type: 'bubble',
              size: 'mega',
              direction: 'ltr',
              hero: {
                type: 'image',
                url: dailyNasaImg.url,
                size: 'full',
                aspectRatio: '20:13',
                aspectMode: 'cover',
                action: {
                  type: 'uri',
                  uri: 'http://linecorp.com/'
                }
              },
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: dailyNasaImg.title,
                    weight: 'bold',
                    size: 'xl'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'lg',
                    spacing: 'sm',
                    contents: [
                      {
                        type: 'box',
                        layout: 'baseline',
                        spacing: 'sm',
                        contents: [
                          {
                            type: 'text',
                            text: 'Detail',
                            color: '#aaaaaa',
                            size: 'sm',
                            flex: 1
                          },
                          {
                            type: 'text',
                            text: dailyNasaImg.explanation,
                            wrap: true,
                            color: '#666666',
                            size: 'sm',
                            flex: 5
                          }
                        ]
                      },
                      {
                        type: 'box',
                        layout: 'baseline',
                        spacing: 'sm',
                        contents: [
                          {
                            type: 'text',
                            text: 'Credit',
                            color: '#aaaaaa',
                            size: 'sm',
                            flex: 1,
                            weight: 'regular'
                          },
                          {
                            type: 'text',
                            text: dailyNasaImg.copyright,
                            wrap: true,
                            color: '#666666',
                            size: 'sm',
                            flex: 5
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  {
                    type: 'button',
                    style: 'link',
                    height: 'sm',
                    action: {
                      type: 'uri',
                      label: 'WEBSITE',
                      uri: 'https://apod.nasa.gov/apod/astropix.html'
                    }
                  },
                  {
                    type: 'spacer',
                    size: 'sm'
                  }
                ],
                flex: 0
              },
              action: {
                type: 'message',
                label: 'action',
                text: 'hello'
              }
            }
          }
        } catch (error) {
          console.log('nasa 發生錯誤')
          console.log(error)
        }
      }
      switch (event.message.text) {
        case `E${finalNum}`:
          event.reply(exponBubble)
          break
        case 'nasa':
          event.reply(imgBubble)
          break
        case '阿國':
          event.reply({
            type: 'text',
            text: '我來啦~~~ε≡ﾍ( ´∀`)ﾉ'
          })
          break
        case '自我介紹':
          event.reply({
            type: 'text',
            text:
              '哈囉~~我叫阿國，\n\n我的創造者之前也是位國考生，在幾次的登陸失敗後，她毅然決然地躍入另一個火坑（還好~~不然你們就看不到我了_(:3 」∠ )_)...\n\n她說不管你是已上岸的也好，或是快擱淺了(誤)，儘管我仍有點兩光兩光，但還是希望多少能幫助到你，也謝謝你願意給我這個表現機會！ԅ(¯﹃¯ԅ)\n\n另外，偷偷跟你說，輸入 "nasa" 會有小彩蛋喔！\n\n最後，送你我很喜歡的一句話：\n「我們都是唯一的，像星星一樣，我們都是最好的。」(林達陽．暗中發光)\n\nHave a nice day!(*´∀`)~♥'
          })
          break
        default:
          event.reply(`🔎 搜尋結果:\n${replyStr}`)
      }
    } catch (error) {
      console.log('發生錯誤')
      console.log(error)
    }
  }
})
