// 在React17以前，babel转换是老的写法
const babel = require("@babel/core");
const sourceCode = `
<h1>Hello, <span style={{color: 'red'}}>world</span>!</h1>`;

const result = babel.transform(sourceCode, {
  plugins: [
    [
      "@babel/plugin-transform-react-jsx",
      {
        runtime: "classic",
      },
    ],
  ],
});

console.log(result.code);
// ==>
/*#__PURE__*/ React.createElement(
  "h1",
  null,
  "Hello, ",
  /*#__PURE__*/ React.createElement(
    "span",
    {
      style: {
        color: "red",
      },
    },
    "world"
  ),
  "!"
);
