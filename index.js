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
bot.on('message', async event => {
  let page
  let totalPageNum
  let title = ''
  let nowPage = 1
  if (event.message.type === 'text') {
    try {
      await axios
      .get(`https://cons.judicial.gov.tw/jcc/zh-tw/jep03?interYear=&interNo=&interKeyword=${encodeURI(event.message.text)}&startDate=&endDate=&submit=`)
      .then(function(response){
        const $ = cheerio.load(response.data)
        page = $('.pagination .PagedList-pageCountAndLocation').find('a').text()
        console.log('只有一頁') 
          $('.blocky_body').each((index, element) => {
            const getTitle = $(element).find('a').text()
            title += getTitle
          })
      })
      if(page !== ''){
        console.log('不只一頁')
        totalPageNum = parseInt(/共(\d+)頁/g.exec(page)[1])
        while (nowPage <= totalPageNum) {
          await axios.get(`https://cons.judicial.gov.tw/jcc/zh-tw/jep03?page=${nowPage}&interKeyword=${encodeURI(event.message.text)}`)
          .then(function(response){
            const $ = cheerio.load(response.data)
              console.log(nowPage)
              $('.blocky_body').each((index, element) => {
                const getTitle = $(element).find('a').text()
                title += getTitle
              })
              nowPage++
            }
          )}
      }
      console.log(title, page)
      event.reply(page + title)        
    } catch (error) {
      console.log('發生錯誤')
      console.log(error)
    }
  }
})
