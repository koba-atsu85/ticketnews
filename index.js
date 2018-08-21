"use strict";

const server = require("express")();
const line = require("@line/bot-sdk");
const line_config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};
const bot = new line.Client(line_config);

server.listen(process.env.PORT || 5000, () => {
    console.log("server is running...");
});

let cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


// ルーター設定
// server.get('/', function(req, res) {
//     res.send('hello world');
// });
// server.use('/', express.static('./public'));

server.post('/webhook', line.middleware(line_config), (req, res, next) => {
    res.sendStatus(200);
    let events_processed = [];

    req.body.events.forEach((event) => {
        // この処理の対象をイベントタイプがメッセージで、かつ、テキストタイプだった場合に限定。
        if (event.type == "message" && event.message.type == "text"){
            // ユーザーからのテキストメッセージが「🍺」だった場合のみ反応。
            if (event.message.text == "🍺") {
                //スクショ保存、cloudinaryヘアップ
                screenshot();

                // urlを取得
                let url = = cloudinary.v2.url("out.jpg", {secure: true});
                // let url = fs.readFileSync('./latest.txt', 'utf8');
                events_processed.push(bot.replyMessage(event.replyToken, {
                    type: "image",
                    originalContentUrl: url,
                    previewImageUrl: url
                }));

            } else if(event.message.text == "機材リスト") {
                events_processed.push(bot.replyMessage(event.replyToken, {
                    type: "text",
                    text: "機材リストはここやで。\n https://docs.google.com/spreadsheets/d/1izMeOgj8qeSwoOuNYHptwYU3Kbd1-K2owHwMLUWdLbI/edit#gid=878262081"
                }));
            } else if(event.message.text == "タイムテーブル") {
                events_processed.push(bot.replyMessage(event.replyToken, {
                    type: "text",
                    text: "タームテーブルはここや。\n ここに複数あるで。 \n https://drive.google.com/drive/folders/0B8VKy5ZDXUYTZmhMdV8yWlplZEU?usp=sharing"
                }));
            }
        }
    });
    // すべてのイベント処理が終了したら何個のイベントが処理されたか出力。
    Promise.all(events_processed).then(
        (response) => {
            console.log(`${response.length} event(s) processed.`);
        }
    );
});


const Chromy = require('chromy');
const fs = require('fs');
const url = process.env.LOGIN_URL;
const login_id = process.env.LOGIN_ID;
const pass = process.env.PASSWORD;
const chromy = new Chromy();

function screenshot() {
    chromy.chain()
        .goto(url)
        .insert('input[name=login_id]', login_id)
        .insert('input[type=password]', pass)
        .click('input[type=submit]', {waitLoadEvent: false})
        .wait('table.ticket_infomation_box')
        // チケット販売状況テーブルのスクショ
        .screenshotSelector('table.ticket_infomation_box')
        .result((img) => fs.writeFileSync('out.png', img))
        .end((e) => console.log(e))
        .catch((e) => {
            console.log(e)
        })
        .then(() => {
            chromy.close();
            // 取得できたらアップロード
            upload('out.png');

        });
}

function upload(img) {

    let jimp = require('jimp');

    jimp.read(img).then(function (lenna) {
        lenna
            // .resize(300, 229) // resize
            .quality(100) // set JPEG quality
            // .greyscale() // set greyscale
            .write('./out.jpg'); // save

        cloudinary.v2.uploader.upload('./out.jpg', {public_id: "out", invalidate: true}, function(error, result) {
            console.log(result);
            fs.writeFileSync('./latest.txt', result.secure_url, function (err) { if (err) throw err; });
        });

    }).catch(function (err) {
        throw err;
    });
}


