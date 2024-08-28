import "dotenv/config";
import express from "express";
import Nylas from "nylas";
import { getSummarization, getImageFromText, getWishText, getGeneratedText } from "./cloud.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  clientId: process.env.NYLAS_CLIENT_ID,
  callbackUri: "http://localhost:3000/oauth/exchange",
  apiKey: process.env.NYLAS_API_KEY,
  apiUri: process.env.NYLAS_API_URI,
};

const identifier = process.env.USER_GRANT_ID;

const nylas = new Nylas({
  apiKey: config.apiKey,
  apiUri: config.apiUri,
});

const app = express();
const port = 3000;

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.use(express.static(path.join(__dirname, "public")));
app.use('/cloud.js', express.static(path.join(__dirname, 'cloud.js')));
app.use(express.json());

app.get("/nylas/auth", (req, res) => {
  const authUrl = nylas.auth.urlForOAuth2({
    clientId: config.clientId,
    redirectUri: config.callbackUri,
  });

  res.redirect(authUrl);
});

app.get("/nylas/recent-emails", async (req, res) => {
  try {
    const identifier = process.env.USER_GRANT_ID;
    const messages = await nylas.messages.list({
      identifier,
      queryParams: {
        limit: 5,
      },
    });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching emails:", error);
  }
});

// callback route Nylas redirects to
app.get("/oauth/exchange", async (req, res) => {
  console.log("Received callback from Nylas");
  const code = req.query.code;

  if (!code) {
    res.status(400).send("No authorization code returned from Nylas");
    return;
  }

  const codeExchangePayload = {
    clientSecret: config.apiKey,
    clientId: config.clientId,
    redirectUri: config.callbackUri,
    code,
  };

  try {
    const response = await nylas.auth.exchangeCodeForToken(codeExchangePayload);
    const { grantId } = response;

    // NB: This stores in RAM
    // In a real app you would store this in a database, associated with a user
    process.env.NYLAS_GRANT_ID = grantId;

    res.json({
      message: "OAuth2 flow completed successfully for grant ID: " + grantId,
    });
  } catch (error) {
    res.status(500).send("Failed to exchange authorization code for token");
  }
});

app.get("/nylas/list-events", async (req, res) => {
  try {
    const calendars = await nylas.calendars.find({
      identifier,
      calendarId: "primary",
    });

    const primaryCalendar = calendars.data;
    const calendarId = primaryCalendar.id;

    const events = await nylas.events.list({
      identifier,
      queryParams: {
        calendar_id: calendarId,
        limit: 5,
      },
    });

    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
  }
});

app.get("/nylas/list-contacts", async (req, res) => {
  try {
    const contacts = await nylas.contacts.list({
      identifier,
      queryParams: {},
    });

    const today = new Date();
    let todayDay = today.getDate();
    let todayMonth = today.getMonth();

    contacts.data.map((ob) => {
      ob.birthdayToSend = false;
      const dateToCompare = new Date(ob.birthday);
      if (
        todayDay === dateToCompare.getDate() &&
        todayMonth === dateToCompare.getMonth()
      ) {
        if (ob.emails.length !== 0) {
          ob.birthdayToSend = true;
        }
      }
    });

    res.json(contacts);
  } catch (error) {
    console.error("Error fetching events:", error);
  }
});

app.get("/nylas/unreaded-emails", async (req, res) => {
  try {
    const identifier = process.env.USER_GRANT_ID;
    const messages = await nylas.messages.list({
      identifier,
      queryParams: {
        unread: true,
      },
    });
    res.json(messages);
  } catch (error) {
    console.error("Error fetching unread emails:", error);
    res.status(500).send("Error fetching emails");
  }
});

app.get("/nylas/emails-current-week", async (req, res) => {
  const today = new Date();
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
  startOfWeek.setHours(0, 0, 0, 0);

  const identifier = process.env.USER_GRANT_ID;
  try {
    const messages = await nylas.messages.list({
      identifier,
      queryParams: {
        received_after: Math.floor(startOfWeek.getTime() / 1000)
      }
    });

    const emailsPerDay = Array(7).fill(0);

    messages.data.forEach(message => {
      const emailDate = new Date(message.date * 1000);
      const dayOfWeek = emailDate.getDay();
      emailsPerDay[dayOfWeek]++;
    });

    res.json(emailsPerDay);
  } catch (error) {
    console.error('Error fetching emails from this week:', error);
  }
});

app.get("/nylas/create-event", async (req, res) => {
  try {
    const identifier = process.env.USER_GRANT_ID;
    const calendars = await nylas.calendars.find({
      identifier,
      calendarId: "primary",
    });

    const primaryCalendar = calendars.data;
    const calendarId = primaryCalendar.id;

    const now = new Date();
    const startTime = new Date(now.getTime());
    startTime.setMinutes(now.getMinutes() + 5);
    const endTime = new Date(now.getTime());
    endTime.setMinutes(now.getMinutes() + 35);

    const newEvent = await nylas.events.create({
      identifier,
      queryParams: {
        calendarId,
      },
      requestBody: {
        title: "New Test Event",
        when: {
          startTime: Math.floor(startTime.getTime() / 1000),
          endTime: Math.floor(endTime.getTime() / 1000),
        },
      },
    });

    res.json(newEvent);
  } catch (error) {
    console.error("Error creating event:", error);
  }
});

app.get("/cloud/image", async (req, res) => {
  try {
    getImageFromText("Please generate picture for happy birthday wishes");

    res.json("DONE");
  } catch (error) {
    console.error("Error creating event:", error);
  }
});

app.get("/cloud/wishes", async (req, res) => {
  const personInfo = {
    name: "John",
    age: "22",
    birthday: "22.02.1992",
  };
  try {
    const wish = getWishText(personInfo);

    res.json(wish);
  } catch (error) {
    console.error("Error creating event:", error);
  }
});

app.get("/nylas/create-event", async (req, res) => {
  try {
    const identifier = process.env.USER_GRANT_ID;
    const calendars = await nylas.calendars.find({
      identifier,
      calendarId: "primary",
    });

    const primaryCalendar = calendars.data;
    const calendarId = primaryCalendar.id;

    const now = new Date();
    const startTime = new Date(now.getTime());
    startTime.setMinutes(now.getMinutes() + 5);
    const endTime = new Date(now.getTime());
    endTime.setMinutes(now.getMinutes() + 35);

    const newEvent = await nylas.events.create({
      identifier,
      queryParams: {
        calendarId,
      },
      requestBody: {
        title: "New Test Event",
        when: {
          startTime: Math.floor(startTime.getTime() / 1000),
          endTime: Math.floor(endTime.getTime() / 1000),
        },
      },
    });

    res.json(newEvent);
  } catch (error) {
    console.error("Error creating event:", error);
  }
});

app.get("/cloud/image", async (req, res) => {
  try {
    getImageFromText("Please generate picture for happy birthday wishes");

    res.json("DONE");
  } catch (error) {
    console.error("Error creating event:", error);
  }
});

app.post("/nylas/send-congratulation", async (req, res) => {
  try {
    const personInfo = req.body;
    const r = await getWishText(personInfo);
    await nylas.messages.send({
      identifier: process.env.USER_GRANT_ID,
      requestBody: {
          to: [{ name: personInfo.name, email: personInfo.email }],
          replyTo: [{ name: personInfo.name, email: personInfo.email }],
          subject: `Happy Birthday ${personInfo.name}`,
          body: r.result.response,
      },
  });
    console.log(`Sent email to ${personInfo.name}`);
} catch (error) {
    console.error("Error sending email:", error);
}});

app.post("/nylas/send-generated-text", async (req, res) => {
  try {
    const info = req.body;
    console.log(info)
    await nylas.messages.send({
      identifier: process.env.USER_GRANT_ID,
      requestBody: {
          to: [{ name: info.name, email: info.email }],
          replyTo: [{ name: info.name, email: info.email }],
          subject: `Reply`,
          body: info.text,
      },
  });
    console.log(`Sent email to ${info.name}`);
} catch (error) {
    console.error("Error sending email:", error);
}});

app.get("/cloud/summarize", async (req, res) => {
  try {
    const text = req.query.text;
    getSummarization(text).then(obj => {
      return res.json(obj.result.summary);
    })
  } catch (error) {
    console.error("Error creating event:", error);
  }
});

app.get("/cloud/text-generating", async (req, res) => {
  try {
    const text = req.query.text;
    const generatedText = await getGeneratedText(text);

    return res.json(generatedText);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});