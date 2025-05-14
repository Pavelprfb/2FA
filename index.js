const express = require('express');
const ejs = require('ejs');
const { TOTP } = require("totp-generator");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static("public"));

app.get('/', (req, res) => {
  res.render('index', { secret: '', otp: '' });
});

app.post('/', (req, res) => {
  const { secret } = req.body;

  const cleanedSecret = secret.replace(/\s+/g, '');

  try {
    const { otp, expires } = TOTP.generate(cleanedSecret);
    const second = Math.floor((expires - Date.now()) / 1000);

    console.log("Expires in:", second, "seconds");
    console.log(secret, otp);

    res.render('index', { secret, otp, second });
  } catch (err) {
    res.render('index', { secret, otp: 'Error', second });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server run at http://127.0.0.1:${PORT}`);
});