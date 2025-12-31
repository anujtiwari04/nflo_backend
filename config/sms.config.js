const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function createMessage() {
  const message = await client.messages.create({
    body: "Test message",
    from: "+919057090999",
    to: "+917877501132",
  });

  console.log(message.body); 
}

createMessage();