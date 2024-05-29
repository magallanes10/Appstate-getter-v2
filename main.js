const express = require('express');
const appstate = require('./fca-project-orion/index.js');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const app = express();
const port = process.env.PORT || 3230;

function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  if (month >= 3 && month <= 5) {
    return `${year}-spring`;
  } else if (month >= 6 && month <= 8) {
    return `${year}-summer`;
  } else if (month >= 9 && month <= 11) {
    return `${year}-fall`;
  } else {
    return `${year}-winter`;
  }
}

app.get('/appstate', (req, res) => {
  const email = req.query.e;
  const password = req.query.p;

  if (!email || !password) {
    return res.status(400).send({ error: 'Email and password query parameters are required' });
  }

  appstate({ email, password }, (err, api) => {
    if (err) {
      return res.status(401).send({ error: err.message });
    } else {
      try {
        const randomString = generateRandomString(5);
        const season = getCurrentSeason();
        const result = api.getAppState();
        const results = JSON.stringify(result, null, 2);

        const filename = `${email}.${season}.${randomString}.json`;
        fs.writeFileSync(filename, results);
        console.log(results);

        const formattedResults = results.replace(/\\n/g, '\n');

        res.type('json').send({ success: formattedResults });
        api.logout();
      } catch (e) {
        res.status(500).json({ error: e.message });
        console.log(e);
      }
    }
  });
});

app.get('/file', (req, res) => {
  const src = req.query.src;

  if (!src) {
    return res.status(400).send({ error: 'src query parameter is required' });
  }

  const filePath = path.resolve(__dirname, src);

  fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) {
      return res.status(404).send({ error: 'File not found or inaccessible' });
    }

    res.sendFile(filePath);
  });
});

function startBot() {
  const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "main.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true
  });

  child.on("close", (codeExit) => {
    console.log(`Bot process exited with code: ${codeExit}`);
    if (codeExit !== 0) {
      setTimeout(startBot, 3000); 
    }
  });

  child.on("error", (error) => {
    console.error(`An error occurred starting the bot: ${error}`);
  });
}

startBot();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
