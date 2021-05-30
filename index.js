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
(2)["釋字第802號", "802", index: 0, input: "釋字第802號", groups: undefined]
0: "釋字第802號"
1: "802"groups: undefined
index: 0
input: "釋字第802號"
length: 2
__proto__: Array(0)
*/
// 選單四大選項狀態
let expoOpen = false;
let lawOpen = false;

// 法條查詢-四大法典狀態
let xianfaOpen = false;
let mingfaOpen = false;
let shinfaOpen = false;
let shinzenfaOpen = false;
// 釋字查詢--------------------------------------------------->
const expoMode = async(event) =>{
  let userTypeStr = event.message.text;
  let userTypeNumStr = exponNum(event);
  let page;
  let nowPage = 1;
  let totalPageNum;
  
  let titles = [];
  let titleLinks = [];
  let replyStr = '';
    // 直接輸入數字---------------------------------->
    let expnoResponse = {};    
    let exponBubble;
    if(!isNaN(parseInt(userTypeStr))){
      await axios.get(`https://cons.judicial.gov.tw/jcc/zh-tw/jep03/show?expno=${userTypeStr}`).then(function (response) {
        const $ = cheerio.load(response.data);
        expnoResponse.interpretation = $('#preExpTitle').text()
        expnoResponse.argument = `　　${$('#secEleven > div.content.pure_text > pre').text()}`
        expnoResponse.critique = $('#secOne > div.content.pure_text > ul > li > pre').text()
        expnoResponse.link = `https://cons.judicial.gov.tw/jcc/zh-tw/jep03/show?expno=${userTypeStr}`
        let inteArr;
        let newInteStr = '';
      if (expnoResponse.interpretation.split('').length > 7) {
        function newInterpretationStr() {
          inteArr = expnoResponse.interpretation.split('');
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
                text: `🚩 釋字第 ${userTypeStr} 號`,
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
  // 輸入 'E + 關鍵字'---------------------------->  
  if(userTypeStr === `E${userTypeNumStr}`){    
    await axios
    .get(`https://cons.judicial.gov.tw/jcc/zh-tw/jep03?interYear=&interNo=&interKeyword=${encodeURI(userTypeNumStr)}&startDate=&endDate=&submit=`)
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
      // 搜尋結果不止一頁
      if (page !== '') {
        console.log(page)
        totalPageNum = parseInt(/共(\d+)頁/g.exec(page)[1])
        while (nowPage <= totalPageNum) {
          await axios
          .get(`https://cons.judicial.gov.tw/jcc/zh-tw/jep03?page=${nowPage}&interKeyword=${encodeURI(userTypeNumStr)}`)
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
    //整裡字串 
    for (let i = 0; i < titles.length; i++) {
      replyStr += `⚆ ${titles[i]}\n`
    }
    event.reply(`🔎 搜尋結果:\n${replyStr}`);
  }else{
    event.reply(exponBubble);
  } 
}       
// E 字串切割
function exponNum(event) {
  let userTypeStr = event.message.text;
  let userTypeArr = userTypeStr.split('');
  userTypeArr.splice(0, 1);
  let userTypeNumStr = '';
  for (let i = 0; i < userTypeArr.length; i++) {
    userTypeNumStr += userTypeArr[i];
  }
  return userTypeNumStr;
}

// 法條查詢---------------------------------------------------->
function lawClassfication(event){
  let xianfaSearchResult;
  let mingfaSearchResult;
  let shinfaSearchResult;
  let shinzenfaSearchResult;

  if(xianfaOpen){
    console.log('xianfaOpen');
    xianfaSearchResult = xianfaMode(event);
  }else if(mingfaOpen){
    console.log('mingfaOpen');
    mingfaSearchResult = mingfaMode(event);
  }else if(shinfaOpen){
    console.log('shinfaOpen');
    shinfaSearchResult = shinfaMode(event);
  }else if(shinzenfaOpen){
    console.log('shinzenfaOpen');
    shinzenfaSearchResult = shinzenfaMode(event);
  }else{
    if(event.message.text === '我想要查憲法'){
      console.log('進入憲法');
      xianfaOpen = true;
      mingfaOpen = false;
      shinfaOpen = false;
      shinzenfaOpen = false;
    }else if(event.message.text === '我想要查民法'){
      console.log('進入民法');
      xianfaOpen = false;
      mingfaOpen = true;
      shinfaOpen = false;
      shinzenfaOpen = false;
    }else if(event.message.text === '我想要查刑法'){
      console.log('進入刑法');
      xianfaOpen = false;
      mingfaOpen = false;
      shinfaOpen = true;
      shinzenfaOpen = false;
    }else if(event.message.text === '我想要查行政程序法'){
      console.log('進入行政法');
      xianfaOpen = false;
      mingfaOpen = false;
      shinfaOpen = false;
      shinzenfaOpen = true;
    }
  }
}
// 輸入字串處理
function strToArr(event){
  let searchLawUserType = event.message.text;
  let searchLawUserTypeArr = searchLawUserType.split('');
  let searchNewStr = '';
  if(searchLawUserType.includes('K')){
    searchLawUserTypeArr.splice(0,1);
    for(let i=0; i<searchLawUserTypeArr.length; i++){
      searchNewStr += searchLawUserTypeArr[i];
    }
    return searchNewStr;
  }
  return searchLawUserTypeArr;
}
// 撈網頁資料
const getDataInfo = async(event, url) => {
  let lawArr = [];
  let lawShowUser = '';
  await axios
    .get(url)
    .then(res => {
      const $ = cheerio.load(res.data);
      $('#pnLawFla > div > .row').each(function(index, element) {
        lawArr.push($(element).find('.col-no').text() + '\n' + $(element).find('.col-data').text() + '\n');
      })
      for(let i=0; i<lawArr.length; i++){
        lawShowUser += `🔸${lawArr[i]}\n`
      }
      console.log(lawShowUser);
      event.reply(`🔎 搜尋結果:\n\n${lawShowUser}`);
    })
}
// 憲法查詢
const xianfaMode = async(event) => {
  let keyword = strToArr(event);
  console.log('keyword',keyword);  
  let searchLawUserType = event.message.text;
  if(keyword.includes(',') || keyword.includes('-') || keyword.includes('.')){
    getDataInfo(event, `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=A0000001&norge=${encodeURI(searchLawUserType)}`);
  }else if(searchLawUserType.includes('K')){
    getDataInfo(event, `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=A0000001&kw1=${encodeURI(keyword)}}`);
  }else{
    getDataInfo(event, `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=A0000001&norge=${encodeURI(searchLawUserType)}`);
  }
}
//民法查詢
const mingfaMode = async(event) => {
  let keyword = strToArr(event);
  console.log('keyword',keyword);  
  let searchLawUserType = event.message.text;
  if(keyword.includes(',') || keyword.includes('-') || keyword.includes('.')){
    getDataInfo(event, `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=B0000001&norge=${encodeURI(searchLawUserType)}`);
  }else if(searchLawUserType.includes('K')){
    getDataInfo(event, `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=B0000001&kw1=${encodeURI(keyword)}`);
  }else{
    getDataInfo(event, `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=B0000001&norge=${encodeURI(searchLawUserType)}`);
  }
}
//刑法查詢
const shinfaMode = async(event) => {
  let keyword = strToArr(event);
  console.log('keyword',keyword);  
  let searchLawUserType = event.message.text;
  if(keyword.includes(',') || keyword.includes('-') || keyword.includes('.')){
    getDataInfo(event, `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=C0000001&norge=${encodeURI(searchLawUserType)}`);
  }else if(searchLawUserType.includes('K')){
    getDataInfo(event, `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=C0000001&kw1=${encodeURI(keyword)}`);
  }else{
    getDataInfo(event, `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=C0000001&norge=${encodeURI(searchLawUserType)}`);
  }
}
// 行政程序法
const shinzenfaMode = async(event) => {
  let keyword = strToArr(event);
  console.log('keyword',keyword);  
  let searchLawUserType = event.message.text;
  if(keyword.includes(',') || keyword.includes('-') || keyword.includes('.')){
    getDataInfo(event, `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=A0030055&norge=${encodeURI(searchLawUserType)}`);
  }else if(searchLawUserType.includes('K')){
    getDataInfo(event, `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=A0030055&kw1=${encodeURI(keyword)}`);
  }else{
    getDataInfo(event, `https://law.moj.gov.tw/LawClass/LawSearchContent.aspx?pcode=A0030055&norge=${encodeURI(searchLawUserType)}`);
  }
}

bot.on('message', async event => {
  let replyStr = '';

  // quickReply 所需變數 ---------------->
  let newsQuickReply = {
    "type": "text", 
    "text": "來！想要看什麼自己選 σ`∀´)σ",
    "quickReply": {
      "items": [
        {
          "type": "action",
          "action": {
            "type": "uri",
            "label": "🔨司法院大法官",
            "uri": "https://cons.judicial.gov.tw/jcc/zh-tw"
          }
        },
        {
          "type": "action",
          "action": {
            "type": "uri",
            "label": "📐全國法規資料庫",
            "uri": "https://law.moj.gov.tw/News/NewsList.aspx"
          }
        }
      ]
    }
  };
  let lawQuickReply = {
    "type": "text", 
    "text": "好勒！你想要查哪一部法典呢？",
    "quickReply": {
      "items": [
        {
          "type": "action",
          "action": {
            "type": "message",
            "label": "✔️憲法",
            "text": "我想要查憲法"
          }
        },
        {
          "type": "action",
          "action": {
            "type": "message",
            "label": "✔️民法",
            "text": "我想要查民法"
          }
        },
        {
          "type": "action",
          "action": {
            "type": "message",
            "label": "✔️刑法",
            "text": "我想要查刑法"
          }
        },
        {
          "type": "action",
          "action": {
            "type": "message",
            "label": "✔️行政程序法",
            "text": "我想要查行政程序法"
          }
        }
      ]
    }
  }; 

  // 輸入的文字內容------------------------------------------------------->
  if (event.message.type === 'text') {
    try {
      if(expoOpen){ //釋字查詢
        console.log('expoopen');
        if(event.message.text === '阿國，我想要查法條！'){ 
          expoOpen = false;
          lawOpen = true;
          xianfaOpen = false;
          mingfaOpen = false;
          shinfaOpen = false;
          shinzenfaOpen = false;
          event.reply(lawQuickReply);
        }else{
          replyStr = expoMode(event);
        }
      }else if(lawOpen){ //法條查詢
        console.log('lawopen');
        if(event.message.text === '阿國，我想要查釋字！'){
          lawOpen = false;
          expoOpen = true;
          xianfaOpen = false;
          mingfaOpen = false;
          shinfaOpen = false;
          shinzenfaOpen = false;
        }else if(event.message.text === '阿國，我想要查法條！'){          
          xianfaOpen = false;
          mingfaOpen = false;
          shinfaOpen = false;
          shinzenfaOpen = false;
          event.reply(lawQuickReply);
        }else{
          lawClassfication(event);          
        } 
      }else{  //按鈕開關狀態設定
        if(event.message.text === '阿國，我想要查釋字！'){
          console.log('釋字查詢');
          expoOpen = true;
          lawOpen = false;
        }else if(event.message.text === '阿國，我想要查法條！'){
          console.log('法條查詢');
          expoOpen = false;
          lawOpen = true;

          xianfaOpen = false;
          mingfaOpen = false;
          shinfaOpen = false;
          shinzenfaOpen = false;
          lawQuickReply = {
            "type": "text", 
            "text": "好勒！你想要查哪一部法典呢？",
            "quickReply": {
              "items": [
                {
                  "type": "action",
                  "action": {
                    "type": "message",
                    "label": "✔️憲法",
                    "text": "我想要查憲法"
                  }
                },
                {
                  "type": "action",
                  "action": {
                    "type": "message",
                    "label": "✔️民法",
                    "text": "我想要查民法"
                  }
                },
                {
                  "type": "action",
                  "action": {
                    "type": "message",
                    "label": "✔️刑法",
                    "text": "我想要查刑法"
                  }
                },
                {
                  "type": "action",
                  "action": {
                    "type": "message",
                    "label": "✔️行政程序法",
                    "text": "我想要查行政程序法"
                  }
                }
              ]
            }
          }
        }
      }
      switch (event.message.text) {
        case '阿國':
          event.reply({
            type: 'text',
            text: '我來啦~~~ε≡ﾍ( ´∀`)ﾉ'
          })
          break;
        case '自我介紹':
          event.reply({
            type: 'text',
            text:
              '哈囉~~我是國釋無雙，不過這個名字太假掰，你們可以叫我阿國就好！(๑¯∀¯๑)\n\n我的創造者之前也是位國考生，在幾次的登陸失敗後，她毅然決然地躍入另一個火坑（還好~~不然你們就看不到我了_(:3 」∠ )_)...\n\n她說不管你是已上岸的也好，或是快擱淺了(誤)，儘管我仍有點兩光兩光，但還是希望多少能幫助到你，也謝謝你願意給我這個表現機會！ԅ(¯﹃¯ԅ)\n\n是說，原本我只需要查釋字就好，沒想到因為她覺得我是可造之材，所以又丟了一堆工作給我，說這樣才不會辜負「無雙」二字，不然就要給我改名只叫「國釋」了。･ﾟ･(つд`ﾟ)･ﾟ･\n\n教學期間，我眼看著底下的桌子越來越多裂紋，真是擔心哪天她的手就這麼拍到我身上來，現在思及此依舊心有餘悸(´_ゝ`)\n\n等等，有人在敲門，我去瞧瞧...'
          })
          break;
        case '阿國，跟我說說這裡的規矩吧！':
          event.reply({
            type: 'text',
            text: 
              `好勒~仔細聽好囉！(ゝ∀･)b\n\n1️⃣ 先選擇模式\n    🔸釋字查詢\n    🔸最新資訊\n    🔸法條查詢\n2️⃣ 根據個別給出的指令進行操作\n    🔸釋字查詢\n        📎E + 關鍵字\n            ex.E比例原則\n        📎輸入字號\n            ex. 767\n    🔸法條查詢\n        📎K + 關鍵字\n            ex. K行為能力\n        📎輸入條號\n            ex. 13,15,75-79,756.7\n3️⃣ 欲切換模式再重複前兩項即可\n\n🐔小彩蛋：\n🔹輸入我的小名\n🔹輸入「自我介紹」`
          })
          break;
        case `阿國，我想要查釋字！`:
          event.reply({
            type: 'text',
            text: '好勒！\n請稍等，我跟你講一下規則喔！\n\n📌關鍵字檢索：\n     1️⃣"E + 關鍵字" (例：E同性)\n     2️⃣所有符合條件者會以清單方式列出\n\n📌單一釋字查詢：\n     1️⃣直接輸入字號 (例：748)\n     2️⃣僅會顯示該筆釋字的爭點、解釋文及其理由書連結。\n\n若查無資料， "🔎 搜尋結果:" 會顯示空白。    另外，有時資料量較大，因為人手不足 (創造者剝削我(つд⊂))，所以我整理起來需要花點時間，屆時還請多多見諒呀！'
          })
          break;
        case `阿國，最近有什麼新鮮事嗎？`:
          event.reply(newsQuickReply);
          break;
        case `阿國，我想要查法條！`:
          event.reply(lawQuickReply);
          break;
        case '我想要查憲法':
          event.reply({
            type: 'text',
            text: '<憲法>\n這裡簡單地跟你嘮叨一下規則喔！(*ﾟ∀ﾟ*)\n\n📌條文檢索：\n     輸入"K + 關鍵字" (例：K平等)\n\n📌條號查詢：\n    1️⃣單一條號\n        直接輸入數字 (例：5)\n    2️⃣多個條號\n        🔸不連續\n             以半型 " , " 區隔 (例：5,7)\n        🔸連續\n             以半型 " - " 區隔 (例：5-10)\n        🔸混用 (例：1,5-10,17)\n    3️⃣含有 "之" 的條號\n        以半型 " . " 區隔 (例：100.1)\n\n💡K 為大寫，且標點符號務必半型喔！'
          })
          break;
        case '我想要查民法':
          event.reply({
            type: 'text',
            text: '<民法>\n好der好der！\n以下是輸入規則！(〃∀〃)\n\n📌條文檢索：\n     輸入"K + 關鍵字" (例：K自然人)\n\n📌條號查詢：\n    1️⃣單一條號\n        直接輸入數字 (例：26)\n    2️⃣多個條號\n        🔸不連續\n             以半型 " , " 區隔 (例：6,26)\n        🔸連續\n             以半型 " - " 區隔 (例：6-9)\n        🔸混用 (例：6,26-30,44)\n    3️⃣含有 "之" 的條號\n        以半型 " . " 區隔 (例：709.2)\n\n💡K 為大寫，且標點符號務必半型喔！'
          })
          break;
        case '我想要查刑法':
          event.reply({
            type: 'text',
            text: '<刑法>\n收到！\n不過先看一下這裡喔(ㅅ˘ㅂ˘)\n\n📌條文檢索：\n     輸入"K + 關鍵字" (例：K沒收)\n\n📌條號查詢：\n    1️⃣單一條號\n        直接輸入數字 (例：2)\n    2️⃣多個條號\n        🔸不連續\n             以半型 " , " 區隔 (例：2,11)\n        🔸連續\n             以半型 " - " 區隔 (例：38-40)\n        🔸混用 (例：2,38-40)\n    3️⃣含有 "之" 的條號\n        以半型 " . " 區隔 (例：38.1)\n\n💡K 為大寫，且標點符號務必半型喔！'
          })
          break;
        case '我想要查行政程序法':
          event.reply({
            type: 'text',
            text: '<行政程序法>\n歐給！\n老規矩如下蛤(o´罒`o)\n\n📌條文檢索：\n     輸入"K + 關鍵字" (例：K行政處分)\n\n📌條號查詢：\n    1️⃣單一條號\n        直接輸入數字 (例：2)\n    2️⃣多個條號\n        🔸不連續\n             以半型 " , " 區隔 (例：2,20)\n        🔸連續\n             以半型 " - " 區隔 (例：92-97)\n        🔸混用 (例：2,92-97)\n    3️⃣含有 "之" 的條號\n        以半型 " . " 區隔 (例：174.1)\n\n💡K 為大寫，且標點符號務必半型喔！\n\n另外，因 line 的回覆有字數限制，所以若搜尋結果的資料量太大，我可能會直接暈倒給你看( ×ω× )(我的創造者似乎也懶得解決這個問題)，此時我建議可以改由條號查詢的方式，將範圍縮小，我就會再滿血復活了！ᕦ(ò_óˇ)ᕤ'
          })
          break;
      }
    } catch (error) {
      console.log('發生錯誤')
      console.log(error)
    }
  }
})
