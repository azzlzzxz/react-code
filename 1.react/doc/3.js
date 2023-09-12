const path = require("path");
console.log(path.delimiter);
console.log(path.posix.delimiter);
// window路径分隔符是;，linux是:
// 怎么保证window和linux的路径分隔符一致呢？用path.posix
