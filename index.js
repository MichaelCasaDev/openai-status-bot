const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

const Parser = require("rss-parser");
const parser = new Parser();

const fs = require("fs/promises");
const { join } = require("path");

(async () => {
  console.log("### Telegram bot is ready and connected! ###");
  console.log("\nFetching feeds:");

  const fileRead = await fs.readFile(join(__dirname, "data.json"));
  const data = JSON.parse(fileRead.toString());

  await bot.setMyCommands([
    {
      command: "latest",
      description: "Get the latest feed",
    },
    {
      command: "subscribe",
      description: "Subscribe to the notification system",
    },
    {
      command: "unsubscribe",
      description: "Unsubscribe from the notification system",
    },
  ]);

  bot.onText(/\/start/, async (msg, match) => {
    const chatId = msg.chat.id;

    bot.sendMessage(
      chatId,
      parseString(
        `Thanks for have chosen OpenAI Status Bot, you will receive notifications when an OpenAI status events will be created.\n\n\nMade by [MichaelCasaDev](https://twitter.com/MichaelCasaDev)!\n\nCheck out more on https://www.michaelcasa.com`
      ),
      {
        parse_mode: "MarkdownV2",
      }
    );

    if (data.chats.indexOf(chatId) == -1) {
      data.chats.push(chatId);

      await fs.writeFile(
        join(__dirname, "data.json"),
        JSON.stringify(data, null, "\t")
      );
    }
  });

  bot.onText(/\/latest/, async (msg, match) => {
    const chatId = msg.chat.id;
    const feed = data.latestFeed.items[0];

    bot.sendMessage(
      chatId,
      parseString(
        `*Title: *${feed.title}\n\n*Description:*\n${feed.contentSnippet}\n\nCheck updates also on ${feed.link}`
      ),
      {
        parse_mode: "MarkdownV2",
      }
    );
  });

  bot.onText(/\/subscribe/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (data.chats.indexOf(chatId) == -1) {
      data.chats.push(chatId);

      await fs.writeFile(
        join(__dirname, "data.json"),
        JSON.stringify(data, null, "\t")
      );

      bot.sendMessage(
        chatId,
        "Thanks for have chosen OpenAI Status Bot, you will receive notifications when an OpenAI status events will be created."
      );
    } else {
      bot.sendMessage(
        chatId,
        "You are already subscribed to the notification system. A message will reach you when a status update is published by OpenAi team."
      );
    }
  });

  bot.onText(/\/unsubscribe/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (data.chats.indexOf(chatId) != -1) {
      data.chats.splice(data.chats.indexOf(chatId), 1);

      await fs.writeFile(
        join(__dirname, "data.json"),
        JSON.stringify(data, null, "\t")
      );

      bot.sendMessage(
        chatId,
        "You have been succesfully unsubscribed from the notification system!"
      );
    } else {
      bot.sendMessage(
        chatId,
        "You are not subscibed to the notification system!"
      );
    }
  });

  setInterval(async () => fetchRSS(data), 1000 * 10);
  fetchRSS(data);
})();

function parseString(str) {
  let newStr = str;

  newStr = newStr.replace(/\!/g, "\\!");
  newStr = newStr.replace(/\+/g, "\\+");
  newStr = newStr.replace(/\-/g, "\\-");
  newStr = newStr.replace(/\./g, "\\.");

  return newStr;
}

function sendGlobalMessage(feed) {
  const parsed = parseString(
    `*🚨 New incident on OpenAI!*\n\n*Title: *${feed.title}\n\n*Description:*\n${feed.contentSnippet}\n\nCheck updates also on ${feed.link}`
  );

  data.chats.map((chatId) => {
    bot.sendMessage(chatId, parsed, {
      parse_mode: "MarkdownV2",
    });
  });
}

async function fetchRSS(data) {
  let feed = await parser.parseURL("https://status.openai.com/history.rss");

  console.log(`\n\n### FETCH AT ${new Date().toISOString()} ###\n`);

  console.log(feed.title);
  console.log("Latest feed: " + feed.pubDate);

  if (data.latestFeed.pubDate != feed.pubDate) {
    sendGlobalMessage(feed.items[0]);
  }

  data.latestFeed = feed;

  await fs.writeFile(
    join(__dirname, "data.json"),
    JSON.stringify(data, null, "\t")
  );
}
