const fs = require('fs');
const path = require('path');

const indexHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="refresh" content="0; url=allure/" />
    <script>window.location.href = "allure/";</script>
    <title>Redirecting...</title>
  </head>
  <body>
    <p>Redirecting to <a href="allure/">Allure Report</a>...</p>
  </body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'index.html'), indexHtml);
