/* eslint import/no-unresolved:0 */
var React = require("react");

var App = React.createClass({
  render: () => (
    <html>
      <head>
        <title>gulp-inject</title>
        {/* inject:html */}
        <link rel="import" href="/test-fixtures/component.html" />
        {/* endinject */}
        {/* inject:css */}
        <link rel="stylesheet" href="/test-fixtures/styles.css" />
        {/* endinject */}
      </head>
      <body>
        {/* inject:js */}
        <script src="/test-fixtures/lib.js"></script>
        {/* endinject */}
      </body>
    </html>
  )
});

module.exports = App;
