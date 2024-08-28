import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';


export async function getWishText(personInfo) {
  const message = {
    messages: [
      {
        role: "system",
        content:
          "You are a friendly assistant and write happy birthday wishes. Please write directly the wish.",
      },
      {
        role: "user",
        content: `Please use for this this person information: Name: ${personInfo.name}, Birthday: ${personInfo.bithday}`,
      },
    ],
  };
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ID}/ai/run/@cf/openchat/openchat-3.5-0106`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_TOKEN}`,
      },
      method: "POST",
      body: JSON.stringify(message),
    }
  );
  const result = await response.json();
  return result;
}

export async function getImageFromText(text) {
  const inputs = {
    prompt: text,
  };

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ID}/ai/run/@cf/lykon/dreamshaper-8-lcm`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_TOKEN}`,
      },
      method: "POST",
      body: JSON.stringify(inputs),
    }
  );

  const buffer = Buffer.from(await response.arrayBuffer());

  // Replicate __dirname in ES Modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // Define the file path to save the image
  const filePath = path.join(__dirname, "image.png");

  // Save the buffer to a file
  fs.writeFileSync(filePath, buffer);

  return new Response(response, {
    headers: {
      "content-type": "image/png",
    },
  });
}

export async function getSummarization(text) {
  const inputs = {
    input_text: text
  };

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ID}/ai/run/@cf/facebook/bart-large-cnn`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_TOKEN}` ,
      },
      method: "POST",
      body: JSON.stringify(inputs),
    }
  );

  const result = await response.json();
  return result;
}


export async function getGeneratedText(text) {
  const message = {
    messages: [
      {
        role: "system",
        content: "You are a professional assistant. Please write an answer for the text.",
      },
      {
        role: "user",
        content: `${text}`,
      },
    ],
  };

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ID}/ai/run/@cf/openchat/openchat-3.5-0106`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_TOKEN}`,
        },
        method: "POST",
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error fetching generated text:", error);
    throw error; // Rethrow the error to be caught in the outer try-catch
  }
}
