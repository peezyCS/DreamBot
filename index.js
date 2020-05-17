const Discord = require("discord.js");
const client = new Discord.Client();
const axios = require("axios");
const config = require("./config.json");
const fs = require("fs");
const prefix = config.prefix;
const cheerio = require("cheerio");
let totalMembers;
let totalMemberChannel;

function getSteamData(){
  return JSON.parse(fs.readFileSync("userData.json").toString())
}
function addSteamData(d){
  return fs.writeFileSync("userData.json", JSON.stringify(d))
}


async function getUserData(url) {
  let data = [];
  let response = await axios.get(url);
  response = response.data;
  var $ = cheerio.load(response);
  $("div.well h3").each((div, element) => {
    let newData = $(element).text();
    data.push(newData);
  });
  return data;
}


async function bot() {
  client.on("ready", () => {
    console.log(`Connected to ${client.user.tag}!`);
    let myGuild = client.guilds.cache.get(config["guild"])
    totalMemberChannel = myGuild.channels.cache.get(config["totalMembers"])
    totalMembers = myGuild.memberCount;
    totalMemberChannel.setName(`Total Members: ${totalMembers}`).then(result=> {
      return;
    })
  });

  client.on("guildMemberAdd", member => {
    ++totalMembers
    totalMemberChannel.setName(`Total Members: ${totalMembers}`).then(result=> {
      return;
    })
  })

  client.on("guildMemberRemove", member => {
    --totalMembers
    totalMemberChannel.setName(`Total Members: ${totalMembers}`).then(result=> {
      return;
    })
  })

  client.on("message", async (msg) => {
    let userData;
    let id;
    if (msg.content.startsWith(`${prefix}inv`)) {
      if (msg.content.split(" ").length >= 0) {
        msg.channel.send("Please wait a few seconds while I fetch the data")
        if (msg.content == "!inv"){
          let user = msg.author.id
          let data = getSteamData();
          id = data[user]
          userData = await getUserData(
          `https://csgobackpack.net/?nick=${id}&currency=USD`
          );
          getInventoryValue(userData, msg, id);
        }else if (!isNaN(msg.content.split(" ")[1])){
          id = msg.content.split(" ")[1];
          userData = await getUserData(
          `https://csgobackpack.net/?nick=${id}&currency=USD`
          );
          getInventoryValue(userData, msg, id);
        }else if (isNaN(id)) {
          let user = msg.mentions.users.first().id;
          let data = getSteamData()
          userData = await getUserData(`https://csgobackpack.net/?nick=${data[user]}&currency=USD`)
          getInventoryValue(userData, msg, data[user]);
        }
      }
    } else if (msg.content.startsWith(`${prefix}steamid`)) {
      let steam_id = msg.content.split(" ")[1];
      let user = msg.author.id;

      if (!isNaN(steam_id)) {
        let json = getSteamData()
        json[user] = steam_id;
        addSteamData(json)
        msg.channel.send(
          "Steam Id added. You will now be able to use !inv command."
        );
      } else {
        let errorEmbed = new Discord.MessageEmbed()
          .setTitle("Error")
          .setDescription("Invalid Steam ID")
          .addField("Requested By:", `<@${msg.author.id}>`)
          .setColor(config.errortheme)
          .setTimestamp()
          .setFooter("CS:GO Inventory Value Checker");
        msg.channel.send(errorEmbed);
      }
    }
  });
}

async function getInventoryValue(userData, msg, id) {
  try {
    let inventoryValue = userData[1].split("\n")[1];
    if (inventoryValue == undefined) {
      inventoryValue = "Error: Your steam account is private.";
    }
    let username = userData[0];
    let inventoryValueEmbed = new Discord.MessageEmbed()
      .setTitle("Inventory Value")
      .setDescription("Inventory Value for " + `**${username}**`)
      .addField("Total Inventory Value:", `${inventoryValue}`)
      .addField("Steam ID:", `||${id}||`)
      .addField("Requested By:", `<@${msg.author.id}>`)
      .setColor(config.theme)
      .setTimestamp()
      .setFooter("CS:GO Inventory Value Checker");
    msg.channel.send(inventoryValueEmbed);
  } catch (error) {
    let errorEmbed = new Discord.MessageEmbed()
      .setTitle("Error")
      .setDescription("Could not find the user")
      .addField(
        "Please check for the following:",
        "Invalid Steam ID \n Make sure your account is public",
        true
      )
      .addField("Requested By:", `<@${msg.author.id}>`)
      .setColor(config.errortheme)
      .setTimestamp()
      .setFooter("CS:GO Inventory Value Checker");
    msg.channel.send(errorEmbed);
  }
}

bot();
client.login(process.env.BOT_TOKEN);
