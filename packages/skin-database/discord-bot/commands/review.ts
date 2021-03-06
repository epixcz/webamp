import * as Skins from "../../data/skins";
import * as Utils from "../utils";
import { Message } from "discord.js";

async function reviewSkin(message: Message, nsfw: boolean): Promise<void> {
  console.log(1);
  const skin = await (nsfw
    ? Skins.getSkinToReviewForNsfw()
    : Skins.getSkinToReview());
  if (skin == null) {
    console.log(1.5);
    throw new Error("No skins to review");
  }
  const { md5 } = skin;
  console.log(2);
  await Utils.postSkin({
    md5,
    title: (filename) => `Review: ${filename}`,
    dest: message.channel,
  });
}

console.log("Top scope");

async function handler(message: Message, args: [string, string]) {
  console.log("Handler called");
  let count = Number(args[0] || 1);
  let nsfw = args[1] === "nsfw";
  if (count > 50) {
    await message.channel.send(
      `You can only review up to ${count} skins at a time.`
    );
    count = 50;
  }
  console.log("About to send");
  await message.channel.send(`Going to show ${count} skins to review.`);
  let i = count;
  while (i--) {
    await reviewSkin(message, nsfw);
  }
  if (count > 1) {
    const tweetableCount = await Skins.getTweetableSkinCount();
    await message.channel.send(
      `Done reviewing ${count} skins. There are now ${tweetableCount} Tweetable skins. Thanks!`
    );
  } else {
    await message.channel.send(`Thanks!`);
  }
}

module.exports = {
  command: "review",
  handler,
  usage: "[<number>]",
  description:
    "Post a <number> of skins to be reviewed for inclusion in the Twitter bot. Defaults to 1",
};
