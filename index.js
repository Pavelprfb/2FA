const express = require("express");
const { totp } = require("otplib");
const mongoose = require("mongoose");
const app = express();


app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

const SECRET = "NSMRRAGQXJ4LIMK2Z4Q7ZUZMR35FUL44";

mongoose.connect('mongodb+srv://MyDatabase:Cp8rNCfi15IUC6uc@cluster0.kjbloky.mongodb.net/2fa', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

const twoFASchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // code expires in 5 minutes (300 seconds)
  }
});

const userModel = mongoose.model('TwoFA', twoFASchema);

function renderPage(code = "", userInput = "", error = "") {
  return `
  <html>
  <head>
  	<meta charset="UTF-8">
  	<meta name="viewport" content="width=device-width, initial-scale=1.0">
  	<meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>2FA Generator</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f0f0f0;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
      }
      .container {
        width: 300px;
        background: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0,0,0,0.2);
        max-width: 400px;
        width: 100%;
        text-align: center;
      }
      input[type="text"] {
        padding: 10px;
        width: 100%;
        margin-bottom: 10px;
        font-size: 16px;
      }
      button {
        padding: 10px 20px;
        font-size: 16px;
        margin: 5px;
        cursor: pointer;
        border: none;
        border-radius: 5px;
        background-color: #007bff;
        color: white;
      }
      button:hover {
        background-color: #0056b3;
      }
      .code-box {
        margin-top: 20px;
        background: #e9ecef;
        padding: 15px;
        border-radius: 5px;
      }
      .error {
        color: red;
      }
      #timer {
        font-weight: bold;
        margin-top: 10px;
      }
      input.readonly {
        font-weight: bold;
        text-align: center;
        border: none;
        background: #e9ecef;
        border: 0.5px solid gray;
        font-size: 10px;
      }
      #timer{
        opacity: 0;
      }
      #code{
      color: black;
      background: yellow;
    </style>
  </head>
  <body>
    <div class="container">
      <h2>2FA Code Generator</h2>
      <form method="POST" action="/">
        ${error ? `<div class="error">${error}</div>` : ""}
        <input type="text" name="secret" placeholder="Enter your secret code" required />
        <button type="submit">Generate Code</button>
      </form>

      ${code ? `
        <div class="code-box">
          <div class="row">
            <input class="readonly" type="text" id="secretInput" value="${userInput}" readonly />
            <button onclick="copyText('secretInput')">Copy</button>
          </div>
          <br>
          <br>
          <p><strong>6-digit Code:</strong> <span id="code">${code}</span></p>
          <button onclick="copyCode()">Copy 6-digit Code</button>
          <p id="timer">New code in <span id="countdown">10</span> seconds</p>
        </div>
      ` : ""}
    </div>

    <script>
      function copyText(id) {
        const input = document.getElementById(id);
        navigator.clipboard.writeText(input.value).then(() => {
          alert('Copied!');
        });
      }

      function copyCode() {
        const code = document.getElementById("code").textContent;
        navigator.clipboard.writeText(code).then(() => {
          alert('Copied!');
        });
      }

      ${code ? `
      let countdown = 1000;
      const countdownEl = document.getElementById("countdown");
      const codeEl = document.getElementById("code");

      function getNewCode() {
        fetch('/generate-code?secret=${userInput}')
          .then(res => res.text())
          .then(newCode => {
            codeEl.textContent = newCode;
          });
      }

      setInterval(() => {
        countdown--;
        countdownEl.textContent = countdown;
        if (countdown <= 0) {
          getNewCode();
          countdown = 10;
        }
      }, 1000);
      ` : ""}
    </script>
  </body>
  </html>
  `;
}

app.get("/", (req, res) => {
  res.send(renderPage());
});

app.post("/", async (req, res) => {
  const input = req.body.secret.replace(/\s/g, "").toUpperCase();
  const rawInput = req.body.secret.trim();
  if (input === SECRET) {
    const code = totp.generate(SECRET);

    // Check if the code already exists in the database
    const findData = await userModel.findOne({ code: input });
    
    if (!findData) {
      const newUser = new userModel({
        code: input
      });
    
      newUser.save()
        .then(() => console.log('Data inserted'))
        .catch(err => console.error('Insert error:', err));
    }
    
    res.send(renderPage(code, rawInput));
  } else {
    res.send(renderPage("", "", "Invalid secret code."));
  }
});

app.get("/view", async (req, res) => {
  try {
    const findData = await userModel.find({});
    res.render('viewData', { data: findData });
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).send('Error fetching data');
  }
});

// API endpoint for auto-refresh code
app.get("/generate-code", (req, res) => {
  const input = req.query.secret?.toUpperCase() || "";
  if (input === SECRET) {
    const newCode = totp.generate(SECRET);
    res.send(newCode);
  } else {
    res.status(400).send("Invalid secret");
  }
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));