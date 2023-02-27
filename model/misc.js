import fs from 'fs';

export const sleep = async function (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/** 中文全角算两个 */
export const getStrLen = function (str) {
  return Array.from(str).reduce((len, c) => (c.match(/[^\x00-\xff]/gi) != null ? (len += 2) : (len += 1)), 0);
};

const ch = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** 阿拉伯数字变中文数字 */
export const num2Ch = function (num) {
  num = Number(num);
  if (isNaN(num)) return '零';
  num = String(num);
  return Array.from(num)
    .map(n => ch[n])
    .join();
};

/** 中文数字变阿拉伯数字 */
export const ch2Num = function (ch) {
  const nStr = Array.from(ch)
    .map(s => {
      const i = ch.findIndex(c => c === s);
      if (i > 0) return i;
      return 0;
    })
    .join();
  return Number(nStr);
};

export function recurGetJsPath(path) {
  return fs
    .readdirSync(path)
    .flatMap(sonPath => {
      // 1) 如果是文件夹，递归
      if (fs.statSync(`${path}/${sonPath}`).isDirectory()) {
        // 跳过.ignore文件夹
        if (sonPath === '.ignore') return []; // 列表会被flat抹去
        return recurGetJsPath(`${path}/${sonPath}`); // 会返回一个列表
      }

      // 2) 如果是文件，返回路径
      if (fs.statSync(`${path}/${sonPath}`).isFile()) return `${path}/${sonPath}`;

      return []; // 列表会被flat抹去
    })
    .filter(fileName => fileName.endsWith('.js'));
}
