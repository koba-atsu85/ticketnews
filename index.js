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
server.post('/webhook', line.middleware(line_config), (req, res, next) => {
    res.sendStatus(200);
    let events_processed = [];

    req.body.events.forEach((event) => {
        // この処理の対象をイベントタイプがメッセージで、かつ、テキストタイプだった場合に限定。
        if (event.type == "message" && event.message.type == "text"){
            // ユーザーからのテキストメッセージが「🍺」だった場合のみ反応。
            if (event.message.text == "🍺"){
                //スクショ保存、cloudinaryヘアップ
                screenshot();

                let url = cloudinary.v2.url("out.jpg", {secure: true});

                events_processed.push(bot.replyMessage(event.replyToken, {
                    type: "image",
                    originalContentUrl: url,
                    previewImageUrl: url
                }));
                events_processed.push(bot.replyMessage(event.replyToken, {
                    type: "text",
                    text: "もしくはここから確認してな。https://ticketpay.jp/adminroom/"
                }));

            } else {
                events_processed.push(bot.replyMessage(event.replyToken, {
                    type: "text",
                    text: "頑張るんやで"
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
const url = 'https://ticketpay.jp/store/login.php';
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
            upload('./out.png');
        });
}

function upload(img) {
    let jimp = require('jimp');

    jimp.read(img, (err, lenna) => {
        if (err) throw err;
        lenna
            .resize(300, 229) // resize
            .quality(60) // set JPEG quality
            .greyscale() // set greyscale
            .write('out.jpg'); // save
    });

    cloudinary.uploader.upload('out.jpg', {public_id: "out"}, function(result) {
        console.log(result)
    });
}


